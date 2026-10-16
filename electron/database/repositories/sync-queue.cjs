const { randomUUID } = require("crypto");

function enqueueSyncRecord(
  database,
  {
    entityType,
    entityId,
    operation,
    payload,
    deviceId,
    timestamp = new Date().toISOString(),
  }
) {
  if (!database) {
    throw new Error("Database connection is required to enqueue sync data.");
  }

  if (!deviceId || !String(deviceId).trim()) {
    throw new Error("Device ID is required to enqueue sync data.");
  }

  database.prepare(`
    INSERT INTO sync_queue (
      id,
      entity_type,
      entity_id,
      operation,
      payload,
      status,
      device_id,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
  `).run(
    randomUUID(),
    entityType,
    entityId,
    operation,
    JSON.stringify(payload),
    String(deviceId).trim(),
    timestamp,
    timestamp
  );
}

module.exports = {
  enqueueSyncRecord,
};
