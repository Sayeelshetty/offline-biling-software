# Installation, Development, and Build

## 1. Requirements

- Windows 10/11 for the packaged desktop installer; development also requires
  Node.js and npm.
- Use Node.js 22.12 or newer with npm. Electron's native SQLite dependency is
  built for the Electron runtime by the installed native package.
- Git is required to clone the repository.
- PostgreSQL is optional for local-only/offline development. It is required
  only when running the cloud sync/backup API.

Verify the toolchain in PowerShell:

```powershell
node --version
npm.cmd --version
git --version
```

## 2. Get the source and install dependencies

```powershell
git clone https://github.com/Sayeelshetty/offline-biling-software.git
Set-Location offline-biling-software
npm.cmd install
npm.cmd --prefix frontend install
```

If you will run the optional cloud service, install its dependencies as well:

```powershell
npm.cmd --prefix server install
```

## 3. Run the desktop application

```powershell
npm.cmd run dev
```

This starts the Vite renderer and Electron desktop shell. It does not require
PostgreSQL for local billing. If `server/.env` contains a valid `DATABASE_URL`,
the development launcher also starts the local cloud API; otherwise, cloud
sync is unavailable while local billing remains usable.

The local database is created automatically under Electron's `userData`
directory at `database/offline-biling-software.db`. The directory is specific
to the current operating-system user and application installation.

## 4. Optional PostgreSQL/cloud setup

Create a PostgreSQL database, then create `server/.env` (do not commit this
file or put real credentials in source control):

```dotenv
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database>
PORT=5000
```

The server initializes its cloud tables when it starts. Start it independently
when needed:

```powershell
npm.cmd --prefix server run dev
```

By default the frontend uses `http://localhost:5000` as the cloud API base URL.
To point the Vite build at another API, set `VITE_CLOUD_API_URL` in
`frontend/.env.local` before starting Vite or building. The cloud server
requires a reachable PostgreSQL database; the local SQLite application does
not.

See [API documentation](./API.md) for the REST endpoints and current sync
direction.

## 5. Test, build, and package

Run the local database regression tests:

```powershell
npm.cmd test
```

Build the TypeScript frontend and production assets:

```powershell
npm.cmd run build
```

Run the built Electron application:

```powershell
npm.cmd start
```

Create the configured Windows installer:

```powershell
npm.cmd run dist
```

`npm run test` currently runs the Node test files under
`electron/database/*.test.cjs`; it is not a full browser/UI, multi-device, or
live cloud/PostgreSQL integration suite. The installer and build configuration
are maintained in the project source and package metadata.

An optional synthetic database benchmark can be run with:

```powershell
node scripts/performance-benchmark.cjs
```

It creates 10,000 products and 50,000 invoices in a simplified test schema.
It deletes and recreates `performance-test/performance-benchmark.db` each
time, so preserve or back up that file first if it contains data you need. The
results do not establish full application performance targets.

## 6. Test data

The sample product CSV is at [test-data/products.csv](../test-data/products.csv).
It contains ten sample product rows and uses the product importer column
format. Import it from Settings → Data & Backup → Import Products, or use it as
a reference when preparing a CSV. Importing adds sample records to the local
database; use a disposable development database for manual tests.

## 7. Troubleshooting

- **Native module/build errors:** use the supported Node version, reinstall
  dependencies, then run `npm.cmd run build` again.
- **Cloud API is offline:** verify PostgreSQL is running, `DATABASE_URL` is
  correct in `server/.env`, and the API health endpoint is reachable.
- **Billing while offline:** cloud failure should not prevent local billing.
  Reconnect later and verify the sync status in the app.
- **Database location:** use the app's `userData` directory; do not edit the
  SQLite database file while the application is running.

See the [user guide](./USER-GUIDE.md) for first-run login and daily workflows.
