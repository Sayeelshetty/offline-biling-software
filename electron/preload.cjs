const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  /*
   * Application information
   */
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),

  /*
   * Database information
   */
  database: {
    getStatus: () =>
      ipcRenderer.invoke("database:get-status"),
  },

  /*
   * Product operations
   */
  products: {
    create: (productData) =>
      ipcRenderer.invoke("products:create", productData),

    getById: (id) =>
      ipcRenderer.invoke("products:get-by-id", id),

    getBySku: (sku) =>
      ipcRenderer.invoke("products:get-by-sku", sku),

    getByBarcode: (barcode) =>
      ipcRenderer.invoke(
        "products:get-by-barcode",
        barcode
      ),

    search: (searchTerm = "", includeInactive = false) =>
      ipcRenderer.invoke("products:search", {
        searchTerm,
        includeInactive,
      }),

    getAll: (options = {}) =>
      ipcRenderer.invoke("products:get-all", options),

    update: (id, data) =>
      ipcRenderer.invoke("products:update", {
        id,
        data,
      }),

    deactivate: (id) =>
      ipcRenderer.invoke("products:deactivate", id),

    activate: (id) =>
      ipcRenderer.invoke("products:activate", id),

    getLowStock: () =>
      ipcRenderer.invoke("products:get-low-stock"),
  },
});