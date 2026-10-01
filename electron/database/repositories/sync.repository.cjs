const { getDatabase } = require("../connection.cjs");

const db = getDatabase();

const ALLOWED_ENTITY_TYPES = [
  "PRODUCT",
  "CATEGORY",
  "CUSTOMER",
  "INVOICE",
  "PAYMENT",
  "STOCK_MOVEMENT",
];

const ALLOWED_OPERATIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
];

const ALLOWED_STATUSES = [
  "PENDING",
  "SYNCED",
  "FAILED",
];

function mapSyncQueueRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,

    entityType: row.entity_type,

    entityId: row.entity_id,

    operation: row.operation,

    payload: row.payload,

    status: row.status,

    deviceId: row.device_id,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  };
}

function validateEntityType(entityType) {
  if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
    throw new Error(
      `Invalid sync entity type. Allowed values: ${ALLOWED_ENTITY_TYPES.join(
        ", "
      )}.`
    );
  }
}

function validateOperation(operation) {
  if (!ALLOWED_OPERATIONS.includes(operation)) {
    throw new Error(
      `Invalid sync operation. Allowed values: ${ALLOWED_OPERATIONS.join(
        ", "
      )}.`
    );
  }
}

function validateStatus(status) {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error(
      `Invalid sync status. Allowed values: ${ALLOWED_STATUSES.join(
        ", "
      )}.`
    );
  }
}

function validateLimit(limit) {
  const normalizedLimit = Number(limit);

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit <= 0
  ) {
    return 100;
  }

  return Math.min(normalizedLimit, 1000);
}

function getPendingSyncItems(limit = 100) {
  const normalizedLimit =
    validateLimit(limit);

  const rows = db
    .prepare(
      `
      SELECT
        id,
        entity_type,
        entity_id,
        operation,
        payload,
        status,
        device_id,
        created_at,
        updated_at
      FROM sync_queue
      WHERE status = 'PENDING'
      ORDER BY
        datetime(created_at) ASC,
        id ASC
      LIMIT ?
      `
    )
    .all(normalizedLimit);

  return rows.map(mapSyncQueueRow);
}

function getFailedSyncItems(limit = 100) {
  const normalizedLimit =
    validateLimit(limit);

  const rows = db
    .prepare(
      `
      SELECT
        id,
        entity_type,
        entity_id,
        operation,
        payload,
        status,
        device_id,
        created_at,
        updated_at
      FROM sync_queue
      WHERE status = 'FAILED'
      ORDER BY
        datetime(updated_at) ASC,
        id ASC
      LIMIT ?
      `
    )
    .all(normalizedLimit);

  return rows.map(mapSyncQueueRow);
}

function getSyncItemById(queueId) {
  if (
    typeof queueId !== "string" ||
    !queueId.trim()
  ) {
    throw new Error(
      "Sync queue ID is required."
    );
  }

  const row = db
    .prepare(
      `
      SELECT
        id,
        entity_type,
        entity_id,
        operation,
        payload,
        status,
        device_id,
        created_at,
        updated_at
      FROM sync_queue
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(queueId);

  return mapSyncQueueRow(row);
}

function getSyncItemsByEntity(
  entityType,
  entityId
) {
  validateEntityType(entityType);

  if (
    typeof entityId !== "string" ||
    !entityId.trim()
  ) {
    throw new Error(
      "Entity ID is required."
    );
  }

  const rows = db
    .prepare(
      `
      SELECT
        id,
        entity_type,
        entity_id,
        operation,
        payload,
        status,
        device_id,
        created_at,
        updated_at
      FROM sync_queue
      WHERE
        entity_type = ?
        AND entity_id = ?
      ORDER BY
        datetime(created_at) ASC,
        id ASC
      `
    )
    .all(
      entityType,
      entityId
    );

  return rows.map(mapSyncQueueRow);
}

function markSyncItemSynced(
  queueId,
  serverId = null
) {
  const item =
    getSyncItemById(queueId);

  if (!item) {
    throw new Error(
      "Sync queue item not found."
    );
  }

  const now =
    new Date().toISOString();

  const transaction = db.transaction(() => {
    const queueUpdate = db
      .prepare(
        `
        UPDATE sync_queue
        SET
          status = 'SYNCED',
          updated_at = ?
        WHERE id = ?
        `
      )
      .run(
        now,
        queueId
      );

    if (queueUpdate.changes !== 1) {
      throw new Error(
        "Sync queue item could not be marked as synced."
      );
    }

    if (
      serverId !== null &&
      typeof serverId === "string" &&
      serverId.trim()
    ) {
      updateEntitySyncMetadata(
        item.entityType,
        item.entityId,
        serverId.trim(),
        "SYNCED",
        now
      );
    } else {
      updateEntitySyncStatusOnly(
        item.entityType,
        item.entityId,
        "SYNCED",
        now
      );
    }

    return getSyncItemById(
      queueId
    );
  });

  return transaction();
}

function markSyncItemFailed(
  queueId,
  errorMessage
) {
  const item =
    getSyncItemById(queueId);

  if (!item) {
    throw new Error(
      "Sync queue item not found."
    );
  }

  const now =
    new Date().toISOString();

  const message =
    String(
      errorMessage ?? "Sync failed."
    ).trim() ||
    "Sync failed.";

  const transaction = db.transaction(() => {
    const queueUpdate = db
      .prepare(
        `
        UPDATE sync_queue
        SET
          status = 'FAILED',
          updated_at = ?
        WHERE id = ?
        `
      )
      .run(
        now,
        queueId
      );

    if (queueUpdate.changes !== 1) {
      throw new Error(
        "Sync queue item could not be marked as failed."
      );
    }

    updateEntitySyncStatusOnly(
      item.entityType,
      item.entityId,
      "FAILED",
      now
    );

    return getSyncItemById(
      queueId
    );
  });

  return transaction();
}

function retrySyncItem(queueId) {
  const item =
    getSyncItemById(queueId);

  if (!item) {
    throw new Error(
      "Sync queue item not found."
    );
  }

  const now =
    new Date().toISOString();

  const result = db
    .prepare(
      `
      UPDATE sync_queue
      SET
        status = 'PENDING',
        updated_at = ?
      WHERE id = ?
      `
    )
    .run(
      now,
      queueId
    );

  if (result.changes !== 1) {
    throw new Error(
      "Sync queue item could not be queued for retry."
    );
  }

  updateEntitySyncStatusOnly(
    item.entityType,
    item.entityId,
    "PENDING",
    now
  );

  return getSyncItemById(
    queueId
  );
}

function retryAllFailed(limit = 100) {
  const failedItems =
    getFailedSyncItems(limit);

  if (failedItems.length === 0) {
    return 0;
  }

  const now =
    new Date().toISOString();

  const transaction = db.transaction(
    () => {
      const updateQueue =
        db.prepare(
          `
          UPDATE sync_queue
          SET
            status = 'PENDING',
            updated_at = ?
          WHERE
            id = ?
            AND status = 'FAILED'
          `
        );

      let retried = 0;

      for (const item of failedItems) {
        const result =
          updateQueue.run(
            now,
            item.id
          );

        if (result.changes === 1) {
          updateEntitySyncStatusOnly(
            item.entityType,
            item.entityId,
            "PENDING",
            now
          );

          retried += 1;
        }
      }

      return retried;
    }
  );

  return transaction();
}

function getSyncSummary() {
  const row = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'PENDING'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS pending,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'SYNCED'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS synced,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'FAILED'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS failed,

        MAX(
          CASE
            WHEN status = 'SYNCED'
            THEN updated_at
            ELSE NULL
          END
        ) AS last_synced_at

      FROM sync_queue
      `
    )
    .get();

  return {
    total: Number(
      row.total ?? 0
    ),

    pending: Number(
      row.pending ?? 0
    ),

    synced: Number(
      row.synced ?? 0
    ),

    failed: Number(
      row.failed ?? 0
    ),

    lastSyncedAt:
      row.last_synced_at ??
      null,
  };
}

function updateEntitySyncStatusOnly(
  entityType,
  entityId,
  syncStatus,
  updatedAt
) {
  validateEntityType(entityType);
  validateStatus(syncStatus);

  const tableMap = {
    PRODUCT: "products",
    CATEGORY: "categories",
    CUSTOMER: "customers",
    INVOICE: "invoices",
    PAYMENT: "payments",
    STOCK_MOVEMENT:
      "stock_movements",
  };

  const table =
    tableMap[entityType];

  if (!table) {
    throw new Error(
      `Unsupported sync entity type: ${entityType}`
    );
  }

  db.prepare(
    `
    UPDATE ${table}
    SET
      sync_status = ?,
      updated_at = ?
    WHERE id = ?
    `
  ).run(
    syncStatus,
    updatedAt,
    entityId
  );
}

function updateEntitySyncMetadata(
  entityType,
  entityId,
  serverId,
  syncStatus,
  updatedAt
) {
  validateEntityType(entityType);
  validateStatus(syncStatus);

  const tableMap = {
    PRODUCT: "products",
    CATEGORY: "categories",
    CUSTOMER: "customers",
    INVOICE: "invoices",
    PAYMENT: "payments",
    STOCK_MOVEMENT:
      "stock_movements",
  };

  const table =
    tableMap[entityType];

  if (!table) {
    throw new Error(
      `Unsupported sync entity type: ${entityType}`
    );
  }

  db.prepare(
    `
    UPDATE ${table}
    SET
      server_id = ?,
      sync_status = ?,
      updated_at = ?
    WHERE id = ?
    `
  ).run(
    serverId,
    syncStatus,
    updatedAt,
    entityId
  );
}

function validateSyncOperation(
  operation
) {
  validateOperation(operation);
}

function getAllSyncItems(limit = 200) {
  const normalizedLimit =
    validateLimit(limit);

  const rows = db
    .prepare(
      `
      SELECT
        id,
        entity_type,
        entity_id,
        operation,
        payload,
        status,
        device_id,
        created_at,
        updated_at
      FROM sync_queue
      ORDER BY
        datetime(created_at) DESC,
        id DESC
      LIMIT ?
      `
    )
    .all(normalizedLimit);

  return rows.map(mapSyncQueueRow);
}

module.exports = {
  getPendingSyncItems,
  getFailedSyncItems,
  getSyncItemById,
  getSyncItemsByEntity,
  getAllSyncItems,
  markSyncItemSynced,
  markSyncItemFailed,
  retrySyncItem,
  retryAllFailed,
  getSyncSummary,
  validateSyncOperation,
};