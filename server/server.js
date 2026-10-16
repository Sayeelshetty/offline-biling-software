require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  testDatabaseConnection,
  query,
} = require("./db/database");

const syncRoutes = require("./routes/sync.routes");

const backupRoutes = require("./routes/backup.routes");

const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Offline Billing Cloud Server is running.",
  });
});

app.get("/health", async (_req, res) => {
  try {
    const database = await testDatabaseConnection();

    res.json({
      success: true,
      server: "ONLINE",
      database: "CONNECTED",
      databaseTime: database.now,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(500).json({
      success: false,
      server: "ONLINE",
      database: "DISCONNECTED",
      error: error.message,
    });
  }
});

app.use("/api/sync", syncRoutes);

app.use("/api/backup", backupRoutes);




app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

async function initializeCloudDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS sync_records (
      id BIGSERIAL PRIMARY KEY,
      server_id UUID NOT NULL UNIQUE,
      queue_id TEXT NOT NULL UNIQUE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload JSONB NOT NULL,
      device_id TEXT NOT NULL,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sync_records_entity
    ON sync_records(entity_type, entity_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sync_records_device
    ON sync_records(device_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sync_records_synced_at
    ON sync_records(synced_at)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sync_entities (
      server_id UUID NOT NULL UNIQUE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      device_id TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      queue_id TEXT NOT NULL,
      PRIMARY KEY (entity_type, entity_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sync_entities_updated_at
    ON sync_entities(updated_at)
  `);

  await query(`
    INSERT INTO sync_entities (
      server_id,
      entity_type,
      entity_id,
      payload,
      device_id,
      updated_at,
      queue_id
    )
    SELECT DISTINCT ON (entity_type, entity_id)
      server_id,
      entity_type,
      entity_id,
      CASE
        WHEN entity_type = 'PRODUCT'
        THEN payload - 'currentStock' - 'serverId' - 'syncStatus'
        ELSE payload - 'serverId' - 'syncStatus'
      END,
      device_id,
      (payload->>'updatedAt')::timestamptz,
      queue_id
    FROM sync_records
    WHERE entity_type IN ('PRODUCT', 'CATEGORY', 'CUSTOMER')
      AND NULLIF(payload->>'updatedAt', '') IS NOT NULL
    ORDER BY
      entity_type,
      entity_id,
      (payload->>'updatedAt')::timestamptz DESC,
      device_id COLLATE "C" DESC,
      queue_id COLLATE "C" DESC
    ON CONFLICT (entity_type, entity_id)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      device_id = EXCLUDED.device_id,
      updated_at = EXCLUDED.updated_at,
      queue_id = EXCLUDED.queue_id
    WHERE
      (
        EXCLUDED.updated_at,
        EXCLUDED.device_id COLLATE "C",
        EXCLUDED.queue_id COLLATE "C"
      ) >
      (
        sync_entities.updated_at,
        sync_entities.device_id COLLATE "C",
        sync_entities.queue_id COLLATE "C"
      )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS cloud_backups (
      id BIGSERIAL PRIMARY KEY,
      backup_id UUID NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      device_id TEXT NOT NULL,
      file_data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function startServer() {
  try {
    await testDatabaseConnection();

    console.log("PostgreSQL connected successfully.");

    await initializeCloudDatabase();

    app.listen(PORT, () => {
      console.log(
        `Cloud server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Unable to start cloud server."
    );

    console.error(error);
    process.exit(1);
  }
}

startServer();
