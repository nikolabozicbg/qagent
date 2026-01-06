import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { spawn } from 'child_process';

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

// Handle file open dialog
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

// Handle running Playwright tests
ipcMain.handle('test:run-playwright', async (event, options: {
  projectPath: string;
  testFiles?: string[];
}) => {
  return new Promise((resolve) => {
    const { projectPath, testFiles } = options;
    
    // Build Playwright command
    const args = ['playwright', 'test'];
    
    // Add specific test files if provided
    if (testFiles && testFiles.length > 0) {
      args.push(...testFiles);
    }
    
    // Add JSON reporter for structured output
    args.push('--reporter=json');
    
    console.log(`Running Playwright tests in: ${projectPath}`);
    console.log(`Command: npx ${args.join(' ')}`);
    
    // Spawn Playwright process
    const testProcess = spawn('npx', args, {
      cwd: projectPath,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' } // Disable colors for parsing
    });
    
    let stdoutBuffer = '';
    let stderrBuffer = '';
    const startTime = Date.now();
    
    // Stream stdout
    testProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      stdoutBuffer += output;
      
      // Send raw output to renderer for live console
      event.sender.send('test:console', {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: output.trim()
      });
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
    testProcess.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      // Try to parse JSON reporter output
      let testResults: any = null;
      try {
        // JSON reporter outputs to stdout
        const jsonMatch = stdoutBuffer.match(/\{[\s\S]*"suites"[\s\S]*\}/);        if (jsonMatch) {
          testResults = JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.error('Failed to parse Playwright JSON output:', err);
      }
      
      // Calculate stats from JSON output or stderr
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let total = 0;
      
      if (testResults && testResults.suites) {
        // Parse suites recursively
        const countTests = (suite: any): void => {
          if (suite.specs) {
            suite.specs.forEach((spec: any) => {
              total++;
              if (spec.ok) passed++;
              else if (spec.tests?.[0]?.status === 'skipped') skipped++;
              else failed++;
            });
          }
          if (suite.suites) {
            suite.suites.forEach(countTests);
          }
        };
        testResults.suites.forEach(countTests);
      } else {
        // Fallback: parse from stderr/stdout
        const passMatch = stdoutBuffer.match(/(\d+) passed/i) || stderrBuffer.match(/(\d+) passed/i);
        const failMatch = stdoutBuffer.match(/(\d+) failed/i) || stderrBuffer.match(/(\d+) failed/i);
        if (passMatch) passed = parseInt(passMatch[1]);
        if (failMatch) failed = parseInt(failMatch[1]);
        total = passed + failed;
      }
      
      // Send completion event
      event.sender.send('test:complete', {
        passed,
        failed,
        skipped,
        total,
        duration,
        exitCode: code
      });
      
      // Resolve with results
      resolve({
        success: code === 0,
        passed,
        failed,
        skipped,
        total,
        duration,
        stdout: stdoutBuffer,
        stderr: stderrBuffer
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
