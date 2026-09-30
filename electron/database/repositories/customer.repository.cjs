const crypto = require("crypto");

const { getDatabase } = require("../connection.cjs");

const db = getDatabase();

function createId() {
  return crypto.randomUUID();
}

function mapCustomerRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    email: row.email ?? null,
    address: row.address ?? null,

    totalPurchases: Number(
      row.total_purchases ?? 0
    ),

    outstandingAmount: Number(
      row.outstanding_amount ?? 0
    ),

    serverId: row.server_id ?? null,

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

function validateCustomerInput(input) {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new Error(
      "Customer data is required."
    );
  }

  const name = String(
    input.name ?? ""
  ).trim();

  const mobile = String(
    input.mobile ?? ""
  ).trim();

  if (!name) {
    throw new Error(
      "Customer name is required."
    );
  }

  if (!mobile) {
    throw new Error(
      "Customer mobile number is required."
    );
  }

  if (
    !/^[0-9+\\-\s()]{7,20}$/.test(
      mobile
    )
  ) {
    throw new Error(
      "Invalid customer mobile number."
    );
  }

  return {
    name,

    mobile,

    email:
      input.email === null ||
      input.email === undefined
        ? null
        : String(input.email)
            .trim() || null,

    address:
      input.address === null ||
      input.address === undefined
        ? null
        : String(input.address)
            .trim() || null,

    deviceId: String(
      input.deviceId ?? ""
    ).trim(),
  };
}

/*
 * IMPORTANT:
 *
 * Customer financial values are calculated
 * from invoices + payments.
 *
 * This avoids stale values in:
 *
 * customers.outstanding_amount
 * customers.total_purchases
 */
function getComputedFinancials(
  customerId
) {
  const row = db
    .prepare(
      `
      WITH invoice_payments AS (
        SELECT
          p.invoice_id,

          COALESCE(
            SUM(
              CASE
                WHEN p.status != 'CANCELLED'
                THEN p.amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount

        FROM payments p

        GROUP BY p.invoice_id
      ),

      customer_invoices AS (
        SELECT
          i.id,
          i.customer_id,
          i.total,
          i.payment_method,
          i.payment_status,

          COALESCE(
            ip.paid_amount,
            0
          ) AS paid_amount

        FROM invoices i

        LEFT JOIN invoice_payments ip
          ON ip.invoice_id = i.id

        WHERE
          i.customer_id = ?
          AND i.payment_status != 'CANCELLED'
      )

      SELECT
        COALESCE(
          SUM(total),
          0
        ) AS total_purchases,

        COALESCE(
          SUM(
            CASE
              WHEN payment_method = 'CREDIT'
              THEN
                CASE
                  WHEN total - paid_amount > 0
                  THEN total - paid_amount
                  ELSE 0
                END
              ELSE 0
            END
          ),
          0
        ) AS outstanding_amount

      FROM customer_invoices
      `
    )
    .get(customerId);

  return {
    totalPurchases: Number(
      row?.total_purchases ?? 0
    ),

    outstandingAmount: Number(
      row?.outstanding_amount ?? 0
    ),
  };
}

function getCustomerById(id) {
  const row = db
    .prepare(
      `
      WITH invoice_payments AS (
        SELECT
          p.invoice_id,

          COALESCE(
            SUM(
              CASE
                WHEN p.status != 'CANCELLED'
                THEN p.amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount

        FROM payments p

        GROUP BY p.invoice_id
      ),

      customer_financials AS (
        SELECT
          i.customer_id,

          COALESCE(
            SUM(i.total),
            0
          ) AS total_purchases,

          COALESCE(
            SUM(
              CASE
                WHEN i.payment_method = 'CREDIT'
                THEN
                  CASE
                    WHEN (
                      i.total -
                      COALESCE(
                        ip.paid_amount,
                        0
                      )
                    ) > 0
                    THEN (
                      i.total -
                      COALESCE(
                        ip.paid_amount,
                        0
                      )
                    )
                    ELSE 0
                  END
                ELSE 0
              END
            ),
            0
          ) AS outstanding_amount

        FROM invoices i

        LEFT JOIN invoice_payments ip
          ON ip.invoice_id = i.id

        WHERE
          i.payment_status != 'CANCELLED'

        GROUP BY i.customer_id
      )

      SELECT
        c.id,
        c.name,
        c.mobile,
        c.email,
        c.address,

        COALESCE(
          cf.total_purchases,
          0
        ) AS total_purchases,

        COALESCE(
          cf.outstanding_amount,
          0
        ) AS outstanding_amount,

        c.server_id,
        c.created_at,
        c.updated_at,
        c.sync_status,
        c.device_id

      FROM customers c

      LEFT JOIN customer_financials cf
        ON cf.customer_id = c.id

      WHERE c.id = ?

      LIMIT 1
      `
    )
    .get(id);

  return mapCustomerRow(row);
}

function getCustomerByMobile(mobile) {
  const normalizedMobile = String(
    mobile ?? ""
  ).trim();

  if (!normalizedMobile) {
    return null;
  }

  const row = db
    .prepare(
      `
      WITH invoice_payments AS (
        SELECT
          p.invoice_id,

          COALESCE(
            SUM(
              CASE
                WHEN p.status != 'CANCELLED'
                THEN p.amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount

        FROM payments p

        GROUP BY p.invoice_id
      ),

      customer_financials AS (
        SELECT
          i.customer_id,

          COALESCE(
            SUM(i.total),
            0
          ) AS total_purchases,

          COALESCE(
            SUM(
              CASE
                WHEN i.payment_method = 'CREDIT'
                THEN
                  CASE
                    WHEN (
                      i.total -
                      COALESCE(
                        ip.paid_amount,
                        0
                      )
                    ) > 0
                    THEN (
                      i.total -
                      COALESCE(
                        ip.paid_amount,
                        0
                      )
                    )
                    ELSE 0
                  END
                ELSE 0
              END
            ),
            0
          ) AS outstanding_amount

        FROM invoices i

        LEFT JOIN invoice_payments ip
          ON ip.invoice_id = i.id

        WHERE
          i.payment_status != 'CANCELLED'

        GROUP BY i.customer_id
      )

      SELECT
        c.id,
        c.name,
        c.mobile,
        c.email,
        c.address,

        COALESCE(
          cf.total_purchases,
          0
        ) AS total_purchases,

        COALESCE(
          cf.outstanding_amount,
          0
        ) AS outstanding_amount,

        c.server_id,
        c.created_at,
        c.updated_at,
        c.sync_status,
        c.device_id

      FROM customers c

      LEFT JOIN customer_financials cf
        ON cf.customer_id = c.id

      WHERE c.mobile = ?

      LIMIT 1
      `
    )
    .get(normalizedMobile);

  return mapCustomerRow(row);
}

function createCustomer(input) {
  const customer =
    validateCustomerInput(input);

  if (!customer.deviceId) {
    throw new Error(
      "Device ID is required."
    );
  }

  const existingCustomer =
    getCustomerByMobile(
      customer.mobile
    );

  if (existingCustomer) {
    throw new Error(
      `A customer with mobile number ${customer.mobile} already exists.`
    );
  }

  const id = createId();

  const now =
    new Date().toISOString();

  const insert = db.prepare(
    `
    INSERT INTO customers (
      id,
      name,
      mobile,
      email,
      address,
      total_purchases,
      outstanding_amount,
      server_id,
      created_at,
      updated_at,
      sync_status,
      device_id
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      0,
      0,
      NULL,
      ?,
      ?,
      'PENDING',
      ?
    )
    `
  );

  insert.run(
    id,
    customer.name,
    customer.mobile,
    customer.email,
    customer.address,
    now,
    now,
    customer.deviceId
  );

  return getCustomerById(id);
}

function updateCustomer(id, input) {
  const customer =
    validateCustomerInput({
      ...input,
      deviceId: "LOCAL-UPDATE",
    });

  const existingCustomer =
    getCustomerById(id);

  if (!existingCustomer) {
    throw new Error(
      "Customer not found."
    );
  }

  const duplicateCustomer =
    getCustomerByMobile(
      customer.mobile
    );

  if (
    duplicateCustomer &&
    duplicateCustomer.id !== id
  ) {
    throw new Error(
      `A customer with mobile number ${customer.mobile} already exists.`
    );
  }

  const updatedAt =
    new Date().toISOString();

  db.prepare(
    `
    UPDATE customers
    SET
      name = ?,
      mobile = ?,
      email = ?,
      address = ?,
      updated_at = ?,
      sync_status = 'PENDING'
    WHERE id = ?
    `
  ).run(
    customer.name,
    customer.mobile,
    customer.email,
    customer.address,
    updatedAt,
    id
  );

  return getCustomerById(id);
}

function getAllCustomers() {
  const rows = db
    .prepare(
      `
      WITH invoice_payments AS (
        SELECT
          p.invoice_id,

          COALESCE(
            SUM(
              CASE
                WHEN p.status != 'CANCELLED'
                THEN p.amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount

        FROM payments p

        GROUP BY p.invoice_id
      ),

      customer_financials AS (
        SELECT
          i.customer_id,

          COALESCE(
            SUM(i.total),
            0
          ) AS total_purchases,

          COALESCE(
            SUM(
              CASE
                WHEN i.payment_method = 'CREDIT'
                THEN
                  CASE
                    WHEN (
                      i.total -
                      COALESCE(
                        ip.paid_amount,
                        0
                      )
                    ) > 0
                    THEN (
                      i.total -
                      COALESCE(
                        ip.paid_amount,
                        0
                      )
                    )
                    ELSE 0
                  END
                ELSE 0
              END
            ),
            0
          ) AS outstanding_amount

        FROM invoices i

        LEFT JOIN invoice_payments ip
          ON ip.invoice_id = i.id

        WHERE
          i.payment_status != 'CANCELLED'

        GROUP BY i.customer_id
      )

      SELECT
        c.id,
        c.name,
        c.mobile,
        c.email,
        c.address,

        COALESCE(
          cf.total_purchases,
          0
        ) AS total_purchases,

        COALESCE(
          cf.outstanding_amount,
          0
        ) AS outstanding_amount,

        c.server_id,
        c.created_at,
        c.updated_at,
        c.sync_status,
        c.device_id

      FROM customers c

      LEFT JOIN customer_financials cf
        ON cf.customer_id = c.id

      ORDER BY
        c.name COLLATE NOCASE ASC
      `
    )
    .all();

  return rows.map(mapCustomerRow);
}

function searchCustomers(searchTerm) {
  const term = String(
    searchTerm ?? ""
  ).trim();

  if (!term) {
    return getAllCustomers();
  }

  const pattern = `%${term}%`;

  const rows = db
    .prepare(
      `
      WITH invoice_payments AS (
        SELECT
          p.invoice_id,

          COALESCE(
            SUM(
              CASE
                WHEN p.status != 'CANCELLED'
                THEN p.amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount

        FROM payments p

        GROUP BY p.invoice_id
      ),

      customer_financials AS (
        SELECT
          i.customer_id,

          COALESCE(
            SUM(i.total),
            0
          ) AS total_purchases,

          COALESCE(
            SUM(
              CASE
                WHEN i.payment_method = 'CREDIT'
                THEN
                  CASE
                    WHEN (
                      i.total -
                      COALESCE(
                        ip.paid_amount,
                        0
                      )
                    ) > 0
                    THEN (
                      i.total -
                      COALESCE(
                        ip.paid_amount,
                        0
                      )
                    )
                    ELSE 0
                  END
                ELSE 0
              END
            ),
            0
          ) AS outstanding_amount

        FROM invoices i

        LEFT JOIN invoice_payments ip
          ON ip.invoice_id = i.id

        WHERE
          i.payment_status != 'CANCELLED'

        GROUP BY i.customer_id
      )

      SELECT
        c.id,
        c.name,
        c.mobile,
        c.email,
        c.address,

        COALESCE(
          cf.total_purchases,
          0
        ) AS total_purchases,

        COALESCE(
          cf.outstanding_amount,
          0
        ) AS outstanding_amount,

        c.server_id,
        c.created_at,
        c.updated_at,
        c.sync_status,
        c.device_id

      FROM customers c

      LEFT JOIN customer_financials cf
        ON cf.customer_id = c.id

      WHERE
        c.name LIKE ? COLLATE NOCASE
        OR c.mobile LIKE ?
        OR c.email LIKE ? COLLATE NOCASE

      ORDER BY
        c.name COLLATE NOCASE ASC
      `
    )
    .all(
      pattern,
      pattern,
      pattern
    );

  return rows.map(mapCustomerRow);
}

function getOutstandingCustomers() {
  const customers =
    getAllCustomers();

  return customers.filter(
    (customer) =>
      customer.outstandingAmount >
      0.009
  );
}

/*
 * Kept for compatibility with the
 * existing invoice/payment code.
 *
 * Instead of blindly adding deltas to
 * cached financial values, refresh the
 * values from actual invoices/payments.
 */
function updateCustomerFinancials(
  customerId,
  purchaseAmountDelta = 0,
  outstandingAmountDelta = 0
) {
  const purchaseDelta = Number(
    purchaseAmountDelta
  );

  const outstandingDelta = Number(
    outstandingAmountDelta
  );

  if (
    !Number.isFinite(
      purchaseDelta
    ) ||
    !Number.isFinite(
      outstandingDelta
    )
  ) {
    throw new Error(
      "Financial amounts must be valid numbers."
    );
  }

  const customer =
    db.prepare(
      `
      SELECT id
      FROM customers
      WHERE id = ?
      LIMIT 1
      `
    ).get(customerId);

  if (!customer) {
    throw new Error(
      "Customer not found."
    );
  }

  const financials =
    getComputedFinancials(
      customerId
    );

  const updatedAt =
    new Date().toISOString();

  db.prepare(
    `
    UPDATE customers
    SET
      total_purchases = ?,
      outstanding_amount = ?,
      updated_at = ?,
      sync_status = 'PENDING'
    WHERE id = ?
    `
  ).run(
    financials.totalPurchases,
    financials.outstandingAmount,
    updatedAt,
    customerId
  );

  return getCustomerById(
    customerId
  );
}

module.exports = {
  getCustomerById,
  getCustomerByMobile,
  createCustomer,
  updateCustomer,
  getAllCustomers,
  searchCustomers,
  getOutstandingCustomers,
  updateCustomerFinancials,
};