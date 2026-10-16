function hasCurrentQueueItem(database, entityType, entityId, updatedAt) {
  return Boolean(
    database.prepare(`
      SELECT 1
      FROM sync_queue
      WHERE entity_type = ?
        AND entity_id = ?
        AND datetime(updated_at) >= datetime(?)
      LIMIT 1
    `).get(entityType, entityId, updatedAt)
  );
}

function backfillPendingTransactionSyncQueue(database) {
  if (!database) {
    throw new Error("Database connection is required.");
  }

  const invoiceRows = database.prepare(`
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
    WHERE sync_status = 'PENDING'
    ORDER BY created_at, id
  `).all();

  const getInvoiceItems = database.prepare(`
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

  const insertQueueItem = database.prepare(`
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
    VALUES (?, ?, ?, 'CREATE', ?, 'PENDING', ?, ?, ?)
  `);

  const backfillTransaction = database.transaction(() => {
    let inserted = 0;

    for (const row of invoiceRows) {
      if (
        hasCurrentQueueItem(
          database,
          "INVOICE",
          row.id,
          row.updated_at
        )
      ) {
        continue;
      }

      const invoice = {
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
        items: getInvoiceItems.all(row.id).map((item) => ({
          id: item.id,
          invoiceId: item.invoice_id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          gstRate: Number(item.gst_rate),
          discount: Number(item.discount),
          amount: Number(item.amount),
          createdAt: item.created_at,
        })),
      };

      const result = insertQueueItem.run(
        `BACKFILL-INVOICE-${row.id}`,
        "INVOICE",
        row.id,
        JSON.stringify({ invoice }),
        row.device_id,
        row.created_at,
        row.updated_at
      );
      inserted += result.changes;
    }

    const paymentRows = database.prepare(`
      SELECT
        id,
        transaction_id,
        invoice_id,
        customer_id,
        amount,
        method,
        due_date,
        status,
        created_at,
        updated_at,
        device_id
      FROM payments
      WHERE sync_status = 'PENDING'
      ORDER BY created_at, id
    `).all();

    for (const row of paymentRows) {
      if (
        hasCurrentQueueItem(
          database,
          "PAYMENT",
          row.id,
          row.updated_at
        )
      ) {
        continue;
      }

      const payload = {
        paymentId: row.id,
        transactionId: row.transaction_id,
        invoiceId: row.invoice_id,
        customerId: row.customer_id ?? null,
        amount: Number(row.amount),
        method: row.method,
        dueDate: row.due_date ?? null,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deviceId: row.device_id,
      };

      const result = insertQueueItem.run(
        `BACKFILL-PAYMENT-${row.id}`,
        "PAYMENT",
        row.id,
        JSON.stringify(payload),
        row.device_id,
        row.created_at,
        row.updated_at
      );
      inserted += result.changes;
    }

    return inserted;
  });

  return backfillTransaction();
}

module.exports = {
  backfillPendingTransactionSyncQueue,
};
