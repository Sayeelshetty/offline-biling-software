import type {
  SyncEntityType,
  SyncQueueItem,
  SyncSummary,
} from "../../../shared/types/sync";

type DesktopSyncApi = {
  getPending: (
    limit?: number
  ) => Promise<SyncQueueItem[]>;

  getFailed: (
    limit?: number
  ) => Promise<SyncQueueItem[]>;

  getAll: (
    limit?: number
  ) => Promise<SyncQueueItem[]>;

  getById: (
    queueId: string
  ) => Promise<SyncQueueItem | null>;

  getByEntity: (
    entityType: SyncEntityType,
    entityId: string
  ) => Promise<SyncQueueItem[]>;

  getSummary: () =>
    Promise<SyncSummary>;

  markSynced: (
    queueId: string,
    serverId?: string | null
  ) => Promise<SyncQueueItem | null>;

  markFailed: (
    queueId: string,
    errorMessage: string
  ) => Promise<SyncQueueItem | null>;

  retry: (
    queueId: string
  ) => Promise<SyncQueueItem | null>;

  retryAll: (
    limit?: number
  ) => Promise<number>;
};

function getSyncApi(): DesktopSyncApi {
  const api =
    window.desktopAPI?.sync as
      | DesktopSyncApi
      | undefined;

  if (!api) {
    throw new Error(
      "Sync API is not available."
    );
  }

  return api;
}

async function getPendingSyncItems(
  limit = 100
): Promise<SyncQueueItem[]> {
  return getSyncApi().getPending(limit);
}

async function getFailedSyncItems(
  limit = 100
): Promise<SyncQueueItem[]> {
  return getSyncApi().getFailed(limit);
}

async function getAllSyncItems(
  limit = 200
): Promise<SyncQueueItem[]> {
  return getSyncApi().getAll(limit);
}

async function getSyncItemById(
  queueId: string
): Promise<SyncQueueItem | null> {
  return getSyncApi().getById(queueId);
}

async function getSyncItemsByEntity(
  entityType: SyncEntityType,
  entityId: string
): Promise<SyncQueueItem[]> {
  return getSyncApi().getByEntity(
    entityType,
    entityId
  );
}

async function getSyncSummary(): Promise<SyncSummary> {
  return getSyncApi().getSummary();
}

async function markSyncItemSynced(
  queueId: string,
  serverId: string | null = null
): Promise<SyncQueueItem | null> {
  return getSyncApi().markSynced(
    queueId,
    serverId
  );
}

async function markSyncItemFailed(
  queueId: string,
  errorMessage: string
): Promise<SyncQueueItem | null> {
  return getSyncApi().markFailed(
    queueId,
    errorMessage
  );
}

async function retrySyncItem(
  queueId: string
): Promise<SyncQueueItem | null> {
  return getSyncApi().retry(queueId);
}

async function retryAllFailed(
  limit = 100
): Promise<number> {
  return getSyncApi().retryAll(limit);
}

const syncService = {
  getPendingSyncItems,
  getFailedSyncItems,
  getAllSyncItems,
  getSyncItemById,
  getSyncItemsByEntity,
  getSyncSummary,
  markSyncItemSynced,
  markSyncItemFailed,
  retrySyncItem,
  retryAllFailed,
};

export default syncService;