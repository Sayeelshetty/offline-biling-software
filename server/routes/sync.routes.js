const express = require("express");
const crypto = require("crypto");

const { query, pool } = require("../db/database");

const router = express.Router();

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

function generateServerId() {
  return crypto.randomUUID();
}

/**
 * Extract transactionId from a sync payload.
 *
 * Invoice:
 * payload.invoice.transactionId
 *
 * Payment / stock movement:
 * payload.transactionId
 */
function getTransactionId(payload) {
  if (
    payload &&
    typeof payload.transactionId === "string" &&
    payload.transactionId.trim()
  ) {
    return payload.transactionId.trim();
  }

  if (
    payload &&
    payload.invoice &&
    typeof payload.invoice.transactionId === "string" &&
    payload.invoice.transactionId.trim()
  ) {
    return payload.invoice.transactionId.trim();
  }

  return null;
}

/**
 * Find an existing sync record.
 *
 * Duplicate protection:
 * 1. Same queueId
 * 2. Same transactionId for the same entity type + operation
 *
 * The transactionId comparison is done in JavaScript after reading
 * the JSON payload from PostgreSQL. This avoids relying on a particular
 * PostgreSQL JSON/JSONB expression and matches the actual payload shape
 * used by this project.
 */
async function findExistingSyncRecord(client, {
  queueId,
  entityType,
  operation,
  transactionId,
}) {
  // First: exact queue item retry
  const queueResult = await client.query(
    `
    SELECT server_id, payload
    FROM sync_records
    WHERE queue_id = $1
    LIMIT 1
    `,
    [queueId]
  );

  if (queueResult.rows.length > 0) {
    return queueResult.rows[0];
  }

  // No transaction ID means queueId is the only deduplication key.
  if (!transactionId) {
    return null;
  }

  // Find previous records for the same entity type + operation.
  const transactionResult = await client.query(
    `
    SELECT server_id, payload
    FROM sync_records
    WHERE entity_type = $1
      AND operation = $2
    ORDER BY created_at DESC
    `,
    [entityType, operation]
  );

  for (const row of transactionResult.rows) {
    let storedPayload = row.payload;

    try {
      if (typeof storedPayload === "string") {
        storedPayload = JSON.parse(storedPayload);
      }
    } catch (error) {
      console.warn(
        "Unable to parse stored sync payload:",
        error.message
      );
      continue;
    }

    const storedTransactionId = getTransactionId(storedPayload);

    if (
      storedTransactionId &&
      storedTransactionId === transactionId
    ) {
      return row;
    }
  }

  return null;
}

router.get("/health", async (_req, res) => {
  res.json({
    success: true,
    service: "cloud-sync",
    timestamp: new Date().toISOString(),
  });
});

router.post("/push", async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({
      success: false,
      message: "items must be an array.",
    });
  }

  if (items.length === 0) {
    return res.json({
      success: true,
      processed: 0,
      synced: 0,
      failed: 0,
      results: [],
    });
  }

  const client = await pool.connect();

  const results = [];
  let synced = 0;
  let failed = 0;

  try {
    await client.query("BEGIN");

    for (const item of items) {
      const {
        queueId,
        entityType,
        entityId,
        operation,
        payload,
        deviceId,
      } = item;

      if (!queueId) {
        results.push({
          queueId: null,
          entityType: entityType || null,
          entityId: entityId || null,
          status: "FAILED",
          serverId: null,
          error: "queueId is required.",
        });

        failed++;
        continue;
      }

      if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
        results.push({
          queueId,
          entityType,
          entityId,
          status: "FAILED",
          serverId: null,
          error: `Unsupported entity type: ${entityType}`,
        });

        failed++;
        continue;
      }

      if (!ALLOWED_OPERATIONS.includes(operation)) {
        results.push({
          queueId,
          entityType,
          entityId,
          status: "FAILED",
          serverId: null,
          error: `Unsupported operation: ${operation}`,
        });

        failed++;
        continue;
      }

      if (!entityId) {
        results.push({
          queueId,
          entityType,
          entityId: null,
          status: "FAILED",
          serverId: null,
          error: "entityId is required.",
        });

        failed++;
        continue;
      }

      if (!deviceId) {
        results.push({
          queueId,
          entityType,
          entityId,
          status: "FAILED",
          serverId: null,
          error: "deviceId is required.",
        });

        failed++;
        continue;
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        results.push({
          queueId,
          entityType,
          entityId,
          status: "FAILED",
          serverId: null,
          error: "payload must be an object.",
        });

        failed++;
        continue;
      }

      const transactionId = getTransactionId(payload);

      /*
       * Lock the logical transaction so concurrent requests with the
       * same transactionId cannot both insert a new record.
       *
       * queueId is also included so different business transactions
       * do not share the same advisory lock.
       */
      if (transactionId) {
        await client.query(
          `
          SELECT pg_advisory_xact_lock(
            hashtextextended($1, 0)
          )
          `,
          [
            `${entityType}:${operation}:${transactionId}`,
          ]
        );
      }

      const existing = await findExistingSyncRecord(client, {
        queueId,
        entityType,
        operation,
        transactionId,
      });

      if (existing) {
        const serverId = existing.server_id;

        results.push({
          queueId,
          entityType,
          entityId,
          status: "SYNCED",
          serverId,
          error: null,
        });

        synced++;
        continue;
      }

      const serverId = generateServerId();

      await client.query(
        `
        INSERT INTO sync_records (
          server_id,
          queue_id,
          entity_type,
          entity_id,
          operation,
          payload,
          device_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          serverId,
          queueId,
          entityType,
          entityId,
          operation,
          JSON.stringify(payload),
          deviceId,
        ]
      );

      results.push({
        queueId,
        entityType,
        entityId,
        status: "SYNCED",
        serverId,
        error: null,
      });

      synced++;
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      processed: items.length,
      synced,
      failed,
      results,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Cloud sync push failed:", error);

    return res.status(500).json({
      success: false,
      message: "Cloud synchronization failed.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

router.get("/records", async (req, res) => {
  try {
    const limit = Math.min(
      Number(req.query.limit) || 100,
      500
    );

    const result = await query(
      `
      SELECT
        server_id,
        queue_id,
        entity_type,
        entity_id,
        operation,
        payload,
        device_id,
        synced_at,
        created_at,
        updated_at
      FROM sync_records
      ORDER BY synced_at DESC
      LIMIT $1
      `,
      [limit]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      records: result.rows,
    });
  } catch (error) {
    console.error("Failed to get sync records:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve sync records.",
      error: error.message,
    });
  }
});

module.exports = router;