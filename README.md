# Offline Billing Software

An offline-first point-of-sale (POS) and billing application for small retail businesses. The current application is a Windows desktop app built with Electron, React, TypeScript, and SQLite. An optional Express and PostgreSQL service supports cloud backup and synchronization.

> **Important scope note:** Core billing and product lookup use the local database and can work without internet access. The cloud sync client currently pushes queued local changes to the cloud; it does not automatically pull remote changes back to the desktop. The app has responsive layouts, but it is not a standalone browser application or a native Android/iOS app. The cloud API does not currently enforce authentication or business-level authorization, so it must not be used with sensitive production data.

## Contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Architecture](#architecture)
4. [Project structure](#project-structure)
5. [Requirements](#requirements)
6. [Quick start](#quick-start)
7. [Optional cloud API setup](#optional-cloud-api-setup)
8. [Demo accounts](#demo-accounts)
9. [Using the application](#using-the-application)
10. [Backup, restore, and CSV](#backup-restore-and-csv)
11. [Database and data persistence](#database-and-data-persistence)
12. [API and desktop IPC](#api-and-desktop-ipc)
13. [Tests and performance checks](#tests-and-performance-checks)
14. [Build the Windows installer](#build-the-windows-installer)
15. [Responsive UI and device support](#responsive-ui-and-device-support)
16. [The 11 expected deliverables](#the-11-expected-deliverables)
17. [Security and limitations](#security-and-limitations)
18. [Related documentation](#related-documentation)

## Features

- Local sign-in with Administrator, Cashier, and Manager demo roles.
- Product and category management.
- Product lookup by name, SKU, or barcode.
- Billing cart with quantity, discount, tax/GST calculation, customer selection, and payment recording.
- Invoice generation, with PDF download and print/share actions. Current PDF output uses A4.
- Inventory tracking, stock adjustments, and stock updates when bills are completed.
- Customer, payment, outstanding-balance, and reporting screens.
- Local SQLite persistence so core billing and product lookup do not require internet access.
- A local synchronization queue with connection status, retry behavior, and server-side duplicate handling.
- Settings for business details and logo, invoice and tax preferences, discounts, payment options, and printer preferences.
- Local database backup and restore.
- Optional cloud backup upload.
- Product CSV import and export.
- Responsive layouts, small-screen bottom navigation, and a camera barcode scanner where Electron camera permissions and device support allow it.

**Feature limitations:** Printer preferences can be saved, but direct thermal-printer discovery and printing are not implemented. Responsive styling adapts the desktop app to smaller windows; it does not provide a separately deployable browser or native mobile application.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Desktop runtime | Electron | Windows application shell and native capabilities |
| Renderer/UI | React, TypeScript, Vite, React Router | Screens, navigation, forms, and responsive UI |
| Desktop boundary | Electron preload and allow-listed IPC | Exposes approved desktop operations to the renderer |
| Local database | SQLite via `better-sqlite3` | Offline products, billing, invoices, payments, inventory, and sync queue |
| Cloud API | Node.js and Express | REST endpoints for sync and backup upload |
| Cloud database | PostgreSQL via `pg` | Stores cloud records and uploaded backup files |
| Barcode scanner | `@zxing/browser`, `@zxing/library` | Camera-based barcode decoding where supported |
| Windows packaging | Electron Builder and NSIS | Creates the Windows installer |

## Architecture

### High-level data flow

```text
┌─────────────────────────────────────┐
│ React + TypeScript renderer         │
│ frontend/src                        │
└──────────────────┬──────────────────┘
                   │ typed frontend services
                   ▼
┌─────────────────────────────────────┐
│ window.desktopAPI                   │
│ electron/preload.cjs                │
│ Context-isolated, allow-listed IPC  │
└──────────────────┬──────────────────┘
                   │ IPC requests
                   ▼
┌─────────────────────────────────────┐
│ Electron main process               │
│ electron/main.cjs                   │
└──────────────────┬──────────────────┘
                   │ repositories / transactions
                   ▼
┌─────────────────────────────────────┐
│ Local SQLite database               │
│ Per-user Electron userData folder   │
└──────────────────┬──────────────────┘
                   │ queued changes when available
                   ▼
┌─────────────────────────────────────┐
│ Express REST API                    │
│ server/                             │
└──────────────────┬──────────────────┘
                   │ SQL through pg
                   ▼
┌─────────────────────────────────────┐
│ PostgreSQL cloud database           │
│ Sync records and backup data        │
└─────────────────────────────────────┘
```

### Responsibilities

- **Renderer/UI:** `frontend/src` contains pages, components, and typed frontend services.
- **Desktop boundary:** `electron/preload.cjs` exposes the restricted `window.desktopAPI` API. The renderer does not access SQLite directly.
- **Electron main process:** `electron/main.cjs` handles startup, IPC requests, native dialogs, and desktop services.
- **Local data layer:** Repositories under `electron/database/repositories/` perform SQLite operations. Billing operations use database transactions for related invoice, payment, and stock changes.
- **Local persistence:** SQLite uses WAL and foreign-key support. The database is stored under Electron’s per-user `userData` directory at `database/offline-biling-software.db`. Do not manually edit or copy the live database while the application is open.
- **Cloud API:** `server/` contains the Express routes and PostgreSQL access.
- **Synchronization:** The client sends queued records to `POST /api/sync/push`, retries when connectivity returns, and processes per-item results. Product, category, and customer snapshots use the documented last-write-wins rule; invoice, payment, and stock changes are sent as events.
- **Cloud backup:** The desktop backup service uploads a SQLite backup file to `POST /api/backup/upload`.

### Synchronization boundary

The desktop client currently supports **push from the desktop to the cloud**. It does not automatically pull remote edits down to a desktop and reconcile them. Do not describe the current implementation as complete bidirectional or multi-device synchronization.

## Project structure

```text
offline-biling-software/
├── electron/
│   ├── main.cjs                 # Electron startup and IPC handlers
│   ├── preload.cjs              # Context-isolated renderer API bridge
│   ├── database/
│   │   ├── schema.sql           # Local SQLite schema
│   │   ├── migrations.cjs       # Local schema/data migrations
│   │   ├── repositories/        # Local data operations and transactions
│   │   └── *.test.cjs           # Local database tests
│   └── services/                # Local and cloud backup services
├── frontend/
│   └── src/
│       ├── App.tsx              # Authentication and application shell
│       ├── pages/               # Dashboard, billing, products, reports, settings
│       ├── components/          # Shared UI and barcode scanner
│       └── services/            # Desktop API clients and sync engine
├── server/
│   ├── server.js                # Express server entry point
│   ├── db/
│   │   └── schema.sql           # PostgreSQL cloud schema
│   └── routes/                  # Sync and backup REST routes
├── shared/                      # Cross-layer types and contracts
├── docs/                        # API, user, install, UI, sync, and handoff docs
├── test-data/
│   └── products.csv             # Sample product import data
├── scripts/                     # Development launcher and benchmark
├── package.json                 # Root scripts and dependencies
├── frontend/package.json        # Frontend dependencies
├── server/package.json          # Cloud API dependencies
└── README.md
```

## Requirements

For a Windows desktop source build:

- Windows 10 or Windows 11.
- Node.js 22.12 or newer and npm.
- Git, if cloning the repository.
- Internet access to download dependencies during initial setup.

PostgreSQL is **not** required for local/offline billing. It is required only if you want to run the cloud API locally.

Check the installed tools in PowerShell:

```powershell
node --version
npm.cmd --version
git --version
```

## Quick start

### Option A: Use the Windows installer

If the installer is included with your supplied files, it is named:

```text
dist/offline-biling-software Setup 1.0.0.exe
```

The `dist/` directory is ignored by Git, so a fresh repository clone will not include the installer. The installer is unsigned, so Windows may display an unknown-publisher warning. Run it only if you trust the source.

### Option B: Run from source

Open PowerShell in the folder where you want the project, then run:

```powershell
git clone https://github.com/Sayeelshetty/offline-biling-software.git
cd offline-biling-software
npm.cmd install
npm.cmd --prefix frontend install
npm.cmd run dev
```

Run `npm.cmd run dev` from the **project root** (the folder containing the root `package.json`). This starts the Vite frontend and Electron desktop app. PostgreSQL is not required for local billing.

If you already have the repository, open PowerShell in the project root and run the install and start commands without cloning it again.

### Build and run locally

To build the frontend and run the app in Electron:

```powershell
npm.cmd run build
npm.cmd start
```

To see available project scripts:

```powershell
npm.cmd run
```

## Optional cloud API setup

The cloud service is optional. Use this section only if you want to run the Express API on your computer.

### 1. Create a PostgreSQL database

Use a local PostgreSQL installation or a database service you control. Create a database and keep its connection details private.

### 2. Create `server/.env`

Create a file named `server/.env` with your own values:

```dotenv
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database>
```

Replace `<user>`, `<password>`, and `<database>` with your actual database details. If your database provider requires SSL, use the connection string and SSL configuration it provides.

**Never commit `.env` files, passwords, database connection strings, tokens, or other secrets to source control.**

### 3. Install server dependencies

From the project root, run:

```powershell
npm.cmd --prefix server install
```

### 4. Start the API separately (optional)

To start the cloud API manually, open a **second PowerShell terminal**, change into the `server` folder, and run its development script:

```powershell
cd server
npm.cmd run dev
```

Keep this terminal open while using cloud features. This command requires `server/.env` to contain a valid `DATABASE_URL` and requires PostgreSQL to be reachable.

To start the desktop application as well, open another terminal, change to the **project root** (the folder containing the root `package.json`), and run:

```powershell
npm.cmd run dev
```

The root development launcher starts Vite and Electron. If `server/.env` contains a valid `DATABASE_URL`, it also starts the local cloud API automatically. If you already started the API manually using `cd server` and `npm.cmd run dev`, the root launcher detects the API on its configured port and reuses it rather than starting a second copy.

### 5. Check the API health endpoints

In another PowerShell window:

```powershell
Invoke-RestMethod http://localhost:5000/health
Invoke-RestMethod http://localhost:5000/api/sync/health
```

The server initializes its cloud tables at startup.

### 6. Configure the renderer API URL

The renderer sync engine uses `VITE_CLOUD_API_URL`. To use your local API, create or update `frontend/.env.local`:

```dotenv
VITE_CLOUD_API_URL=http://localhost:5000
```

Restart Vite/Electron after changing this value. Vite reads environment variables at startup or build time.

The Electron cloud-backup service uses `CLOUD_API_URL`, while the renderer sync engine uses `VITE_CLOUD_API_URL`. Check both settings if sync and backup behave differently. These variables should contain API base URLs only, not database credentials.

### Demo API

The project has used this public demo API endpoint:

```text
https://offline-billing-api.onrender.com
```

Health endpoints:

```text
https://offline-billing-api.onrender.com/health
https://offline-billing-api.onrender.com/api/sync/health
```


Free/demo hosting may sleep when inactive, so the first request can take longer. Availability depends on the hosting plan and deployment configuration.

**Security warning:** The current cloud routes do not enforce authentication or business-level authorization and use permissive CORS. Do not send real customer or payment data to this public demo API.

## Demo accounts

On a fresh local database, the application bootstraps these development/demo accounts:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@offlinebilling.local` | `admin123` |
| Cashier | `cashier@offlinebilling.local` | `cashier123` |
| Manager | `manager@offlinebilling.local` | `manager123` |

To sign in:

1. Start the application using `npm.cmd run dev` or open the installed application.
2. Enter one of the email/password pairs above on the login screen.
3. Select **Sign In**.
4. Explore the screens available to that role.

These are fixed demo credentials. Passwords are hashed in the local database, but the application does not provide a user/password management screen or first-run credential setup. The accounts may not be recreated if your existing local database already contains different users. Use only disposable demo/test data; do not use these credentials in production.

## Using the application

### 1. Set up categories and products

1. Sign in using a demo account.
2. Open **Categories** and create a category if needed.
3. Open **Products** and add a product with a unique SKU, name, selling price, tax rate, and starting stock.
4. Optionally import the sample CSV from **Settings → Data & Backup → Import Products**.

### 2. Create a bill

1. Open **Billing**.
2. Search for a product by name, SKU, or barcode. Use the camera scanner if permitted.
3. Add the product to the cart and set quantities or discounts as required.
4. Select or enter customer details if required.
5. Review the tax/GST and total amount.
6. Choose the payment details and complete the bill.
7. Generate the invoice.

### 3. Verify the billing result

- Open **Invoices** and confirm the new invoice appears.
- Open **Payments** and confirm the payment record.
- Open **Inventory** and confirm stock changed according to the bill.
- Check the relevant dashboard or reporting screens.

### 4. Check offline operation

1. Create test categories and products while the application is open.
2. Disconnect the computer from the internet.
3. Search for a product and create a test bill.
4. Reconnect to the internet.
5. If cloud sync is configured, check the **Sync Status** indicator in the application header.

Local billing should not require an internet connection. Cloud upload and synchronization require a reachable, correctly configured cloud API.

## Backup, restore, and CSV

### Create a local backup

1. Open **Settings → Data & Backup**.
2. Select **Backup Database**.
3. Wait for the confirmation message.
4. Record the displayed path and copy the backup to a safe location.

### Upload a cloud backup

1. Confirm that the cloud API URL is configured and reachable.
2. Open **Settings → Data & Backup**.
3. Select the cloud backup action and wait for the result.

The upload endpoint accepts a raw SQLite backup body (`application/octet-stream`) and uses the `X-Backup-File-Name` and `X-Device-Id` headers. The server stores uploaded file data in PostgreSQL.

### Restore a local backup

> **Restore replaces current local data.** Create and preserve a separate backup before proceeding.

1. Create a fresh safety backup.
2. Open **Settings → Data & Backup → Restore Database**.
3. Select the `.db` backup file.
4. Read the confirmation warning.
5. Confirm the restore and wait for the success message or application restart.
6. Reopen the app and verify products, invoices, and other expected data.

A safety backup is created automatically before restore. Do not edit the active SQLite database manually while the application is running.

### Import or export products

- Sample import file: `test-data/products.csv`.
- Import from **Settings → Data & Backup → Import Products**.
- Export from **Settings → Data & Backup → Export Products**.
- Note the output path and exported product count shown by the application.

Import sample data into a disposable development database to avoid mixing it with business data.

## Database and data persistence

### Local SQLite database

- Schema: `electron/database/schema.sql`
- Migrations: `electron/database/migrations.cjs`
- Data access: `electron/database/repositories/`
- Location: Electron’s per-user `userData` directory, under `database/offline-biling-software.db`
- Stores: local catalog, billing, invoices, payments, inventory, settings, and sync queue data

The SQLite database uses WAL and foreign-key support. Related billing updates are performed using database transactions.

Do not manually edit, move, or copy the live database while the application is open. Use the backup and restore features instead.

### Cloud PostgreSQL database

- Schema: `server/db/schema.sql`
- Connection module: `server/db/database.js`
- Connection setting: `DATABASE_URL`
- Stores: server-side sync records and metadata/binary content for cloud backup uploads

The Express server initializes its cloud tables at startup. Do not commit `server/.env` or put database passwords in source code. Rotate any credential that has been accidentally shared or committed.

## API and desktop IPC

See [`docs/API.md`](docs/API.md) for the full Electron IPC and cloud REST reference.

| Method | Endpoint | Purpose | Verification |
|---|---|---|---|
| `GET` | `/health` | Check API and database availability | HTTP 200; server and database reported online in the local and demo API checks. |
| `GET` | `/api/sync/health` | Check sync service availability | HTTP 200 in the local and demo API checks. |
| `POST` | `/api/sync/push` | Push queued local changes to the cloud | Empty batch returned HTTP 200 with zero items processed. A real transaction was not tested. |
| `POST` | `/api/backup/upload` | Upload a SQLite database backup | Invalid file was rejected with HTTP 400. A successful upload was not tested. |

These checks confirm the health endpoints and expected handling of the tested POST requests; they do not prove that a real sync transaction or valid cloud backup upload succeeds.

The local desktop API is exposed to React through `window.desktopAPI` in the preload layer. The renderer should not import SQLite modules or access the database file directly.

## Tests and performance checks

Run commands from the project root in PowerShell.

### Run local database tests

```powershell
npm.cmd test
```

The root test script runs Node’s test runner against `electron/database/*.test.cjs`. These tests cover selected local database behaviors, including offline bill persistence and pending transaction queue handling. They are not a full UI, cloud, or multi-device test suite.

### Build the frontend

```powershell
npm.cmd run build
```

The production UI bundle is written to `frontend/dist/`.

### Run both checks

```powershell
npm.cmd test
npm.cmd run build
```

These checks do not replace manual testing of UI interactions, live PostgreSQL sync, cloud backup, camera support, installer behavior, or multi-device reconciliation.

### Optional synthetic benchmark

```powershell
node scripts/performance-benchmark.cjs
```

The benchmark creates 10,000 products and 50,000 invoices in a simplified test schema. It creates or recreates:

```text
performance-test/performance-benchmark.db
```

Back up any data in that specific file before running the benchmark. The synthetic results are not an end-to-end performance guarantee for the full application, and they do not prove that the stated response-time targets are met.

## Build the Windows installer

From the project root:

```powershell
npm.cmd run dist
```

The configured output includes:

```text
dist/offline-biling-software Setup 1.0.0.exe
dist/win-unpacked/offline-biling-software.exe
```

The `dist/` directory is ignored by Git, so a fresh clone may not include the installer. The installer is unsigned and may display a Windows unknown-publisher warning.

The existing packaged app was smoke-tested to confirm that its main window opens. That smoke test did not exercise interactive installation, login, or every application feature.

## Responsive UI and device support

- The primary target is the Windows Electron desktop application.
- Responsive page layouts and narrow-screen bottom navigation are included for Home, Billing, Products, Reports, and More.
- Billing supports manual product, SKU, and barcode search.
- Camera scanning depends on camera permission and device support.
- The renderer depends on `window.desktopAPI` for local database operations, so responsive CSS does not make it a standalone browser app.
- No native Android/iOS package is included, and full real-device mobile validation has not been completed.

## The 11 expected deliverables

| # | Expected deliverable | Status | Evidence and notes |
|---:|---|---|---|
| 1 | Complete source code | Provided | Electron main/preload, React/TypeScript renderer, SQLite repositories, Express API, shared types, and supporting scripts are in the repository. |
| 2 | Database schema | Provided | Local SQLite schema and migrations, plus the PostgreSQL cloud schema. |
| 3 | UI design | Provided | Implemented application screens and design notes in [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md). |
| 4 | Responsive web/desktop application | Partial | Responsive Electron desktop app is provided. A standalone browser runtime is not included. |
| 5 | Mobile-responsive implementation | Partial | Narrow-screen styles, bottom navigation, and a camera scanner are present. No native Android/iOS build or full real-device acceptance test is provided. |
| 6 | Offline database implementation | Provided | Local SQLite storage and transaction-backed billing are implemented. Database tests cover selected persistence and queue behavior. |
| 7 | Synchronization mechanism | Partial | Local queue, push/retry, and server-side duplicate handling exist. Automatic cloud-to-device pull and reconciliation are not implemented. |
| 8 | API documentation | Provided | Electron IPC and cloud REST reference are documented in [`docs/API.md`](docs/API.md). |
| 9 | Installation/build instructions | Provided | Source setup, optional server setup, tests, build, and packaging are documented here and in [`docs/INSTALLATION.md`](docs/INSTALLATION.md). |
| 10 | Test data | Partial | A sample product CSV and synthetic benchmark data are included. There is no comprehensive acceptance dataset covering all invoices, payments, and customers. |
| 11 | Basic user documentation | Provided | Application workflows and backup instructions are documented here and in [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md). |

### Important acceptance boundaries

The current project provides a desktop-first, offline-capable POS foundation. These capabilities should not be represented as complete until implemented and tested:

- Standalone browser use and native Android/iOS applications.
- Automatic cloud-to-device synchronization and full multi-device conflict reconciliation.
- Production-ready authentication and authorization for cloud routes.
- End-to-end performance verification against launch, search, billing, and invoice-generation targets.
- Full UI automation and broad real-device acceptance testing.

## Security and limitations

- **Demo accounts:** Fixed credentials are included for development. There is no user/password management or change/reset flow. Never use these accounts for real business data.
- **Cloud security:** Cloud routes do not currently enforce authentication or business-level authorization and use permissive CORS. The public demo API is not suitable for sensitive data or production use.
- **Sync direction:** Client-to-cloud push is implemented. Automatic cloud-to-client pull and multi-device reconciliation are not.
- **Printer support:** Printer preferences are saved, but direct thermal-printer discovery and output are not implemented. Invoice PDF output uses A4.
- **Mobile:** Responsive UI is present, but there is no native Android/iOS build and target-device testing is incomplete.
- **Test coverage:** Automated tests focus on local SQLite behavior. Cloud sync, UI end-to-end flows, camera behavior, packaged installation, and large-scale performance need separate validation.
- **Credentials:** Never commit `.env` files, connection strings, passwords, access tokens, or other secrets. Rotate credentials that may have been exposed.

### Before production use

1. Add authentication and per-business authorization to cloud routes.
2. Restrict CORS and validate and rate-limit incoming requests.
3. Store secrets in environment or secret-management settings, and rotate any exposed credentials.
4. Implement and test cloud-to-device pull/reconciliation if bidirectional sync is required.
5. Add managed user accounts and password lifecycle flows.
6. Complete restore/recovery, cloud, UI end-to-end, camera, and installer acceptance testing.
7. Validate backup retention, restore procedures, and responsiveness on target devices.

## Related documentation

- [`docs/DELIVERABLES.md`](docs/DELIVERABLES.md) — requirement-by-requirement deliverable status and handoff verification.
- [`docs/INSTALLATION.md`](docs/INSTALLATION.md) — installation, testing, build, and packaging instructions.
- [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md) — everyday application workflows.
- [`docs/API.md`](docs/API.md) — Electron IPC and cloud REST API reference.
- [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md) — UI design notes.
- [`docs/CONFLICT-RESOLUTION.md`](docs/CONFLICT-RESOLUTION.md) — sync conflict-resolution rules.

---

**Project:** Offline Billing Software
**Primary platform:** Windows / Electron
**Local operation:** SQLite-first and offline-capable
**Optional cloud service:** Express API and PostgreSQL
