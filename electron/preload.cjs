const {
  contextBridge,
  ipcRenderer,
} = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  // =========================
  // Application
  // =========================

  getAppInfo: () =>
    ipcRenderer.invoke("app:get-info"),

  // =========================
  // Database
  // =========================

  database: {
    getStatus: () =>
      ipcRenderer.invoke(
        "database:get-status"
      ),
  },

  // =========================
  // Products
  // =========================

  products: {
    create: (productData) =>
      ipcRenderer.invoke(
        "products:create",
        productData
      ),

    getById: (id) =>
      ipcRenderer.invoke(
        "products:get-by-id",
        id
      ),

    getBySku: (sku) =>
      ipcRenderer.invoke(
        "products:get-by-sku",
        sku
      ),

    getByBarcode: (barcode) =>
      ipcRenderer.invoke(
        "products:get-by-barcode",
        barcode
      ),

    search: (
      searchTerm,
      includeInactive = false
    ) =>
      ipcRenderer.invoke(
        "products:search",
        {
          searchTerm,
          includeInactive,
        }
      ),

    getAll: (options = {}) =>
      ipcRenderer.invoke(
        "products:get-all",
        options
      ),

    update: (id, data) =>
      ipcRenderer.invoke(
        "products:update",
        {
          id,
          data,
        }
      ),

    deactivate: (id) =>
      ipcRenderer.invoke(
        "products:deactivate",
        id
      ),

    activate: (id) =>
      ipcRenderer.invoke(
        "products:activate",
        id
      ),

    getLowStock: () =>
      ipcRenderer.invoke(
        "products:get-low-stock"
      ),

    exportCsv: (
      includeInactive = false,
      categoryId = null
    ) =>
      ipcRenderer.invoke(
        "products:export-csv",
        {
          includeInactive,
          categoryId,
        }
      ),

    importCsv: () =>
      ipcRenderer.invoke(
        "products:import-csv"
      ),
  },

  // =========================
  // Categories
  // =========================

  categories: {
    create: (categoryData) =>
      ipcRenderer.invoke(
        "categories:create",
        categoryData
      ),

    getById: (id) =>
      ipcRenderer.invoke(
        "categories:get-by-id",
        id
      ),

    getByName: (name) =>
      ipcRenderer.invoke(
        "categories:get-by-name",
        name
      ),

    getAll: (options = {}) =>
      ipcRenderer.invoke(
        "categories:get-all",
        options
      ),

    search: (
      searchText,
      options = {}
    ) =>
      ipcRenderer.invoke(
        "categories:search",
        searchText,
        options
      ),

    update: (categoryData) =>
      ipcRenderer.invoke(
        "categories:update",
        categoryData
      ),

    deactivate: (id) =>
      ipcRenderer.invoke(
        "categories:deactivate",
        id
      ),

    activate: (id) =>
      ipcRenderer.invoke(
        "categories:activate",
        id
      ),
  },

  // =========================
  // Inventory
  // =========================

  inventory: {
    stockIn: (inventoryData) =>
      ipcRenderer.invoke(
        "inventory:stock-in",
        inventoryData
      ),

    stockOut: (inventoryData) =>
      ipcRenderer.invoke(
        "inventory:stock-out",
        inventoryData
      ),

    adjust: (inventoryData) =>
      ipcRenderer.invoke(
        "inventory:adjust",
        inventoryData
      ),

    getCurrentStock: (productId) =>
      ipcRenderer.invoke(
        "inventory:get-current-stock",
        productId
      ),

    getMovements: (
      productId,
      limit = 100
    ) =>
      ipcRenderer.invoke(
        "inventory:get-movements",
        {
          productId,
          limit,
        }
      ),

    getAllMovements: (
      limit = 200
    ) =>
      ipcRenderer.invoke(
        "inventory:get-all-movements",
        limit
      ),

    getSummary: () =>
      ipcRenderer.invoke(
        "inventory:get-summary"
      ),
  },

  // =========================
  // Customers
  // =========================

  customers: {
    getById: (id) =>
      ipcRenderer.invoke(
        "customers:get-by-id",
        id
      ),

    getByMobile: (mobile) =>
      ipcRenderer.invoke(
        "customers:get-by-mobile",
        mobile
      ),

    create: (input) =>
      ipcRenderer.invoke(
        "customers:create",
        input
      ),

    update: (id, input) =>
      ipcRenderer.invoke(
        "customers:update",
        id,
        input
      ),

    getAll: () =>
      ipcRenderer.invoke(
        "customers:get-all"
      ),

    search: (searchTerm) =>
      ipcRenderer.invoke(
        "customers:search",
        searchTerm
      ),

    getOutstanding: () =>
      ipcRenderer.invoke(
        "customers:get-outstanding"
      ),

    updateFinancials: (
      customerId,
      purchaseAmountDelta,
      outstandingAmountDelta
    ) =>
      ipcRenderer.invoke(
        "customers:update-financials",
        customerId,
        purchaseAmountDelta,
        outstandingAmountDelta
      ),
  },

  // =========================
  // Invoices
  // =========================

  invoices: {
    create: (input) =>
      ipcRenderer.invoke(
        "invoices:create",
        input
      ),

    getById: (invoiceId) =>
      ipcRenderer.invoke(
        "invoices:get-by-id",
        invoiceId
      ),

    getByTransactionId: (
      transactionId
    ) =>
      ipcRenderer.invoke(
        "invoices:get-by-transaction-id",
        transactionId
      ),

    getByNumber: (invoiceNumber) =>
      ipcRenderer.invoke(
        "invoices:get-by-number",
        invoiceNumber
      ),

    getRecent: (limit) =>
      ipcRenderer.invoke(
        "invoices:get-recent",
        limit
      ),

    downloadPdf: (invoiceNumber) =>
      ipcRenderer.invoke(
        "invoices:download-pdf",
        invoiceNumber
      ),
  },

  // =========================
  // Payments
  // =========================

  payments: {
    getById: (paymentId) =>
      ipcRenderer.invoke(
        "payments:get-by-id",
        paymentId
      ),

    getAll: (options) =>
      ipcRenderer.invoke(
        "payments:get-all",
        options
      ),

    getOutstanding: () =>
      ipcRenderer.invoke(
        "payments:get-outstanding"
      ),

    getSummary: () =>
      ipcRenderer.invoke(
        "payments:get-summary"
      ),

    record: (input) =>
      ipcRenderer.invoke(
        "payments:record",
        input
      ),
  },

  // Existing root-level PDF helper
  downloadPdf: (invoiceNumber) =>
    ipcRenderer.invoke(
      "invoices:download-pdf",
      invoiceNumber
    ),

  // =========================
  // Reports
  // =========================

  reports: {
    getSalesSummary: (options = {}) =>
      ipcRenderer.invoke(
        "reports:get-sales-summary",
        options
      ),

    getDailySales: (options = {}) =>
      ipcRenderer.invoke(
        "reports:get-daily-sales",
        options
      ),

    getWeeklySales: (options = {}) =>
      ipcRenderer.invoke(
        "reports:get-weekly-sales",
        options
      ),

    getMonthlySales: (options = {}) =>
      ipcRenderer.invoke(
        "reports:get-monthly-sales",
        options
      ),

    getProductWiseSales: (
      options = {}
    ) =>
      ipcRenderer.invoke(
        "reports:get-product-wise-sales",
        options
      ),

    getPaymentMethodSales: (
      options = {}
    ) =>
      ipcRenderer.invoke(
        "reports:get-payment-method-sales",
        options
      ),

    getCurrentStock: (
      options = {}
    ) =>
      ipcRenderer.invoke(
        "reports:get-current-stock",
        options
      ),

    getLowStock: () =>
      ipcRenderer.invoke(
        "reports:get-low-stock"
      ),

    getStockMovements: (
      options = {}
    ) =>
      ipcRenderer.invoke(
        "reports:get-stock-movements",
        options
      ),

    getInventorySummary: () =>
      ipcRenderer.invoke(
        "reports:get-inventory-summary"
      ),

    getCustomerPurchases: (
      options = {}
    ) =>
      ipcRenderer.invoke(
        "reports:get-customer-purchases",
        options
      ),

    getOutstandingPayments: () =>
      ipcRenderer.invoke(
        "reports:get-outstanding-payments"
      ),

    getCustomerOutstandingSummary: () =>
      ipcRenderer.invoke(
        "reports:get-customer-outstanding-summary"
      ),
  },

  // =========================
  // Sync
  // =========================

  sync: {
    getPending: (limit) =>
      ipcRenderer.invoke(
        "sync:get-pending",
        limit
      ),

    getFailed: (limit) =>
      ipcRenderer.invoke(
        "sync:get-failed",
        limit
      ),

    getAll: (limit) =>
      ipcRenderer.invoke(
        "sync:get-all",
        limit
      ),

    getById: (queueId) =>
      ipcRenderer.invoke(
        "sync:get-by-id",
        queueId
      ),

    getByEntity: (
      entityType,
      entityId
    ) =>
      ipcRenderer.invoke(
        "sync:get-by-entity",
        entityType,
        entityId
      ),

    getSummary: () =>
      ipcRenderer.invoke(
        "sync:get-summary"
      ),

    markSynced: (
      queueId,
      serverId
    ) =>
      ipcRenderer.invoke(
        "sync:mark-synced",
        queueId,
        serverId
      ),

    markFailed: (
      queueId,
      errorMessage
    ) =>
      ipcRenderer.invoke(
        "sync:mark-failed",
        queueId,
        errorMessage
      ),

    retry: (queueId) =>
      ipcRenderer.invoke(
        "sync:retry",
        queueId
      ),

    retryAll: (limit) =>
      ipcRenderer.invoke(
        "sync:retry-all",
        limit
      ),
  },
});