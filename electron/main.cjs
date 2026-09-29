const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const { runMigrations } = require("./database/migrations.cjs");

const {
  getDatabase,
  getDatabasePath,
  closeDatabase,
} = require("./database/connection.cjs");

const {
  createProduct,
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

const isDevelopment = !app.isPackaged;

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1100,
    minHeight: 700,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },

    show: false,
  });

  if (isDevelopment) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../frontend/dist/index.html")
    );
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/*
|--------------------------------------------------------------------------
| Application IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle("app:get-info", () => {
  return {
    name: "Offline Billing Software",
    version: app.getVersion(),
    platform: process.platform,
  };
});

/*
|--------------------------------------------------------------------------
| Database IPC
|--------------------------------------------------------------------------
*/

ipcMain.handle("database:get-status", () => {
  try {
    const database = getDatabase();

    const tables = database
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
      `)
      .all();

    return {
      success: true,
      path: getDatabasePath(),
      tableCount: tables.length,
      tables: tables.map((table) => table.name),
    };
  } catch (error) {
    console.error("Database status error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
});

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
        product: createProduct(productData),
      };
    } catch (error) {
      console.error("Create product error:", error);

      return {
        success: false,
        error: error.message,
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
        product: findProductById(id),
      };
    } catch (error) {
      console.error("Find product by ID error:", error);

      return {
        success: false,
        error: error.message,
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
        product: findProductBySku(sku),
      };
    } catch (error) {
      console.error("Find product by SKU error:", error);

      return {
        success: false,
        error: error.message,
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
        product: findProductByBarcode(barcode),
      };
    } catch (error) {
      console.error("Find product by barcode error:", error);

      return {
        success: false,
        error: error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:search",
  (_event, { searchTerm = "", includeInactive = false } = {}) => {
    try {
      return {
        success: true,
        products: searchProducts(
          searchTerm,
          includeInactive
        ),
      };
    } catch (error) {
      console.error("Search products error:", error);

      return {
        success: false,
        error: error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:get-all",
  (_event, options = {}) => {
    try {
      return {
        success: true,
        products: getAllProducts(options),
      };
    } catch (error) {
      console.error("Get all products error:", error);

      return {
        success: false,
        error: error.message,
      };
    }
  }
);

ipcMain.handle(
  "products:update",
  (_event, { id, data }) => {
    try {
      return {
        success: true,
        product: updateProduct(id, data),
      };
    } catch (error) {
      console.error("Update product error:", error);

      return {
        success: false,
        error: error.message,
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
        product: deactivateProduct(id),
      };
    } catch (error) {
      console.error("Deactivate product error:", error);

      return {
        success: false,
        error: error.message,
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
        product: activateProduct(id),
      };
    } catch (error) {
      console.error("Activate product error:", error);

      return {
        success: false,
        error: error.message,
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
        products: getLowStockProducts(),
      };
    } catch (error) {
      console.error(
        "Get low stock products error:",
        error
      );

      return {
        success: false,
        error: error.message,
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
        category: createCategory(categoryData),
      };
    } catch (error) {
      console.error("Create category error:", error);

      return {
        success: false,
        error: error.message,
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
        category: getCategoryById(id),
      };
    } catch (error) {
      console.error("Get category by ID error:", error);

      return {
        success: false,
        error: error.message,
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
        category: getCategoryByName(name),
      };
    } catch (error) {
      console.error(
        "Get category by name error:",
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:get-all",
  (_event, options = {}) => {
    try {
      return {
        success: true,
        categories: getAllCategories(options),
      };
    } catch (error) {
      console.error(
        "Get all categories error:",
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }
);

ipcMain.handle(
  "categories:search",
  (_event, searchText, options = {}) => {
    try {
      return {
        success: true,
        categories: searchCategories(
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
        error: error.message,
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
        category: updateCategory(categoryData),
      };
    } catch (error) {
      console.error(
        "Update category error:",
        error
      );

      return {
        success: false,
        error: error.message,
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
        category: deactivateCategory(id),
      };
    } catch (error) {
      console.error(
        "Deactivate category error:",
        error
      );

      return {
        success: false,
        error: error.message,
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
        category: activateCategory(id),
      };
    } catch (error) {
      console.error(
        "Activate category error:",
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
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

    console.log("=================================");
    console.log("Offline Billing Software");
    console.log("SQLite initialized successfully");
    console.log("Database:", getDatabasePath());
    console.log("=================================");

    createMainWindow();
  } catch (error) {
    console.error("Application startup failed:");
    console.error(error);

    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  closeDatabase();
});