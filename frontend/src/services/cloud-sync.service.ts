import type {
  SyncBatchResult,
  SyncQueueItem,
} from "../../../shared/types/sync";

const CLOUD_API_URL = (
  import.meta.env.VITE_CLOUD_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

function parsePayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("Sync payload must be a JSON object.");
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Invalid sync payload: ${
        error instanceof Error
          ? error.message
          : "Unknown parsing error"
      }`
    );
  }
}

function prepareSyncItem(item: SyncQueueItem) {
  return {
    queueId: item.id,
    entityType: item.entityType,
    entityId: item.entityId,
    operation: item.operation,
    payload: parsePayload(item.payload),
    deviceId: item.deviceId,
  };
}

async function pushSyncItems(
  items: SyncQueueItem[]
): Promise<SyncBatchResult> {
  if (items.length === 0) {
    return {
      processed: 0,
      synced: 0,
      failed: 0,
      results: [],
    };
  }

  const response = await fetch(
    `${CLOUD_API_URL}/api/sync/push`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.map(prepareSyncItem),
      }),
    }
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Cloud server returned HTTP ${response.status} with an invalid response.`
    );
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : `Cloud server returned HTTP ${response.status}.`;

    throw new Error(message);
  }

  return data as SyncBatchResult;
}

async function healthCheck() {
  const response = await fetch(
    `${CLOUD_API_URL}/api/sync/health`
  );

  if (!response.ok) {
    throw new Error(
      `Cloud sync health check failed with HTTP ${response.status}.`
    );
  }

  return response.json();
}

const cloudSyncService = {
  pushSyncItems,
  healthCheck,
};

export default cloudSyncService;