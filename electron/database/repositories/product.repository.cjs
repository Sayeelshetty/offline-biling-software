const crypto = require("crypto");

const { getDatabase } = require("../connection.cjs");

/*
|--------------------------------------------------------------------------
| Product Row Mapper
|--------------------------------------------------------------------------
|
| SQLite uses snake_case column names.
| The rest of the application uses camelCase.
|
| SQLite:
| selling_price
|
| Application:
| sellingPrice
|
*/

function mapProductRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    serverId: row.server_id,

    name: row.name,
    sku: row.sku,
    barcode: row.barcode,

    categoryId: row.category_id,

    sellingPrice: row.selling_price,
    purchasePrice: row.purchase_price,

    gstRate: row.gst_rate,

    currentStock: row.current_stock,
    minimumStock: row.minimum_stock,

    unit: row.unit,

    imagePath: row.image_path,

    status: row.status,

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    syncStatus: row.sync_status,

    deviceId: row.device_id,
  };
}

/*
|--------------------------------------------------------------------------
| Create Product
|--------------------------------------------------------------------------
*/

function createProduct({
  name,
  sku,
  barcode = null,
  categoryId = null,
  sellingPrice = 0,
  purchasePrice = 0,
  gstRate = 0,
  currentStock = 0,
  minimumStock = 0,
  unit = "PCS",
  imagePath = null,
  status = "ACTIVE",
  deviceId,
}) {
  if (!name || !name.trim()) {
    throw new Error("Product name is required.");
  }

  if (!sku || !sku.trim()) {
    throw new Error("SKU is required.");
  }

  if (!deviceId) {
    throw new Error("Device ID is required.");
  }

  const database = getDatabase();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const statement = database.prepare(`
    INSERT INTO products (
      id,
      server_id,
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
      image_path,
      status,
      created_at,
      updated_at,
      sync_status,
      device_id
    )
    VALUES (
      @id,
      NULL,
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
      @imagePath,
      @status,
      @createdAt,
      @updatedAt,
      'PENDING',
      @deviceId
    )
  `);

  statement.run({
    id,
    name: name.trim(),
    sku: sku.trim(),
    barcode: barcode ? barcode.trim() : null,
    categoryId,
    sellingPrice,
    purchasePrice,
    gstRate,
    currentStock,
    minimumStock,
    unit,
    imagePath,
    status,
    createdAt: now,
    updatedAt: now,
    deviceId,
  });

  return findProductById(id);
}

/*
|--------------------------------------------------------------------------
| Find Product By ID
|--------------------------------------------------------------------------
*/

function findProductById(id) {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT *
      FROM products
      WHERE id = ?
    `)
    .get(id);

  return mapProductRow(row);
}

/*
|--------------------------------------------------------------------------
| Find Product By SKU
|--------------------------------------------------------------------------
*/

function findProductBySku(sku) {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT *
      FROM products
      WHERE sku = ?
    `)
    .get(sku);

  return mapProductRow(row);
}

/*
|--------------------------------------------------------------------------
| Find Product By Barcode
|--------------------------------------------------------------------------
*/

function findProductByBarcode(barcode) {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT *
      FROM products
      WHERE barcode = ?
    `)
    .get(barcode);

  return mapProductRow(row);
}

/*
|--------------------------------------------------------------------------
| Search Products
|--------------------------------------------------------------------------
*/

function searchProducts(
  searchTerm = "",
  includeInactive = false
) {
  const database = getDatabase();

  const searchPattern = `%${searchTerm.trim()}%`;

  let sql = `
    SELECT *
    FROM products
    WHERE (
      name LIKE @searchPattern
      OR sku LIKE @searchPattern
      OR barcode LIKE @searchPattern
    )
  `;

  if (!includeInactive) {
    sql += `
      AND status = 'ACTIVE'
    `;
  }

  sql += `
    ORDER BY name ASC
  `;

  const rows = database
    .prepare(sql)
    .all({
      searchPattern,
    });

  return rows.map(mapProductRow);
}

/*
|--------------------------------------------------------------------------
| Get All Products
|--------------------------------------------------------------------------
*/

function getAllProducts({
  includeInactive = false,
  categoryId = null,
} = {}) {
  const database = getDatabase();

  let sql = `
    SELECT *
    FROM products
    WHERE 1 = 1
  `;

  const parameters = {};

  if (!includeInactive) {
    sql += `
      AND status = 'ACTIVE'
    `;
  }

  if (categoryId) {
    sql += `
      AND category_id = @categoryId
    `;

    parameters.categoryId = categoryId;
  }

  sql += `
    ORDER BY name ASC
  `;

  const rows = database
    .prepare(sql)
    .all(parameters);

  return rows.map(mapProductRow);
}

/*
|--------------------------------------------------------------------------
| Update Product
|--------------------------------------------------------------------------
|
| Stock is intentionally NOT updated here.
| Inventory changes must go through stock movements.
|
*/

function updateProduct(
  id,
  {
    name,
    sku,
    barcode = null,
    categoryId = null,
    sellingPrice = 0,
    purchasePrice = 0,
    gstRate = 0,
    minimumStock = 0,
    unit = "PCS",
    imagePath = null,
    status = "ACTIVE",
  }
) {
  const database = getDatabase();

  const existingProduct = findProductById(id);

  if (!existingProduct) {
    throw new Error("Product not found.");
  }

  const now = new Date().toISOString();

  const statement = database.prepare(`
    UPDATE products
    SET
      name = @name,
      sku = @sku,
      barcode = @barcode,
      category_id = @categoryId,
      selling_price = @sellingPrice,
      purchase_price = @purchasePrice,
      gst_rate = @gstRate,
      minimum_stock = @minimumStock,
      unit = @unit,
      image_path = @imagePath,
      status = @status,
      updated_at = @updatedAt,
      sync_status = 'PENDING'
    WHERE id = @id
  `);

  statement.run({
    id,
    name: name.trim(),
    sku: sku.trim(),
    barcode: barcode ? barcode.trim() : null,
    categoryId,
    sellingPrice,
    purchasePrice,
    gstRate,
    minimumStock,
    unit,
    imagePath,
    status,
    updatedAt: now,
  });

  return findProductById(id);
}

/*
|--------------------------------------------------------------------------
| Deactivate Product
|--------------------------------------------------------------------------
*/

function deactivateProduct(id) {
  const database = getDatabase();

  const existingProduct = findProductById(id);

  if (!existingProduct) {
    throw new Error("Product not found.");
  }

  const now = new Date().toISOString();

  database
    .prepare(`
      UPDATE products
      SET
        status = 'INACTIVE',
        updated_at = @updatedAt,
        sync_status = 'PENDING'
      WHERE id = @id
    `)
    .run({
      id,
      updatedAt: now,
    });

  return findProductById(id);
}

/*
|--------------------------------------------------------------------------
| Activate Product
|--------------------------------------------------------------------------
*/

function activateProduct(id) {
  const database = getDatabase();

  const existingProduct = findProductById(id);

  if (!existingProduct) {
    throw new Error("Product not found.");
  }

  const now = new Date().toISOString();

  database
    .prepare(`
      UPDATE products
      SET
        status = 'ACTIVE',
        updated_at = @updatedAt,
        sync_status = 'PENDING'
      WHERE id = @id
    `)
    .run({
      id,
      updatedAt: now,
    });

  return findProductById(id);
}

/*
|--------------------------------------------------------------------------
| Low Stock Products
|--------------------------------------------------------------------------
*/

function getLowStockProducts() {
  const database = getDatabase();

  const rows = database
    .prepare(`
      SELECT *
      FROM products
      WHERE
        status = 'ACTIVE'
        AND current_stock <= minimum_stock
      ORDER BY current_stock ASC, name ASC
    `)
    .all();

  return rows.map(mapProductRow);
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  createProduct,
  findProductById,
  findProductBySku,
  findProductByBarcode,
  searchProducts,
  getAllProducts,
  updateProduct,
  deactivateProduct,
  activateProduct,
  getLowStockProducts,
};