const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const Database = require("better-sqlite3");

const {
  backfillPendingTransactionSyncQueue,
} = require("./pending-transaction-backfill.cjs");

const schema = fs.readFileSync(
  path.join(__dirname, "schema.sql"),
  "utf8"
);

function withDatabase(callback) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "offline-billing-backfill-")
  );
  const databasePath = path.join(directory, "billing.db");
  let database = new Database(databasePath);

  try {
    database.pragma("foreign_keys = ON");
    database.exec(schema);
    seedOfflineBill(database);

    const result = callback({
      database,
      databasePath,
      reopen() {
        if (database.open) {
          database.close();
        }
        database = new Database(databasePath);
        database.pragma("foreign_keys = ON");
        return database;
      },
    });
    return result;
  } finally {
    if (database.open) {
      database.close();
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function seedOfflineBill(database) {
  const createdAt = "2026-10-16T12:00:00.000Z";
  const deviceId = "DEVICE-OFFLINE-1";

  database.prepare(`
    INSERT INTO products (
      id, name, sku, selling_price, purchase_price, gst_rate,
      current_stock, minimum_stock, unit, status,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, 'SYNCED', ?)
  `).run(
    "product-1", "Tea", "TEA-1", 100, 60, 5,
    4, 0, "PCS", createdAt, createdAt, deviceId
  );

  database.prepare(`
    INSERT INTO invoices (
      id, transaction_id, invoice_number, subtotal, discount, tax, total,
      payment_method, payment_status, created_at, updated_at,
      sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(
    "invoice-1", "TXN-OFFLINE-1", "INV-0001",
    100, 0, 5, 105, "CASH", "PAID",
    createdAt, createdAt, deviceId
  );

  database.prepare(`
    INSERT INTO invoice_items (
      id, invoice_id, product_id, product_name, quantity, rate,
      gst_rate, discount, amount, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "invoice-item-1", "invoice-1", "product-1", "Tea",
    1, 100, 5, 0, 100, createdAt
  );

  database.prepare(`
    INSERT INTO payments (
      id, transaction_id, invoice_id, amount, method, status,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(
    "payment-1", "TXN-OFFLINE-1:PAYMENT", "invoice-1",
    105, "CASH", "PAID", createdAt, createdAt, deviceId
  );

  database.prepare(`
    INSERT INTO stock_movements (
      id, transaction_id, product_id, type, quantity,
      reference_type, reference_id, created_at, updated_at,
      sync_status, device_id
    )
    VALUES (?, ?, ?, 'STOCK_OUT', ?, 'INVOICE', ?, ?, ?, 'SYNCED', ?)
  `).run(
    "stock-movement-1", "TXN-OFFLINE-1:STOCK:product-1",
    "product-1", 1, "invoice-1", createdAt, createdAt, deviceId
  );
}

test("offline bill and payment are queued after database restart and only once", () => {
  withDatabase(({ database, reopen }) => {
    database.close();
    const reopenedDatabase = reopen();

    assert.equal(
      reopenedDatabase
        .prepare("SELECT current_stock FROM products WHERE id = ?")
        .get("product-1").current_stock,
      4
    );

    assert.equal(
      backfillPendingTransactionSyncQueue(reopenedDatabase),
      2
    );

    const queueItems = reopenedDatabase.prepare(`
      SELECT id, entity_type, entity_id, operation, payload, status, device_id
      FROM sync_queue
      ORDER BY id
    `).all();

    assert.equal(queueItems.length, 2);
    assert.deepEqual(
      queueItems.map(({ entity_type, entity_id, operation, status }) => ({
        entity_type,
        entity_id,
        operation,
        status,
      })),
      [
        {
          entity_type: "INVOICE",
          entity_id: "invoice-1",
          operation: "CREATE",
          status: "PENDING",
        },
        {
          entity_type: "PAYMENT",
          entity_id: "payment-1",
          operation: "CREATE",
          status: "PENDING",
        },
      ]
    );

    const invoicePayload = JSON.parse(queueItems[0].payload);
    assert.equal(invoicePayload.invoice.transactionId, "TXN-OFFLINE-1");
    assert.equal(invoicePayload.invoice.total, 105);
    assert.deepEqual(invoicePayload.invoice.items, [
      {
        id: "invoice-item-1",
        invoiceId: "invoice-1",
        productId: "product-1",
        productName: "Tea",
        quantity: 1,
        rate: 100,
        gstRate: 5,
        discount: 0,
        amount: 100,
        createdAt: "2026-10-16T12:00:00.000Z",
      },
    ]);

    const paymentPayload = JSON.parse(queueItems[1].payload);
    assert.equal(paymentPayload.paymentId, "payment-1");
    assert.equal(paymentPayload.transactionId, "TXN-OFFLINE-1:PAYMENT");
    assert.equal(paymentPayload.invoiceId, "invoice-1");
    assert.equal(paymentPayload.amount, 105);

    assert.equal(backfillPendingTransactionSyncQueue(reopenedDatabase), 0);
    assert.equal(
      reopenedDatabase
        .prepare("SELECT COUNT(*) AS count FROM sync_queue")
        .get().count,
      2
    );

    reopenedDatabase.close();
  });
});

test("backfill preserves an existing current queue record and ignores synced rows", () => {
  withDatabase(({ database }) => {
    database.prepare(`
      INSERT INTO sync_queue (
        id, entity_type, entity_id, operation, payload, status,
        device_id, created_at, updated_at
      )
      VALUES (?, 'INVOICE', ?, 'CREATE', ?, 'PENDING', ?, ?, ?)
    `).run(
      "existing-invoice-queue",
      "invoice-1",
      JSON.stringify({ invoice: { id: "invoice-1" } }),
      "DEVICE-OFFLINE-1",
      "2026-10-16T12:00:00.000Z",
      "2026-10-16T12:00:00.000Z"
    );
    database.prepare(`
      UPDATE payments SET sync_status = 'SYNCED' WHERE id = 'payment-1'
    `).run();

    assert.equal(backfillPendingTransactionSyncQueue(database), 0);
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM sync_queue").get().count,
      1
    );
  });
});
