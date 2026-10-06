# Offline Billing Software - API Documentation

## 1. Overview

The Offline Billing Software uses a local-first desktop architecture.

Critical application operations use the local SQLite database through the Electron IPC layer.

Cloud APIs are used for:

- Synchronizing pending records
- Checking cloud synchronization availability
- Uploading a cloud database backup

The cloud backend is implemented using Node.js, Express and PostgreSQL.

---

## 2. Base URL

### Development

```text
http://localhost:5000