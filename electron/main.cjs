const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const { runMigrations } = require("./database/migration.cjs");
const {
  getDatabase,
  getDatabasePath,
  closeDatabase,
} = require("./database/connection.cjs");

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

ipcMain.handle("app:get-info", () => {
  return {
    name: "Offline Billing Software",
    version: app.getVersion(),
    platform: process.platform,
  };
});

ipcMain.handle("database:get-status", () => {
  try {
    const database = getDatabase();

    const tables = database
      .prepare(
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
        `
      )
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

app.whenReady().then(() => {
  try {
    // Open the database and create the required tables.
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