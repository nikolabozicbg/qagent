import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { ChildProcess, spawn } from 'child_process';

/**
 * App status
 */
export type AppStatus = 'stopped' | 'starting' | 'running' | 'error';

/**
 * Dev server configuration
 */
export interface DevServerConfig {
  command: string;
  args: string[];
  port: number;
  url: string;
  framework: 'next' | 'vite' | 'cra' | 'express' | 'nest' | 'unknown';
}

/**
 * AppLauncherService
 * 
 * Detects and manages the dev server for a project:
 * - Auto-detects framework (Next.js, Vite, CRA, etc.)
 * - Starts dev server in background
 * - Waits for server to be ready
 * - Manages lifecycle (start/stop)
 */
export class AppLauncherService {
  private process: ChildProcess | null = null;
  private status: AppStatus = 'stopped';
  private config: DevServerConfig | null = null;
  private outputChannel: vscode.OutputChannel;
  private statusChangeCallbacks: ((status: AppStatus) => void)[] = [];
  
  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('QAgenAI App Launcher');
  }
  
  /**
   * Get current app status
   */
  getStatus(): AppStatus {
    return this.status;
  }
  
  /**
   * Get current dev server config
   */
  getConfig(): DevServerConfig | null {
    return this.config;
  }
  
  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: AppStatus) => void): void {
    this.statusChangeCallbacks.push(callback);
  }
  
  /**
   * Detect dev server configuration from project
   */
  async detectConfig(workspaceRoot: string): Promise<DevServerConfig | null> {
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Detect framework and appropriate command
      let config: DevServerConfig;
      
      // Next.js detection
      if (deps['next']) {
        const port = this.extractPort(scripts['dev']) || 3000;
        config = {
          command: 'npm',
          args: ['run', 'dev'],
          port,
          url: `http://localhost:${port}`,
          framework: 'next'
        };
      }
      // Vite detection
      else if (deps['vite']) {
        const port = this.extractPort(scripts['dev']) || 5173;
        config = {
          command: 'npm',
          args: ['run', 'dev'],
          port,
          url: `http://localhost:${port}`,
          framework: 'vite'
        };
      }
      // Create React App detection
      else if (deps['react-scripts']) {
        const port = this.extractPort(scripts['start']) || 3000;
        config = {
          command: 'npm',
          args: ['start'],
          port,
          url: `http://localhost:${port}`,
          framework: 'cra'
        };
      }
      // NestJS detection
      else if (deps['@nestjs/core']) {
        const port = this.extractPort(scripts['start:dev']) || 3000;
        config = {
          command: 'npm',
          args: ['run', 'start:dev'],
          port,
          url: `http://localhost:${port}`,
          framework: 'nest'
        };
      }
      // Express detection
      else if (deps['express'] && scripts['dev']) {
        const port = this.extractPort(scripts['dev']) || 3000;
        config = {
          command: 'npm',
          args: ['run', 'dev'],
          port,
          url: `http://localhost:${port}`,
          framework: 'express'
        };
      }
      // Generic - try npm run dev
      else if (scripts['dev']) {
        config = {
          command: 'npm',
          args: ['run', 'dev'],
          port: 3000,
          url: 'http://localhost:3000',
          framework: 'unknown'
        };
      }
      else {
        return null;
      }
      
      this.config = config;
      return config;
      
    } catch (error) {
      console.error('Failed to detect dev server config:', error);
      return null;
    }
  }
  
  /**
   * Start the dev server
   */
  async start(workspaceRoot: string): Promise<boolean> {
    if (this.status === 'running') {
      return true;
    }
    
    // Detect config if not already done
    if (!this.config) {
      await this.detectConfig(workspaceRoot);
    }
    
    if (!this.config) {
      vscode.window.showErrorMessage('QAgenAI: Could not detect dev server configuration');
      return false;
    }
    
    this.setStatus('starting');
    this.outputChannel.show(true);
    this.outputChannel.appendLine(`🚀 Starting ${this.config.framework} dev server...`);
    this.outputChannel.appendLine(`   Command: ${this.config.command} ${this.config.args.join(' ')}`);
    this.outputChannel.appendLine(`   Port: ${this.config.port}`);
    this.outputChannel.appendLine('');
    
    return new Promise((resolve) => {
      try {
        // Spawn dev server process
        this.process = spawn(this.config!.command, this.config!.args, {
          cwd: workspaceRoot,
          shell: true,
          env: { ...process.env, BROWSER: 'none', CI: 'true' } // Prevent browser auto-open
        });
        
        // Capture output
        this.process.stdout?.on('data', (data) => {
          this.outputChannel.appendLine(data.toString());
        });
        
        this.process.stderr?.on('data', (data) => {
          this.outputChannel.appendLine(data.toString());
        });
        
        this.process.on('error', (error) => {
          this.outputChannel.appendLine(`❌ Error: ${error.message}`);
          this.setStatus('error');
          resolve(false);
        });
        
        this.process.on('exit', (code) => {
          this.outputChannel.appendLine(`\n🛑 Dev server stopped (exit code: ${code})`);
          this.setStatus('stopped');
        });
        
        // Wait for server to be ready
        this.waitForReady().then((ready) => {
          if (ready) {
            this.setStatus('running');
            this.outputChannel.appendLine(`\n✅ Dev server ready at ${this.config!.url}`);
            resolve(true);
          } else {
            this.setStatus('error');
            this.outputChannel.appendLine('\n❌ Dev server failed to start');
            resolve(false);
          }
        });
        
      } catch (error) {
        this.outputChannel.appendLine(`❌ Failed to start: ${error}`);
        this.setStatus('error');
        resolve(false);
      }
    });
  }
  
  /**
   * Stop the dev server
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.outputChannel.appendLine('\n🛑 Stopping dev server...');
      
      // Kill process tree
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', this.process.pid!.toString(), '/f', '/t']);
      } else {
        this.process.kill('SIGTERM');
      }
      
      this.process = null;
      this.setStatus('stopped');
    }
  }
  
  /**
   * Check if server is already running on the configured port
   */
  async isServerRunning(): Promise<boolean> {
    if (!this.config) {
      return false;
    }
    
    return this.checkPort(this.config.port);
  }
  
  /**
   * Wait for server to be ready
   */
  private async waitForReady(maxWaitMs: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000;
    
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.isServerRunning()) {
        // Additional wait for framework to fully initialize
        await this.sleep(2000);
        return true;
      }
      await this.sleep(checkInterval);
    }
    
    return false;
  }
  
  /**
   * Check if a port is responding
   */
  private checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port,
        path: '/',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        resolve(true);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  }
  
  /**
   * Extract port from npm script
   */
  private extractPort(script: string | undefined): number | null {
    if (!script) return null;
    
    // Match patterns like --port 3000, -p 3000, PORT=3000
    const patterns = [
      /--port[=\s]+(\d+)/,
      /-p[=\s]+(\d+)/,
      /PORT[=\s]+(\d+)/,
      /:(\d{4})/
    ];
    
    for (const pattern of patterns) {
      const match = script.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return null;
  }
  
  /**
   * Set status and notify listeners
   */
  private setStatus(status: AppStatus): void {
    this.status = status;
    this.statusChangeCallbacks.forEach(cb => cb(status));
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
    this.outputChannel.dispose();
  }
}
