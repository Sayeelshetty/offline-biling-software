import type {
  SyncBatchResult,
  SyncEngineStatus,
  SyncQueueItem,
  SyncResult,
} from "../../../shared/types/sync";

import connectionService from "./connection.service";
import syncService from "./sync.service";
import cloudSyncService from "./cloud-sync.service";

type SyncListener = (
  status: SyncEngineStatus
) => void;

class SyncEngineService {
  private syncing = false;

  private listeners =
    new Set<SyncListener>();

  private unsubscribeConnection:
    (() => void) | null = null;

  private refreshTimer:
    ReturnType<typeof setInterval> | null =
      null;

  private cloudBackupPending = false;

  private cloudBackupInProgress = false;

  private lastCloudBackupAttemptAt = 0;

  private lastAutomaticRetryAt = 0;

  private readonly automaticRetryIntervalMs =
    60_000;

  private syncRetryCount = 0;

  private nextSyncRetryAt = 0;

  private readonly baseSyncRetryDelayMs =
    5_000;

  private readonly maxSyncRetryDelayMs =
    300_000;

  private readonly cloudBackupRetryIntervalMs =
    60_000;

  private status: SyncEngineStatus = {
    connection:
      connectionService.getConnectionStatus(),

    syncing: false,

    pending: 0,

    failed: 0,

    lastSyncedAt: null,

    deviceId: this.getDeviceId(),
  };

  private getDeviceId(): string {
    let deviceId = localStorage.getItem(
      "offline-billing-device-id"
    );

    if (!deviceId) {
      deviceId =
        `DEVICE-${crypto.randomUUID()}`;

      localStorage.setItem(
        "offline-billing-device-id",
        deviceId
      );
    }

    return deviceId;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({
        ...this.status,
      });
    }
  }

  private async refreshCounts(): Promise<void> {
    try {
      const summary =
        await syncService.getSyncSummary();

      this.status = {
        ...this.status,

        connection:
          connectionService.getConnectionStatus(),

        pending:
          summary.pending,

        failed:
          summary.failed,

        lastSyncedAt:
          summary.lastSyncedAt,

        deviceId:
          summary.deviceId ||
          this.getDeviceId(),
      };

      this.notify();
    } catch (error) {
      console.error(
        "Failed to refresh sync summary:",
        error
      );
    }
  }

  subscribe(
    listener: SyncListener
  ): () => void {
    this.listeners.add(listener);

    listener({
      ...this.status,
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  async initialize(): Promise<void> {
    if (this.unsubscribeConnection) {
      return;
    }

    this.status = {
      ...this.status,
      connection:
        connectionService.getConnectionStatus(),
    };

    this.unsubscribeConnection =
      connectionService.subscribeToConnectionChanges(
        async (connection) => {
          const becameOnline =
            this.status.connection !== "ONLINE" &&
            connection === "ONLINE";

          this.status = {
            ...this.status,

            connection,
          };

          this.notify();

          if (becameOnline) {
            this.cloudBackupPending = true;

            await this.retryFailedSyncItems(true);
            await this.syncPending(true);
            await this.tryAutomaticCloudBackup();
          }
        }
      );

    await this.refreshCounts();

    /*
     * Keep the local sync status updated even
     * when the user creates a bill/product/payment
     * while the application is already running.
     *
     * This is what makes:
     *
     * Offline + 3 pending
     *
     * appear immediately without restarting
     * the Electron application.
     */
    this.refreshTimer =
      setInterval(async () => {
        if (this.syncing) {
          return;
        }

        await this.refreshCounts();

        if (
          connectionService.getConnectionStatus() ===
            "ONLINE" &&
          this.status.failed > 0
        ) {
          await this.retryFailedSyncItems();
        }

        if (
          connectionService.getConnectionStatus() ===
            "ONLINE" &&
          this.status.pending > 0
        ) {
          await this.syncPending();
        }

        if (
          connectionService.getConnectionStatus() ===
          "ONLINE"
        ) {
          await this.tryAutomaticCloudBackup();
        }
      }, 1500);

    if (
      this.status.connection ===
      "ONLINE"
    ) {
      this.cloudBackupPending = true;

      await this.retryFailedSyncItems(true);
      await this.syncPending(true);
      await this.tryAutomaticCloudBackup();
    }
  }

  private async retryFailedSyncItems(
    force = false
  ): Promise<void> {
    if (
      connectionService.getConnectionStatus() !==
        "ONLINE" ||
      (!force &&
        Date.now() - this.lastAutomaticRetryAt <
          this.automaticRetryIntervalMs)
    ) {
      return;
    }

    this.lastAutomaticRetryAt = Date.now();

    const retried =
      await syncService.retryAllFailed(100);

    if (retried > 0) {
      await this.refreshCounts();
    }
  }

  private async tryAutomaticCloudBackup(): Promise<void> {
    if (
      !this.cloudBackupPending ||
      this.cloudBackupInProgress ||
      connectionService.getConnectionStatus() ===
        "OFFLINE" ||
      Date.now() - this.lastCloudBackupAttemptAt <
        this.cloudBackupRetryIntervalMs
    ) {
      return;
    }

    this.cloudBackupInProgress = true;
    this.lastCloudBackupAttemptAt = Date.now();

    try {
      const result =
        await window.desktopAPI.settings.cloudBackup();

      if (!result.success) {
        throw new Error(
          result.error ||
            "Automatic cloud backup failed."
        );
      }

      this.cloudBackupPending = false;

      console.info(
        "[BACKUP] Automatic cloud backup completed."
      );
    } catch (error) {
      console.error(
        "[BACKUP] Automatic cloud backup failed; it will be retried while online:",
        error
      );
    } finally {
      this.cloudBackupInProgress = false;
    }
  }

  async getPendingItems(
    limit = 100
  ): Promise<SyncQueueItem[]> {
    return syncService.getPendingSyncItems(
      limit
    );
  }

  async getFailedItems(
    limit = 100
  ): Promise<SyncQueueItem[]> {
    return syncService.getFailedSyncItems(
      limit
    );
  }

  async retryFailed(
    limit = 100
  ): Promise<number> {
    const retryCount =
      await syncService.retryAllFailed(
        limit
      );

    await this.refreshCounts();

    return retryCount;
  }

  async syncPending(
    force = false
  ): Promise<SyncBatchResult> {
    if (this.syncing) {
      return {
        processed: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    }

    if (
      !force &&
      Date.now() < this.nextSyncRetryAt
    ) {
      return {
        processed: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    }

    if (
      connectionService.getConnectionStatus() ===
      "OFFLINE"
    ) {
      await this.refreshCounts();

      return {
        processed: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    }

    this.syncing = true;

    this.status = {
      ...this.status,

      connection: "ONLINE",

      syncing: true,
    };

    this.notify();

    try {
      const pendingItems =
        await this.getPendingItems(100);

      if (pendingItems.length === 0) {
        this.syncRetryCount = 0;
        this.nextSyncRetryAt = 0;
        await this.refreshCounts();

        return {
          processed: 0,
          synced: 0,
          failed: 0,
          results: [],
        };
      }

      console.log(
        `[SYNC] Sending ${pendingItems.length} pending item(s) to cloud.`
      );

      const cloudResult =
        await cloudSyncService.pushSyncItems(
          pendingItems
        );

      this.syncRetryCount = 0;
      this.nextSyncRetryAt = 0;

      const results: SyncResult[] =
        cloudResult.results || [];

      for (const result of results) {
  try {
    if (!result.queueId) {
      console.error(
        "[SYNC] Cloud returned a sync result without a queueId.",
        result
      );
      continue;
    }

    if (
      result.status === "SYNCED"
    ) {
      await syncService.markSyncItemSynced(
        result.queueId,
        result.serverId
      );

            console.log(
              `[SYNC] Synced ${result.entityType} ${result.entityId}`
            );
          } else {
            await syncService.markSyncItemFailed(
              result.queueId,
              result.error ||
                "Cloud synchronization failed."
            );

            console.error(
              `[SYNC] Failed ${result.entityType} ${result.entityId}:`,
              result.error
            );
          }
        } catch (localUpdateError) {
          console.error(
            `[SYNC] Failed to update local sync status for ${result.queueId}:`,
            localUpdateError
          );
        }
      }

      await this.refreshCounts();

      return {
        processed:
          cloudResult.processed,

        synced:
          cloudResult.synced,

        failed:
          cloudResult.failed,

        results,
      };
    } catch (error) {
      /*
       * Keep pending records as PENDING when
       * the cloud server or internet is unavailable.
       *
       * They will be retried automatically later.
       */
      console.error(
        "[SYNC] Cloud synchronization unavailable:",
        error
      );

      this.syncRetryCount += 1;
      const retryDelay = Math.min(
        this.maxSyncRetryDelayMs,
        this.baseSyncRetryDelayMs *
          2 ** Math.min(this.syncRetryCount - 1, 6)
      );
      this.nextSyncRetryAt =
        Date.now() + retryDelay;

      await this.refreshCounts();

      return {
        processed: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    } finally {
      this.syncing = false;

      this.status = {
        ...this.status,

        syncing: false,
      };

      this.notify();
    }
  }

  getStatus(): SyncEngineStatus {
    return {
      ...this.status,
    };
  }

  destroy(): void {
    if (this.unsubscribeConnection) {
      this.unsubscribeConnection();

      this.unsubscribeConnection =
        null;
    }

    if (this.refreshTimer) {
      clearInterval(
        this.refreshTimer
      );

      this.refreshTimer = null;
    }

    this.listeners.clear();
  }
}

const syncEngineService =
  new SyncEngineService();

export default syncEngineService;