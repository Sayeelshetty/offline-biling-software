const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

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
    typeof database.backup !== "function"
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
    !fs.existsSync(destinationDirectory)
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

  if (!fs.existsSync(destination)) {
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

/*
 * Restores the contents of a SQLite backup
 * into the currently open database connection.
 *
 * The target connection remains open, so
 * repositories that already hold the connection
 * continue to work after the restore.
 */
function restoreDatabase(
  sourcePath,
  targetDatabase
) {
  if (
    !sourcePath ||
    !fs.existsSync(sourcePath)
  ) {
    throw new Error(
      "Backup file does not exist."
    );
  }

  if (
    !isSQLiteDatabase(sourcePath)
  ) {
    throw new Error(
      "The selected file is not a valid SQLite database backup."
    );
  }

  if (!targetDatabase) {
    throw new Error(
      "SQLite database connection is not available."
    );
  }

  const source =
    new Database(
      path.resolve(sourcePath),
      {
        readonly: true,
      }
    );

  try {
    const tables =
      source
        .prepare(`
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `)
        .all();

    const sourceTableInfo =
      new Map();

    for (const table of tables) {
      const columns =
        source
          .prepare(
            `PRAGMA table_info("${table.name}")`
          )
          .all();

      sourceTableInfo.set(
        table.name,
        columns
      );
    }

    targetDatabase.pragma(
      "foreign_keys = OFF"
    );

    const restoreTransaction =
      targetDatabase.transaction(() => {
        /*
         * Remove existing application data.
         */
        for (
          const table of tables
        ) {
          targetDatabase
            .prepare(
              `DELETE FROM "${table.name}"`
            )
            .run();
        }

        /*
         * Insert backup data.
         */
        for (
          const table of tables
        ) {
          const columns =
            sourceTableInfo.get(
              table.name
            ) || [];

          if (
            columns.length === 0
          ) {
            continue;
          }

          const columnNames =
            columns.map(
              (column) =>
                `"${column.name}"`
            );

          const placeholders =
            columns.map(
              () => "?"
            );

          const insertStatement =
            targetDatabase.prepare(`
              INSERT INTO "${table.name}" (
                ${columnNames.join(", ")}
              )
              VALUES (
                ${placeholders.join(", ")}
              )
            `);

          const rows =
            source
              .prepare(
                `SELECT * FROM "${table.name}"`
              )
              .all();

          for (
            const row of rows
          ) {
            const values =
              columns.map(
                (column) =>
                  row[column.name]
              );

            insertStatement.run(
              ...values
            );
          }
        }
      });

    restoreTransaction();

    targetDatabase.pragma(
      "foreign_keys = ON"
    );

    /*
     * Make sure the restored database
     * has no foreign-key violations.
     */
    const foreignKeyProblems =
      targetDatabase
        .prepare(
          "PRAGMA foreign_key_check"
        )
        .all();

    if (
      foreignKeyProblems.length > 0
    ) {
      throw new Error(
        "Restore completed with foreign-key integrity errors."
      );
    }

    return true;
  } finally {
    source.close();

    try {
      targetDatabase.pragma(
        "foreign_keys = ON"
      );
    } catch {
      // Best effort.
    }
  }
}

module.exports = {
  backupDatabase,
  restoreDatabase,
};