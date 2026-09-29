const { randomUUID } = require("crypto");
const { getDatabase } = require("../connection.cjs");

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
| Validation Helpers
|--------------------------------------------------------------------------
*/

function validateProductName(name) {
  if (!name || !name.trim()) {
    throw new Error("Product name is required");
  }
}

function validateSku(sku) {
  if (!sku || !sku.trim()) {
    throw new Error("SKU is required");
  }
}

function validateDeviceId(deviceId) {
  if (!deviceId || !deviceId.trim()) {
    throw new Error("Device ID is required");
  }
}

function validateCategoryId(categoryId) {
  if (categoryId === null || categoryId === undefined || categoryId === "") {
    return;
  }

  const database = getDatabase();

  const category = database
    .prepare(`
      SELECT id
      FROM categories
      WHERE id = ?
    `)
    .get(categoryId);

  if (!category) {
    throw new Error("Selected category was not found");
  }
}

/*
|--------------------------------------------------------------------------
| Create Product
|--------------------------------------------------------------------------
*/

function createProduct(productData) {
  const database = getDatabase();

  const {
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
  } = productData || {};

  validateProductName(name);
  validateSku(sku);
  validateDeviceId(deviceId);
  validateCategoryId(categoryId);

  const id = randomUUID();
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
    categoryId: categoryId || null,
    sellingPrice: Number(sellingPrice),
    purchasePrice: Number(purchasePrice),
    gstRate: Number(gstRate),
    currentStock: Number(currentStock),
    minimumStock: Number(minimumStock),
    unit: unit.trim(),
    imagePath: imagePath || null,
    status,
    createdAt: now,
    updatedAt: now,
    deviceId: deviceId.trim(),
  });

  return findProductById(id);
}

/*
|--------------------------------------------------------------------------
| Find Product
|--------------------------------------------------------------------------
*/

function findProductById(id) {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT
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
      FROM products
      WHERE id = ?
    `)
    .get(id);

  return mapProductRow(row);
}

function findProductBySku(sku) {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT
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
      FROM products
      WHERE LOWER(sku) = LOWER(?)
      LIMIT 1
    `)
    .get(sku.trim());

  return mapProductRow(row);
}

function findProductByBarcode(barcode) {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT
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
      FROM products
      WHERE barcode = ?
      LIMIT 1
    `)
    .get(barcode.trim());

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

  const search = `%${searchTerm.trim()}%`;

  let query = `
    SELECT
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
    FROM products
    WHERE (
      LOWER(name) LIKE LOWER(@search)
      OR LOWER(sku) LIKE LOWER(@search)
      OR LOWER(COALESCE(barcode, '')) LIKE LOWER(@search)
    )
  `;

  if (!includeInactive) {
    query += ` AND status = 'ACTIVE' `;
  }

  query += `
    ORDER BY name COLLATE NOCASE ASC
  `;

  const rows = database
    .prepare(query)
    .all({
      search,
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

  const conditions = [];
  const parameters = {};

  if (!includeInactive) {
    conditions.push(`status = 'ACTIVE'`);
  }

  if (categoryId) {
    conditions.push(`category_id = @categoryId`);
    parameters.categoryId = categoryId;
  }

  let query = `
    SELECT
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
    FROM products
  `;

  if (conditions.length > 0) {
    query += `
      WHERE ${conditions.join(" AND ")}
    `;
  }

  query += `
    ORDER BY name COLLATE NOCASE ASC
  `;

  const rows = database
    .prepare(query)
    .all(parameters);

  return rows.map(mapProductRow);
}

/*
|--------------------------------------------------------------------------
| Update Product
|--------------------------------------------------------------------------
|
| Note:
| current_stock is intentionally NOT updated here.
| Stock should later be changed through inventory
| stock movements.
|
|--------------------------------------------------------------------------
*/

function updateProduct(id, data) {
  const database = getDatabase();

  if (!id) {
    throw new Error("Product ID is required");
  }

  const existingProduct = findProductById(id);

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  const {
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
    status = existingProduct.status,
  } = data || {};

  validateProductName(name);
  validateSku(sku);
  validateCategoryId(categoryId);

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
    categoryId: categoryId || null,
    sellingPrice: Number(sellingPrice),
    purchasePrice: Number(purchasePrice),
    gstRate: Number(gstRate),
    minimumStock: Number(minimumStock),
    unit: unit.trim(),
    imagePath: imagePath || null,
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

  if (!id) {
    throw new Error("Product ID is required");
  }

  const existingProduct = findProductById(id);

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  const now = new Date().toISOString();

  database
    .prepare(`
      UPDATE products
      SET
        status = 'INACTIVE',
        updated_at = ?,
        sync_status = 'PENDING'
      WHERE id = ?
    `)
    .run(now, id);

  return findProductById(id);
}

/*
|--------------------------------------------------------------------------
| Activate Product
|--------------------------------------------------------------------------
*/

function activateProduct(id) {
  const database = getDatabase();

  if (!id) {
    throw new Error("Product ID is required");
  }

  const existingProduct = findProductById(id);

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  const now = new Date().toISOString();

  database
    .prepare(`
      UPDATE products
      SET
        status = 'ACTIVE',
        updated_at = ?,
        sync_status = 'PENDING'
      WHERE id = ?
    `)
    .run(now, id);

  return findProductById(id);
}

/*
|--------------------------------------------------------------------------
| Get Low Stock Products
|--------------------------------------------------------------------------
*/

function getLowStockProducts() {
  const database = getDatabase();

  const rows = database
    .prepare(`
      SELECT
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
      FROM products
      WHERE
        status = 'ACTIVE'
        AND current_stock <= minimum_stock
      ORDER BY current_stock ASC, name COLLATE NOCASE ASC
    `)
    .all();

  return rows.map(mapProductRow);
}

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