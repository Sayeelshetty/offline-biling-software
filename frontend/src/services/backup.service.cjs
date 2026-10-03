const fs = require("fs");
const path = require("path");

/**
 * Creates a safe SQLite backup using the active
 * better-sqlite3 database connection.
 *
 * The database remains available to the application
 * while the backup is being created.
 */
async function backupDatabase(
  database,
  destinationPath
) {
  if (!database) {
    throw new Error(
      "SQLite database connection is not available."
    );
  }

  if (
    typeof database.backup !==
    "function"
  ) {
    throw new Error(
      "SQLite backup functionality is not available."
    );
  }

  if (
    !destinationPath ||
    !String(destinationPath).trim()
  ) {
    throw new Error(
      "Backup destination path is required."
    );
  }

  const destination =
    path.resolve(
      String(destinationPath)
    );

  const destinationDirectory =
    path.dirname(destination);

  if (
    !fs.existsSync(
      destinationDirectory
    )
  ) {
    fs.mkdirSync(
      destinationDirectory,
      {
        recursive: true,
      }
    );
  }

  await database.backup(
    destination
  );

  if (
    !fs.existsSync(destination)
  ) {
    throw new Error(
      "Backup file was not created."
    );
  }

  const fileStats =
    fs.statSync(destination);

  if (fileStats.size <= 0) {
    throw new Error(
      "Backup file is empty."
    );
  }

  return destination;
}

module.exports = {
  backupDatabase,
};