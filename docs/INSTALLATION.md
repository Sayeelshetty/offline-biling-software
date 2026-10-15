# Offline Billing Software - Installation and Build Guide

## 1. Prerequisites

Install the following software before starting:

- Node.js
- npm
- Git
- PostgreSQL

Verify the installations:

```cmd
node --version
npm --version
git --version
psql --version
```

## Development startup

Run the desktop app and its Vite frontend with:

```cmd
npm run dev
```

The development launcher selects an available local port and opens Electron
against that exact Vite URL. When `DATABASE_URL` is configured in
`server/.env`, it also starts the local cloud API and waits for it to become
healthy. Desktop billing remains available locally if the cloud API or
PostgreSQL is unavailable.