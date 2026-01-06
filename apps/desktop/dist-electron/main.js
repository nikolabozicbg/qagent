"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path_1 = require("path");
var fs_1 = require("fs");
var path_2 = require("path");
// Disable security warnings for development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
var mainWindow = null;
var createWindow = function () {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        title: 'QAgent',
        titleBarStyle: 'hiddenInset', // macOS-style titlebar
        trafficLightPosition: { x: 12, y: 16 },
        backgroundColor: '#0A0E14', // Warp-inspired dark bg
        webPreferences: {
            preload: (0, path_1.join)(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false // Don't show until ready
    });
    // Show window when ready (prevents flash)
    mainWindow.once('ready-to-show', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
    });
    // Load the app
    if (!electron_1.app.isPackaged) {
        // Development mode - try different possible ports
        var devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        mainWindow.loadURL(devServerUrl).catch(function () {
            // If port 5173 fails, try other common Vite ports
            var altPorts = [5174, 5175, 5176];
            var tryPort = function (index) {
                if (index >= altPorts.length) {
                    console.error('Failed to load dev server on any port');
                    return;
                }
                mainWindow.loadURL("http://localhost:".concat(altPorts[index])).catch(function () { return tryPort(index + 1); });
            };
            tryPort(0);
        });
        mainWindow.webContents.openDevTools();
    }
    else {
        // Production mode
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
    // Window close handler
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
    // Keyboard shortcuts for development
    if (!electron_1.app.isPackaged) {
        mainWindow.webContents.on('before-input-event', function (event, input) {
            // Cmd+R or F5 to reload
            if ((input.control || input.meta) && input.key === 'r' || input.key === 'F5') {
                mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.reload();
            }
            // Cmd+Shift+R or Ctrl+Shift+R to force reload
            if ((input.control || input.meta) && input.shift && input.key === 'r') {
                mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.reloadIgnoringCache();
            }
        });
    }
};
// App lifecycle
electron_1.app.whenReady().then(function () {
    createWindow();
    electron_1.app.on('activate', function () {
        // macOS: Re-create window when dock icon is clicked
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed (except on macOS)
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC Handlers
electron_1.ipcMain.handle('get-app-version', function () {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('minimize-window', function () {
    mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.minimize();
});
electron_1.ipcMain.handle('maximize-window', function () {
    if (mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.isMaximized()) {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.unmaximize();
    }
    else {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.maximize();
    }
});
electron_1.ipcMain.handle('close-window', function () {
    mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.close();
});
// Handle file open dialog
electron_1.ipcMain.handle('open-file-dialog', function () { return __awaiter(void 0, void 0, void 0, function () {
    var dialog, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dialog = require('electron').dialog;
                return [4 /*yield*/, dialog.showOpenDialog(mainWindow, {
                        properties: ['openDirectory']
                    })];
            case 1:
                result = _a.sent();
                return [2 /*return*/, result];
        }
    });
}); });
// Handle save test file
electron_1.ipcMain.handle('fs:saveTestFile', function (_event, filePath, contents) { return __awaiter(void 0, void 0, void 0, function () {
    var fullPath, dir, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                fullPath = filePath.startsWith('/') ? filePath : (0, path_1.join)(process.cwd(), filePath);
                dir = (0, path_2.dirname)(fullPath);
                return [4 /*yield*/, fs_1.promises.mkdir(dir, { recursive: true })];
            case 1:
                _a.sent();
                // Write file
                return [4 /*yield*/, fs_1.promises.writeFile(fullPath, contents, 'utf-8')];
            case 2:
                // Write file
                _a.sent();
                return [2 /*return*/, { ok: true, path: fullPath }];
            case 3:
                error_1 = _a.sent();
                console.error('Failed to save test file:', error_1);
                return [2 /*return*/, { ok: false, error: error_1.message }];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Handle read file
electron_1.ipcMain.handle('fs:readFile', function (_event, filePath) { return __awaiter(void 0, void 0, void 0, function () {
    var fullPath, contents, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                fullPath = filePath.startsWith('/') ? filePath : (0, path_1.join)(process.cwd(), filePath);
                return [4 /*yield*/, fs_1.promises.readFile(fullPath, 'utf-8')];
            case 1:
                contents = _a.sent();
                return [2 /*return*/, { ok: true, contents: contents }];
            case 2:
                error_2 = _a.sent();
                console.error('Failed to read file:', error_2);
                return [2 /*return*/, { ok: false, error: error_2.message }];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Handle open file in external editor (VS Code)
electron_1.ipcMain.handle('fs:openInEditor', function (_event, filePath) { return __awaiter(void 0, void 0, void 0, function () {
    var shell, fullPath, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                shell = require('electron').shell;
                fullPath = filePath.startsWith('/') ? filePath : (0, path_1.join)(process.cwd(), filePath);
                return [4 /*yield*/, shell.openPath(fullPath)];
            case 1:
                _a.sent();
                return [2 /*return*/, { ok: true }];
            case 2:
                error_3 = _a.sent();
                console.error('Failed to open file in editor:', error_3);
                return [2 /*return*/, { ok: false, error: error_3.message }];
            case 3: return [2 /*return*/];
        }
    });
}); });
