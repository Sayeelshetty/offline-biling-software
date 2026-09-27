const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let database = null;

/**
 * Returns the directory where the application's
 * local database will be stored.
 */
function getDatabaseDirectory() {
  const databaseDirectory = path.join(
    app.getPath("userData"),
    "database"
  );

  if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, {
      recursive: true,
    });
  }

  return databaseDirectory;
}

/**
 * Returns the complete path of the SQLite database file.
 */
function getDatabasePath() {
  return path.join(
    getDatabaseDirectory(),
    "offline-biling-software.db"
  );
}

/**
 * Creates and returns the SQLite database connection.
 *
 * The same database connection is reused during
 * the lifetime of the Electron application.
 */
function getDatabase() {
  if (database) {
    return database;
  }

  const databasePath = getDatabasePath();

  database = new Database(databasePath);

  // WAL improves read/write concurrency and reliability.
  database.pragma("journal_mode = WAL");

  // Protect relationships between tables.
  database.pragma("foreign_keys = ON");

  console.log("SQLite connected:");
  console.log(databasePath);

  return database;
}

/**
 * Closes the database safely when the application exits.
 */
function closeDatabase() {
  if (database) {
    database.close();
    database = null;

    console.log("SQLite database connection closed.");
  }
}

module.exports = {
  getDatabase,
  getDatabasePath,
  closeDatabase,
};