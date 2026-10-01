export type SyncStatus =
  | "PENDING"
  | "SYNCED"
  | "FAILED";

export type SyncEntityType =
  | "PRODUCT"
  | "CATEGORY"
  | "CUSTOMER"
  | "INVOICE"
  | "PAYMENT"
  | "STOCK_MOVEMENT";

export type SyncOperation =
  | "CREATE"
  | "UPDATE"
  | "DELETE";

export type SyncQueueItem = {
  id: string;

  entityType: SyncEntityType;

  entityId: string;

  operation: SyncOperation;

  payload: string;

  status: SyncStatus;

  deviceId: string;

  createdAt: string;

  updatedAt: string;
};

export type SyncResultStatus =
  | "SYNCED"
  | "FAILED";

export type SyncResult = {
  queueId: string;

  entityType: SyncEntityType;

  entityId: string;

  status: SyncResultStatus;

  serverId: string | null;

  error: string | null;
};

export type SyncBatchResult = {
  processed: number;

  synced: number;

  failed: number;

  results: SyncResult[];
};

export type SyncSummary = {
  pending: number;

  synced: number;

  failed: number;

  total: number;

  lastSyncedAt: string | null;

  deviceId: string;
};

export type SyncConnectionStatus =
  | "ONLINE"
  | "OFFLINE";

export type SyncEngineStatus = {
  connection: SyncConnectionStatus;

  syncing: boolean;

  pending: number;

  failed: number;

  lastSyncedAt: string | null;

  deviceId: string;
};

export type SyncOptions = {
  retryFailed?: boolean;

  limit?: number;
};