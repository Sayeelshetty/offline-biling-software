const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
} = require("electron");


const userRepository =
  require(
    "./database/repositories/user.repository.cjs"
  );

const fs = require("fs");
const path = require("path");

const {
  backupDatabase,
  restoreDatabase,
} = require(
  "./services/backup.service.cjs"
);

const { runMigrations } = require("./database/migrations.cjs");

const invoiceRepository = require(
  "./database/repositories/invoice.repository.cjs"
);

const paymentRepository = require(
  "./database/repositories/payment.repository.cjs"
);

const customerRepository = require("./database/repositories/customer.repository.cjs");

const syncRepository = require(
  "./database/repositories/sync.repository.cjs"
);

const settingsRepository = require(
  "./database/repositories/settings.repository.cjs"
);

const reportRepository = require(
  "./database/repositories/report.repository.cjs"
);

const {
  getDatabase,
  getDatabasePath,
  closeDatabase,
} = require("./database/connection.cjs");

const {
  createProduct,
  importProducts,
  findProductById,
  findProductBySku,
  findProductByBarcode,
  searchProducts,
  getAllProducts,
  updateProduct,
  deactivateProduct,
  activateProduct,
  getLowStockProducts,
} = require("./database/repositories/product.repository.cjs");

const {
  createCategory,
  getCategoryById,
  getCategoryByName,
  getAllCategories,
  searchCategories,
  updateCategory,
  deactivateCategory,
  activateCategory,
} = require("./database/repositories/category.repository.cjs");

const {
  stockIn,
  stockOut,
  adjustStock,
  getCurrentStock,
  getStockMovements,
  getAllStockMovements,
  getStockSummary,
} = require("./database/repositories/inventory.repository.cjs");

const {
  writeProductsCsv,
  readProductsCsv,
} = require("./utils/csv.cjs");

const isDevelopment = !app.isPackaged;

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1100,
    minHeight: 700,

    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.cjs"
      ),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },

    show: false,
  });

  if (isDevelopment) {
    mainWindow.loadURL(
      "http://127.0.0.1:5173"
    );
  } else {
    mainWindow.loadFile(
      path.join(
        __dirname,
        "../frontend/dist/index.html"
      )
    );
  }

  mainWindow.once(
    "ready-to-show",
    () => {
      mainWindow.show();
    }
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/*
|--------------------------------------------------------------------------
| Application IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle(
  "app:get-info",
  () => {
    return {
      name: "Offline Billing Software",
      version: app.getVersion(),
      platform: process.platform,
    };
  }
);

/*
|--------------------------------------------------------------------------
| Database IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle(
  "database:get-status",
  () => {
    try {
      const database =
        getDatabase();

      const tables =
        database
          .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
          `)
          .all();

      return {
        success: true,
        path:
          getDatabasePath(),
        tableCount:
          tables.length,
        tables:
          tables.map(
            (table) =>
              table.name
          ),
      };
    } catch (error) {
      console.error(
        "Database status error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

/*
|--------------------------------------------------------------------------
| Product IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle(
  "products:create",
  (_event, productData) => {
    try {
      return {
        success: true,
        product:
          createProduct(
            productData
          ),
      };
    } catch (error) {
      console.error(
        "Create product error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:get-by-id",
  (_event, id) => {
    try {
      return {
        success: true,
        product:
          findProductById(id),
      };
    } catch (error) {
      console.error(
        "Find product by ID error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:get-by-sku",
  (_event, sku) => {
    try {
      return {
        success: true,
        product:
          findProductBySku(sku),
      };
    } catch (error) {
      console.error(
        "Find product by SKU error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:get-by-barcode",
  (_event, barcode) => {
    try {
      return {
        success: true,
        product:
          findProductByBarcode(
            barcode
          ),
      };
    } catch (error) {
      console.error(
        "Find product by barcode error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:search",
  (
    _event,
    {
      searchTerm = "",
      includeInactive = false,
    } = {}
  ) => {
    try {
      return {
        success: true,
        products:
          searchProducts(
            searchTerm,
            includeInactive
          ),
      };
    } catch (error) {
      console.error(
        "Search products error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:get-all",
  (
    _event,
    options = {}
  ) => {
    try {
      return {
        success: true,
        products:
          getAllProducts(
            options
          ),
      };
    } catch (error) {
      console.error(
        "Get all products error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:update",
  (
    _event,
    { id, data }
  ) => {
    try {
      return {
        success: true,
        product:
          updateProduct(
            id,
            data
          ),
      };
    } catch (error) {
      console.error(
        "Update product error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:deactivate",
  (_event, id) => {
    try {
      return {
        success: true,
        product:
          deactivateProduct(
            id
          ),
      };
    } catch (error) {
      console.error(
        "Deactivate product error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:activate",
  (_event, id) => {
    try {
      return {
        success: true,
        product:
          activateProduct(
            id
          ),
      };
    } catch (error) {
      console.error(
        "Activate product error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:get-low-stock",
  () => {
    try {
      return {
        success: true,
        products:
          getLowStockProducts(),
      };
    } catch (error) {
      console.error(
        "Get low stock products error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

/*
|--------------------------------------------------------------------------
| Product CSV Export IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle(
  "products:export-csv",
  async (
    _event,
    {
      includeInactive = false,
      categoryId = null,
    } = {}
  ) => {
    try {
      const products =
        getAllProducts({
          includeInactive,
          categoryId:
            categoryId || null,
        });

      const defaultFileName =
        `products-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

      const result =
        await dialog.showSaveDialog(
          mainWindow,
          {
            title:
              "Export Products",

            defaultPath:
              defaultFileName,

            filters: [
              {
                name:
                  "CSV Files",
                extensions: [
                  "csv",
                ],
              },
              {
                name:
                  "All Files",
                extensions: [
                  "*",
                ],
              },
            ],
          }
        );

      if (
        result.canceled
      ) {
        return {
          success: true,
          canceled: true,
        };
      }

      if (
        !result.filePath
      ) {
        return {
          success: false,
          error:
            "No export file path selected.",
        };
      }

      writeProductsCsv(
        result.filePath,
        products
      );

      return {
        success: true,
        canceled: false,
        path:
          result.filePath,
        count:
          products.length,
      };
    } catch (error) {
      console.error(
        "Export products CSV error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

/*
|--------------------------------------------------------------------------
| Product CSV Import IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle(
  "products:import-csv",
  async () => {
    try {
      const result =
        await dialog.showOpenDialog(
          mainWindow,
          {
            title:
              "Import Products",

            properties: [
              "openFile",
            ],

            filters: [
              {
                name:
                  "CSV Files",
                extensions: [
                  "csv",
                ],
              },
              {
                name:
                  "All Files",
                extensions: [
                  "*",
                ],
              },
            ],
          }
        );

      if (
        result.canceled
      ) {
        return {
          success: true,
          canceled: true,
          count: 0,
          products: [],
          errors: [],
        };
      }

      if (
        !result.filePaths ||
        result.filePaths.length === 0
      ) {
        return {
          success: false,
          error:
            "No CSV file selected.",
        };
      }

      const filePath =
        result.filePaths[0];

      const rows =
        readProductsCsv(
          filePath
        );

      if (
        rows.length === 0
      ) {
        return {
          success: false,
          error:
            "The selected CSV file contains no product rows.",
        };
      }

      const validProducts = [];
      const errors = [];

      rows.forEach(
        (row, index) => {
          const rowNumber =
            index + 2;

          const name =
            row[
              "Product Name"
            ]?.trim();

          const sku =
            row["SKU"]?.trim();

          const barcode =
            row[
              "Barcode"
            ]?.trim() || null;

          const categoryId =
            row[
              "Category ID"
            ]?.trim() || null;

          const sellingPrice =
            Number(
              row[
                "Selling Price"
              ]
            );

          const purchasePrice =
            Number(
              row[
                "Purchase Price"
              ]
            );

          const gstRate =
            Number(
              row[
                "GST Rate"
              ]
            );

          const currentStock =
            Number(
              row[
                "Current Stock"
              ]
            );

          const minimumStock =
            Number(
              row[
                "Minimum Stock"
              ]
            );

          const unit =
            row["Unit"]?.trim() ||
            "PCS";

          const status =
            row["Status"]?.trim() ||
            "ACTIVE";

          if (!name) {
            errors.push(
              `Row ${rowNumber}: Product Name is required.`
            );

            return;
          }

          if (!sku) {
            errors.push(
              `Row ${rowNumber}: SKU is required.`
            );

            return;
          }

          if (
            Number.isNaN(
              sellingPrice
            ) ||
            sellingPrice < 0
          ) {
            errors.push(
              `Row ${rowNumber}: Selling Price is invalid.`
            );

            return;
          }

          if (
            Number.isNaN(
              purchasePrice
            ) ||
            purchasePrice < 0
          ) {
            errors.push(
              `Row ${rowNumber}: Purchase Price is invalid.`
            );

            return;
          }

          if (
            Number.isNaN(
              gstRate
            ) ||
            gstRate < 0 ||
            gstRate > 100
          ) {
            errors.push(
              `Row ${rowNumber}: GST Rate must be between 0 and 100.`
            );

            return;
          }

          if (
            Number.isNaN(
              currentStock
            ) ||
            currentStock < 0
          ) {
            errors.push(
              `Row ${rowNumber}: Current Stock is invalid.`
            );

            return;
          }

          if (
            Number.isNaN(
              minimumStock
            ) ||
            minimumStock < 0
          ) {
            errors.push(
              `Row ${rowNumber}: Minimum Stock is invalid.`
            );

            return;
          }

          if (!unit) {
            errors.push(
              `Row ${rowNumber}: Unit is required.`
            );

            return;
          }

          if (
            status !== "ACTIVE" &&
            status !== "INACTIVE"
          ) {
            errors.push(
              `Row ${rowNumber}: Status must be ACTIVE or INACTIVE.`
            );

            return;
          }

          if (categoryId) {
            const category =
              getCategoryById(
                categoryId
              );

            if (!category) {
              errors.push(
                `Row ${rowNumber}: Category ID "${categoryId}" was not found.`
              );

              return;
            }

            if (
              category.status !==
              "ACTIVE"
            ) {
              errors.push(
                `Row ${rowNumber}: Selected category is inactive.`
              );

              return;
            }
          }

          const existingSku =
            findProductBySku(
              sku
            );

          if (
            existingSku
          ) {
            errors.push(
              `Row ${rowNumber}: SKU "${sku}" already exists.`
            );

            return;
          }

          if (barcode) {
            const existingBarcode =
              findProductByBarcode(
                barcode
              );

            if (
              existingBarcode
            ) {
              errors.push(
                `Row ${rowNumber}: Barcode "${barcode}" already exists.`
              );

              return;
            }
          }

          validProducts.push({
            name,
            sku,
            barcode,
            categoryId,
            sellingPrice,
            purchasePrice,
            gstRate,
            currentStock,
            minimumStock,
            unit,
            imagePath:
              row[
                "Image Path"
              ]?.trim() ||
              null,
            status,
          });
        }
      );

      if (
        errors.length > 0
      ) {
        return {
          success: true,
          canceled: false,
          path: filePath,
          count: 0,
          products: [],
          errors,
        };
      }

      const createdProducts =
        importProducts(
          validProducts,
          "DEV-LOCAL-001"
        );

      return {
        success: true,
        canceled: false,
        path: filePath,
        count:
          createdProducts.length,
        products:
          createdProducts,
        errors: [],
      };
    } catch (error) {
      console.error(
        "Import products CSV error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

/*
|--------------------------------------------------------------------------
| Inventory IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle(
  "inventory:stock-in",
  (_event, inventoryData) => {
    try {
      return {
        success: true,
        result:
          stockIn(
            inventoryData
          ),
      };
    } catch (error) {
      console.error(
        "Stock in error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "inventory:stock-out",
  (_event, inventoryData) => {
    try {
      return {
        success: true,
        result:
          stockOut(
            inventoryData
          ),
      };
    } catch (error) {
      console.error(
        "Stock out error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "inventory:adjust",
  (_event, inventoryData) => {
    try {
      return {
        success: true,
        result:
          adjustStock(
            inventoryData
          ),
      };
    } catch (error) {
      console.error(
        "Stock adjustment error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "inventory:get-current-stock",
  (_event, productId) => {
    try {
      return {
        success: true,
        result:
          getCurrentStock(
            productId
          ),
      };
    } catch (error) {
      console.error(
        "Get current stock error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "inventory:get-movements",
  (
    _event,
    {
      productId,
      limit = 100,
    } = {}
  ) => {
    try {
      return {
        success: true,
        movements:
          getStockMovements(
            productId,
            limit
          ),
      };
    } catch (error) {
      console.error(
        "Get product stock movements error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "inventory:get-all-movements",
  (
    _event,
    limit = 200
  ) => {
    try {
      return {
        success: true,
        movements:
          getAllStockMovements(
            limit
          ),
      };
    } catch (error) {
      console.error(
        "Get all stock movements error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "inventory:get-summary",
  () => {
    try {
      return {
        success: true,
        products:
          getStockSummary(),
      };
    } catch (error) {
      console.error(
        "Get stock summary error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

/*
|--------------------------------------------------------------------------
| Category IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle(
  "categories:create",
  (_event, categoryData) => {
    try {
      return {
        success: true,
        category:
          createCategory(
            categoryData
          ),
      };
    } catch (error) {
      console.error(
        "Create category error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:get-by-id",
  (_event, id) => {
    try {
      return {
        success: true,
        category:
          getCategoryById(id),
      };
    } catch (error) {
      console.error(
        "Get category by ID error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:get-by-name",
  (_event, name) => {
    try {
      return {
        success: true,
        category:
          getCategoryByName(
            name
          ),
      };
    } catch (error) {
      console.error(
        "Get category by name error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:get-all",
  (
    _event,
    options = {}
  ) => {
    try {
      return {
        success: true,
        categories:
          getAllCategories(
            options
          ),
      };
    } catch (error) {
      console.error(
        "Get all categories error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:search",
  (
    _event,
    searchText,
    options = {}
  ) => {
    try {
      return {
        success: true,
        categories:
          searchCategories(
            searchText,
            options
          ),
      };
    } catch (error) {
      console.error(
        "Search categories error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:update",
  (_event, categoryData) => {
    try {
      return {
        success: true,
        category:
          updateCategory(
            categoryData
          ),
      };
    } catch (error) {
      console.error(
        "Update category error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:deactivate",
  (_event, id) => {
    try {
      return {
        success: true,
        category:
          deactivateCategory(
            id
          ),
      };
    } catch (error) {
      console.error(
        "Deactivate category error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:activate",
  (_event, id) => {
    try {
      return {
        success: true,
        category:
          activateCategory(
            id
          ),
      };
    } catch (error) {
      console.error(
        "Activate category error:",
        error
      );

      return {
        success: false,
        error:
          error.message,
      };
    }
  }
);



ipcMain.handle("customers:get-by-id", (_event, id) => {
  return customerRepository.getCustomerById(id);
});

ipcMain.handle("customers:get-by-mobile", (_event, mobile) => {
  return customerRepository.getCustomerByMobile(mobile);
});

ipcMain.handle("customers:create", (_event, input) => {
  return customerRepository.createCustomer(input);
});

ipcMain.handle(
  "customers:update",
  (_event, id, input) => {
    return customerRepository.updateCustomer(
      id,
      input
    );
  }
);

ipcMain.handle("customers:get-all", () => {
  return customerRepository.getAllCustomers();
});

ipcMain.handle(
  "customers:search",
  (_event, searchTerm) => {
    return customerRepository.searchCustomers(
      searchTerm
    );
  }
);

ipcMain.handle("customers:get-outstanding", () => {
  return customerRepository.getOutstandingCustomers();
});

ipcMain.handle(
  "customers:update-financials",
  (
    _event,
    customerId,
    purchaseAmountDelta,
    outstandingAmountDelta
  ) => {
    return customerRepository.updateCustomerFinancials(
      customerId,
      purchaseAmountDelta,
      outstandingAmountDelta
    );
  }

);


ipcMain.handle(
  "invoices:create",
  (_event, input) =>
    invoiceRepository.createInvoice(input)
);

ipcMain.handle(
  "invoices:get-by-id",
  (_event, invoiceId) =>
    invoiceRepository.getInvoiceById(invoiceId)
);

ipcMain.handle(
  "invoices:get-by-transaction-id",
  (_event, transactionId) =>
    invoiceRepository.getInvoiceByTransactionId(
      transactionId
    )
);

ipcMain.handle(
  "invoices:get-by-number",
  (_event, invoiceNumber) =>
    invoiceRepository.getInvoiceByNumber(
      invoiceNumber
    )
);

ipcMain.handle(
  "invoices:get-recent",
  (_event, limit) =>
    invoiceRepository.getRecentInvoices(limit)
);

ipcMain.handle(
  "invoices:share",
  async (_event, shareText) => {
    const text =
      String(shareText || "").trim();

    if (!text) {
      throw new Error(
        "Invoice share content is empty."
      );
    }

    const whatsappUrl =
      `https://wa.me/?text=${encodeURIComponent(
        text
      )}`;

    await shell.openExternal(
      whatsappUrl
    );

    return {
      success: true,
    };
  }
);

ipcMain.handle(
  "payments:get-by-id",
  (_event, paymentId) =>
    paymentRepository.getPaymentById(
      paymentId
    )
);

ipcMain.handle(
  "payments:get-all",
  (_event, options) =>
    paymentRepository.getPayments(
      options || {}
    )
);

ipcMain.handle(
  "payments:get-outstanding",
  () =>
    paymentRepository.getOutstandingPayments()
);

ipcMain.handle(
  "payments:get-summary",
  () =>
    paymentRepository.getPaymentSummary()
);

ipcMain.handle(
  "payments:record",
  (_event, input) =>
    paymentRepository.recordPayment(
      input
    )
);
ipcMain.handle(
  "invoices:download-pdf",
  async (event, invoiceNumber) => {
    const win =
      BrowserWindow.fromWebContents(
        event.sender
      );

      ipcMain.handle(
  "invoices:share",
  async (_event, shareText) => {
    const text =
      String(shareText || "").trim();

    if (!text) {
      throw new Error(
        "Invoice share content is empty."
      );
    }

    const whatsappUrl =
      `https://wa.me/?text=${encodeURIComponent(
        text
      )}`;

    await shell.openExternal(
      whatsappUrl
    );

    return {
      success: true,
    };
  }
);

ipcMain.handle(
  "settings:backup",
  async (event) => {
    const win =
      BrowserWindow.fromWebContents(
        event.sender
      );

    try {
      const database =
        getDatabase();

      const databasePath =
        path.resolve(
          getDatabasePath()
        );

      const timestamp =
        new Date()
          .toISOString()
          .replace(
            /[:.]/g,
            "-"
          );

      const defaultFileName =
        `offline-billing-backup-${timestamp}.db`;

      const result =
        await dialog.showSaveDialog(
          win,
          {
            title:
              "Backup Local Database",
            defaultPath:
              path.join(
                app.getPath(
                  "documents"
                ),
                defaultFileName
              ),
            filters: [
              {
                name:
                  "SQLite Database",
                extensions: [
                  "db",
                ],
              },
            ],
          }
        );

      if (
        result.canceled ||
        !result.filePath
      ) {
        return {
          success: true,
          canceled: true,
          filePath: null,
        };
      }

      const selectedPath =
        path.resolve(
          result.filePath
        );

      if (
        selectedPath ===
        databasePath
      ) {
        return {
          success: false,
          error:
            "You cannot overwrite the active application database with its own backup.",
        };
      }

      const backupPath =
        await backupDatabase(
          database,
          selectedPath
        );

      console.log(
        "Local database backup created:",
        backupPath
      );

      return {
        success: true,
        canceled: false,
        filePath: backupPath,
      };
    } catch (error) {
      console.error(
        "Database backup failed:",
        error
      );

      return {
        success: false,
        canceled: false,
        filePath: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create database backup.",
      };
    }
  }
);



    if (!win) {
      throw new Error(
        "Invoice window is not available."
      );
    }

    const safeInvoiceNumber =
      String(
        invoiceNumber || "invoice"
      ).replace(
        /[<>:"/\\|?*]+/g,
        "_"
      );

    const result =
      await dialog.showSaveDialog(
        win,
        {
          title: "Save Invoice as PDF",

          defaultPath:
            `${safeInvoiceNumber}.pdf`,

          filters: [
            {
              name: "PDF Files",
              extensions: ["pdf"],
            },
          ],
        }
      );

    if (
      result.canceled ||
      !result.filePath
    ) {
      return {
        canceled: true,
        filePath: null,
      };
    }

    const settings =
  settingsRepository.getSettings();

const printFormat =
  settings?.invoice?.printFormat ===
  "THERMAL"
    ? "THERMAL"
    : "A4";

const paperWidth =
  settings?.printer?.paperWidth === 58
    ? 58
    : 80;

const pageSize =
  printFormat === "THERMAL"
    ? {
        width: paperWidth / 25.4,
        height: 11.69,
      }
    : "A4";

    const pdfData =
      await win.webContents.printToPDF({
        pageSize: "A4",
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,

        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });

    fs.writeFileSync(
      result.filePath,
      pdfData
    );

    return {
      canceled: false,
      filePath: result.filePath,
    };
  }
);

// --------------------------------------------------------------------------
// Sync IPC
// --------------------------------------------------------------------------

ipcMain.handle(
  "sync:get-pending",
  (_event, limit) =>
    syncRepository.getPendingSyncItems(limit)
);

ipcMain.handle(
  "sync:get-failed",
  (_event, limit) =>
    syncRepository.getFailedSyncItems(limit)
);

ipcMain.handle(
  "sync:get-all",
  (_event, limit) =>
    syncRepository.getAllSyncItems(limit)
);

ipcMain.handle(
  "sync:get-by-id",
  (_event, queueId) =>
    syncRepository.getSyncItemById(queueId)
);

ipcMain.handle(
  "sync:get-by-entity",
  (
    _event,
    entityType,
    entityId
  ) =>
    syncRepository.getSyncItemsByEntity(
      entityType,
      entityId
    )
);

ipcMain.handle(
  "sync:get-summary",
  () =>
    syncRepository.getSyncSummary()
);

ipcMain.handle(
  "sync:mark-synced",
  (
    _event,
    queueId,
    serverId
  ) =>
    syncRepository.markSyncItemSynced(
      queueId,
      serverId ?? null
    )
);

ipcMain.handle(
  "sync:mark-failed",
  (
    _event,
    queueId,
    errorMessage
  ) =>
    syncRepository.markSyncItemFailed(
      queueId,
      errorMessage
    )
);

ipcMain.handle(
  "sync:retry",
  (_event, queueId) =>
    syncRepository.retrySyncItem(
      queueId
    )
);

ipcMain.handle(
  "sync:retry-all",
  (_event, limit) =>
    syncRepository.retryAllFailed(
      limit
    )
);


// --------------------------------------------------------------------------
// Settings IPC
// --------------------------------------------------------------------------

ipcMain.handle(
  "settings:get",
  () => {
    return settingsRepository.getSettings();
  }
);

ipcMain.handle(
  "settings:update",
  (_event, settings) => {
    return settingsRepository.updateSettings(
      settings
    );
  }
);

ipcMain.handle(
  "settings:reset",
  () => {
    return settingsRepository.resetSettings();
  }
);


ipcMain.handle(
  "settings:backup",
  async (event) => {
    const win =
      BrowserWindow.fromWebContents(
        event.sender
      );

    try {
      const database =
        getDatabase();

      const databasePath =
        path.resolve(
          getDatabasePath()
        );

      const timestamp =
        new Date()
          .toISOString()
          .replace(
            /[:.]/g,
            "-"
          );

      const defaultFileName =
        `offline-billing-backup-${timestamp}.db`;

      const result =
        await dialog.showSaveDialog(
          win,
          {
            title:
              "Backup Local Database",

            defaultPath:
              path.join(
                app.getPath(
                  "documents"
                ),
                defaultFileName
              ),

            filters: [
              {
                name:
                  "SQLite Database",
                extensions: [
                  "db",
                ],
              },
            ],
          }
        );

      if (
        result.canceled ||
        !result.filePath
      ) {
        return {
          success: true,
          canceled: true,
          filePath: null,
        };
      }

      const selectedPath =
        path.resolve(
          result.filePath
        );

      if (
        selectedPath ===
        databasePath
      ) {
        return {
          success: false,
          canceled: false,
          filePath: null,
          error:
            "You cannot overwrite the active application database with its own backup.",
        };
      }

      const backupPath =
        await backupDatabase(
          database,
          selectedPath
        );

      console.log(
        "Local database backup created:",
        backupPath
      );

      return {
        success: true,
        canceled: false,
        filePath: backupPath,
      };
    } catch (error) {
      console.error(
        "Database backup failed:",
        error
      );

      return {
        success: false,
        canceled: false,
        filePath: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create local database backup.",
      };
    }
  }
);

ipcMain.handle(
  "settings:restore",
  async (event) => {
    const win =
      BrowserWindow.fromWebContents(
        event.sender
      );

    try {
      const databasePath =
        path.resolve(
          getDatabasePath()
        );

      const result =
        await dialog.showOpenDialog(
          win,
          {
            title:
              "Restore Local Database",
            properties: [
              "openFile",
            ],
            filters: [
              {
                name:
                  "SQLite Database",
                extensions: [
                  "db",
                ],
              },
            ],
          }
        );

      if (
        result.canceled ||
        !result.filePaths?.length
      ) {
        return {
          success: true,
          canceled: true,
          filePath: null,
        };
      }

      const selectedPath =
        path.resolve(
          result.filePaths[0]
        );

      if (
        selectedPath ===
        databasePath
      ) {
        return {
          success: false,
          canceled: false,
          filePath: null,
          error:
            "The selected file is already the active database.",
        };
      }

      const confirmation =
        await dialog.showMessageBox(
          win,
          {
            type: "warning",
            title:
              "Restore Database",
            message:
              "Restore this database backup?",
            detail:
              "This will replace the current local billing database. A safety backup of the current database will be created first.",
            buttons: [
              "Restore",
              "Cancel",
            ],
            defaultId: 1,
            cancelId: 1,
          }
        );

      if (
        confirmation.response !== 0
      ) {
        return {
          success: true,
          canceled: true,
          filePath: null,
        };
      }

      /*
       * Keep the current SQLite connection open.
       * First create a safety backup.
       */
      const safetyBackupPath =
        path.join(
          app.getPath(
            "documents"
          ),
          `offline-billing-before-restore-${Date.now()}.db`
        );

      const database =
        getDatabase();

      await backupDatabase(
        database,
        safetyBackupPath
      );

      /*
       * Restore the selected backup
       * directly into the currently open
       * SQLite database.
       */
      restoreDatabase(
        selectedPath,
        database
      );

      console.log(
        "Database restored successfully:",
        selectedPath
      );

      console.log(
        "Safety backup created:",
        safetyBackupPath
      );

      return {
        success: true,
        canceled: false,
        filePath: selectedPath,
      };
    } catch (error) {
      console.error(
        "Database restore failed:",
        error
      );

      return {
        success: false,
        canceled: false,
        filePath: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to restore database.",
      };
    }
  }
);
// --------------------------------------------------------------------------
// Reports IPC
// --------------------------------------------------------------------------

ipcMain.handle(
  "reports:get-sales-summary",
  (_event, options = {}) =>
    reportRepository.getSalesSummary(options || {})
);

ipcMain.handle(
  "reports:get-daily-sales",
  (_event, options = {}) =>
    reportRepository.getDailySales(options || {})
);

ipcMain.handle(
  "reports:get-weekly-sales",
  (_event, options = {}) =>
    reportRepository.getWeeklySales(options || {})
);

ipcMain.handle(
  "reports:get-monthly-sales",
  (_event, options = {}) =>
    reportRepository.getMonthlySales(options || {})
);

ipcMain.handle(
  "reports:get-product-wise-sales",
  (_event, options = {}) =>
    reportRepository.getProductWiseSales(options || {})
);

ipcMain.handle(
  "reports:get-payment-method-sales",
  (_event, options = {}) =>
    reportRepository.getPaymentMethodWiseSales(options || {})
);

ipcMain.handle(
  "reports:get-current-stock",
  (_event, options = {}) =>
    reportRepository.getCurrentStockReport(options || {})
);

ipcMain.handle(
  "reports:get-low-stock",
  () =>
    reportRepository.getLowStockProducts()
);

ipcMain.handle(
  "reports:get-stock-movements",
  (_event, options = {}) =>
    reportRepository.getStockMovementReport(options || {})
);

ipcMain.handle(
  "reports:get-inventory-summary",
  () =>
    reportRepository.getInventorySummary()
);

ipcMain.handle(
  "reports:get-customer-purchases",
  (_event, options = {}) =>
    reportRepository.getCustomerPurchasesReport(options || {})
);

ipcMain.handle(
  "reports:get-outstanding-payments",
  () =>
    reportRepository.getOutstandingPaymentsReport()
);

ipcMain.handle(
  "reports:get-customer-outstanding-summary",
  () =>
    reportRepository.getCustomerOutstandingSummary()
);

// --------------------------------------------------------------------------
// Settings Logo Picker
// --------------------------------------------------------------------------

ipcMain.handle(
  "settings:select-logo",
  async (event) => {
    const win =
      BrowserWindow.fromWebContents(
        event.sender
      );

    const result =
      await dialog.showOpenDialog(
        win,
        {
          title: "Select Business Logo",

          properties: [
            "openFile",
          ],

          filters: [
            {
              name: "Image Files",
              extensions: [
                "png",
                "jpg",
                "jpeg",
                "webp",
              ],
            },
          ],
        }
      );

    if (
      result.canceled ||
      result.filePaths.length === 0
    ) {
      return {
        canceled: true,
        filePath: null,
      };
    }

    return {
      canceled: false,
      filePath: result.filePaths[0],
    };
  }
);

// --------------------------------------------------------------------------
// Settings Logo Data
// --------------------------------------------------------------------------

ipcMain.handle(
  "settings:get-logo-data",
  async () => {
    const settings =
      settingsRepository.getSettings();

    const logoPath =
      settings?.business?.logoPath;

    if (!logoPath) {
      return null;
    }

    try {
      if (!fs.existsSync(logoPath)) {
        return null;
      }

      const extension =
        path
          .extname(logoPath)
          .toLowerCase();

      const mimeTypes = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
      };

      const mimeType =
        mimeTypes[extension];

      if (!mimeType) {
        return null;
      }

      const imageBuffer =
        fs.readFileSync(logoPath);

      return `data:${mimeType};base64,${imageBuffer.toString(
        "base64"
      )}`;
    } catch (error) {
      console.error(
        "Failed to load business logo:",
        error
      );

      return null;
    }
  }
);

ipcMain.handle("auth:login", (_event, input) => {
  try {
    const email =
      typeof input?.email === "string"
        ? input.email.trim()
        : "";

    const password =
      typeof input?.password === "string"
        ? input.password
        : "";

    if (!email || !password) {
      return {
        success: false,
        error: "Email and password are required.",
      };
    }

    const user =
      userRepository.authenticateUser(
        email,
        password
      );

    if (!user) {
      return {
        success: false,
        error: "Invalid email or password.",
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error(
      "auth:login failed:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Login failed.",
    };
  }
});

ipcMain.handle("auth:get-current-user", () => {
  return {
    success: false,
    user: undefined,
  };
});

/*
|--------------------------------------------------------------------------
| Application Lifecycle
|--------------------------------------------------------------------------
*/

app.whenReady().then(() => {
  try {
    runMigrations();
    userRepository.initializeDefaultAdmin();

    console.log(
      "================================="
    );

    console.log(
      "Offline Billing Software"
    );

    console.log(
      "SQLite initialized successfully"
    );

    console.log(
      "Database:",
      getDatabasePath()
    );

    console.log(
      "================================="
    );

    createMainWindow();
  } catch (error) {
    console.error(
      "Application startup failed:"
    );

    console.error(error);

    app.quit();

    return;
  }

  app.on(
    "activate",
    () => {
      if (
        BrowserWindow
          .getAllWindows()
          .length === 0
      ) {
        createMainWindow();
      }
    }
  );
});

app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);

app.on(
  "before-quit",
  () => {
    closeDatabase();
  }
);