"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: () => electron_1.ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => electron_1.ipcRenderer.invoke('maximize-window'),
    closeWindow: () => electron_1.ipcRenderer.invoke('close-window'),
    // App info
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    // File system
    openFileDialog: () => electron_1.ipcRenderer.invoke('open-file-dialog'),
    selectFolder: () => electron_1.ipcRenderer.invoke('open-file-dialog'), // Alias for clarity
    saveTestFile: (filePath, contents) => electron_1.ipcRenderer.invoke('fs:saveTestFile', filePath, contents),
    readFile: (filePath) => electron_1.ipcRenderer.invoke('fs:readFile', filePath),
    openInEditor: (filePath) => electron_1.ipcRenderer.invoke('fs:openInEditor', filePath),
    // Playwright setup
    checkPlaywright: (projectPath) => electron_1.ipcRenderer.invoke('playwright:check', projectPath),
    installPlaywright: (projectPath) => electron_1.ipcRenderer.invoke('playwright:install', projectPath),
    readPlaywrightConfig: (projectPath) => electron_1.ipcRenderer.invoke('playwright:read-config', projectPath),
    createPlaywrightConfig: (projectPath, config) => electron_1.ipcRenderer.invoke('playwright:create-config', projectPath, config),
    // Test execution
    runPlaywrightTests: (options) => electron_1.ipcRenderer.invoke('test:run-playwright', options),
    // Test execution events (one-way from main to renderer)
    onTestConsole: (callback) => {
        const subscription = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('test:console', subscription);
        return () => electron_1.ipcRenderer.removeListener('test:console', subscription);
    },
    onTestComplete: (callback) => {
        const subscription = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('test:complete', subscription);
        return () => electron_1.ipcRenderer.removeListener('test:complete', subscription);
    },
    // Playwright installation events
    onPlaywrightInstallProgress: (callback) => {
        const subscription = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('playwright:install:progress', subscription);
        return () => electron_1.ipcRenderer.removeListener('playwright:install:progress', subscription);
    },
    onPlaywrightInstallComplete: (callback) => {
        const subscription = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('playwright:install:complete', subscription);
        return () => electron_1.ipcRenderer.removeListener('playwright:install:complete', subscription);
    },
    // Project scanning for cloud discovery
    scanProject: (projectPath) => electron_1.ipcRenderer.invoke('project:scan', projectPath),
    // V5 Project scanning (enhanced with ranked selectors, constraints, flows)
    scanProjectV5: (projectPath) => electron_1.ipcRenderer.invoke('project:scan-v5', projectPath),
    // V7 Project scanning (Behavior Graph)
    scanProjectV7: (projectPath) => electron_1.ipcRenderer.invoke('project:scan-v7', projectPath),
    // Platform info
    platform: process.platform
});
