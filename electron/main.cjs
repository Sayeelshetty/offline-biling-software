const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
} = require("electron");

const path = require("path");

const { runMigrations } = require("./database/migrations.cjs");
const customerRepository = require("./database/repositories/customer.repository.cjs");

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

/*
|--------------------------------------------------------------------------
| Application Lifecycle
|--------------------------------------------------------------------------
*/

app.whenReady().then(() => {
  try {
    runMigrations();

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