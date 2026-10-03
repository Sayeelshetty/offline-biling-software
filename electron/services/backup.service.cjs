const fs = require("fs");
const path = require("path");

/**
 * Creates a safe SQLite backup using
 * the active better-sqlite3 connection.
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

/**
 * Checks whether a file is a SQLite database.
 */
function isSQLiteDatabase(
  filePath
) {
  if (
    !filePath ||
    !fs.existsSync(filePath)
  ) {
    return false;
  }

  const stats =
    fs.statSync(filePath);

  if (
    !stats.isFile() ||
    stats.size < 16
  ) {
    return false;
  }

  const fileHandle =
    fs.openSync(
      filePath,
      "r"
    );

  try {
    const header =
      Buffer.alloc(16);

    fs.readSync(
      fileHandle,
      header,
      0,
      16,
      0
    );

    return (
      header.toString() ===
      "SQLite format 3\u0000"
    );
  } finally {
    fs.closeSync(
      fileHandle
    );
  }
}

/**
 * Restores a SQLite database from
 * a previously created backup file.
 */
function restoreDatabase(
  sourcePath,
  databasePath
) {
  const source =
    path.resolve(
      String(sourcePath || "")
    );

  const destination =
    path.resolve(
      String(databasePath || "")
    );

  if (
    !source ||
    !fs.existsSync(source)
  ) {
    throw new Error(
      "Backup file does not exist."
    );
  }

  if (
    !isSQLiteDatabase(source)
  ) {
    throw new Error(
      "The selected file is not a valid SQLite database backup."
    );
  }

  if (source === destination) {
    throw new Error(
      "The selected backup cannot be the active database."
    );
  }

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

  const tempPath =
    `${destination}.restore-${Date.now()}.tmp`;

  fs.copyFileSync(
    source,
    tempPath
  );

  const tempStats =
    fs.statSync(tempPath);

  if (tempStats.size <= 0) {
    try {
      fs.unlinkSync(
        tempPath
      );
    } catch {
      // Ignore cleanup errors.
    }

    throw new Error(
      "The restore file is empty."
    );
  }

  fs.copyFileSync(
    tempPath,
    destination
  );

  try {
    fs.unlinkSync(
      tempPath
    );
  } catch {
    // Temporary file cleanup is best effort.
  }

  return destination;
}

module.exports = {
  backupDatabase,
  restoreDatabase,
};