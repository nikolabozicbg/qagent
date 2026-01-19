import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { spawn } from 'child_process';
import { chromium } from 'playwright';
import { scanProject, scanProjectV5, AnalysisPayload, V5ScannerPayload } from './scanner';
import type { BehaviorGraphPayload, V7UserGoal } from './v8-auto-mapping';
import { autoMapGoalOnPage, computeStartPathForGoal } from './v8-auto-mapping';
import { runDiscoveryV9, listDiscoveryRuns, loadDiscoveryResult } from './discovery-v9';
import type { DiscoveryV9Config, DiscoveryV9Progress, DiscoveryResultV9 } from './discovery-v9';

// Disable security warnings for development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: 'QAgent',
    titleBarStyle: 'hiddenInset', // macOS-style titlebar
    trafficLightPosition: { x: 12, y: 16 },
    backgroundColor: '#0A0E14', // Warp-inspired dark bg
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
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
  if (!app.isPackaged) {
    // Development mode - use port 5178 for desktop app
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5178';
    mainWindow.loadURL(devServerUrl).catch(() => {
      console.error('Failed to load dev server on port 5178');
    });
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // Window close handler
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Keyboard shortcuts for development
  if (!app.isPackaged) {
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
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: Re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Open JSON file dialog (used for V8 mapping/goals selection)
ipcMain.handle('open-json-file-dialog', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

// Handle folder open dialog
ipcMain.handle('open-file-dialog', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });

  return result;
});

// Handle save test file
ipcMain.handle('fs:saveTestFile', async (_event, filePath: string, contents: string) => {
  try {
    // Get the project path from the file path (should be absolute)
    const fullPath = filePath.startsWith('/') ? filePath : join(process.cwd(), filePath);
    
    // Ensure directory exists
    const dir = dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, contents, 'utf-8');
    
    return { ok: true, path: fullPath };
  } catch (error: any) {
    console.error('Failed to save test file:', error);
    return { ok: false, error: error.message };
  }
});

// Handle read file
ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    const fullPath = filePath.startsWith('/') ? filePath : join(process.cwd(), filePath);
    const contents = await fs.readFile(fullPath, 'utf-8');
    return { ok: true, contents };
  } catch (error: any) {
    console.error('Failed to read file:', error);
    return { ok: false, error: error.message };
  }
});

// Handle open file in external editor (VS Code)
ipcMain.handle('fs:openInEditor', async (_event, filePath: string) => {
  try {
    const { shell } = require('electron');
    const fullPath = filePath.startsWith('/') ? filePath : join(process.cwd(), filePath);
    await shell.openPath(fullPath);
    return { ok: true };
  } catch (error: any) {
    console.error('Failed to open file in editor:', error);
    return { ok: false, error: error.message };
  }
});

// Playwright detection - check if installed
ipcMain.handle('playwright:check', async (_event, projectPath: string) => {
  try {
    // Check if @playwright/test is in package.json dependencies
    const packageJsonPath = join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    const hasPlaywright = 
      packageJson.dependencies?.['@playwright/test'] ||
      packageJson.devDependencies?.['@playwright/test'] ||
      packageJson.dependencies?.['playwright'] ||
      packageJson.devDependencies?.['playwright'];
    
    // Also check if node_modules/@playwright exists
    const nodeModulesPath = join(projectPath, 'node_modules', '@playwright');
    let isInstalled = false;
    try {
      await fs.access(nodeModulesPath);
      isInstalled = true;
    } catch {
      isInstalled = false;
    }
    
    return {
      ok: true,
      hasPlaywright: !!hasPlaywright,
      isInstalled,
      version: hasPlaywright || null
    };
  } catch (error: any) {
    return { ok: false, error: error.message, hasPlaywright: false, isInstalled: false };
  }
});

// Playwright installation
ipcMain.handle('playwright:install', async (event, projectPath: string) => {
  return new Promise((resolve) => {
    console.log(`Installing Playwright in: ${projectPath}`);
    
    // Run npm init playwright with automated options
    // --no-browsers: Don't download browsers automatically (user can do this later)
    // --install-deps: Install dependencies
    const installProcess = spawn('npm', [
      'init', 
      'playwright@latest', 
      '--', 
      '--no-examples',  // Skip example tests
      '--install-deps'   // Install deps automatically
    ], {
      cwd: projectPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'] // Ensure we can pipe stdin for non-interactive mode
    });
    
    // Auto-answer prompts by writing to stdin if needed
    installProcess.stdin?.write('\n'); // Accept defaults
    installProcess.stdin?.end();
    
    let output = '';
    
    installProcess.stdout.on('data', (data: Buffer) => {
      const message = data.toString();
      output += message;
      event.sender.send('playwright:install:progress', { message: message.trim() });
    });
    
    installProcess.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      output += message;
      event.sender.send('playwright:install:progress', { message: message.trim() });
    });
    
    installProcess.on('close', async (code) => {
      if (code === 0) {
        // Create default playwright.config.ts if it doesn't exist
        const configPath = join(projectPath, 'playwright.config.ts');
        try {
          await fs.access(configPath);
          console.log('Playwright config already exists');
        } catch {
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
          await fs.writeFile(configPath, defaultConfig, 'utf-8');
          console.log('Created default playwright.config.ts');
        }
        
        event.sender.send('playwright:install:complete', { success: true });
        resolve({ ok: true, output });
      } else {
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
ipcMain.handle('playwright:create-config', async (_event, projectPath: string, config: { baseURL: string; testDir?: string }) => {
  try {
    const configPath = join(projectPath, 'playwright.config.ts');
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
    
    await fs.writeFile(configPath, configContent, 'utf-8');
    
    return { ok: true, configPath };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
});

// Read Playwright config
ipcMain.handle('playwright:read-config', async (_event, projectPath: string) => {
  try {
    // Try different config file names
    const configFileNames = [
      'playwright.config.ts',
      'playwright.config.js',
      'playwright.config.mjs'
    ];
    
    let configPath: string | null = null;
    let configContent: string | null = null;
    
    for (const fileName of configFileNames) {
      const fullPath = join(projectPath, fileName);
      try {
        configContent = await fs.readFile(fullPath, 'utf-8');
        configPath = fullPath;
        break;
      } catch {
        continue;
      }
    }
    
    if (!configPath || !configContent) {
      return { ok: false, error: 'No Playwright config found' };
    }
    
    // Parse testDir from config (simple regex approach)
    const testDirMatch = configContent.match(/testDir\s*:\s*['"]([^'"]+)['"]/);    const baseURLMatch = configContent.match(/baseURL\s*:\s*['"]([^'"]+)['"]/);    
    return {
      ok: true,
      configPath,
      testDir: testDirMatch?.[1] || 'tests',
      baseURL: baseURLMatch?.[1] || undefined
    };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
});

// Scan project for cloud discovery
ipcMain.handle('project:scan', async (_event, projectPath: string): Promise<{ ok: boolean; payload?: AnalysisPayload; error?: string }> => {
  try {
    console.log(`Scanning project for cloud discovery: ${projectPath}`);
    const payload = await scanProject(projectPath);
    console.log(`Scan complete: ${payload.routes.length} routes, ${payload.components.length} components, ${payload.types.length} types`);
    return { ok: true, payload };
  } catch (error: any) {
    console.error('Project scan failed:', error);
    return { ok: false, error: error.message };
  }
});

// Scan project for V5 cloud discovery (enhanced payload)
ipcMain.handle('project:scan-v5', async (_event, projectPath: string): Promise<{ ok: boolean; payload?: V5ScannerPayload; error?: string }> => {
  try {
    console.log(`Scanning project for V5 cloud discovery: ${projectPath}`);
    const payload = await scanProjectV5(projectPath);
    console.log(`V5 Scan complete: ${payload.pages.length} pages, ${payload.elements.length} elements, ${payload.constraints.length} constraints, ${payload.flows.length} flows`);
    return { ok: true, payload };
  } catch (error: any) {
    console.error('V5 Project scan failed:', error);
    return { ok: false, error: error.message };
  }
});

// Scan project for V7 behavior graph discovery
ipcMain.handle('project:scan-v7', async (_event, projectPath: string): Promise<{ ok: boolean; payload?: any; error?: string }> => {
  try {
    console.log(`Scanning project for V7 behavior graph: ${projectPath}`);
    const { scanProjectV7 } = await import('./behavior-graph/scanner');
    const payload = await scanProjectV7(projectPath);
    console.log(`V7 Scan complete: ${payload.graph.nodes.length} nodes, ${payload.graph.edges.length} edges`);
    return { ok: true, payload };
  } catch (error: any) {
    console.error('V7 Project scan failed:', error);
    return { ok: false, error: error.message };
  }
});

// Handle running Playwright tests
ipcMain.handle('test:run-playwright', async (event, options: {
  projectPath: string;
  testFiles?: string[];
}) => {
  return new Promise(async (resolve) => {
    const { projectPath, testFiles } = options;
    
    // Create temp file for JSON output
    const jsonOutputPath = join(projectPath, '.playwright-results.json');
    
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
    const testProcess = spawn('npx', args, {
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
    testProcess.stdout.on('data', (data: Buffer) => {
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
    testProcess.stderr.on('data', (data: Buffer) => {
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
      let testResults: any = null;
      try {
        // Read JSON from file (more reliable than parsing stdout)
        const jsonContent = await fs.readFile(jsonOutputPath, 'utf-8');
        testResults = JSON.parse(jsonContent);
        // Clean up temp file
        await fs.unlink(jsonOutputPath).catch(() => {});
      } catch (err) {
        console.log('JSON output file not found or invalid, using fallback parsing');
      }
      
      // Calculate stats and extract test details from JSON output
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let total = 0;
      const testDetails: any[] = [];
      
      if (testResults && testResults.suites) {
        // Parse suites recursively and extract test details
        const countTests = (suite: any, parentFile?: string): void => {
          const currentFile = suite.file || parentFile || 'Unknown';
          
          if (suite.specs) {
            suite.specs.forEach((spec: any) => {
              total++;
              const test = spec.tests?.[0];
              const result = test?.results?.[0];
              const testStatus = spec.ok ? 'passed' : (test?.status === 'skipped' ? 'skipped' : 'failed');
              
              if (spec.ok) passed++;
              else if (test?.status === 'skipped') skipped++;
              else failed++;
              
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
            suite.suites.forEach((s: any) => countTests(s, currentFile));
          }
        };
        testResults.suites.forEach((s: any) => countTests(s));
      } else {
        // Fallback: parse from stderr/stdout for counts
        const passMatch = stdoutBuffer.match(/(\d+) passed/i) || stderrBuffer.match(/(\d+) passed/i);
        const failMatch = stdoutBuffer.match(/(\d+) failed/i) || stderrBuffer.match(/(\d+) failed/i);
        if (passMatch) passed = parseInt(passMatch[1]);
        if (failMatch) failed = parseInt(failMatch[1]);
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

function mergeUiReadyOutputs(outputs: any[]): any {
  const suiteMap = new Map<string, any[]>();
  const verifiedGoals: any[] = [];
  const unverifiedGoals: any[] = [];

  for (const out of outputs) {
    if (!out || out.success !== true) continue;
    if (out.v8Report?.verifiedGoals) verifiedGoals.push(...out.v8Report.verifiedGoals);
    if (out.v8Report?.unverifiedGoals) unverifiedGoals.push(...out.v8Report.unverifiedGoals);

    for (const s of out.suites || []) {
      const existing = suiteMap.get(s.name) || [];
      existing.push(...(s.cases || []));
      suiteMap.set(s.name, existing);
    }
  }

  const suiteNames = Array.from(suiteMap.keys()).sort((a, b) => {
    const aIsUn = a === 'UNCLUSTERED';
    const bIsUn = b === 'UNCLUSTERED';
    if (aIsUn && !bIsUn) return 1;
    if (!aIsUn && bIsUn) return -1;
    return a.localeCompare(b);
  });

  const suites = suiteNames.map(name => {
    const cases = (suiteMap.get(name) || []).slice().sort((c1, c2) => {
      const g1 = String(c1.goalId || '');
      const g2 = String(c2.goalId || '');
      return g1.localeCompare(g2);
    });
    return { name, cases };
  });

  return {
    success: true,
    suites,
    v8Report: {
      verifiedGoals,
      unverifiedGoals,
    },
  };
}

async function runV8CliOnce(params: {
  baseUrl: string;
  goalsPath: string;
  mappingPath: string;
  uiReadyOut: string;
  reportOut: string;
}) {
  const cliPath = join(process.cwd(), 'packages', 'v8-runtime', 'dist', 'cli.js');

  return await new Promise((resolve) => {
    const child = spawn('node', [
      cliPath,
      '--baseUrl',
      params.baseUrl,
      '--goals',
      params.goalsPath,
      '--mapping',
      params.mappingPath,
      '--out',
      params.uiReadyOut,
      '--reportOut',
      params.reportOut
    ], {
      cwd: process.cwd(),
      shell: false,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    child.on('close', async (code) => {
      try {
        const uiReadyRaw = await fs.readFile(params.uiReadyOut, 'utf-8');
        const reportRaw = await fs.readFile(params.reportOut, 'utf-8');
        resolve({
          ok: code === 0,
          exitCode: code,
          stdout,
          stderr,
          uiReady: JSON.parse(uiReadyRaw),
          v8Report: JSON.parse(reportRaw),
        });
      } catch (err: any) {
        resolve({ ok: false, exitCode: code, stdout, stderr, error: err?.message || 'Failed to read V8 outputs' });
      }
    });

    child.on('error', (err) => {
      resolve({ ok: false, exitCode: null, error: err.message });
    });
  });
}

// V8 runtime batch execution (spawns packages/v8-runtime CLI and returns UI-ready suites JSON)
ipcMain.handle('v8:run-batch', async (_event, options: {
  baseUrl: string;
  goalsPath: string;
  mappingPath: string;
}) => {
  try {
    const { baseUrl, goalsPath, mappingPath } = options;

    // Write outputs into Electron userData so renderer can load them deterministically
    const userDataDir = app.getPath('userData');
    const runDir = join(userDataDir, 'v8-runs', String(Date.now()));
    await fs.mkdir(runDir, { recursive: true });

    const uiReadyOut = join(runDir, 'ui-ready.suites.json');
    const reportOut = join(runDir, 'v8-report.batch.json');

    const result: any = await runV8CliOnce({
      baseUrl,
      goalsPath,
      mappingPath,
      uiReadyOut,
      reportOut,
    });

    return {
      ok: !!result.ok,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error,
      paths: { uiReadyOut, reportOut, runDir },
      uiReady: result.uiReady,
      v8Report: result.v8Report,
    };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
});

// V8 auto-execution: build mapping deterministically from DOM + run per startPath; return merged UI-ready output
ipcMain.handle('v8:run-batch-auto', async (_event, options: {
  baseUrl: string;
  behaviorGraphPayload: BehaviorGraphPayload;
  derivedUserGoals: V7UserGoal[];
}) => {
  const { baseUrl, behaviorGraphPayload, derivedUserGoals } = options;

  // Candidates: only deterministic goals (terminalNodeId !== UNKNOWN)
  const deterministicGoals = (derivedUserGoals || []).filter(g => g.terminalNodeId !== 'UNKNOWN');

  const userDataDir = app.getPath('userData');
  const runDir = join(userDataDir, 'v8-runs', String(Date.now()));
  await fs.mkdir(runDir, { recursive: true });

  // Group goals by startPath
  const goalsByStartPath = new Map<string, V7UserGoal[]>();
  for (const g of deterministicGoals) {
    const startPath = computeStartPathForGoal({ payload: behaviorGraphPayload as any, goal: g as any });
    if (!startPath) continue; // discard
    const existing = goalsByStartPath.get(startPath) || [];
    existing.push(g);
    goalsByStartPath.set(startPath, existing);
  }

  // Build per-startPath mapping by inspecting DOM deterministically
  const browser = await chromium.launch({ headless: true });
  try {
    const uiReadyOutputs: any[] = [];

    const startPaths = Array.from(goalsByStartPath.keys()).sort();
    for (const startPath of startPaths) {
      const goalsForPath = goalsByStartPath.get(startPath) || [];
      if (goalsForPath.length === 0) continue;

      const context = await browser.newContext();
      const page = await context.newPage();
      const startUrl = new URL(startPath, baseUrl).toString();

      try {
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 10_000 });

        const actions: Record<string, any> = {};
        const goalIds: string[] = [];

        // deterministic ordering
        const sortedGoals = goalsForPath.slice().sort((a, b) => a.id.localeCompare(b.id));

        for (const g of sortedGoals) {
          const mapped = await autoMapGoalOnPage({ page, payload: behaviorGraphPayload as any, goal: g as any });
          if (!mapped) continue; // discard goal

          actions[mapped.startUserActionId] = mapped.action;
          goalIds.push(mapped.goalId);
        }

        if (goalIds.length === 0) {
          continue;
        }

        const goalsFile = join(runDir, `goals.${encodeURIComponent(startPath)}.json`);
        const mappingFile = join(runDir, `mapping.${encodeURIComponent(startPath)}.json`);
        const uiReadyOut = join(runDir, `ui-ready.${encodeURIComponent(startPath)}.json`);
        const reportOut = join(runDir, `v8-report.${encodeURIComponent(startPath)}.json`);

        // V8 input file
        const v8Goals = {
          derivedUserGoals: sortedGoals.map(g => ({
            id: g.id,
            startUserActionId: g.startUserActionId,
            terminalNodeId: g.terminalNodeId,
            pageRouteHint: startPath,
          })),
        };
        await fs.writeFile(goalsFile, JSON.stringify(v8Goals, null, 2), 'utf-8');

        // V8 batch mapping
        const v8Mapping = {
          version: 'v8-mapping-1',
          startPath,
          actions,
          batch: {
            goalIds,
            mode: 'isolated',
            timeoutMs: 10_000,
          },
        };
        await fs.writeFile(mappingFile, JSON.stringify(v8Mapping, null, 2), 'utf-8');

        const result: any = await runV8CliOnce({
          baseUrl,
          goalsPath: goalsFile,
          mappingPath: mappingFile,
          uiReadyOut,
          reportOut,
        });

        if (result?.uiReady?.success) {
          uiReadyOutputs.push(result.uiReady);
        }
      } finally {
        await context.close().catch(() => undefined);
      }
    }

    const merged = mergeUiReadyOutputs(uiReadyOutputs);

    return {
      ok: true,
      paths: { runDir },
      uiReady: merged,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  } finally {
    await browser.close().catch(() => undefined);
  }
});

// ============================================================================
// V9 DISCOVERY PIPELINE
// ============================================================================

// Run V9 Discovery pipeline (scanning + exploration + backend call)
ipcMain.handle('discovery:v9:run', async (_event, config: DiscoveryV9Config) => {
  try {
    console.log('[Discovery V9] Starting pipeline for:', config.projectPath);
    
    const result = await runDiscoveryV9(config, (progress: DiscoveryV9Progress) => {
      // Send progress to renderer
      mainWindow?.webContents.send('discovery:v9:progress', progress);
    });

    console.log('[Discovery V9] Pipeline complete:', {
      suites: result.result.suites.length,
      cases: result.result.summary.totalCases,
      steps: result.result.summary.totalSteps,
    });

    return {
      ok: true,
      result: result.result,
      artifactsPath: result.artifactsPath,
    };
  } catch (error: any) {
    console.error('[Discovery V9] Pipeline failed:', error);
    return {
      ok: false,
      error: error.message || 'Discovery pipeline failed',
    };
  }
});

// List previous discovery runs
ipcMain.handle('discovery:v9:list-runs', async () => {
  try {
    const runs = await listDiscoveryRuns();
    return { ok: true, runs };
  } catch (error: any) {
    return { ok: false, error: error.message, runs: [] };
  }
});

// Load a previous discovery result
ipcMain.handle('discovery:v9:load-result', async (_event, artifactsPath: string) => {
  try {
    const result = await loadDiscoveryResult(artifactsPath);
    if (!result) {
      return { ok: false, error: 'Result not found' };
    }
    return { ok: true, result };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
});
