const crypto = require("crypto");

const { getDatabase } = require("../connection.cjs");

const db = getDatabase();

const ALLOWED_PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "CARD",
  "CREDIT",
  "OTHER",
];

const PAYMENT_COLLECTION_METHODS = [
  "CASH",
  "UPI",
  "CARD",
  "OTHER",
];

const ALLOWED_PAYMENT_STATUSES = [
  "PAID",
  "PENDING",
  "PARTIAL",
  "CANCELLED",
];

function generateId() {
  return crypto.randomUUID();
}

function generateTransactionId(prefix = "PAY") {
  return `${prefix}-${crypto.randomUUID()}`;
}

function mapPaymentRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    serverId: row.server_id ?? null,

    transactionId: row.transaction_id,

    invoiceId: row.invoice_id,
    customerId: row.customer_id ?? null,

    amount: Number(row.amount),

    method: row.method,

    dueDate: row.due_date ?? null,

    status: row.status,

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    syncStatus: row.sync_status,
    deviceId: row.device_id,

    invoiceNumber: row.invoice_number ?? "",
    customerName: row.customer_name ?? null,
  };
}

function validateDeviceId(deviceId) {
  if (
    typeof deviceId !== "string" ||
    !deviceId.trim()
  ) {
    throw new Error("Device ID is required.");
  }
}

function validateInvoiceId(invoiceId) {
  if (
    typeof invoiceId !== "string" ||
    !invoiceId.trim()
  ) {
    throw new Error("Invoice ID is required.");
  }
}

function validateCustomerId(customerId) {
  if (
    typeof customerId !== "string" ||
    !customerId.trim()
  ) {
    throw new Error("Customer ID is required.");
  }
}

function validatePaymentMethod(method) {
  if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
    throw new Error(
      `Invalid payment method. Allowed methods: ${ALLOWED_PAYMENT_METHODS.join(
        ", "
      )}.`
    );
  }
}

function validateCollectionMethod(method) {
  if (!PAYMENT_COLLECTION_METHODS.includes(method)) {
    throw new Error(
      "Outstanding payments can be collected using Cash, UPI, Card, or Other."
    );
  }
}

function validatePaymentStatus(status) {
  if (!ALLOWED_PAYMENT_STATUSES.includes(status)) {
    throw new Error(
      `Invalid payment status. Allowed statuses: ${ALLOWED_PAYMENT_STATUSES.join(
        ", "
      )}.`
    );
  }
}

function validateAmount(amount) {
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getPaymentById(paymentId) {
  if (
    typeof paymentId !== "string" ||
    !paymentId.trim()
  ) {
    throw new Error("Payment ID is required.");
  }

  const row = db
    .prepare(
      `
      SELECT
        p.*,
        i.invoice_number,
        c.name AS customer_name
      FROM payments p
      LEFT JOIN invoices i
        ON i.id = p.invoice_id
      LEFT JOIN customers c
        ON c.id = p.customer_id
      WHERE p.id = ?
      LIMIT 1
      `
    )
    .get(paymentId);

  return mapPaymentRow(row);
}

function getPayments(options = {}) {
  const {
    status = null,
    customerId = null,
    invoiceId = null,
  } = options;

  if (status !== null) {
    validatePaymentStatus(status);
  }

  if (customerId !== null) {
    validateCustomerId(customerId);
  }

  if (invoiceId !== null) {
    validateInvoiceId(invoiceId);
  }

  const conditions = [];
  const values = [];

  if (status !== null) {
    conditions.push("p.status = ?");
    values.push(status);
  }

  if (customerId !== null) {
    conditions.push("p.customer_id = ?");
    values.push(customerId);
  }

  if (invoiceId !== null) {
    conditions.push("p.invoice_id = ?");
    values.push(invoiceId);
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const rows = db
    .prepare(
      `
      SELECT
        p.*,
        i.invoice_number,
        c.name AS customer_name
      FROM payments p
      LEFT JOIN invoices i
        ON i.id = p.invoice_id
      LEFT JOIN customers c
        ON c.id = p.customer_id
      ${whereClause}
      ORDER BY
        datetime(p.created_at) DESC,
        p.id DESC
      `
    )
    .all(...values);

  return rows.map(mapPaymentRow);
}

function getOutstandingPayments() {
  const rows = db
    .prepare(
      `
      SELECT
        i.id AS invoice_id,
        i.invoice_number,

        c.id AS customer_id,
        c.name AS customer_name,

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

    invoiceTotal: roundMoney(
      Number(row.invoice_total)
    ),

    paidAmount: roundMoney(
      Number(row.paid_amount)
    ),

    outstandingAmount: roundMoney(
      Number(row.outstanding_amount)
    ),

    dueDate: row.due_date ?? null,

    paymentStatus:
      Number(row.paid_amount) <= 0
        ? "PENDING"
        : "PARTIAL",

    createdAt: row.created_at,
  }));
}

function getPaymentSummary() {
  const paymentTotals = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total_payments,

        COALESCE(
          SUM(
            CASE
              WHEN status != 'CANCELLED'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS total_paid

      FROM payments
      `
    )
    .get();

  const outstandingTotals = db
    .prepare(
      `
      SELECT
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
        ) AS total_outstanding

      FROM invoices i

      WHERE
        i.payment_method = 'CREDIT'
        AND i.payment_status != 'CANCELLED'
      `
    )
    .get();

  return {
    totalPayments: Number(
      paymentTotals.total_payments
    ),

    totalPaid: roundMoney(
      Number(paymentTotals.total_paid)
    ),

    totalOutstanding: roundMoney(
      Number(
        outstandingTotals.total_outstanding
      )
    ),
  };
}

function recordPayment(input) {
  const {
    invoiceId,
    customerId,
    amount,
    method,
    dueDate = null,
    deviceId,
  } = input || {};

  validateInvoiceId(invoiceId);
  validateCustomerId(customerId);
  validateAmount(amount);
  validateCollectionMethod(method);
  validateDeviceId(deviceId);

  if (
    dueDate !== null &&
    (typeof dueDate !== "string" ||
      !dueDate.trim())
  ) {
    throw new Error(
      "Due date must be a valid date string or null."
    );
  }

  const transaction = db.transaction(() => {
    const invoice = db
      .prepare(
        `
        SELECT
          id,
          customer_id,
          total,
          payment_method,
          payment_status
        FROM invoices
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found.");
    }

    if (invoice.payment_status === "CANCELLED") {
      throw new Error(
        "Cannot record payment for a cancelled invoice."
      );
    }

    if (invoice.payment_method !== "CREDIT") {
      throw new Error(
        "This payment screen is intended for credit invoices."
      );
    }

    if (invoice.customer_id !== customerId) {
      throw new Error(
        "The selected customer does not match the invoice customer."
      );
    }

    const paidRow = db
      .prepare(
        `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN status != 'CANCELLED'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount
        FROM payments
        WHERE invoice_id = ?
        `
      )
      .get(invoiceId);

    const paidAmount = roundMoney(
      Number(paidRow.paid_amount)
    );

    const invoiceTotal = roundMoney(
      Number(invoice.total)
    );

    const outstandingAmount = roundMoney(
      invoiceTotal - paidAmount
    );

    if (outstandingAmount <= 0.009) {
      throw new Error(
        "This invoice is already fully paid."
      );
    }

    if (amount > outstandingAmount + 0.009) {
      throw new Error(
        `Payment cannot exceed the outstanding amount of ₹${outstandingAmount.toFixed(
          2
        )}.`
      );
    }

    const paymentAmount = roundMoney(amount);

    const now = new Date().toISOString();

    const paymentId = generateId();

    const transactionId =
      generateTransactionId("PAY");

    db.prepare(
      `
      INSERT INTO payments (
        id,
        server_id,
        transaction_id,
        invoice_id,
        customer_id,
        amount,
        method,
        due_date,
        status,
        created_at,
        updated_at,
        sync_status,
        device_id
      )
      VALUES (
        ?,
        NULL,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'PAID',
        ?,
        ?,
        'PENDING',
        ?
      )
      `
    ).run(
      paymentId,
      transactionId,
      invoiceId,
      customerId,
      paymentAmount,
      method,
      dueDate,
      now,
      now,
      deviceId
    );

    const newPaidAmount = roundMoney(
      paidAmount + paymentAmount
    );

    const newOutstandingAmount = roundMoney(
      invoiceTotal - newPaidAmount
    );

    const newInvoiceStatus =
      newOutstandingAmount <= 0.009
        ? "PAID"
        : "PARTIAL";

    db.prepare(
      `
      UPDATE invoices
      SET
        payment_status = ?,
        updated_at = ?
      WHERE id = ?
      `
    ).run(
      newInvoiceStatus,
      now,
      invoiceId
    );

    db.prepare(
  `
  INSERT INTO sync_queue (
    id,
    entity_type,
    entity_id,
    operation,
    payload,
    status,
    device_id,
    created_at,
    updated_at
  )
  VALUES (
    ?,
    'PAYMENT',
    ?,
    'CREATE',
    ?,
    'PENDING',
    ?,
    ?,
    ?
  )
  `
).run(
  generateId(),
  paymentId,
  JSON.stringify({
    paymentId,
    transactionId,
    invoiceId,
    customerId,
    amount: paymentAmount,
    method,
    dueDate,
    status: "PAID",
    deviceId,
  }),
  deviceId,
  now,
  now
);

    const payment = getPaymentById(
      paymentId
    );

    return {
      payment,
      invoice: {
        id: invoice.id,
        invoiceTotal,
        previousPaidAmount: paidAmount,
        paidAmount: newPaidAmount,
        outstandingAmount:
          newOutstandingAmount,
        paymentStatus:
          newInvoiceStatus,
      },
    };
  });

  return transaction();
}

module.exports = {
  getPaymentById,
  getPayments,
  getOutstandingPayments,
  getPaymentSummary,
  recordPayment,
};