const { getDatabase } = require("../connection.cjs");

const db = getDatabase();

/**
 * --------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------
 */

function roundMoney(value) {
  return Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;
}

function validateDate(value, fieldName) {
  if (
    value !== null &&
    value !== undefined &&
    (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    )
  ) {
    throw new Error(
      `${fieldName} must be in YYYY-MM-DD format.`
    );
  }
}

function normalizeDateRange(options = {}) {
  const from =
    options.from === undefined ||
    options.from === null ||
    options.from === ""
      ? null
      : String(options.from);

  const to =
    options.to === undefined ||
    options.to === null ||
    options.to === ""
      ? null
      : String(options.to);

  validateDate(from, "from");
  validateDate(to, "to");

  if (from && to && from > to) {
    throw new Error(
      "The from date cannot be later than the to date."
    );
  }

  return {
    from,
    to,
  };
}

function buildDateConditions(
  columnName,
  from,
  to,
  values
) {
  const conditions = [];

  if (from) {
    conditions.push(
      `date(${columnName}) >= date(?)`
    );
    values.push(from);
  }

  if (to) {
    conditions.push(
      `date(${columnName}) <= date(?)`
    );
    values.push(to);
  }

  return conditions;
}

function mapSalesSummary(row) {
  return {
    totalBills: Number(row.total_bills || 0),
    totalSales: roundMoney(row.total_sales || 0),
    totalDiscount: roundMoney(row.total_discount || 0),
    totalTax: roundMoney(row.total_tax || 0),
  };
}

/**
 * --------------------------------------------------------------------------
 * Sales Reports
 * --------------------------------------------------------------------------
 */

/**
 * Overall sales summary.
 *
 * Excludes cancelled invoices.
 */
function getSalesSummary(options = {}) {
  const { from, to } =
    normalizeDateRange(options);

  const values = [];

  const conditions = [
    "i.payment_status != 'CANCELLED'",
  ];

  conditions.push(
    ...buildDateConditions(
      "i.created_at",
      from,
      to,
      values
    )
  );

  const row = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total_bills,

        COALESCE(
          SUM(i.total),
          0
        ) AS total_sales,

        COALESCE(
          SUM(i.discount),
          0
        ) AS total_discount,

        COALESCE(
          SUM(i.tax),
          0
        ) AS total_tax

      FROM invoices i

      WHERE ${conditions.join(" AND ")}
      `
    )
    .get(...values);

  return mapSalesSummary(row);
}

/**
 * Daily sales report.
 */
function getDailySales(options = {}) {
  const { from, to } =
    normalizeDateRange(options);

  const values = [];

  const conditions = [
    "i.payment_status != 'CANCELLED'",
  ];

  conditions.push(
    ...buildDateConditions(
      "i.created_at",
      from,
      to,
      values
    )
  );

  const rows = db
    .prepare(
      `
      SELECT
        date(i.created_at) AS date,

        COUNT(*) AS bill_count,

        COALESCE(
          SUM(i.total),
          0
        ) AS total_sales,

        COALESCE(
          SUM(i.discount),
          0
        ) AS total_discount,

        COALESCE(
          SUM(i.tax),
          0
        ) AS total_tax

      FROM invoices i

      WHERE ${conditions.join(" AND ")}

      GROUP BY date(i.created_at)

      ORDER BY date(i.created_at) DESC
      `
    )
    .all(...values);

  return rows.map((row) => ({
    date: row.date,
    billCount: Number(row.bill_count || 0),
    totalSales: roundMoney(row.total_sales || 0),
    totalDiscount: roundMoney(row.total_discount || 0),
    totalTax: roundMoney(row.total_tax || 0),
  }));
}

/**
 * Weekly sales report.
 *
 * Grouping uses:
 * YYYY-WW
 */
function getWeeklySales(options = {}) {
  const { from, to } =
    normalizeDateRange(options);

  const values = [];

  const conditions = [
    "i.payment_status != 'CANCELLED'",
  ];

  conditions.push(
    ...buildDateConditions(
      "i.created_at",
      from,
      to,
      values
    )
  );

  const rows = db
    .prepare(
      `
      SELECT
        strftime(
          '%Y-%W',
          i.created_at
        ) AS week,

        COUNT(*) AS bill_count,

        COALESCE(
          SUM(i.total),
          0
        ) AS total_sales

      FROM invoices i

      WHERE ${conditions.join(" AND ")}

      GROUP BY strftime(
        '%Y-%W',
        i.created_at
      )

      ORDER BY week DESC
      `
    )
    .all(...values);

  return rows.map((row) => ({
    week: row.week,
    billCount: Number(row.bill_count || 0),
    totalSales: roundMoney(row.total_sales || 0),
  }));
}

/**
 * Monthly sales report.
 */
function getMonthlySales(options = {}) {
  const { from, to } =
    normalizeDateRange(options);

  const values = [];

  const conditions = [
    "i.payment_status != 'CANCELLED'",
  ];

  conditions.push(
    ...buildDateConditions(
      "i.created_at",
      from,
      to,
      values
    )
  );

  const rows = db
    .prepare(
      `
      SELECT
        strftime(
          '%Y-%m',
          i.created_at
        ) AS month,

        COUNT(*) AS bill_count,

        COALESCE(
          SUM(i.total),
          0
        ) AS total_sales

      FROM invoices i

      WHERE ${conditions.join(" AND ")}

      GROUP BY strftime(
        '%Y-%m',
        i.created_at
      )

      ORDER BY month DESC
      `
    )
    .all(...values);

  return rows.map((row) => ({
    month: row.month,
    billCount: Number(row.bill_count || 0),
    totalSales: roundMoney(row.total_sales || 0),
  }));
}

/**
 * Product-wise sales report.
 */
function getProductWiseSales(options = {}) {
  const { from, to } =
    normalizeDateRange(options);

  const values = [];

  const conditions = [
    "i.payment_status != 'CANCELLED'",
  ];

  conditions.push(
    ...buildDateConditions(
      "i.created_at",
      from,
      to,
      values
    )
  );

  const rows = db
    .prepare(
      `
      SELECT
        ii.product_id,

        ii.product_name,

        COUNT(DISTINCT i.id) AS bill_count,

        COALESCE(
          SUM(ii.quantity),
          0
        ) AS quantity_sold,

        COALESCE(
          SUM(ii.amount),
          0
        ) AS sales_amount

      FROM invoice_items ii

      INNER JOIN invoices i
        ON i.id = ii.invoice_id

      WHERE ${conditions.join(" AND ")}

      GROUP BY
        ii.product_id,
        ii.product_name

      ORDER BY sales_amount DESC
      `
    )
    .all(...values);

  return rows.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    billCount: Number(row.bill_count || 0),
    quantitySold: Number(row.quantity_sold || 0),
    salesAmount: roundMoney(row.sales_amount || 0),
  }));
}

/**
 * Payment-method-wise sales report.
 */
function getPaymentMethodWiseSales(options = {}) {
  const { from, to } =
    normalizeDateRange(options);

  const values = [];

  const conditions = [
    "i.payment_status != 'CANCELLED'",
  ];

  conditions.push(
    ...buildDateConditions(
      "i.created_at",
      from,
      to,
      values
    )
  );

  const rows = db
    .prepare(
      `
      SELECT
        i.payment_method AS payment_method,

        COUNT(*) AS bill_count,

        COALESCE(
          SUM(i.total),
          0
        ) AS total_sales

      FROM invoices i

      WHERE ${conditions.join(" AND ")}

      GROUP BY i.payment_method

      ORDER BY total_sales DESC
      `
    )
    .all(...values);

  return rows.map((row) => ({
    paymentMethod: row.payment_method,
    billCount: Number(row.bill_count || 0),
    totalSales: roundMoney(row.total_sales || 0),
  }));
}

/**
 * --------------------------------------------------------------------------
 * Inventory Reports
 * --------------------------------------------------------------------------
 */

/**
 * Current stock report.
 */
function getCurrentStockReport(options = {}) {
  const includeInactive =
    options.includeInactive === true;

  const conditions = [];

  if (!includeInactive) {
    conditions.push(
      "p.status = 'ACTIVE'"
    );
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const rows = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.sku,
        p.current_stock,
        p.minimum_stock,
        p.purchase_price,
        p.selling_price,
        p.unit,
        p.status

      FROM products p

      ${whereClause}

      ORDER BY
        p.name COLLATE NOCASE ASC
      `
    )
    .all();

  return rows.map((row) => ({
    productId: row.id,
    productName: row.name,
    sku: row.sku,
    currentStock: Number(
      row.current_stock || 0
    ),
    minimumStock: Number(
      row.minimum_stock || 0
    ),
    purchasePrice: roundMoney(
      row.purchase_price || 0
    ),
    sellingPrice: roundMoney(
      row.selling_price || 0
    ),
    unit: row.unit,
    status: row.status,

    stockValue: roundMoney(
      Number(row.current_stock || 0) *
      Number(row.purchase_price || 0)
    ),

    sellingValue: roundMoney(
      Number(row.current_stock || 0) *
      Number(row.selling_price || 0)
    ),

    isLowStock:
      Number(row.current_stock || 0) <=
      Number(row.minimum_stock || 0),
  }));
}

/**
 * Low-stock product report.
 */
function getLowStockProducts() {
  const rows = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.sku,
        p.current_stock,
        p.minimum_stock,
        p.unit,
        p.selling_price,
        p.purchase_price

      FROM products p

      WHERE
        p.status = 'ACTIVE'
        AND p.current_stock <= p.minimum_stock

      ORDER BY
        p.current_stock ASC,
        p.name COLLATE NOCASE ASC
      `
    )
    .all();

  return rows.map((row) => ({
    productId: row.id,
    productName: row.name,
    sku: row.sku,
    currentStock: Number(
      row.current_stock || 0
    ),
    minimumStock: Number(
      row.minimum_stock || 0
    ),
    unit: row.unit,
    purchasePrice: roundMoney(
      row.purchase_price || 0
    ),
    sellingPrice: roundMoney(
      row.selling_price || 0
    ),
    shortageQuantity: Math.max(
      0,
      Number(row.minimum_stock || 0) -
      Number(row.current_stock || 0)
    ),
  }));
}

/**
 * Stock movement report.
 */
function getStockMovementReport(options = {}) {
  const { from, to } =
    normalizeDateRange(options);

  const limit = Math.min(
    Math.max(
      Number(options.limit) || 200,
      1
    ),
    1000
  );

  const values = [];

  const conditions = [];

  conditions.push(
    ...buildDateConditions(
      "sm.created_at",
      from,
      to,
      values
    )
  );

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  values.push(limit);

  const rows = db
    .prepare(
      `
      SELECT
        sm.id,
        sm.transaction_id,
        sm.product_id,
        p.name AS product_name,
        p.sku,
        sm.type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.created_at,
        sm.updated_at,
        sm.sync_status,
        sm.device_id

      FROM stock_movements sm

      INNER JOIN products p
        ON p.id = sm.product_id

      ${whereClause}

      ORDER BY
        datetime(sm.created_at) DESC,
        sm.id DESC

      LIMIT ?
      `
    )
    .all(...values);

  return rows.map((row) => ({
    id: row.id,
    transactionId: row.transaction_id,
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    type: row.type,
    quantity: Number(row.quantity || 0),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  }));
}

/**
 * Inventory summary.
 */
function getInventorySummary() {
  const row = db
    .prepare(
      `
      SELECT

        COUNT(*) AS total_products,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'ACTIVE'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS active_products,

        COALESCE(
          SUM(
            CASE
              WHEN
                status = 'ACTIVE'
                AND current_stock <= minimum_stock
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS low_stock_products,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'ACTIVE'
              THEN current_stock * purchase_price
              ELSE 0
            END
          ),
          0
        ) AS stock_value

      FROM products
      `
    )
    .get();

  return {
    totalProducts: Number(
      row.total_products || 0
    ),
    activeProducts: Number(
      row.active_products || 0
    ),
    lowStockProducts: Number(
      row.low_stock_products || 0
    ),
    stockValue: roundMoney(
      row.stock_value || 0
    ),
  };
}

/**
 * --------------------------------------------------------------------------
 * Customer Reports
 * --------------------------------------------------------------------------
 */

/**
 * Customer purchase report.
 */
function getCustomerPurchasesReport(options = {}) {
  const { from, to } =
    normalizeDateRange(options);

  const values = [];

  const conditions = [
    "i.payment_status != 'CANCELLED'",
    "i.customer_id IS NOT NULL",
  ];

  conditions.push(
    ...buildDateConditions(
      "i.created_at",
      from,
      to,
      values
    )
  );

  const rows = db
    .prepare(
      `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.mobile,

        COUNT(i.id) AS bill_count,

        COALESCE(
          SUM(i.total),
          0
        ) AS total_purchases,

        MAX(i.created_at) AS last_purchase_at

      FROM customers c

      INNER JOIN invoices i
        ON i.customer_id = c.id

      WHERE ${conditions.join(" AND ")}

      GROUP BY
        c.id,
        c.name,
        c.mobile

      ORDER BY
        total_purchases DESC
      `
    )
    .all(...values);

  return rows.map((row) => ({
    customerId: row.customer_id,
    customerName: row.customer_name,
    mobile: row.mobile,
    billCount: Number(row.bill_count || 0),
    totalPurchases: roundMoney(
      row.total_purchases || 0
    ),
    lastPurchaseAt: row.last_purchase_at,
  }));
}

/**
 * Outstanding payment report.
 *
 * Uses actual payments rather than relying on cached customer
 * outstanding_amount values.
 */
function getOutstandingPaymentsReport() {
  const rows = db
    .prepare(
      `
      SELECT

        i.id AS invoice_id,

        i.invoice_number,

        c.id AS customer_id,

        c.name AS customer_name,

        c.mobile,

        i.total AS invoice_total,

        COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN p.status != 'CANCELLED'
                THEN p.amount
                ELSE 0
              END
            )
            FROM payments p
            WHERE p.invoice_id = i.id
          ),
          0
        ) AS paid_amount,

        (
          i.total -
          COALESCE(
            (
              SELECT SUM(
                CASE
                  WHEN p.status != 'CANCELLED'
                  THEN p.amount
                  ELSE 0
                END
              )
              FROM payments p
              WHERE p.invoice_id = i.id
            ),
            0
          )
        ) AS outstanding_amount,

        (
          SELECT p.due_date
          FROM payments p

          WHERE
            p.invoice_id = i.id
            AND p.due_date IS NOT NULL

          ORDER BY
            datetime(p.created_at) ASC

          LIMIT 1
        ) AS due_date,

        i.created_at

      FROM invoices i

      INNER JOIN customers c
        ON c.id = i.customer_id

      WHERE
        i.payment_method = 'CREDIT'
        AND i.payment_status != 'CANCELLED'

        AND (
          i.total -
          COALESCE(
            (
              SELECT SUM(
                CASE
                  WHEN p.status != 'CANCELLED'
                  THEN p.amount
                  ELSE 0
                END
              )
              FROM payments p
              WHERE p.invoice_id = i.id
            ),
            0
          )
        ) > 0.009

      ORDER BY
        CASE
          WHEN (
            SELECT p.due_date
            FROM payments p

            WHERE
              p.invoice_id = i.id
              AND p.due_date IS NOT NULL

            ORDER BY
              datetime(p.created_at) ASC

            LIMIT 1
          ) IS NULL
          THEN 1
          ELSE 0
        END,

        date(
          (
            SELECT p.due_date
            FROM payments p

            WHERE
              p.invoice_id = i.id
              AND p.due_date IS NOT NULL

            ORDER BY
              datetime(p.created_at) ASC

            LIMIT 1
          )
        ) ASC,

        datetime(i.created_at) ASC
      `
    )
    .all();

  return rows.map((row) => ({
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    mobile: row.mobile,

    invoiceTotal: roundMoney(
      row.invoice_total || 0
    ),

    paidAmount: roundMoney(
      row.paid_amount || 0
    ),

    outstandingAmount: roundMoney(
      row.outstanding_amount || 0
    ),

    dueDate: row.due_date || null,
    createdAt: row.created_at,

    paymentStatus:
      Number(row.paid_amount || 0) <= 0
        ? "PENDING"
        : "PARTIAL",
  }));
}

/**
 * Customer outstanding summary.
 */
function getCustomerOutstandingSummary() {
  const rows = db
    .prepare(
      `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.mobile,

        COALESCE(
          SUM(
            i.total -
            COALESCE(
              (
                SELECT SUM(
                  CASE
                    WHEN p.status != 'CANCELLED'
                    THEN p.amount
                    ELSE 0
                  END
                )
                FROM payments p
                WHERE p.invoice_id = i.id
              ),
              0
            )
          ),
          0
        ) AS outstanding_amount

      FROM customers c

      INNER JOIN invoices i
        ON i.customer_id = c.id

      WHERE
        i.payment_method = 'CREDIT'
        AND i.payment_status != 'CANCELLED'

      GROUP BY
        c.id,
        c.name,
        c.mobile

      HAVING outstanding_amount > 0.009

      ORDER BY
        outstanding_amount DESC
      `
    )
    .all();

  return rows.map((row) => ({
    customerId: row.customer_id,
    customerName: row.customer_name,
    mobile: row.mobile,
    outstandingAmount: roundMoney(
      row.outstanding_amount || 0
    ),
  }));
}

/**
 * --------------------------------------------------------------------------
 * Exports
 * --------------------------------------------------------------------------
 */

module.exports = {
  getSalesSummary,
  getDailySales,
  getWeeklySales,
  getMonthlySales,
  getProductWiseSales,
  getPaymentMethodWiseSales,

  getCurrentStockReport,
  getLowStockProducts,
  getStockMovementReport,
  getInventorySummary,

  getCustomerPurchasesReport,
  getOutstandingPaymentsReport,
  getCustomerOutstandingSummary,
};