const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const Module = require("node:module");

const userDataPath = fs.mkdtempSync(
  path.join(os.tmpdir(), "offline-billing-restart-")
);

const originalLoad = Module._load;
Module._load = function loadWithElectronStub(request, parent, isMain) {
  if (request === "electron") {
    return {
      app: {
        getPath(name) {
          if (name !== "userData") {
            throw new Error(`Unexpected Electron path request: ${name}`);
          }
          return userDataPath;
        },
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

let connection;
let migrations;
let productRepository;
let invoiceRepository;
try {
  connection = require("./connection.cjs");
  migrations = require("./migrations.cjs");
  productRepository = require("./repositories/product.repository.cjs");
  invoiceRepository = require("./repositories/invoice.repository.cjs");
} finally {
  Module._load = originalLoad;
}

test("creating a bill offline persists stock and transactions through restart for sync", () => {
  try {
    migrations.runMigrations();
    const database = connection.getDatabase();
    const product = productRepository.createProduct({
      name: "Restart Test Tea",
      sku: "RESTART-TEA-001",
      sellingPrice: 100,
      purchasePrice: 60,
      gstRate: 5,
      currentStock: 10,
      minimumStock: 0,
      unit: "PCS",
      deviceId: "DEVICE-RESTART-TEST",
    });

    const created = invoiceRepository.createInvoice({
      customerId: null,
      items: [{
        productId: product.id,
        productName: product.name,
        quantity: 1,
        rate: 100,
        gstRate: 5,
        discount: 0,
      }],
      discount: 0,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      paymentAmount: 105,
      dueDate: null,
      deviceId: "DEVICE-RESTART-TEST",
    });

    assert.equal(created.invoice.total, 105);
    assert.equal(
      database
        .prepare("SELECT current_stock FROM products WHERE id = ?")
        .get(product.id).current_stock,
      9
    );

    database.prepare(`
      DELETE FROM sync_queue
      WHERE entity_type IN ('INVOICE', 'PAYMENT')
        AND entity_id IN (?, ?)
    `).run(created.invoice.id, created.payment.id);

    connection.closeDatabase();
    const restartedDatabase = connection.getDatabase();
    migrations.runMigrations();

    const pendingTransactions = restartedDatabase.prepare(`
      SELECT entity_type, entity_id, operation, payload, status
      FROM sync_queue
      WHERE entity_type IN ('INVOICE', 'PAYMENT')
      ORDER BY entity_type
    `).all();
    assert.equal(pendingTransactions.length, 2);

    const invoiceQueue = pendingTransactions.find(
      (item) => item.entity_type === "INVOICE"
    );
    const paymentQueue = pendingTransactions.find(
      (item) => item.entity_type === "PAYMENT"
    );
    assert.ok(invoiceQueue);
    assert.ok(paymentQueue);
    assert.equal(invoiceQueue.status, "PENDING");
    assert.equal(paymentQueue.status, "PENDING");
    assert.equal(invoiceQueue.entity_id, created.invoice.id);
    assert.equal(paymentQueue.entity_id, created.payment.id);

    const restoredInvoicePayload = JSON.parse(invoiceQueue.payload);
    assert.equal(
      restoredInvoicePayload.invoice.transactionId,
      created.invoice.transactionId
    );
    assert.equal(restoredInvoicePayload.invoice.items.length, 1);
    assert.equal(
      restoredInvoicePayload.invoice.items[0].productId,
      product.id
    );

    const restoredPaymentPayload = JSON.parse(paymentQueue.payload);
    assert.equal(
      restoredPaymentPayload.transactionId,
      created.payment.transactionId
    );
    assert.equal(
      restoredPaymentPayload.invoiceId,
      created.invoice.id
    );
    assert.equal(restoredPaymentPayload.amount, 105);

    assert.equal(
      restartedDatabase
        .prepare("SELECT current_stock FROM products WHERE id = ?")
        .get(product.id).current_stock,
      9
    );

    migrations.runMigrations();
    assert.equal(
      restartedDatabase.prepare(`
        SELECT COUNT(*) AS count
        FROM sync_queue
        WHERE entity_type IN ('INVOICE', 'PAYMENT')
      `).get().count,
      2
    );
  } finally {
    connection.closeDatabase();
    fs.rmSync(userDataPath, { recursive: true, force: true });
  }
});
