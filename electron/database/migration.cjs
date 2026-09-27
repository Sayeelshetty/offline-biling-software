const fs = require("fs");
const path = require("path");

const { getDatabase } = require("./connection.cjs");

/**
 * Initializes the local SQLite database.
 *
 * The schema.sql file contains all CREATE TABLE
 * and CREATE INDEX statements required by the application.
 */
function runMigrations() {
  const database = getDatabase();

  const schemaPath = path.join(__dirname, "schema.sql");

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Database schema not found: ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, "utf8");

  database.exec(schema);

  console.log("SQLite database schema initialized successfully.");
}

module.exports = {
  runMigrations,
};