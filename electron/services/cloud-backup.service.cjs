const fs = require("fs");
const path = require("path");

const CLOUD_API_URL = (
  process.env.CLOUD_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

async function uploadDatabaseBackup(
  filePath,
  deviceId
) {
  if (
    !filePath ||
    !String(filePath).trim()
  ) {
    throw new Error(
      "Cloud backup file path is required."
    );
  }

  const resolvedPath =
    path.resolve(
      String(filePath)
    );

  if (
    !fs.existsSync(resolvedPath)
  ) {
    throw new Error(
      "Cloud backup file does not exist."
    );
  }

  const fileStats =
    fs.statSync(
      resolvedPath
    );

  if (
    !fileStats.isFile() ||
    fileStats.size <= 0
  ) {
    throw new Error(
      "Cloud backup file is empty or invalid."
    );
  }

  const fileBuffer =
    fs.readFileSync(
      resolvedPath
    );

  const fileName =
    path.basename(
      resolvedPath
    );

  const response =
    await fetch(
      `${CLOUD_API_URL}/api/backup/upload`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/octet-stream",

          "X-Backup-File-Name":
            fileName,

          "X-Device-Id":
            String(
              deviceId ||
                "ELECTRON-DESKTOP"
            ),
        },
        body: fileBuffer,
      }
    );

  let data;

  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      `Cloud backup server returned HTTP ${response.status} with an invalid response.`
    );
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.message ===
        "string"
        ? data.message
        : `Cloud backup failed with HTTP ${response.status}.`
    );
  }

  if (
    !data ||
    data.success !== true
  ) {
    throw new Error(
      typeof data?.message ===
        "string"
        ? data.message
        : "Cloud backup was not completed."
    );
  }

  return data;
}

module.exports = {
  uploadDatabaseBackup,
};