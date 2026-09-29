const fs = require("fs");
const path = require("path");

const { getDatabase } = require("./connection.cjs");

/*
|--------------------------------------------------------------------------
| Database Migration Helpers
|--------------------------------------------------------------------------
*/

function getTableColumns(database, tableName) {
  return database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all();
}

function columnExists(database, tableName, columnName) {
  const columns = getTableColumns(
    database,
    tableName
  );

  return columns.some(
    (column) => column.name === columnName
  );
}

/*
|--------------------------------------------------------------------------
| Run Database Migrations
|--------------------------------------------------------------------------
*/

function runMigrations() {
  const database = getDatabase();

  const schemaPath = path.join(
    __dirname,
    "schema.sql"
  );

  if (!fs.existsSync(schemaPath)) {
    throw new Error(
      `Database schema not found: ${schemaPath}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Initialize Base Schema
  |--------------------------------------------------------------------------
  */

  const schema = fs.readFileSync(
    schemaPath,
    "utf8"
  );

  database.exec(schema);

  /*
  |--------------------------------------------------------------------------
  | Categories Migration
  |--------------------------------------------------------------------------
  |
  | Older versions of the categories table did not
  | contain description or status.
  |
  | Add only the missing columns so existing data
  | remains intact.
  |
  */

  if (
    !columnExists(
      database,
      "categories",
      "description"
    )
  ) {
    database.exec(`
      ALTER TABLE categories
      ADD COLUMN description TEXT NOT NULL DEFAULT ''
    `);

    console.log(
      "Migration applied: categories.description column added."
    );
  }

  if (
    !columnExists(
      database,
      "categories",
      "status"
    )
  ) {
    database.exec(`
      ALTER TABLE categories
      ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'INACTIVE'))
    `);

    console.log(
      "Migration applied: categories.status column added."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Migration Complete
  |--------------------------------------------------------------------------
  */

  console.log(
    "SQLite database schema initialized successfully."
  );
}

module.exports = {
  runMigrations,
};