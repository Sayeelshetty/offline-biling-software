const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),

  database: {
    getStatus: () => ipcRenderer.invoke("database:get-status")
  }
});