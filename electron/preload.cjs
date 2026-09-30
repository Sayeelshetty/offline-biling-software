const { contextBridge, ipcRenderer } = require("electron");

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

  getByTransactionId: (transactionId) =>
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

downloadPdf: (invoiceNumber) =>
  ipcRenderer.invoke(
    "invoices:download-pdf",
    invoiceNumber
  ),

});


