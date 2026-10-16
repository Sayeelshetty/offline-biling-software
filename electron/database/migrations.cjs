const fs = require("fs");
const path = require("path");

const { getDatabase } = require("./connection.cjs");
const {
  backfillPendingTransactionSyncQueue,
} = require("./pending-transaction-backfill.cjs");

/*
|--------------------------------------------------------------------------
| Database Migration Helpers
|--------------------------------------------------------------------------
*/

function getTableColumns(database, tableName) {
  return database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all();
}

function columnExists(database, tableName, columnName) {
  const columns = getTableColumns(
    database,
    tableName
  );

  return columns.some(
    (column) => column.name === columnName
  );
}

function backfillPendingSyncQueue(database) {
  database.exec(`
    INSERT OR IGNORE INTO sync_queue (
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
    SELECT
      'BACKFILL-PRODUCT-' || p.id,
      'PRODUCT',
      p.id,
      CASE WHEN p.created_at = p.updated_at THEN 'CREATE' ELSE 'UPDATE' END,
      json_object(
        'id', p.id,
        'serverId', p.server_id,
        'name', p.name,
        'sku', p.sku,
        'barcode', p.barcode,
        'categoryId', p.category_id,
        'sellingPrice', p.selling_price,
        'purchasePrice', p.purchase_price,
        'gstRate', p.gst_rate,
        'currentStock', p.current_stock,
        'minimumStock', p.minimum_stock,
        'unit', p.unit,
        'imagePath', p.image_path,
        'status', p.status,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at,
        'syncStatus', p.sync_status,
        'deviceId', p.device_id
      ),
      'PENDING',
      p.device_id,
      p.updated_at,
      p.updated_at
    FROM products p
    WHERE p.sync_status = 'PENDING'
      AND NOT EXISTS (
        SELECT 1
        FROM sync_queue q
        WHERE q.entity_type = 'PRODUCT'
          AND q.entity_id = p.id
          AND datetime(q.updated_at) >= datetime(p.updated_at)
      )

    UNION ALL

    SELECT
      'BACKFILL-CATEGORY-' || c.id,
      'CATEGORY',
      c.id,
      CASE WHEN c.created_at = c.updated_at THEN 'CREATE' ELSE 'UPDATE' END,
      json_object(
        'id', c.id,
        'serverId', c.server_id,
        'name', c.name,
        'description', c.description,
        'status', c.status,
        'createdAt', c.created_at,
        'updatedAt', c.updated_at,
        'syncStatus', c.sync_status,
        'deviceId', c.device_id
      ),
      'PENDING',
      c.device_id,
      c.updated_at,
      c.updated_at
    FROM categories c
    WHERE c.sync_status = 'PENDING'
      AND NOT EXISTS (
        SELECT 1
        FROM sync_queue q
        WHERE q.entity_type = 'CATEGORY'
          AND q.entity_id = c.id
          AND datetime(q.updated_at) >= datetime(c.updated_at)
      )

    UNION ALL

    SELECT
      'BACKFILL-CUSTOMER-' || c.id,
      'CUSTOMER',
      c.id,
      CASE WHEN c.created_at = c.updated_at THEN 'CREATE' ELSE 'UPDATE' END,
      json_object(
        'id', c.id,
        'serverId', c.server_id,
        'name', c.name,
        'mobile', c.mobile,
        'email', c.email,
        'address', c.address,
        'totalPurchases', c.total_purchases,
        'outstandingAmount', c.outstanding_amount,
        'createdAt', c.created_at,
        'updatedAt', c.updated_at,
        'syncStatus', c.sync_status,
        'deviceId', c.device_id
      ),
      'PENDING',
      c.device_id,
      c.updated_at,
      c.updated_at
    FROM customers c
    WHERE c.sync_status = 'PENDING'
      AND NOT EXISTS (
        SELECT 1
        FROM sync_queue q
        WHERE q.entity_type = 'CUSTOMER'
          AND q.entity_id = c.id
          AND datetime(q.updated_at) >= datetime(c.updated_at)
      )

    UNION ALL

    SELECT
      'BACKFILL-STOCK_MOVEMENT-' || m.id,
      'STOCK_MOVEMENT',
      m.id,
      'CREATE',
      json_object(
        'id', m.id,
        'serverId', m.server_id,
        'transactionId', m.transaction_id,
        'productId', m.product_id,
        'type', m.type,
        'quantity', m.quantity,
        'referenceType', m.reference_type,
        'referenceId', m.reference_id,
        'createdAt', m.created_at,
        'updatedAt', m.updated_at,
        'syncStatus', m.sync_status,
        'deviceId', m.device_id
      ),
      'PENDING',
      m.device_id,
      m.updated_at,
      m.updated_at
    FROM stock_movements m
    WHERE m.sync_status = 'PENDING'
      AND NOT EXISTS (
        SELECT 1
        FROM sync_queue q
        WHERE q.entity_type = 'STOCK_MOVEMENT'
          AND q.entity_id = m.id
      )
  `);
}

/*
|--------------------------------------------------------------------------
| Run Database Migrations
|--------------------------------------------------------------------------
*/

function runMigrations() {
  const database = getDatabase();

  const schemaPath = path.join(
    __dirname,
    "schema.sql"
  );

  if (!fs.existsSync(schemaPath)) {
    throw new Error(
      `Database schema not found: ${schemaPath}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Initialize Base Schema
  |--------------------------------------------------------------------------
  */

  const schema = fs.readFileSync(
    schemaPath,
    "utf8"
  );

  database.exec(schema);

  /*
  |--------------------------------------------------------------------------
  | Categories Migration
  |--------------------------------------------------------------------------
  |
  | Older versions of the categories table did not
  | contain description or status.
  |
  | Add only the missing columns so existing data
  | remains intact.
  |
  */

  if (
    !columnExists(
      database,
      "categories",
      "description"
    )
  ) {
    database.exec(`
      ALTER TABLE categories
      ADD COLUMN description TEXT NOT NULL DEFAULT ''
    `);

    console.log(
      "Migration applied: categories.description column added."
    );
  }

  if (
    !columnExists(
      database,
      "categories",
      "status"
    )
  ) {
    database.exec(`
      ALTER TABLE categories
      ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'INACTIVE'))
    `);

    console.log(
      "Migration applied: categories.status column added."
    );
  }

  backfillPendingSyncQueue(database);
  backfillPendingTransactionSyncQueue(database);

  /*
  |--------------------------------------------------------------------------
  | Migration Complete
  |--------------------------------------------------------------------------
  */

  console.log(
    "SQLite database schema initialized successfully."
  );
}

module.exports = {
  runMigrations,
};