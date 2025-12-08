import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';

/**
 * Project configuration detected from package.json
 */
export interface ProjectConfig {
  framework: 'react' | 'nextjs' | 'vue' | 'vite' | 'angular' | 'svelte' | 'unknown';
  port: number;
  startCommand: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  baseUrl: string;
}

/**
 * ProjectConfigService
 * 
 * Automatically detects project configuration:
 * - Framework type (React, Next.js, Vue, etc.)
 * - Port number from start script
 * - Package manager
 * - Base URL for scanning
 */
export class ProjectConfigService {
  private outputChannel: vscode.OutputChannel;
  
  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('QAgenAI Project Config');
  }
  
  /**
   * Detect project configuration from workspace
   */
  async detectConfig(workspaceRoot: string): Promise<ProjectConfig | null> {
    this.outputChannel.appendLine(`🔍 Detecting project configuration in ${workspaceRoot}`);
    
    // Read package.json
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.outputChannel.appendLine('❌ No package.json found');
      return null;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // Detect framework
    const framework = this.detectFramework(packageJson);
    this.outputChannel.appendLine(`📦 Framework: ${framework}`);
    
    // Detect port
    const startScript = packageJson.scripts?.start || packageJson.scripts?.dev || '';
    const port = this.extractPort(startScript, framework);
    this.outputChannel.appendLine(`🔌 Port: ${port}`);
    
    // Detect package manager
    const packageManager = this.detectPackageManager(workspaceRoot);
    this.outputChannel.appendLine(`📦 Package manager: ${packageManager}`);
    
    const baseUrl = `http://localhost:${port}`;
    
    return {
      framework,
      port,
      startCommand: startScript,
      packageManager,
      baseUrl
    };
  }
  
  /**
   * Detect framework from package.json dependencies
   */
  private detectFramework(packageJson: any): ProjectConfig['framework'] {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    // Check in priority order
    if (deps['next']) return 'nextjs';
    if (deps['@angular/core']) return 'angular';
    if (deps['vue']) return 'vue';
    if (deps['svelte']) return 'svelte';
    if (deps['vite']) return 'vite';
    if (deps['react']) return 'react';
    
    return 'unknown';
  }
  
  /**
   * Extract port number from start script
   */
  private extractPort(startScript: string, framework: ProjectConfig['framework']): number {
    // Common patterns:
    // PORT=4100 react-scripts start
    // next dev -p 3001
    // vite --port 5173
    // vue-cli-service serve --port 8080
    
    // Pattern 1: PORT=XXXX or PORT XXXX
    const portEnvMatch = startScript.match(/PORT[=\s]+(\d+)/i);
    if (portEnvMatch) {
      return parseInt(portEnvMatch[1], 10);
    }
    
    // Pattern 2: -p XXXX or --port XXXX
    const portFlagMatch = startScript.match(/(?:-p|--port)[=\s]+(\d+)/i);
    if (portFlagMatch) {
      return parseInt(portFlagMatch[1], 10);
    }
    
    // Default ports by framework
    const defaultPorts: Record<string, number> = {
      'nextjs': 3000,
      'react': 3000,
      'vite': 5173,
      'vue': 8080,
      'angular': 4200,
      'svelte': 5000,
      'unknown': 3000
    };
    
    return defaultPorts[framework] || 3000;
  }
  
  /**
   * Detect package manager from lock files
   */
  private detectPackageManager(workspaceRoot: string): 'npm' | 'yarn' | 'pnpm' {
    if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  }
  
  /**
   * Check if a port is available (app not running)
   */
  async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false); // Port is in use
        } else {
          resolve(true); // Other error, assume available
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true); // Port is available
      });
      
      server.listen(port);
    });
  }
  
  /**
   * Check if app is responding at URL
   */
  async isAppReady(url: string, timeout: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every 1 second
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url, { 
          method: 'GET',
          signal: AbortSignal.timeout(2000) 
        });
        
        if (response.ok || response.status === 404) {
          // 200 OK or 404 means server is responding
          return true;
        }
      } catch (error) {
        // Connection refused, not ready yet
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    return false; // Timeout
  }
  
  /**
   * Start the app in a background terminal
   */
  async startApp(
    workspaceRoot: string, 
    config: ProjectConfig,
    progressCallback?: (message: string) => void
  ): Promise<vscode.Terminal> {
    const terminalName = 'QAgenAI Dev Server';
    
    // Check if terminal already exists
    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
    
    if (!terminal) {
      terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workspaceRoot
      });
    }
    
    // Show terminal
    terminal.show(true);
    
    // Send start command
    const startCmd = config.packageManager === 'npm' ? 'npm start' :
                     config.packageManager === 'yarn' ? 'yarn start' :
                     'pnpm start';
    
    progressCallback?.(`Starting app with "${startCmd}"...`);
    this.outputChannel.appendLine(`▶️  Running: ${startCmd}`);
    
    terminal.sendText(startCmd);
    
    // Wait for app to be ready
    progressCallback?.(`Waiting for app to be ready at ${config.baseUrl}...`);
    
    const isReady = await this.isAppReady(config.baseUrl);
    
    if (isReady) {
      progressCallback?.('✅ App is ready!');
      this.outputChannel.appendLine(`✅ App ready at ${config.baseUrl}`);
    } else {
      progressCallback?.('⚠️  App startup timeout, but continuing...');
      this.outputChannel.appendLine('⚠️  Timeout waiting for app, may not be ready');
    }
    
    return terminal;
  }
}
