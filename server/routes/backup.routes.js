const express = require("express");
const crypto = require("crypto");

const { query } = require("../db/database");

const router = express.Router();

const SQLITE_HEADER = Buffer.from(
  "SQLite format 3\u0000"
);

function getSafeFileName(
  value
) {
  const fallback =
    `offline-billing-backup-${Date.now()}.db`;

  const rawName =
    String(value || fallback)
      .trim();

  const normalized =
    rawName.replace(
      /\\/g,
      "/"
    );

  const fileName =
    normalized
      .split("/")
      .pop();

  if (!fileName) {
    return fallback;
  }

  return fileName.slice(
    0,
    255
  );
}

router.post(
  "/upload",
  express.raw({
    type:
      "application/octet-stream",
    limit: "100mb",
  }),
  async (req, res) => {
    try {
      const backupBuffer =
        req.body;

      if (
        !Buffer.isBuffer(
          backupBuffer
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Backup data must be sent as a binary file.",
        });
      }

      if (
        backupBuffer.length <
        SQLITE_HEADER.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Backup file is too small to be a valid SQLite database.",
        });
      }

      const header =
        backupBuffer.subarray(
          0,
          SQLITE_HEADER.length
        );

      if (
        !header.equals(
          SQLITE_HEADER
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The uploaded file is not a valid SQLite database backup.",
        });
      }

      const backupId =
        crypto.randomUUID();

      const fileName =
        getSafeFileName(
          req.headers[
            "x-backup-file-name"
          ]
        );

      const deviceId =
        String(
          req.headers[
            "x-device-id"
          ] || "UNKNOWN"
        )
          .trim()
          .slice(0, 255) ||
        "UNKNOWN";

      const result =
        await query(
          `
            INSERT INTO cloud_backups (
              backup_id,
              file_name,
              file_size,
              device_id,
              file_data
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5
            )
            RETURNING
              backup_id,
              file_name,
              file_size,
              device_id,
              created_at
          `,
          [
            backupId,
            fileName,
            backupBuffer.length,
            deviceId,
            backupBuffer,
          ]
        );

      const backup =
        result.rows[0];

      return res.json({
        success: true,
        message:
          "Cloud backup uploaded successfully.",
        backup: {
          backupId:
            backup.backup_id,
          fileName:
            backup.file_name,
          fileSize:
            Number(
              backup.file_size
            ),
          deviceId:
            backup.device_id,
          createdAt:
            backup.created_at,
        },
      });
    } catch (error) {
      console.error(
        "Cloud backup upload failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to upload cloud backup.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      });
    }
  }
);

module.exports = router;