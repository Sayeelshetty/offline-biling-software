# API and Desktop Integration

## 1. Architecture

The renderer does not connect to SQLite directly. React pages call typed
services, which use the allow-listed `window.desktopAPI` bridge exposed by
Electron's preload script. Electron's main process handles those IPC calls and
uses the local repositories.

The cloud API is separate. It currently accepts pushed sync records and backup
uploads. The desktop sync client does not download canonical cloud data back
into local SQLite; `/api/sync/entities` and `/api/sync/records` are read-only
server endpoints, not a client pull/synchronization implementation.

Implementation:

- [Electron preload bridge](../electron/preload.cjs)
- [Electron IPC handlers](../electron/main.cjs)
- [Desktop API TypeScript declarations](../frontend/src/types/desktop-api.d.ts)
- [Cloud sync client](../frontend/src/services/cloud-sync.service.ts)
- [Cloud server routes](../server/routes/sync.routes.js)
- [Cloud backup route](../server/routes/backup.routes.js)

## 2. Local desktop API (IPC)

The public renderer API is `window.desktopAPI`. The preload bridge groups
operations by domain:

| Group | Representative operations |
|---|---|
| `database` | Local database status |
| `auth` | Login |
| `products` | Create, search, list, update, activate/deactivate, low-stock, CSV import/export |
| `categories` | Create, search, list, update, activate/deactivate |
| `inventory` | Stock-in, stock-out, adjustments, current stock, movement history |
| `customers` | Create, find, list, update, purchase/outstanding data |
| `invoices` | Create, lookup, recent invoices, PDF download, share |
| `payments` | Create, lookup, list, payment summaries |
| `reports` | Sales, inventory, stock movement, customer purchases, outstanding balances |
| `sync` | Pending/failed queue, summary, mark synced/failed, retry |
| `settings` | Read/update/reset settings, logo selection, local/cloud backup, restore |

The full method signatures and IPC channel names are defined in
[preload.cjs](../electron/preload.cjs) and
[desktop-api.d.ts](../frontend/src/types/desktop-api.d.ts). These methods are
available inside the Electron application, not in an ordinary browser tab.

## 3. Cloud REST API

The default development base URL is `http://localhost:5000`. Set
`VITE_CLOUD_API_URL` in the Vite environment when using another base URL.

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Server liveness |
| `GET` | `/health` | Server and PostgreSQL health |
| `GET` | `/api/sync/health` | Sync service health |

### Push queued changes

`POST /api/sync/push`

Request:

```json
{
  "items": [
    {
      "queueId": "queue-entry-id",
      "entityType": "PRODUCT",
      "entityId": "local-product-id",
      "operation": "CREATE",
      "payload": {
        "id": "local-product-id",
        "updatedAt": "2026-10-16T12:00:00.000Z",
        "deviceId": "device-id"
      },
      "deviceId": "device-id"
    }
  ]
}
```

Supported entity types: `PRODUCT`, `CATEGORY`, `CUSTOMER`, `INVOICE`,
`PAYMENT`, and `STOCK_MOVEMENT`. Supported operations: `CREATE`, `UPDATE`,
`DELETE`. Each item needs a `queueId`, `entityId`, `deviceId`, and object
`payload`. Product, category, and customer payloads require a valid
`updatedAt`.

Successful HTTP responses contain overall counts and per-item results:

```json
{
  "success": true,
  "processed": 1,
  "synced": 1,
  "failed": 0,
  "results": [
    {
      "queueId": "queue-entry-id",
      "entityType": "PRODUCT",
      "entityId": "local-product-id",
      "status": "SYNCED",
      "serverId": "server-generated-id",
      "error": null
    }
  ]
}
```

An HTTP 200 response can still contain item-level failures; callers must inspect
`results` and `failed`, not only the HTTP status. Repeated queue IDs and
transaction IDs are handled idempotently by the server.

### Read server sync data

| Method | Path | Query | Description |
|---|---|---|---|
| `GET` | `/api/sync/entities` | Optional `entityType=PRODUCT\|CATEGORY\|CUSTOMER`, `limit` (default 100, max 500) | Read canonical product/category/customer snapshots |
| `GET` | `/api/sync/records` | Optional `limit` (default 100, max 500) | Read recent accepted sync records |

These routes are not currently used to pull cloud changes into a device's
SQLite database.

### Upload a cloud backup

`POST /api/backup/upload`

- `Content-Type: application/octet-stream`
- `X-Backup-File-Name: <file name>` (optional)
- `X-Device-Id: <device id>` (optional)
- Request body: SQLite database bytes; maximum 100 MiB.

The server validates the SQLite file signature and stores it in PostgreSQL.
There is currently no cloud-backup list or cloud-restore API; restore in the
desktop app reads a locally selected backup file.

## 4. Error handling and deployment notes

- Invalid requests return HTTP 400; server/database failures return HTTP 500.
- Sync items can fail independently inside an HTTP 200 batch response.
- The cloud routes currently have no authentication middleware. Keep this API
  on a trusted private network or add authentication and authorization before
  exposing it to an untrusted network.
- Offline billing and local database operations do not require the cloud API.

## 5. Source of truth

This document summarizes the current implementation. For exact payload
validation and response behavior, use
[sync.routes.js](../server/routes/sync.routes.js),
[backup.routes.js](../server/routes/backup.routes.js), and
[cloud-sync.service.ts](../frontend/src/services/cloud-sync.service.ts).
