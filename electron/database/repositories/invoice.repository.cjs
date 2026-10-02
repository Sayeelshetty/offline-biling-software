const crypto = require("crypto");

const { getDatabase } =
  require("../connection.cjs");

const settingsRepository =
  require("./settings.repository.cjs");

const db = getDatabase();

const PAYMENT_METHODS = new Set([
  "CASH",
  "UPI",
  "CARD",
  "CREDIT",
  "OTHER",
]);

const PAYMENT_STATUSES = new Set([
  "PAID",
  "PENDING",
  "PARTIAL",
  "CANCELLED",
]);

function createId() {
  return crypto.randomUUID();
}

function createTransactionId() {
  return `TXN-${crypto.randomUUID()}`;
}

function getNow() {
  return new Date().toISOString();
}

function enqueueSyncRecord(
  entityType,
  entityId,
  operation,
  payload,
  deviceId
) {
  const now = getNow();

  db.prepare(`
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
      ?,
      ?,
      ?,
      ?,
      'PENDING',
      ?,
      ?,
      ?
    )
  `).run(
    createId(),
    entityType,
    entityId,
    operation,
    JSON.stringify(payload),
    deviceId,
    now,
    now
  );
}

function roundMoney(value) {
  return (
    Math.round(
      (Number(value) + Number.EPSILON) * 100
    ) / 100
  );
}

function mapInvoiceItemRow(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity),
    rate: Number(row.rate),
    gstRate: Number(row.gst_rate),
    discount: Number(row.discount),
    amount: Number(row.amount),
    createdAt: row.created_at,
  };
}

function mapInvoiceRow(row, items) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    serverId: row.server_id ?? null,
    transactionId: row.transaction_id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id ?? null,

    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    tax: Number(row.tax),
    total: Number(row.total),

    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    syncStatus: row.sync_status,
    deviceId: row.device_id,

    items: items || [],
  };
}

function validateCreateInvoiceInput(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Invoice data is required.");
  }

  if (
    !Array.isArray(input.items) ||
    input.items.length === 0
  ) {
    throw new Error(
      "At least one product is required."
    );
  }

  const deviceId = String(
    input.deviceId ?? ""
  ).trim();

  if (!deviceId) {
    throw new Error("Device ID is required.");
  }

  const paymentMethod = String(
    input.paymentMethod ?? ""
  ).toUpperCase();

  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw new Error(
      "Invalid payment method."
    );
  }

  const paymentStatus = String(
    input.paymentStatus ?? ""
  ).toUpperCase();

  if (!PAYMENT_STATUSES.has(paymentStatus)) {
    throw new Error(
      "Invalid payment status."
    );
  }

  const invoiceDiscount = Number(
    input.discount ?? 0
  );

  if (
    !Number.isFinite(invoiceDiscount) ||
    invoiceDiscount < 0
  ) {
    throw new Error(
      "Invalid invoice discount."
    );
  }

  const paymentAmount = Number(
    input.paymentAmount ?? 0
  );

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount < 0
  ) {
    throw new Error(
      "Invalid payment amount."
    );
  }

  const customerId =
    input.customerId === null ||
    input.customerId === undefined ||
    String(input.customerId).trim() === ""
      ? null
      : String(input.customerId).trim();

  const dueDate =
    input.dueDate === null ||
    input.dueDate === undefined ||
    String(input.dueDate).trim() === ""
      ? null
      : String(input.dueDate).trim();

  const items = input.items.map(
    (item, index) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        throw new Error(
          `Invalid invoice item at position ${
            index + 1
          }.`
        );
      }

      const productId = String(
        item.productId ?? ""
      ).trim();

      const productName = String(
        item.productName ?? ""
      ).trim();

      const quantity = Number(
        item.quantity
      );

      const rate = Number(item.rate);

      const gstRate = Number(
        item.gstRate ?? 0
      );

      const discount = Number(
        item.discount ?? 0
      );

      if (!productId) {
        throw new Error(
          `Product is missing at item ${
            index + 1
          }.`
        );
      }

      if (!productName) {
        throw new Error(
          `Product name is missing at item ${
            index + 1
          }.`
        );
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          `Quantity must be greater than 0 at item ${
            index + 1
          }.`
        );
      }

      if (
        !Number.isFinite(rate) ||
        rate < 0
      ) {
        throw new Error(
          `Invalid rate at item ${
            index + 1
          }.`
        );
      }

      if (
        !Number.isFinite(gstRate) ||
        gstRate < 0 ||
        gstRate > 100
      ) {
        throw new Error(
          `Invalid GST rate at item ${
            index + 1
          }.`
        );
      }

      if (
        !Number.isFinite(discount) ||
        discount < 0
      ) {
        throw new Error(
          `Invalid item discount at item ${
            index + 1
          }.`
        );
      }

      const grossAmount = roundMoney(
        quantity * rate
      );

      if (discount > grossAmount) {
        throw new Error(
          `Item discount cannot exceed item amount at item ${
            index + 1
          }.`
        );
      }

      return {
        productId,
        productName,
        quantity,
        rate,
        gstRate,
        discount,
      };
    }
  );

  return {
    customerId,
    items,
    discount: invoiceDiscount,
    paymentMethod,
    paymentStatus,
    paymentAmount,
    dueDate,
    deviceId,
  };
}

function calculateInvoiceSummary(
  items,
  invoiceDiscount
) {
  const subtotal = roundMoney(
    items.reduce(
      (sum, item) =>
        sum +
        item.quantity * item.rate,
      0
    )
  );

  const itemDiscount = roundMoney(
    items.reduce(
      (sum, item) =>
        sum + item.discount,
      0
    )
  );

  if (
    invoiceDiscount + itemDiscount >
    subtotal
  ) {
    throw new Error(
      "Total discount cannot exceed subtotal."
    );
  }

  const taxableAmount = roundMoney(
    subtotal -
      itemDiscount -
      invoiceDiscount
  );

  const tax = roundMoney(
    items.reduce(
      (sum, item) => {
        const lineGross = roundMoney(
          item.quantity * item.rate
        );

        const lineNetBeforeInvoiceDiscount =
          roundMoney(
            lineGross -
              item.discount
          );

        if (lineGross <= 0) {
          return sum;
        }

        const lineShare =
          lineNetBeforeInvoiceDiscount /
          subtotal;

        const allocatedInvoiceDiscount =
          roundMoney(
            invoiceDiscount *
              lineShare
          );

        const taxableLine =
          Math.max(
            0,
            roundMoney(
              lineNetBeforeInvoiceDiscount -
                allocatedInvoiceDiscount
            )
          );

        const lineTax = roundMoney(
          taxableLine *
            (item.gstRate / 100)
        );

        return sum + lineTax;
      },
      0
    )
  );

  const total = roundMoney(
    taxableAmount + tax
  );

  return {
    subtotal,
    discount: roundMoney(
      itemDiscount +
        invoiceDiscount
    ),
    tax,
    total,
  };
}

function getNextInvoiceNumber(
  transaction
) {
  const settings =
    settingsRepository.getSettings();

  const configuredPrefix =
    String(
      settings?.invoice?.invoicePrefix ??
        "INV"
    ).trim();

  const configuredStartingNumber =
    Number(
      settings?.invoice?.startingNumber ??
        1
    );

  const prefix =
    configuredPrefix || "INV";

  const startingNumber =
    Number.isInteger(
      configuredStartingNumber
    ) &&
    configuredStartingNumber > 0
      ? configuredStartingNumber
      : 1;

  const numberPrefix =
    `${prefix}-`;

  const findExistingInvoice =
    transaction.prepare(`
      SELECT 1
      FROM invoices
      WHERE invoice_number = ?
      LIMIT 1
    `);

  let nextNumber =
    startingNumber;

  while (true) {
    const candidate =
      `${numberPrefix}${String(
        nextNumber
      ).padStart(4, "0")}`;

    const existing =
      findExistingInvoice.get(candidate);

    if (!existing) {
      return candidate;
    }

    nextNumber += 1;
  }
}


function getInvoiceById(invoiceId) {
  const invoiceRow = db
    .prepare(`
      SELECT
        id,
        server_id,
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
        updated_at,
        sync_status,
        device_id
      FROM invoices
      WHERE id = ?
      LIMIT 1
    `)
    .get(invoiceId);

  if (!invoiceRow) {
    return null;
  }

  const itemRows = db
    .prepare(`
      SELECT
        id,
        invoice_id,
        product_id,
        product_name,
        quantity,
        rate,
        gst_rate,
        discount,
        amount,
        created_at
      FROM invoice_items
      WHERE invoice_id = ?
      ORDER BY rowid ASC
    `)
    .all(invoiceId);

  return mapInvoiceRow(
    invoiceRow,
    itemRows.map(
      mapInvoiceItemRow
    )
  );
}

function getInvoiceByTransactionId(
  transactionId
) {
  const row = db
    .prepare(`
      SELECT id
      FROM invoices
      WHERE transaction_id = ?
      LIMIT 1
    `)
    .get(transactionId);

  if (!row) {
    return null;
  }

  return getInvoiceById(row.id);
}

function getInvoiceByNumber(
  invoiceNumber
) {
  const row = db
    .prepare(`
      SELECT id
      FROM invoices
      WHERE invoice_number = ?
      LIMIT 1
    `)
    .get(invoiceNumber);

  if (!row) {
    return null;
  }

  return getInvoiceById(row.id);
}

function getRecentInvoices(
  limit = 50
) {
  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 50,
      1
    ),
    500
  );

  const rows = db
    .prepare(`
      SELECT
        id,
        server_id,
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
        updated_at,
        sync_status,
        device_id
      FROM invoices
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(safeLimit);

  const itemQuery = db.prepare(`
    SELECT
      id,
      invoice_id,
      product_id,
      product_name,
      quantity,
      rate,
      gst_rate,
      discount,
      amount,
      created_at
    FROM invoice_items
    WHERE invoice_id = ?
    ORDER BY rowid ASC
  `);

  return rows.map((row) => {
    const items = itemQuery
      .all(row.id)
      .map(mapInvoiceItemRow);

    return mapInvoiceRow(
      row,
      items
    );
  });
}

function createInvoice(input) {
  const data =
    validateCreateInvoiceInput(
      input
    );

  const createInvoiceTransaction =
    db.transaction(() => {
      const now = getNow();

      if (data.customerId) {
        const customer = db
          .prepare(`
            SELECT id
            FROM customers
            WHERE id = ?
            LIMIT 1
          `)
          .get(data.customerId);

        if (!customer) {
          throw new Error(
            "Selected customer was not found."
          );
        }
      }

      const requestedQuantities =
        new Map();

      for (const item of data.items) {
        const current =
          requestedQuantities.get(
            item.productId
          ) || 0;

        requestedQuantities.set(
          item.productId,
          current +
            item.quantity
        );
      }

      const productQuery =
        db.prepare(`
          SELECT
            id,
            name,
            selling_price,
            gst_rate,
            current_stock,
            status
          FROM products
          WHERE id = ?
          LIMIT 1
        `);

      for (const [
        productId,
        requiredQuantity,
      ] of requestedQuantities.entries()) {
        const product =
          productQuery.get(
            productId
          );

        if (!product) {
          throw new Error(
            `Product ${productId} was not found.`
          );
        }

        if (
          product.status !==
          "ACTIVE"
        ) {
          throw new Error(
            `Product "${product.name}" is inactive.`
          );
        }

        const currentStock =
          Number(
            product.current_stock
          );

        if (
          currentStock <
          requiredQuantity
        ) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${currentStock}, requested: ${requiredQuantity}.`
          );
        }
      }

      const summary =
        calculateInvoiceSummary(
          data.items,
          data.discount
        );

      if (
        data.paymentMethod ===
          "CREDIT" &&
        !data.customerId
      ) {
        throw new Error(
          "Customer is required for credit payment."
        );
      }

      if (
        data.paymentStatus ===
          "PAID" &&
        data.paymentAmount <
          summary.total
      ) {
        throw new Error(
          "Payment amount cannot be less than the invoice total for a PAID invoice."
        );
      }

      if (
        data.paymentStatus ===
          "PARTIAL" &&
        (
          data.paymentAmount <=
            0 ||
          data.paymentAmount >=
            summary.total
        )
      ) {
        throw new Error(
          "Partial payment must be greater than 0 and less than the invoice total."
        );
      }

      if (
        data.paymentStatus ===
          "PENDING" &&
        data.paymentAmount > 0
      ) {
        throw new Error(
          "Pending payment cannot contain a paid amount."
        );
      }

      if (
        data.paymentMethod ===
          "CREDIT" &&
        data.paymentStatus ===
          "PAID" &&
        data.dueDate
      ) {
        // Allowed. Due date is stored.
        // Credit accounting is driven by
        // payment status and payment amount.
      }

      if (
        data.paymentMethod !==
          "CREDIT" &&
        data.paymentStatus ===
          "PENDING" &&
        data.paymentAmount ===
          0
      ) {
        // Supported because the schema
        // permits PENDING.
      }

      const invoiceId =
        createId();

      const invoiceTransactionId =
        createTransactionId();

      const invoiceNumber =
        getNextInvoiceNumber(
          db
        );

      const insertInvoice =
        db.prepare(`
          INSERT INTO invoices (
            id,
            server_id,
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
            ?,
            ?,
            ?,
            ?,
            ?,
            'PENDING',
            ?
          )
        `);

      insertInvoice.run(
        invoiceId,
        invoiceTransactionId,
        invoiceNumber,
        data.customerId,
        summary.subtotal,
        summary.discount,
        summary.tax,
        summary.total,
        data.paymentMethod,
        data.paymentStatus,
        now,
        now,
        data.deviceId
      );

      const insertItem =
        db.prepare(`
          INSERT INTO invoice_items (
            id,
            invoice_id,
            product_id,
            product_name,
            quantity,
            rate,
            gst_rate,
            discount,
            amount,
            created_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `);

      for (const item of data.items) {
        const grossAmount =
          roundMoney(
            item.quantity *
              item.rate
          );

        const amount =
          roundMoney(
            grossAmount -
              item.discount
          );

        insertItem.run(
          createId(),
          invoiceId,
          item.productId,
          item.productName,
          item.quantity,
          item.rate,
          item.gstRate,
          item.discount,
          amount,
          now
        );
      }

      const insertStockMovement =
        db.prepare(`
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
            ?,
            NULL,
            ?,
            ?,
            'STOCK_OUT',
            ?,
            'INVOICE',
            ?,
            ?,
            ?,
            'PENDING',
            ?
          )
        `);

      const updateProductStock =
        db.prepare(`
          UPDATE products
          SET
            current_stock =
              current_stock - ?,
            updated_at = ?,
            sync_status = 'PENDING'
          WHERE
            id = ?
            AND current_stock >= ?
        `);

      for (const [
        productId,
        quantity,
      ] of requestedQuantities.entries()) {
        const stockTransactionId =
          `${invoiceTransactionId}:STOCK:${productId}`;

        const stockUpdateResult =
          updateProductStock.run(
            quantity,
            now,
            productId,
            quantity
          );

        if (
          stockUpdateResult.changes !==
          1
        ) {
          throw new Error(
            "Stock changed while creating the bill. Please try again."
          );
        }

        const stockMovementId =
          createId();

        insertStockMovement.run(
          stockMovementId,
          stockTransactionId,
          productId,
          quantity,
          invoiceId,
          now,
          now,
          data.deviceId
        );

        enqueueSyncRecord(
          "STOCK_MOVEMENT",
          stockMovementId,
          "CREATE",
          {
            id: stockMovementId,
            transactionId:
              stockTransactionId,
            productId,
            type: "STOCK_OUT",
            quantity,
            referenceType: "INVOICE",
            referenceId:
              invoiceId,
            createdAt: now,
            updatedAt: now,
            deviceId:
              data.deviceId,
          },
          data.deviceId
        );

        const updatedProduct =
          db
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
              LIMIT 1
            `)
            .get(productId);

        if (!updatedProduct) {
          throw new Error(
            "Product could not be loaded after stock update."
          );
        }

        enqueueSyncRecord(
          "PRODUCT",
          productId,
          "UPDATE",
          {
            id: updatedProduct.id,
            serverId:
              updatedProduct.server_id ??
              null,
            name:
              updatedProduct.name,
            sku:
              updatedProduct.sku,
            barcode:
              updatedProduct.barcode ??
              null,
            categoryId:
              updatedProduct.category_id ??
              null,
            sellingPrice:
              Number(
                updatedProduct.selling_price
              ),
            purchasePrice:
              Number(
                updatedProduct.purchase_price
              ),
            gstRate:
              Number(
                updatedProduct.gst_rate
              ),
            currentStock:
              Number(
                updatedProduct.current_stock
              ),
            minimumStock:
              Number(
                updatedProduct.minimum_stock
              ),
            unit:
              updatedProduct.unit,
            imagePath:
              updatedProduct.image_path ??
              null,
            status:
              updatedProduct.status,
            createdAt:
              updatedProduct.created_at,
            updatedAt:
              updatedProduct.updated_at,
            syncStatus:
              updatedProduct.sync_status,
            deviceId:
              updatedProduct.device_id,
          },
          data.deviceId
        );
      }

      const paymentId =
        createId();

      const paymentTransactionId =
        `${invoiceTransactionId}:PAYMENT`;

      const paymentStatus =
        data.paymentStatus;

      const insertPayment =
        db.prepare(`
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
            ?,
            ?,
            ?,
            'PENDING',
            ?
          )
        `);

      insertPayment.run(
        paymentId,
        paymentTransactionId,
        invoiceId,
        data.customerId,
        data.paymentAmount,
        data.paymentMethod,
        data.dueDate,
        paymentStatus,
        now,
        now,
        data.deviceId
      );

      if (data.customerId) {
        const outstandingDelta =
          roundMoney(
            summary.total -
              data.paymentAmount
          );

        const updateCustomer =
          db.prepare(`
            UPDATE customers
            SET
              total_purchases =
                total_purchases + ?,
              outstanding_amount =
                outstanding_amount + ?,
              updated_at = ?,
              sync_status = 'PENDING'
            WHERE id = ?
          `);

        updateCustomer.run(
          summary.total,
          outstandingDelta,
          now,
          data.customerId
        );

        const updatedCustomer =
          db
            .prepare(`
              SELECT
                id,
                server_id,
                name,
                mobile,
                email,
                address,
                total_purchases,
                outstanding_amount,
                created_at,
                updated_at,
                sync_status,
                device_id
              FROM customers
              WHERE id = ?
              LIMIT 1
            `)
            .get(data.customerId);

        if (!updatedCustomer) {
          throw new Error(
            "Customer could not be loaded after financial update."
          );
        }

        enqueueSyncRecord(
          "CUSTOMER",
          data.customerId,
          "UPDATE",
          {
            id:
              updatedCustomer.id,
            serverId:
              updatedCustomer.server_id ??
              null,
            name:
              updatedCustomer.name,
            mobile:
              updatedCustomer.mobile,
            email:
              updatedCustomer.email ??
              null,
            address:
              updatedCustomer.address ??
              null,
            totalPurchases:
              Number(
                updatedCustomer.total_purchases
              ),
            outstandingAmount:
              Number(
                updatedCustomer.outstanding_amount
              ),
            createdAt:
              updatedCustomer.created_at,
            updatedAt:
              updatedCustomer.updated_at,
            syncStatus:
              updatedCustomer.sync_status,
            deviceId:
              updatedCustomer.device_id,
          },
          data.deviceId
        );
      }

      const invoice =
        getInvoiceById(
          invoiceId
        );

      if (!invoice) {
        throw new Error(
          "Invoice could not be loaded after creation."
        );
      }

      enqueueSyncRecord(
        "INVOICE",
        invoiceId,
        "CREATE",
        {
          invoice,
        },
        data.deviceId
      );

      enqueueSyncRecord(
        "PAYMENT",
        paymentId,
        "CREATE",
        {
          paymentId,
          transactionId:
            paymentTransactionId,
          invoiceId,
          customerId:
            data.customerId,
          amount:
            data.paymentAmount,
          method:
            data.paymentMethod,
          dueDate:
            data.dueDate,
          status:
            paymentStatus,
          deviceId:
            data.deviceId,
        },
        data.deviceId
      );

      return {
        invoice,

        payment: {
          id: paymentId,

          transactionId:
            paymentTransactionId,

          invoiceId,

          customerId:
            data.customerId,

          amount:
            data.paymentAmount,

          method:
            data.paymentMethod,

          dueDate:
            data.dueDate,

          status:
            paymentStatus,

          createdAt: now,

          updatedAt: now,

          syncStatus: "PENDING",

          deviceId:
            data.deviceId,
        },
      };
    });

  return createInvoiceTransaction();
}

module.exports = {
  createInvoice,
  getInvoiceById,
  getInvoiceByTransactionId,
  getInvoiceByNumber,
  getRecentInvoices,
};