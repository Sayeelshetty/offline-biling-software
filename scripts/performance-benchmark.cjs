const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const BENCHMARK_DIR = path.join(
  process.cwd(),
  "performance-test"
);

const DATABASE_PATH = path.join(
  BENCHMARK_DIR,
  "performance-benchmark.db"
);

const PRODUCT_COUNT = 10000;
const INVOICE_COUNT = 50000;

fs.mkdirSync(BENCHMARK_DIR, {
  recursive: true,
});

if (fs.existsSync(DATABASE_PATH)) {
  fs.unlinkSync(DATABASE_PATH);
}

const database = new Database(
  DATABASE_PATH
);

function formatMs(value) {
  return `${value.toFixed(3)} ms`;
}

function printResult(name, value, target) {
  const passed =
    target === null
      ? "MEASURED"
      : value <= target
        ? "PASS"
        : "CHECK";

  console.log(
    `${name}: ${formatMs(value)} | Target: ${
      target === null
        ? "informational"
        : `< ${target} ms`
    } | ${passed}`
  );
}

console.log(
  "==============================================="
);

console.log(
  "Offline Billing - Performance Benchmark"
);

console.log(
  "==============================================="
);

console.log(
  `Database: ${DATABASE_PATH}`
);

console.log(
  `Products: ${PRODUCT_COUNT.toLocaleString()}`
);

console.log(
  `Invoices: ${INVOICE_COUNT.toLocaleString()}`
);

console.log("");

// --------------------------------------------------
// DATABASE SCHEMA
// --------------------------------------------------

database.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    category_id TEXT,
    selling_price REAL NOT NULL DEFAULT 0,
    purchase_price REAL NOT NULL DEFAULT 0,
    gst_rate REAL NOT NULL DEFAULT 0,
    current_stock REAL NOT NULL DEFAULT 0,
    minimum_stock REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'PCS',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL UNIQUE,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX idx_products_name
    ON products(name);

  CREATE INDEX idx_products_barcode
    ON products(barcode);

  CREATE INDEX idx_products_sku
    ON products(sku);

  CREATE INDEX idx_products_status
    ON products(status);

  CREATE INDEX idx_invoices_created_at
    ON invoices(created_at);

  CREATE INDEX idx_invoices_customer
    ON invoices(customer_id);
`);


// --------------------------------------------------
// SEED PRODUCTS
// --------------------------------------------------

console.log(
  "Creating 10,000 products..."
);

const insertProduct = database.prepare(`
  INSERT INTO products (
    id,
    name,
    sku,
    barcode,
    category_id,
    selling_price,
    purchase_price,
    gst_rate,
    current_stock,
    minimum_stock,
    unit,
    status,
    created_at,
    updated_at
  )
  VALUES (
    @id,
    @name,
    @sku,
    @barcode,
    @categoryId,
    @sellingPrice,
    @purchasePrice,
    @gstRate,
    @currentStock,
    @minimumStock,
    @unit,
    @status,
    @createdAt,
    @updatedAt
  )
`);

const insertProducts = database.transaction(() => {
  const timestamp =
    new Date().toISOString();

  for (
    let index = 1;
    index <= PRODUCT_COUNT;
    index++
  ) {
    const padded = String(index).padStart(
      5,
      "0"
    );

    insertProduct.run({
      id: `product-${padded}`,
      name: `Benchmark Product ${padded}`,
      sku: `SKU-${padded}`,
      barcode: `890000000${String(
        index
      ).padStart(4, "0")}`,
      categoryId: null,
      sellingPrice: 100 + index,
      purchasePrice: 80 + index,
      gstRate: 5,
      currentStock: 100,
      minimumStock: 10,
      unit: "PCS",
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
});

const productSeedStart =
  process.hrtime.bigint();

insertProducts();

const productSeedEnd =
  process.hrtime.bigint();

const productSeedMs =
  Number(
    productSeedEnd -
      productSeedStart
  ) / 1_000_000;

console.log(
  `Product seed time: ${formatMs(
    productSeedMs
  )}`
);

console.log("");


// --------------------------------------------------
// SEED INVOICES
// --------------------------------------------------

console.log(
  "Creating 50,000 invoices..."
);

const insertInvoice = database.prepare(`
  INSERT INTO invoices (
    id,
    transaction_id,
    invoice_number,
    customer_id,
    subtotal,
    discount,
    tax,
    total,
    payment_method,
    payment_status,
    created_at,
    updated_at
  )
  VALUES (
    @id,
    @transactionId,
    @invoiceNumber,
    @customerId,
    @subtotal,
    @discount,
    @tax,
    @total,
    @paymentMethod,
    @paymentStatus,
    @createdAt,
    @updatedAt
  )
`);

const insertInvoices =
  database.transaction(() => {
    for (
      let index = 1;
      index <= INVOICE_COUNT;
      index++
    ) {
      const padded =
        String(index).padStart(
          5,
          "0"
        );

      const timestamp =
        new Date(
          Date.now() -
            (INVOICE_COUNT - index) *
              1000
        ).toISOString();

      insertInvoice.run({
        id: `invoice-${padded}`,
        transactionId:
          `transaction-${padded}`,
        invoiceNumber:
          `INV-${padded}`,
        customerId: null,
        subtotal: 1000,
        discount: 50,
        tax: 47.5,
        total: 997.5,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  });

const invoiceSeedStart =
  process.hrtime.bigint();

insertInvoices();

const invoiceSeedEnd =
  process.hrtime.bigint();

const invoiceSeedMs =
  Number(
    invoiceSeedEnd -
      invoiceSeedStart
  ) / 1_000_000;

console.log(
  `Invoice seed time: ${formatMs(
    invoiceSeedMs
  )}`
);

console.log("");


// --------------------------------------------------
// VERIFY DATASET SIZE
// --------------------------------------------------

const productCount =
  database
    .prepare(
      "SELECT COUNT(*) AS count FROM products"
    )
    .get().count;

const invoiceCount =
  database
    .prepare(
      "SELECT COUNT(*) AS count FROM invoices"
    )
    .get().count;

console.log(
  `Verified products: ${productCount.toLocaleString()}`
);

console.log(
  `Verified invoices: ${invoiceCount.toLocaleString()}`
);

console.log("");


// --------------------------------------------------
// PRODUCT SEARCH BENCHMARK
// --------------------------------------------------

const searchProducts =
  database.prepare(`
    SELECT
      id,
      name,
      sku,
      barcode,
      selling_price,
      current_stock
    FROM products
    WHERE status = 'ACTIVE'
      AND (
        name LIKE ?
        OR sku LIKE ?
        OR barcode LIKE ?
      )
    LIMIT 20
  `);

const searchTerm =
  "%9999%";

const SEARCH_RUNS = 100;

const searchStart =
  process.hrtime.bigint();

let searchResultCount = 0;

for (
  let run = 0;
  run < SEARCH_RUNS;
  run++
) {
  const result =
    searchProducts.all(
      searchTerm,
      searchTerm,
      searchTerm
    );

  searchResultCount =
    result.length;
}

const searchEnd =
  process.hrtime.bigint();

const searchTotalMs =
  Number(
    searchEnd -
      searchStart
  ) / 1_000_000;

const searchAverageMs =
  searchTotalMs /
  SEARCH_RUNS;

printResult(
  "Product search average",
  searchAverageMs,
  null
);

console.log(
  `Search results returned: ${searchResultCount}`
);

console.log("");


// --------------------------------------------------
// ADD PRODUCT BENCHMARK
// --------------------------------------------------

const insertSingleProduct =
  database.prepare(`
    INSERT INTO products (
      id,
      name,
      sku,
      barcode,
      category_id,
      selling_price,
      purchase_price,
      gst_rate,
      current_stock,
      minimum_stock,
      unit,
      status,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @name,
      @sku,
      @barcode,
      NULL,
      @sellingPrice,
      @purchasePrice,
      @gstRate,
      @currentStock,
      @minimumStock,
      'PCS',
      'ACTIVE',
      @createdAt,
      @updatedAt
    )
`);

const addProductStart =
  process.hrtime.bigint();

insertSingleProduct.run({
  id: "performance-test-product",
  name: "Performance Test Product",
  sku: "PERF-TEST-001",
  barcode: "9999999999999",
  sellingPrice: 500,
  purchasePrice: 400,
  gstRate: 5,
  currentStock: 100,
  minimumStock: 10,
  createdAt:
    new Date().toISOString(),
  updatedAt:
    new Date().toISOString(),
});

const addProductEnd =
  process.hrtime.bigint();

const addProductMs =
  Number(
    addProductEnd -
      addProductStart
  ) / 1_000_000;

printResult(
  "Add product",
  addProductMs,
  500
);

console.log("");


// --------------------------------------------------
// BILL CALCULATION BENCHMARK
// --------------------------------------------------

function calculateBill(lines) {
  let subtotal = 0;
  let tax = 0;
  let discount = 0;

  for (const line of lines) {
    const lineSubtotal =
      line.quantity *
      line.price;

    const lineDiscount =
      lineSubtotal *
      (line.discountPercent / 100);

    const taxableAmount =
      lineSubtotal -
      lineDiscount;

    const lineTax =
      taxableAmount *
      (line.gstRate / 100);

    subtotal +=
      lineSubtotal;

    discount +=
      lineDiscount;

    tax +=
      lineTax;
  }

  const total =
    subtotal -
    discount +
    tax;

  return {
    subtotal,
    discount,
    tax,
    total,
  };
}

const billLines =
  Array.from(
    { length: 10 },
    (_, index) => ({
      quantity: 2,
      price: 100 + index,
      discountPercent: 5,
      gstRate: 5,
    })
  );

const BILL_RUNS = 10000;

const billStart =
  process.hrtime.bigint();

let calculatedBill = null;

for (
  let run = 0;
  run < BILL_RUNS;
  run++
) {
  calculatedBill =
    calculateBill(
      billLines
    );
}

const billEnd =
  process.hrtime.bigint();

const billTotalMs =
  Number(
    billEnd -
      billStart
  ) / 1_000_000;

const billAverageMs =
  billTotalMs /
  BILL_RUNS;

printResult(
  "Bill calculation average",
  billAverageMs,
  null
);

console.log(
  `Calculated total: ₹${calculatedBill.total.toFixed(
    2
  )}`
);

console.log("");


// --------------------------------------------------
// INVOICE QUERY BENCHMARK
// --------------------------------------------------

const invoiceQuery =
  database.prepare(`
    SELECT
      id,
      invoice_number,
      subtotal,
      discount,
      tax,
      total,
      payment_method,
      payment_status,
      created_at
    FROM invoices
    ORDER BY created_at DESC
    LIMIT 50
  `);

const INVOICE_QUERY_RUNS = 100;

const invoiceQueryStart =
  process.hrtime.bigint();

let invoiceRows = [];

for (
  let run = 0;
  run < INVOICE_QUERY_RUNS;
  run++
) {
  invoiceRows =
    invoiceQuery.all();
}

const invoiceQueryEnd =
  process.hrtime.bigint();

const invoiceQueryTotalMs =
  Number(
    invoiceQueryEnd -
      invoiceQueryStart
  ) / 1_000_000;

const invoiceQueryAverageMs =
  invoiceQueryTotalMs /
  INVOICE_QUERY_RUNS;

printResult(
  "Invoice history query average",
  invoiceQueryAverageMs,
  null
);

console.log(
  `Invoice rows returned: ${invoiceRows.length}`
);

console.log("");


// --------------------------------------------------
// INVOICE INSERT BENCHMARK
// --------------------------------------------------

const performanceInvoiceStart =
  process.hrtime.bigint();

insertInvoice.run({
  id: "performance-test-invoice",
  transactionId:
    "performance-test-transaction",
  invoiceNumber:
    "PERF-INV-001",
  customerId: null,
  subtotal: 1000,
  discount: 50,
  tax: 47.5,
  total: 997.5,
  paymentMethod: "UPI",
  paymentStatus: "PAID",
  createdAt:
    new Date().toISOString(),
  updatedAt:
    new Date().toISOString(),
});

const performanceInvoiceEnd =
  process.hrtime.bigint();

const invoiceInsertMs =
  Number(
    performanceInvoiceEnd -
      performanceInvoiceStart
  ) / 1_000_000;

printResult(
  "Invoice insert",
  invoiceInsertMs,
  2000
);

console.log("");


// --------------------------------------------------
// SUMMARY
// --------------------------------------------------

console.log(
  "==============================================="
);

console.log(
  "Performance Benchmark Complete"
);

console.log(
  "==============================================="
);

console.log(
  `Products tested: ${productCount.toLocaleString()}`
);

console.log(
  `Invoices tested: ${invoiceCount.toLocaleString()}`
);

console.log(
  `Benchmark DB: ${DATABASE_PATH}`
);

console.log(
  "The benchmark database is separate from the application's real database."
);

console.log("");

database.close();