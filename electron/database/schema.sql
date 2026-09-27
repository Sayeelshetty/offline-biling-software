PRAGMA foreign_keys = ON;

-- ============================================
-- USERS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    business_id TEXT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
        CHECK (role IN ('ADMIN', 'CASHIER', 'MANAGER')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL
);

-- ============================================
-- CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL
);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
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
    image_path TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,

    FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL
);

-- ============================================
-- CUSTOMERS
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    address TEXT,
    total_purchases REAL NOT NULL DEFAULT 0,
    outstanding_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL
);

-- ============================================
-- INVOICES
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    transaction_id TEXT NOT NULL UNIQUE,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,

    payment_method TEXT NOT NULL
        CHECK (
            payment_method IN (
                'CASH',
                'UPI',
                'CARD',
                'CREDIT',
                'OTHER'
            )
        ),

    payment_status TEXT NOT NULL DEFAULT 'PAID'
        CHECK (
            payment_status IN (
                'PAID',
                'PENDING',
                'PARTIAL',
                'CANCELLED'
            )
        ),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL
);

-- ============================================
-- INVOICE ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    rate REAL NOT NULL,
    gst_rate REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL,

    FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    transaction_id TEXT NOT NULL UNIQUE,
    invoice_id TEXT NOT NULL,
    customer_id TEXT,
    amount REAL NOT NULL,

    method TEXT NOT NULL
        CHECK (
            method IN (
                'CASH',
                'UPI',
                'CARD',
                'CREDIT',
                'OTHER'
            )
        ),

    due_date TEXT,

    status TEXT NOT NULL DEFAULT 'PAID'
        CHECK (
            status IN (
                'PAID',
                'PENDING',
                'PARTIAL',
                'CANCELLED'
            )
        ),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,

    FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL
);

-- ============================================
-- STOCK MOVEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    transaction_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,

    type TEXT NOT NULL
        CHECK (
            type IN (
                'STOCK_IN',
                'STOCK_OUT',
                'ADJUSTMENT'
            )
        ),

    quantity REAL NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
);

-- ============================================
-- SYNC QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,

    operation TEXT NOT NULL
        CHECK (
            operation IN (
                'CREATE',
                'UPDATE',
                'DELETE'
            )
        ),

    payload TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'SYNCED',
                'FAILED'
            )
        ),

    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL
);

-- ============================================
-- SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_name
ON products(name);

CREATE INDEX IF NOT EXISTS idx_products_barcode
ON products(barcode);

CREATE INDEX IF NOT EXISTS idx_products_sku
ON products(sku);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_stock
ON products(current_stock);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at
ON invoices(created_at);

CREATE INDEX IF NOT EXISTS idx_invoices_customer
ON invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
ON invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_product
ON invoice_items(product_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice
ON payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_customer
ON payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
ON stock_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created
ON stock_movements(created_at);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status
ON sync_queue(status);

CREATE INDEX IF NOT EXISTS idx_sync_queue_entity
ON sync_queue(entity_type, entity_id);