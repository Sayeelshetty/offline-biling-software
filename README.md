# Offline Billing Software

An offline-first POS and billing desktop application built with Electron,
React, TypeScript, SQLite, and an optional Express/PostgreSQL cloud service.
Invoices and inventory updates are stored locally before any cloud sync is
attempted.

## Quick start

On Windows, install the dependencies and start the desktop app:

```powershell
npm.cmd install
npm.cmd --prefix frontend install
npm.cmd run dev
```

See [Installation and Build](docs/INSTALLATION.md) for prerequisites, optional
PostgreSQL setup, tests, and packaging instructions. Local billing works
without PostgreSQL or internet access.

## Project map

| Area | Location |
|---|---|
| Electron main process and IPC | [electron/main.cjs](electron/main.cjs), [electron/preload.cjs](electron/preload.cjs) |
| React application and pages | [frontend/src](frontend/src) |
| Local SQLite schema and migrations | [schema.sql](electron/database/schema.sql), [migrations.cjs](electron/database/migrations.cjs) |
| SQLite repositories | [electron/database/repositories](electron/database/repositories) |
| Cloud service and PostgreSQL schema | [server](server), [server/db/schema.sql](server/db/schema.sql) |
| Shared TypeScript contracts | [shared](shared) |
| Sample product import data | [test-data/products.csv](test-data/products.csv) |

## Documentation

- [Deliverables assessment: requirement-by-requirement status and evidence](docs/DELIVERABLES.md)
- [Installation, tests, and build](docs/INSTALLATION.md)
- [User guide](docs/USER-GUIDE.md)
- [API and desktop IPC reference](docs/API.md)
- [UI design and responsive behavior](docs/UI-DESIGN.md)
- [Conflict-resolution strategy](docs/CONFLICT-RESOLUTION.md)

## Validation commands

```powershell
npm.cmd test
npm.cmd run build
```

`npm test` runs the current Electron database tests. It does not represent a
full UI, load/performance, live cloud, or multi-device test suite. See the
[deliverables assessment](docs/DELIVERABLES.md) for current limitations.
