const express = require("express");
const crypto = require("crypto");

const { query } = require("../db/database");

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

  const client = await require("../db/database").pool.connect();

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

      if (typeof payload !== "object" || payload === null) {
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

      const existing = await client.query(
        `
        SELECT server_id
        FROM sync_records
        WHERE queue_id = $1
        LIMIT 1
        `,
        [queueId]
      );

      if (existing.rows.length > 0) {
        const serverId = existing.rows[0].server_id;

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