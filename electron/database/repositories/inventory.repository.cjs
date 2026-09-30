const { randomUUID } = require("crypto");

const { getDatabase } = require("../connection.cjs");

/*
|--------------------------------------------------------------------------
| Map Database Row
|--------------------------------------------------------------------------
*/

function mapStockMovementRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    serverId: row.server_id,
    transactionId: row.transaction_id,
    productId: row.product_id,
    type: row.type,
    quantity: row.quantity,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

function validateProductId(productId) {
  if (!productId || !productId.trim()) {
    throw new Error("Product ID is required");
  }
}

function validateDeviceId(deviceId) {
  if (!deviceId || !deviceId.trim()) {
    throw new Error("Device ID is required");
  }
}

function validateQuantity(quantity) {
  const value = Number(quantity);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      "Quantity must be greater than zero"
    );
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| Get Product
|--------------------------------------------------------------------------
*/

function getProduct(productId) {
  const database = getDatabase();

  const product = database
    .prepare(`
      SELECT
        id,
        name,
        sku,
        current_stock,
        status
      FROM products
      WHERE id = ?
      LIMIT 1
    `)
    .get(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
}

/*
|--------------------------------------------------------------------------
| Create Stock Movement
|--------------------------------------------------------------------------
|
| STOCK_IN:
|   Adds quantity to current stock.
|
| STOCK_OUT:
|   Removes quantity from current stock.
|
| ADJUSTMENT:
|   Applies a signed quantity difference.
|   Example:
|     +10 = increase stock by 10
|     -5  = decrease stock by 5
|
| The stock update and movement record are
| committed in the same SQLite transaction.
|
|--------------------------------------------------------------------------
*/

function createStockMovement({
  productId,
  type,
  quantity,
  referenceType = null,
  referenceId = null,
  deviceId,
}) {
  const database = getDatabase();

  validateProductId(productId);
  validateDeviceId(deviceId);

  if (
    ![
      "STOCK_IN",
      "STOCK_OUT",
      "ADJUSTMENT",
    ].includes(type)
  ) {
    throw new Error(
      "Invalid stock movement type"
    );
  }

  const product = getProduct(productId);

  let movementQuantity;

  if (type === "ADJUSTMENT") {
    movementQuantity = Number(quantity);

    if (
      !Number.isFinite(movementQuantity) ||
      movementQuantity === 0
    ) {
      throw new Error(
        "Adjustment quantity cannot be zero"
      );
    }
  } else {
    movementQuantity =
      validateQuantity(quantity);
  }

  /*
  |--------------------------------------------------------------------------
  | Calculate New Stock
  |--------------------------------------------------------------------------
  */

  let newStock =
    Number(product.current_stock);

  if (type === "STOCK_IN") {
    newStock += movementQuantity;
  }

  if (type === "STOCK_OUT") {
    newStock -= movementQuantity;
  }

  if (type === "ADJUSTMENT") {
    newStock += movementQuantity;
  }

  if (newStock < 0) {
    throw new Error(
      `Insufficient stock. Current stock: ${product.current_stock}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Create Transaction IDs
  |--------------------------------------------------------------------------
  */

  const id = randomUUID();
  const transactionId = randomUUID();
  const now = new Date().toISOString();

  /*
  |--------------------------------------------------------------------------
  | SQLite Transaction
  |--------------------------------------------------------------------------
  */

  const transaction =
    database.transaction(() => {
      /*
      |--------------------------------------------------------------------------
      | Insert Movement
      |--------------------------------------------------------------------------
      */

      database
        .prepare(`
          INSERT INTO stock_movements (
            id,
            server_id,
            transaction_id,
            product_id,
            type,
            quantity,
            reference_type,
            reference_id,
            created_at,
            updated_at,
            sync_status,
            device_id
          )
          VALUES (
            @id,
            NULL,
            @transactionId,
            @productId,
            @type,
            @quantity,
            @referenceType,
            @referenceId,
            @createdAt,
            @updatedAt,
            'PENDING',
            @deviceId
          )
        `)
        .run({
          id,
          transactionId,
          productId,
          type,
          quantity: movementQuantity,
          referenceType,
          referenceId,
          createdAt: now,
          updatedAt: now,
          deviceId: deviceId.trim(),
        });

      /*
      |--------------------------------------------------------------------------
      | Update Product Stock
      |--------------------------------------------------------------------------
      */

      database
        .prepare(`
          UPDATE products
          SET
            current_stock = ?,
            updated_at = ?,
            sync_status = 'PENDING'
          WHERE id = ?
        `)
        .run(
          newStock,
          now,
          productId
        );

      /*
      |--------------------------------------------------------------------------
      | Return Movement + New Stock
      |--------------------------------------------------------------------------
      */

      const movement = database
        .prepare(`
          SELECT
            id,
            server_id,
            transaction_id,
            product_id,
            type,
            quantity,
            reference_type,
            reference_id,
            created_at,
            updated_at,
            sync_status,
            device_id
          FROM stock_movements
          WHERE id = ?
        `)
        .get(id);

      return {
        movement:
          mapStockMovementRow(
            movement
          ),
        currentStock: newStock,
      };
    });

  return transaction();
}

/*
|--------------------------------------------------------------------------
| Stock In
|--------------------------------------------------------------------------
*/

function stockIn({
  productId,
  quantity,
  referenceType = "MANUAL",
  referenceId = null,
  deviceId,
}) {
  return createStockMovement({
    productId,
    type: "STOCK_IN",
    quantity,
    referenceType,
    referenceId,
    deviceId,
  });
}

/*
|--------------------------------------------------------------------------
| Stock Out
|--------------------------------------------------------------------------
*/

function stockOut({
  productId,
  quantity,
  referenceType = "MANUAL",
  referenceId = null,
  deviceId,
}) {
  return createStockMovement({
    productId,
    type: "STOCK_OUT",
    quantity,
    referenceType,
    referenceId,
    deviceId,
  });
}

/*
|--------------------------------------------------------------------------
| Stock Adjustment
|--------------------------------------------------------------------------
*/

function adjustStock({
  productId,
  adjustmentQuantity,
  referenceType = "MANUAL",
  referenceId = null,
  deviceId,
}) {
  return createStockMovement({
    productId,
    type: "ADJUSTMENT",
    quantity: adjustmentQuantity,
    referenceType,
    referenceId,
    deviceId,
  });
}

/*
|--------------------------------------------------------------------------
| Get Current Stock
|--------------------------------------------------------------------------
*/

function getCurrentStock(productId) {
  validateProductId(productId);

  const product = getProduct(productId);

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    currentStock: Number(
      product.current_stock
    ),
    status: product.status,
  };
}

/*
|--------------------------------------------------------------------------
| Get Product Stock History
|--------------------------------------------------------------------------
*/

function getStockMovements(
  productId,
  limit = 100
) {
  validateProductId(productId);

  const database = getDatabase();

  const safeLimit = Math.min(
    Math.max(Number(limit) || 100, 1),
    500
  );

  const rows = database
    .prepare(`
      SELECT
        id,
        server_id,
        transaction_id,
        product_id,
        type,
        quantity,
        reference_type,
        reference_id,
        created_at,
        updated_at,
        sync_status,
        device_id
      FROM stock_movements
      WHERE product_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(
      productId,
      safeLimit
    );

  return rows.map(
    mapStockMovementRow
  );
}

/*
|--------------------------------------------------------------------------
| Get All Stock Movements
|--------------------------------------------------------------------------
*/

function getAllStockMovements(
  limit = 200
) {
  const database = getDatabase();

  const safeLimit = Math.min(
    Math.max(Number(limit) || 200, 1),
    1000
  );

  const rows = database
    .prepare(`
      SELECT
        id,
        server_id,
        transaction_id,
        product_id,
        type,
        quantity,
        reference_type,
        reference_id,
        created_at,
        updated_at,
        sync_status,
        device_id
      FROM stock_movements
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(safeLimit);

  return rows.map(
    mapStockMovementRow
  );
}

/*
|--------------------------------------------------------------------------
| Get Product Stock Summary
|--------------------------------------------------------------------------
*/

function getStockSummary() {
  const database = getDatabase();

  const rows = database
    .prepare(`
      SELECT
        p.id,
        p.name,
        p.sku,
        p.current_stock,
        p.minimum_stock,
        p.purchase_price,
        p.selling_price,
        p.unit,
        p.status,

        COALESCE(
          SUM(
            CASE
              WHEN sm.type = 'STOCK_IN'
                THEN sm.quantity

              WHEN sm.type = 'STOCK_OUT'
                THEN -sm.quantity

              WHEN sm.type = 'ADJUSTMENT'
                THEN sm.quantity

              ELSE 0
            END
          ),
          0
        ) AS net_movement

      FROM products p

      LEFT JOIN stock_movements sm
        ON sm.product_id = p.id

      GROUP BY
        p.id,
        p.name,
        p.sku,
        p.current_stock,
        p.minimum_stock,
        p.purchase_price,
        p.selling_price,
        p.unit,
        p.status

      ORDER BY
        p.name COLLATE NOCASE ASC
    `)
    .all();

  return rows.map((row) => ({
    productId: row.id,
    name: row.name,
    sku: row.sku,
    currentStock: Number(
      row.current_stock
    ),
    minimumStock: Number(
      row.minimum_stock
    ),
    purchasePrice: Number(
      row.purchase_price
    ),
    sellingPrice: Number(
      row.selling_price
    ),
    unit: row.unit,
    status: row.status,
    netMovement: Number(
      row.net_movement
    ),
    stockValue:
      Number(row.current_stock) *
      Number(row.purchase_price),
  }));
}

module.exports = {
  createStockMovement,
  stockIn,
  stockOut,
  adjustStock,
  getCurrentStock,
  getStockMovements,
  getAllStockMovements,
  getStockSummary,
};