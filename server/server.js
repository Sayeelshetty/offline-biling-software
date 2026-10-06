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

async function startServer() {
  try {
    await testDatabaseConnection();

    console.log("PostgreSQL connected successfully.");

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