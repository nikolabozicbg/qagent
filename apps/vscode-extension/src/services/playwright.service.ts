import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { log } from '../extension';

/**
 * PlaywrightConfig - Configuration read from playwright.config.ts
 */
export interface PlaywrightConfig {
  testDir: string;
  baseURL: string;
  configPath: string;
}

/**
 * PlaywrightService - Manages Playwright installation, configuration, and test execution
 * 
 * Responsibilities:
 * - Detect if Playwright is installed
 * - Install Playwright if needed
 * - Read configuration (testDir, baseURL)
 * - Save tests to correct directory
 * - Run tests
 */
export class PlaywrightService {
  private workspaceRoot: string | undefined;
  private cachedConfig: PlaywrightConfig | null = null;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Check if Playwright is installed in the project
   */
  async isInstalled(): Promise<boolean> {
    if (!this.workspaceRoot) return false;

    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      const installed = !!allDeps['@playwright/test'] || !!allDeps['playwright'];
      log('Playwright installed:', installed);
      return installed;
    } catch (error) {
      log('Could not read package.json:', error);
      return false;
    }
  }

  /**
   * Create default playwright.config.ts
   */
  async createDefaultConfig(): Promise<void> {
    if (!this.workspaceRoot) return;
    
    const configPath = path.join(this.workspaceRoot, 'playwright.config.ts');
    
    if (fs.existsSync(configPath)) {
      log('Config already exists, skipping');
      return;
    }
    
    // Detect baseURL from package.json scripts
    let baseURL = 'http://localhost:3000';
    try {
      const pkgPath = path.join(this.workspaceRoot, 'package.json');
      const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      
      // Check for common dev server ports
      if (pkg.scripts?.start) {
        const startScript = pkg.scripts.start;
        if (startScript.includes('4100')) baseURL = 'http://localhost:4100';
        else if (startScript.includes('3001')) baseURL = 'http://localhost:3001';
        else if (startScript.includes('8080')) baseURL = 'http://localhost:8080';
      }
    } catch (error) {
      log('Could not detect baseURL, using default');
    }
    
    const configContent = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
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
    
    fs.writeFileSync(configPath, configContent, 'utf-8');
    log('Created playwright.config.ts with baseURL:', baseURL);
    
    // Create tests directory
    const testsDir = path.join(this.workspaceRoot, 'tests');
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
      log('Created tests/ directory');
    }
  }
  
  /**
   * Check if playwright.config.ts exists
   */
  hasConfig(): boolean {
    if (!this.workspaceRoot) return false;

    const configPaths = [
      'playwright.config.ts',
      'playwright.config.js',
      'playwright.config.mjs',
    ];

    for (const configFile of configPaths) {
      if (fs.existsSync(path.join(this.workspaceRoot, configFile))) {
        log('Playwright config found:', configFile);
        return true;
      }
    }

    log('No Playwright config found');
    return false;
  }

  /**
   * Install Playwright via terminal
   * Uses --legacy-peer-deps to avoid peer dependency conflicts
   */
  async install(): Promise<void> {
    if (!this.workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    // Check if already installed
    const installed = await this.isInstalled();
    if (installed) {
      log('Playwright already installed, checking config...');
      
      if (this.hasConfig()) {
        vscode.window.showInformationMessage('Playwright is already set up!');
        return;
      }
      
      // Has package but no config - create config
      await this.createDefaultConfig();
      vscode.window.showInformationMessage('Created playwright.config.ts');
      return;
    }

    log('Installing Playwright with --legacy-peer-deps...');

    const terminal = vscode.window.createTerminal({
      name: 'Playwright Setup',
      cwd: this.workspaceRoot,
    });

    terminal.show();
    
    // Install Playwright with legacy peer deps to avoid React version conflicts
    terminal.sendText('npm install --save-dev @playwright/test --legacy-peer-deps && npx playwright install');

    // Show info message
    vscode.window.showInformationMessage(
      'Installing Playwright... Check the terminal for progress.',
      'OK'
    );
    
    // Wait a bit, then create config
    setTimeout(async () => {
      if (await this.isInstalled()) {
        await this.createDefaultConfig();
        vscode.window.showInformationMessage('Playwright installed! Click "Refresh" to continue.');
      }
    }, 10000); // Wait 10s for install
  }

  /**
   * Read Playwright configuration from playwright.config.ts
   * Returns testDir, baseURL, and config path
   */
  async getConfig(): Promise<PlaywrightConfig> {
    // Return cached config if available
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const defaults: PlaywrightConfig = {
      testDir: 'e2e',
      baseURL: 'http://localhost:3000',
      configPath: '',
    };

    if (!this.workspaceRoot) {
      return defaults;
    }

    const configPaths = [
      'playwright.config.ts',
      'playwright.config.js',
      'playwright.config.mjs',
    ];

    for (const configFile of configPaths) {
      const fullPath = path.join(this.workspaceRoot, configFile);
      
      if (!fs.existsSync(fullPath)) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Extract testDir
        const testDirMatch = content.match(/testDir:\s*['"]([^'"]+)['"]/);
        const testDir = testDirMatch ? testDirMatch[1] : defaults.testDir;

        // Extract baseURL from use section
        const baseURLMatch = content.match(/baseURL:\s*['"]([^'"]+)['"]/);
        const baseURL = baseURLMatch ? baseURLMatch[1] : defaults.baseURL;

        this.cachedConfig = {
          testDir: testDir.replace(/^\.\//, ''), // Remove leading ./
          baseURL,
          configPath: configFile,
        };

        log('Playwright config loaded:', this.cachedConfig);
        return this.cachedConfig;
      } catch (error) {
        log('Error reading playwright config:', error);
      }
    }

    return defaults;
  }

  /**
   * Get the absolute path to the test directory
   * Creates the directory if it doesn't exist
   */
  async getTestDirectory(): Promise<string> {
    if (!this.workspaceRoot) {
      throw new Error('No workspace folder open');
    }

    const config = await this.getConfig();
    const testDir = path.join(this.workspaceRoot, config.testDir);

    // Create directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      log('Creating test directory:', testDir);
      fs.mkdirSync(testDir, { recursive: true });
    }

    return testDir;
  }

  /**
   * Get the baseURL from config
   */
  async getBaseURL(): Promise<string> {
    const config = await this.getConfig();
    return config.baseURL;
  }

  /**
   * Find test file for a given flow name
   * Searches in testDir for matching spec file
   */
  async findTestFile(flowName: string): Promise<string | null> {
    if (!this.workspaceRoot) return null;

    const slugName = flowName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const config = await this.getConfig();
    const testDir = path.join(this.workspaceRoot, config.testDir);

    // Possible file names
    const possibleNames = [
      `${slugName}.spec.ts`,
      `${slugName}.spec.js`,
      `${slugName}.test.ts`,
      `${slugName}.test.js`,
    ];

    for (const fileName of possibleNames) {
      const filePath = path.join(testDir, fileName);
      if (fs.existsSync(filePath)) {
        log('Found test file:', filePath);
        return filePath;
      }
    }

    log('Test file not found for:', flowName);
    return null;
  }

  /**
   * Run a Playwright test file
   * Opens terminal and runs npx playwright test
   */
  async runTest(testFilePath: string, options?: { headed?: boolean }): Promise<void> {
    if (!this.workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const headed = options?.headed ?? true;
    const headedFlag = headed ? '--headed' : '';

    log('Running test:', testFilePath);

    const terminal = vscode.window.createTerminal({
      name: 'Playwright Test',
      cwd: this.workspaceRoot,
    });

    terminal.show();
    terminal.sendText(`npx playwright test "${testFilePath}" ${headedFlag}`.trim());
  }

  /**
   * Run all tests in the test directory
   */
  async runAllTests(options?: { headed?: boolean }): Promise<void> {
    if (!this.workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const headed = options?.headed ?? false;
    const headedFlag = headed ? '--headed' : '';

    log('Running all tests');

    const terminal = vscode.window.createTerminal({
      name: 'Playwright Tests',
      cwd: this.workspaceRoot,
    });

    terminal.show();
    terminal.sendText(`npx playwright test ${headedFlag}`.trim());
  }

  /**
   * Clear cached config (call after installation or config change)
   */
  clearCache(): void {
    this.cachedConfig = null;
    log('Playwright config cache cleared');
  }

  /**
   * Refresh workspace root (call if workspace changes)
   */
  refreshWorkspace(): void {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    this.clearCache();
  }

  /**
   * Get status summary for UI display
   */
  async getStatus(): Promise<{
    installed: boolean;
    hasConfig: boolean;
    testDir: string;
    baseURL: string;
  }> {
    const installed = await this.isInstalled();
    const hasConfig = this.hasConfig();
    const config = await this.getConfig();

    return {
      installed,
      hasConfig,
      testDir: config.testDir,
      baseURL: config.baseURL,
    };
  }
}
