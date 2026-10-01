require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  testDatabaseConnection,
  query,
} = require("./db/database");

const syncRoutes = require("./routes/sync.routes");

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

app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

async function startServer() {
  try {
    await testDatabaseConnection();

    console.log("PostgreSQL connected successfully.");

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