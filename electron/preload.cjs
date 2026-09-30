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
      ipcRenderer.invoke("database:get-status"),
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
});