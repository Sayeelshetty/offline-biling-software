# Conflict Resolution Strategy

## Overview

The Offline Billing Software works primarily with local SQLite storage
and synchronizes pending changes with the cloud when internet
connectivity becomes available.

The system handles four basic synchronization conflict cases:

1. Same product edited on multiple devices
2. Inventory changes from different devices
3. Duplicate transactions
4. Repeated synchronization attempts

---

## 1. Same Product Edited on Multiple Devices

### Problem

The same product can be edited on two devices while both devices are
offline.

Example:

- Device A changes the selling price.
- Device B changes the selling price.
- Both devices reconnect later.

### Strategy

Product updates use the `updatedAt` timestamp.

The latest product update is treated as the current version.

This follows a basic Last Write Wins strategy.

### Rules

- Every product update contains `updatedAt`.
- The cloud compares the incoming update with the existing product.
- The newer update is accepted.
- An older update must not overwrite a newer product update.

---

## 2. Inventory Changes from Different Devices

### Problem

Two devices can sell or adjust the same product while working offline.

Example:

- Device A sells 2 units.
- Device B sells 3 units.
- Both devices later synchronize.

Simply synchronizing the final `currentStock` value could overwrite
another device's stock change.

### Strategy

Inventory changes are represented as stock movement events.

Supported movement types include:

- `STOCK_IN`
- `STOCK_OUT`
- `ADJUSTMENT`

Each stock movement contains:

- Local ID
- Transaction ID
- Product ID
- Quantity
- Movement type
- Reference information
- Created timestamp
- Device ID

The cloud processes each unique stock movement once.

### Rules

- Each stock movement has a unique transaction ID.
- Stock movements from different devices are treated as separate events.
- The same stock movement must not be applied twice.
- Inventory changes are not treated as a simple overwrite of stock.

---

## 3. Duplicate Transactions

### Problem

A bill, payment, or stock movement can be sent more than once because
of network problems or synchronization retries.

### Strategy

Every important transaction uses a unique `transactionId`.

Examples:

- `TXN-<unique-id>`
- `TXN-<unique-id>:PAYMENT`
- `TXN-<unique-id>:STOCK:<product-id>`

The transaction ID acts as an idempotency key.

If the same transaction is received again, the server must not create
another business transaction.

### Rules

- Duplicate invoices must not be created.
- Duplicate payments must not be created.
- Duplicate stock movements must not be applied.
- A previously processed transaction can safely be retried.

---

## 4. Repeated Synchronization Attempts

### Problem

A synchronization request may fail because of a network interruption.
The client may then send the same record again.

### Strategy

The synchronization process is designed to be idempotent.

The server checks whether the transaction has already been processed.

If it has already been processed:

- No duplicate business record is created.
- The existing result can be reused.
- The local record can be marked as `SYNCED`.

If synchronization has not completed:

- The record remains in the local sync queue.
- It can be retried later.

---

## 5. Device Identification

Each synchronized record contains a `deviceId`.

The device ID identifies where the change originated and helps with
synchronization tracking and troubleshooting.

---

## 6. Conflict Resolution Summary

| Conflict | Strategy |
|---|---|
| Same product edited on multiple devices | Last Write Wins using `updatedAt` |
| Inventory changed on multiple devices | Process stock movements/events |
| Duplicate transaction | Unique `transactionId` |
| Repeated sync attempt | Idempotent processing |
| Synchronization failure | Keep record locally and retry |
| Change identification | Store `deviceId` |

---

## 7. Overall Synchronization Flow

Local SQLite
    ↓
Pending Sync Queue
    ↓
Internet Available
    ↓
Send Pending Changes
    ↓
Cloud Conflict / Duplicate Check
    ↓
Cloud Database
    ↓
Confirm Processing
    ↓
Mark Local Record as SYNCED

The local transaction is created first so that billing continues to work
even when there is no internet connection.

Cloud synchronization happens after the local transaction has been
stored successfully.