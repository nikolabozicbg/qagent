"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: function () { return electron_1.ipcRenderer.invoke('minimize-window'); },
    maximizeWindow: function () { return electron_1.ipcRenderer.invoke('maximize-window'); },
    closeWindow: function () { return electron_1.ipcRenderer.invoke('close-window'); },
    // App info
    getAppVersion: function () { return electron_1.ipcRenderer.invoke('get-app-version'); },
    // File system
    openFileDialog: function () { return electron_1.ipcRenderer.invoke('open-file-dialog'); },
    selectFolder: function () { return electron_1.ipcRenderer.invoke('open-file-dialog'); }, // Alias for clarity
    saveTestFile: function (filePath, contents) {
        return electron_1.ipcRenderer.invoke('fs:saveTestFile', filePath, contents);
    },
    readFile: function (filePath) {
        return electron_1.ipcRenderer.invoke('fs:readFile', filePath);
    },
    openInEditor: function (filePath) {
        return electron_1.ipcRenderer.invoke('fs:openInEditor', filePath);
    },
    // Platform info
    platform: process.platform
});
