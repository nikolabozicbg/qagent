"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const fs_1 = require("fs");
const path_2 = require("path");
const child_process_1 = require("child_process");
const scanner_1 = require("./scanner");
// Disable security warnings for development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
let mainWindow = null;
const createWindow = () => {
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
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Load the app
    if (!electron_1.app.isPackaged) {
        // Development mode - use port 5178 for desktop app
        const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5178';
        mainWindow.loadURL(devServerUrl).catch(() => {
            console.error('Failed to load dev server on port 5178');
        });
        mainWindow.webContents.openDevTools();
    }
    else {
        // Production mode
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
    // Window close handler
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Keyboard shortcuts for development
    if (!electron_1.app.isPackaged) {
        mainWindow.webContents.on('before-input-event', (event, input) => {
            // Cmd+R or F5 to reload
            if ((input.control || input.meta) && input.key === 'r' || input.key === 'F5') {
                mainWindow?.reload();
            }
            // Cmd+Shift+R or Ctrl+Shift+R to force reload
            if ((input.control || input.meta) && input.shift && input.key === 'r') {
                mainWindow?.webContents.reloadIgnoringCache();
            }
        });
    }
};
// App lifecycle
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        // macOS: Re-create window when dock icon is clicked
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed (except on macOS)
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC Handlers
electron_1.ipcMain.handle('get-app-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('minimize-window', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.handle('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow?.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.handle('close-window', () => {
    mainWindow?.close();
});
// Handle file open dialog
electron_1.ipcMain.handle('open-file-dialog', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result;
});
// Handle save test file
electron_1.ipcMain.handle('fs:saveTestFile', async (_event, filePath, contents) => {
    try {
        // Get the project path from the file path (should be absolute)
        const fullPath = filePath.startsWith('/') ? filePath : (0, path_1.join)(process.cwd(), filePath);
        // Ensure directory exists
        const dir = (0, path_2.dirname)(fullPath);
        await fs_1.promises.mkdir(dir, { recursive: true });
        // Write file
        await fs_1.promises.writeFile(fullPath, contents, 'utf-8');
        return { ok: true, path: fullPath };
    }
    catch (error) {
        console.error('Failed to save test file:', error);
        return { ok: false, error: error.message };
    }
});
// Handle read file
electron_1.ipcMain.handle('fs:readFile', async (_event, filePath) => {
    try {
        const fullPath = filePath.startsWith('/') ? filePath : (0, path_1.join)(process.cwd(), filePath);
        const contents = await fs_1.promises.readFile(fullPath, 'utf-8');
        return { ok: true, contents };
    }
    catch (error) {
        console.error('Failed to read file:', error);
        return { ok: false, error: error.message };
    }
});
// Handle open file in external editor (VS Code)
electron_1.ipcMain.handle('fs:openInEditor', async (_event, filePath) => {
    try {
        const { shell } = require('electron');
        const fullPath = filePath.startsWith('/') ? filePath : (0, path_1.join)(process.cwd(), filePath);
        await shell.openPath(fullPath);
        return { ok: true };
    }
    catch (error) {
        console.error('Failed to open file in editor:', error);
        return { ok: false, error: error.message };
    }
});
// Playwright detection - check if installed
electron_1.ipcMain.handle('playwright:check', async (_event, projectPath) => {
    try {
        // Check if @playwright/test is in package.json dependencies
        const packageJsonPath = (0, path_1.join)(projectPath, 'package.json');
        const packageJson = JSON.parse(await fs_1.promises.readFile(packageJsonPath, 'utf-8'));
        const hasPlaywright = packageJson.dependencies?.['@playwright/test'] ||
            packageJson.devDependencies?.['@playwright/test'] ||
            packageJson.dependencies?.['playwright'] ||
            packageJson.devDependencies?.['playwright'];
        // Also check if node_modules/@playwright exists
        const nodeModulesPath = (0, path_1.join)(projectPath, 'node_modules', '@playwright');
        let isInstalled = false;
        try {
            await fs_1.promises.access(nodeModulesPath);
            isInstalled = true;
        }
        catch {
            isInstalled = false;
        }
        return {
            ok: true,
            hasPlaywright: !!hasPlaywright,
            isInstalled,
            version: hasPlaywright || null
        };
    }
    catch (error) {
        return { ok: false, error: error.message, hasPlaywright: false, isInstalled: false };
    }
});
// Playwright installation
electron_1.ipcMain.handle('playwright:install', async (event, projectPath) => {
    return new Promise((resolve) => {
        console.log(`Installing Playwright in: ${projectPath}`);
        // Run npm init playwright with automated options
        // --no-browsers: Don't download browsers automatically (user can do this later)
        // --install-deps: Install dependencies
        const installProcess = (0, child_process_1.spawn)('npm', [
            'init',
            'playwright@latest',
            '--',
            '--no-examples', // Skip example tests
            '--install-deps' // Install deps automatically
        ], {
            cwd: projectPath,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'] // Ensure we can pipe stdin for non-interactive mode
        });
        // Auto-answer prompts by writing to stdin if needed
        installProcess.stdin?.write('\n'); // Accept defaults
        installProcess.stdin?.end();
        let output = '';
        installProcess.stdout.on('data', (data) => {
            const message = data.toString();
            output += message;
            event.sender.send('playwright:install:progress', { message: message.trim() });
        });
        installProcess.stderr.on('data', (data) => {
            const message = data.toString();
            output += message;
            event.sender.send('playwright:install:progress', { message: message.trim() });
        });
        installProcess.on('close', async (code) => {
            if (code === 0) {
                // Create default playwright.config.ts if it doesn't exist
                const configPath = (0, path_1.join)(projectPath, 'playwright.config.ts');
                try {
                    await fs_1.promises.access(configPath);
                    console.log('Playwright config already exists');
                }
                catch {
                    // Config doesn't exist, create default one
                    const defaultConfig = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
`;
                    await fs_1.promises.writeFile(configPath, defaultConfig, 'utf-8');
                    console.log('Created default playwright.config.ts');
                }
                event.sender.send('playwright:install:complete', { success: true });
                resolve({ ok: true, output });
            }
            else {
                event.sender.send('playwright:install:complete', { success: false, error: 'Installation failed' });
                resolve({ ok: false, error: 'Installation failed', output });
            }
        });
        installProcess.on('error', (error) => {
            event.sender.send('playwright:install:complete', { success: false, error: error.message });
            resolve({ ok: false, error: error.message });
        });
    });
});
// Create or update Playwright config
electron_1.ipcMain.handle('playwright:create-config', async (_event, projectPath, config) => {
    try {
        const configPath = (0, path_1.join)(projectPath, 'playwright.config.ts');
        const testDir = config.testDir || './tests/e2e';
        const baseURL = config.baseURL || 'http://localhost:3000';
        const configContent = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '${testDir}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: '${baseURL}',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
`;
        await fs_1.promises.writeFile(configPath, configContent, 'utf-8');
        return { ok: true, configPath };
    }
    catch (error) {
        return { ok: false, error: error.message };
    }
});
// Read Playwright config
electron_1.ipcMain.handle('playwright:read-config', async (_event, projectPath) => {
    try {
        // Try different config file names
        const configFileNames = [
            'playwright.config.ts',
            'playwright.config.js',
            'playwright.config.mjs'
        ];
        let configPath = null;
        let configContent = null;
        for (const fileName of configFileNames) {
            const fullPath = (0, path_1.join)(projectPath, fileName);
            try {
                configContent = await fs_1.promises.readFile(fullPath, 'utf-8');
                configPath = fullPath;
                break;
            }
            catch {
                continue;
            }
        }
        if (!configPath || !configContent) {
            return { ok: false, error: 'No Playwright config found' };
        }
        // Parse testDir from config (simple regex approach)
        const testDirMatch = configContent.match(/testDir\s*:\s*['"]([^'"]+)['"]/);
        const baseURLMatch = configContent.match(/baseURL\s*:\s*['"]([^'"]+)['"]/);
        return {
            ok: true,
            configPath,
            testDir: testDirMatch?.[1] || 'tests',
            baseURL: baseURLMatch?.[1] || undefined
        };
    }
    catch (error) {
        return { ok: false, error: error.message };
    }
});
// Scan project for cloud discovery
electron_1.ipcMain.handle('project:scan', async (_event, projectPath) => {
    try {
        console.log(`Scanning project for cloud discovery: ${projectPath}`);
        const payload = await (0, scanner_1.scanProject)(projectPath);
        console.log(`Scan complete: ${payload.routes.length} routes, ${payload.components.length} components, ${payload.types.length} types`);
        return { ok: true, payload };
    }
    catch (error) {
        console.error('Project scan failed:', error);
        return { ok: false, error: error.message };
    }
});
// Scan project for V5 cloud discovery (enhanced payload)
electron_1.ipcMain.handle('project:scan-v5', async (_event, projectPath) => {
    try {
        console.log(`Scanning project for V5 cloud discovery: ${projectPath}`);
        const payload = await (0, scanner_1.scanProjectV5)(projectPath);
        console.log(`V5 Scan complete: ${payload.pages.length} pages, ${payload.elements.length} elements, ${payload.constraints.length} constraints, ${payload.flows.length} flows`);
        return { ok: true, payload };
    }
    catch (error) {
        console.error('V5 Project scan failed:', error);
        return { ok: false, error: error.message };
    }
});
// Scan project for V7 behavior graph discovery
electron_1.ipcMain.handle('project:scan-v7', async (_event, projectPath) => {
    try {
        console.log(`Scanning project for V7 behavior graph: ${projectPath}`);
        const { scanProjectV7 } = await Promise.resolve().then(() => __importStar(require('./behavior-graph/scanner')));
        const payload = await scanProjectV7(projectPath);
        console.log(`V7 Scan complete: ${payload.graph.nodes.length} nodes, ${payload.graph.edges.length} edges`);
        return { ok: true, payload };
    }
    catch (error) {
        console.error('V7 Project scan failed:', error);
        return { ok: false, error: error.message };
    }
});
// Handle running Playwright tests
electron_1.ipcMain.handle('test:run-playwright', async (event, options) => {
    return new Promise(async (resolve) => {
        const { projectPath, testFiles } = options;
        // Create temp file for JSON output
        const jsonOutputPath = (0, path_1.join)(projectPath, '.playwright-results.json');
        // Build Playwright command
        const args = ['playwright', 'test'];
        // Add specific test files if provided
        if (testFiles && testFiles.length > 0) {
            args.push(...testFiles);
        }
        // Use list reporter for console + JSON reporter to file
        args.push(`--reporter=list,json`);
        console.log(`Running Playwright tests in: ${projectPath}`);
        console.log(`Command: PLAYWRIGHT_JSON_OUTPUT_NAME=${jsonOutputPath} npx ${args.join(' ')}`);
        // Spawn Playwright process with JSON output to file
        const testProcess = (0, child_process_1.spawn)('npx', args, {
            cwd: projectPath,
            shell: true,
            env: {
                ...process.env,
                FORCE_COLOR: '0',
                PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOutputPath
            }
        });
        let stdoutBuffer = '';
        let stderrBuffer = '';
        const startTime = Date.now();
        // Stream stdout
        testProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutBuffer += output;
            // Send raw output to renderer for live console (but skip JSON reporter output)
            const trimmed = output.trim();
            if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('}')) {
                event.sender.send('test:console', {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: trimmed
                });
            }
        });
        // Stream stderr
        testProcess.stderr.on('data', (data) => {
            const output = data.toString();
            stderrBuffer += output;
            event.sender.send('test:console', {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: output.trim()
            });
        });
        // Handle process completion
        testProcess.on('close', async (code) => {
            const duration = Date.now() - startTime;
            // Try to parse JSON reporter output from file
            let testResults = null;
            try {
                // Read JSON from file (more reliable than parsing stdout)
                const jsonContent = await fs_1.promises.readFile(jsonOutputPath, 'utf-8');
                testResults = JSON.parse(jsonContent);
                // Clean up temp file
                await fs_1.promises.unlink(jsonOutputPath).catch(() => { });
            }
            catch (err) {
                console.log('JSON output file not found or invalid, using fallback parsing');
            }
            // Calculate stats and extract test details from JSON output
            let passed = 0;
            let failed = 0;
            let skipped = 0;
            let total = 0;
            const testDetails = [];
            if (testResults && testResults.suites) {
                // Parse suites recursively and extract test details
                const countTests = (suite, parentFile) => {
                    const currentFile = suite.file || parentFile || 'Unknown';
                    if (suite.specs) {
                        suite.specs.forEach((spec) => {
                            total++;
                            const test = spec.tests?.[0];
                            const result = test?.results?.[0];
                            const testStatus = spec.ok ? 'passed' : (test?.status === 'skipped' ? 'skipped' : 'failed');
                            if (spec.ok)
                                passed++;
                            else if (test?.status === 'skipped')
                                skipped++;
                            else
                                failed++;
                            // Extract test details for UI with all required fields
                            testDetails.push({
                                id: `test-${total}`,
                                testFile: currentFile,
                                testName: spec.title || 'Unknown Test',
                                status: testStatus,
                                duration: result?.duration || 0,
                                error: result?.error?.message,
                                stack: result?.error?.stack
                            });
                        });
                    }
                    if (suite.suites) {
                        suite.suites.forEach((s) => countTests(s, currentFile));
                    }
                };
                testResults.suites.forEach((s) => countTests(s));
            }
            else {
                // Fallback: parse from stderr/stdout for counts
                const passMatch = stdoutBuffer.match(/(\d+) passed/i) || stderrBuffer.match(/(\d+) passed/i);
                const failMatch = stdoutBuffer.match(/(\d+) failed/i) || stderrBuffer.match(/(\d+) failed/i);
                if (passMatch)
                    passed = parseInt(passMatch[1]);
                if (failMatch)
                    failed = parseInt(failMatch[1]);
                total = passed + failed;
                // Create placeholder test entries if we have counts but no details
                if (total > 0 && testDetails.length === 0) {
                    // Parse test file names from the list reporter output
                    const testFileMatches = Array.from(stdoutBuffer.matchAll(/(?:✓|✗|○)\s+(?:\[\d+\/\d+\]\s+)?(?:\[.*?\]\s+)?(.+?\.spec\.ts)(?::.*)?\s+›\s+(.+?)\s+\(/g));
                    for (const match of testFileMatches) {
                        testDetails.push({
                            id: `test-${testDetails.length + 1}`,
                            testFile: match[1] || 'Unknown',
                            testName: match[2]?.trim() || 'Unknown Test',
                            status: match[0].includes('✓') ? 'passed' : match[0].includes('○') ? 'skipped' : 'failed',
                            duration: 0
                        });
                    }
                    // If still no details, create generic entries
                    if (testDetails.length === 0) {
                        for (let i = 0; i < passed; i++) {
                            testDetails.push({
                                id: `test-${i + 1}`,
                                testFile: testFiles?.[0] || 'tests/e2e/test.spec.ts',
                                testName: `Test ${i + 1}`,
                                status: 'passed',
                                duration: Math.round(duration / total)
                            });
                        }
                        for (let i = 0; i < failed; i++) {
                            testDetails.push({
                                id: `test-${passed + i + 1}`,
                                testFile: testFiles?.[0] || 'tests/e2e/test.spec.ts',
                                testName: `Test ${passed + i + 1}`,
                                status: 'failed',
                                duration: Math.round(duration / total),
                                error: 'Test failed - check console output for details'
                            });
                        }
                    }
                }
            }
            // Send individual test results
            testDetails.forEach((test) => {
                event.sender.send('test:result', test);
            });
            // Send completion event
            event.sender.send('test:complete', {
                passed,
                failed,
                skipped,
                total,
                duration,
                exitCode: code,
                tests: testDetails
            });
            // Resolve with results including test details
            resolve({
                success: code === 0,
                passed,
                failed,
                skipped,
                total,
                duration,
                stdout: stdoutBuffer,
                stderr: stderrBuffer,
                tests: testDetails
            });
        });
        // Handle process errors
        testProcess.on('error', (error) => {
            console.error('Failed to start Playwright:', error);
            resolve({
                success: false,
                error: error.message,
                passed: 0,
                failed: 0,
                total: 0,
                duration: Date.now() - startTime
            });
        });
    });
});
