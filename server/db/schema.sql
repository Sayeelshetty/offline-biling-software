CREATE TABLE IF NOT EXISTS sync_records (
    id BIGSERIAL PRIMARY KEY,

    server_id UUID NOT NULL UNIQUE,

    queue_id TEXT NOT NULL UNIQUE,

    entity_type TEXT NOT NULL,

    entity_id TEXT NOT NULL,

    operation TEXT NOT NULL,

    payload JSONB NOT NULL,

    device_id TEXT NOT NULL,

    synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_records_entity
ON sync_records(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_sync_records_device
ON sync_records(device_id);

CREATE INDEX IF NOT EXISTS idx_sync_records_synced_at
ON sync_records(synced_at);

-- Cloud database backups
CREATE TABLE IF NOT EXISTS cloud_backups (
    id BIGSERIAL PRIMARY KEY,

    backup_id UUID NOT NULL UNIQUE,

    file_name TEXT NOT NULL,

    file_size BIGINT NOT NULL,

    device_id TEXT NOT NULL,

    file_data BYTEA NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

);
