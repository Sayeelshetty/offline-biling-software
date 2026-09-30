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
    totalPurchases: Number(row.total_purchases ?? 0),
    outstandingAmount: Number(row.outstanding_amount ?? 0),
    serverId: row.server_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

function validateCustomerInput(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Customer data is required.");
  }

  const name = String(input.name ?? "").trim();
  const mobile = String(input.mobile ?? "").trim();

  if (!name) {
    throw new Error("Customer name is required.");
  }

  if (!mobile) {
    throw new Error("Customer mobile number is required.");
  }

  if (!/^[0-9+\-\s()]{7,20}$/.test(mobile)) {
    throw new Error("Invalid customer mobile number.");
  }

  return {
    name,
    mobile,
    email:
      input.email === null ||
      input.email === undefined
        ? null
        : String(input.email).trim() || null,
    address:
      input.address === null ||
      input.address === undefined
        ? null
        : String(input.address).trim() || null,
    deviceId: String(input.deviceId ?? "").trim(),
  };
}

function getCustomerById(id) {
  const row = db
    .prepare(
      `
      SELECT
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
      FROM customers
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(id);

  return mapCustomerRow(row);
}

function getCustomerByMobile(mobile) {
  const normalizedMobile = String(mobile ?? "").trim();

  if (!normalizedMobile) {
    return null;
  }

  const row = db
    .prepare(
      `
      SELECT
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
      FROM customers
      WHERE mobile = ?
      LIMIT 1
      `
    )
    .get(normalizedMobile);

  return mapCustomerRow(row);
}

function createCustomer(input) {
  const customer = validateCustomerInput(input);

  if (!customer.deviceId) {
    throw new Error("Device ID is required.");
  }

  const existingCustomer = getCustomerByMobile(
    customer.mobile
  );

  if (existingCustomer) {
    throw new Error(
      `A customer with mobile number ${customer.mobile} already exists.`
    );
  }

  const id = createId();

  // The customers table requires both timestamps.
  const now = new Date().toISOString();

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
  const customer = validateCustomerInput({
    ...input,
    deviceId: "LOCAL-UPDATE",
  });

  const existingCustomer = getCustomerById(id);

  if (!existingCustomer) {
    throw new Error("Customer not found.");
  }

  const duplicateCustomer = getCustomerByMobile(
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

  const updatedAt = new Date().toISOString();

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
      SELECT
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
      FROM customers
      ORDER BY name COLLATE NOCASE ASC
      `
    )
    .all();

  return rows.map(mapCustomerRow);
}

function searchCustomers(searchTerm) {
  const term = String(searchTerm ?? "").trim();

  if (!term) {
    return getAllCustomers();
  }

  const pattern = `%${term}%`;

  const rows = db
    .prepare(
      `
      SELECT
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
      FROM customers
      WHERE
        name LIKE ? COLLATE NOCASE
        OR mobile LIKE ?
        OR email LIKE ? COLLATE NOCASE
      ORDER BY name COLLATE NOCASE ASC
      `
    )
    .all(pattern, pattern, pattern);

  return rows.map(mapCustomerRow);
}

function getOutstandingCustomers() {
  const rows = db
    .prepare(
      `
      SELECT
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
      FROM customers
      WHERE outstanding_amount > 0
      ORDER BY outstanding_amount DESC, name COLLATE NOCASE ASC
      `
    )
    .all();

  return rows.map(mapCustomerRow);
}

function updateCustomerFinancials(
  customerId,
  purchaseAmountDelta = 0,
  outstandingAmountDelta = 0
) {
  const purchaseDelta = Number(purchaseAmountDelta);
  const outstandingDelta = Number(
    outstandingAmountDelta
  );

  if (
    !Number.isFinite(purchaseDelta) ||
    !Number.isFinite(outstandingDelta)
  ) {
    throw new Error(
      "Financial amounts must be valid numbers."
    );
  }

  const customer = getCustomerById(customerId);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const nextOutstanding =
    customer.outstandingAmount + outstandingDelta;

  if (nextOutstanding < 0) {
    throw new Error(
      "Customer outstanding amount cannot be negative."
    );
  }

  const updatedAt = new Date().toISOString();

  db.prepare(
    `
    UPDATE customers
    SET
      total_purchases = total_purchases + ?,
      outstanding_amount = outstanding_amount + ?,
      updated_at = ?,
      sync_status = 'PENDING'
    WHERE id = ?
    `
  ).run(
    purchaseDelta,
    outstandingDelta,
    updatedAt,
    customerId
  );

  return getCustomerById(customerId);
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