import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Framework execution configuration
 */
export interface FrameworkExecutionConfig {
  name: string;
  runCommand: string;
  runSingleFile: string;
  watchCommand?: string;
  debugCommand?: string;
}

/**
 * Universal test execution service
 * Supports any test framework via configuration
 */
export class TestExecutionService {
  private terminals: Map<string, vscode.Terminal> = new Map();

  /**
   * Run a single test file
   */
  async runTest(
    testFilePath: string,
    framework: FrameworkExecutionConfig,
    workspaceRoot: string
  ): Promise<void> {
    const terminalName = `Test: ${path.basename(testFilePath)}`;
    const terminal = this.getOrCreateTerminal(terminalName, workspaceRoot);
    
    const relativePath = path.relative(workspaceRoot, testFilePath);
    const command = framework.runSingleFile.replace('{file}', relativePath);
    
    terminal.show();
    terminal.sendText(command);
    
    vscode.window.showInformationMessage(`Running test: ${path.basename(testFilePath)}`);
  }

  /**
   * Run tests with given command (backward compatibility)
   */
  async runTests(command: string, workspaceRoot: string): Promise<void> {
    const terminal = vscode.window.createTerminal({
      name: 'QAgenAI - Test Runner',
      cwd: workspaceRoot,
      iconPath: new vscode.ThemeIcon('beaker')
    });
    
    terminal.show();
    terminal.sendText(command);
    
    vscode.window.showInformationMessage(`Running: ${command}`);
  }

  /**
   * Run all tests for a framework
   */
  async runAllTests(
    framework: FrameworkExecutionConfig,
    workspaceRoot: string
  ): Promise<void> {
    const terminalName = `Tests: ${framework.name}`;
    const terminal = this.getOrCreateTerminal(terminalName, workspaceRoot);
    
    terminal.show();
    terminal.sendText(framework.runCommand);
    
    vscode.window.showInformationMessage(`Running all ${framework.name} tests`);
  }

  /**
   * Watch a test file (continuous testing)
   */
  async watchTest(
    testFilePath: string,
    framework: FrameworkExecutionConfig,
    workspaceRoot: string
  ): Promise<void> {
    if (!framework.watchCommand) {
      vscode.window.showWarningMessage(`${framework.name} doesn't support watch mode`);
      return;
    }

    const terminalName = `Watch: ${path.basename(testFilePath)}`;
    const terminal = this.getOrCreateTerminal(terminalName, workspaceRoot);
    
    const relativePath = path.relative(workspaceRoot, testFilePath);
    const command = framework.watchCommand.replace('{file}', relativePath);
    
    terminal.show();
    terminal.sendText(command);
    
    vscode.window.showInformationMessage(`Watching test: ${path.basename(testFilePath)}`);
  }

  /**
   * Debug a test file
   */
  async debugTest(
    testFilePath: string,
    framework: FrameworkExecutionConfig,
    workspaceRoot: string
  ): Promise<void> {
    if (!framework.debugCommand) {
      vscode.window.showWarningMessage(`${framework.name} doesn't support debug mode yet`);
      return;
    }

    const terminalName = `Debug: ${path.basename(testFilePath)}`;
    const terminal = this.getOrCreateTerminal(terminalName, workspaceRoot);
    
    const relativePath = path.relative(workspaceRoot, testFilePath);
    const command = framework.debugCommand.replace('{file}', relativePath);
    
    terminal.show();
    terminal.sendText(command);
    
    vscode.window.showInformationMessage(`Debugging test: ${path.basename(testFilePath)}`);
  }
  
  /**
   * Install framework via npm (backward compatibility)
   */
  async installFramework(installCommand: string, workspaceRoot: string): Promise<void> {
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Installing test framework...',
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Please wait, this may take a minute...' });
      
      const terminal = vscode.window.createTerminal({
        name: 'QAgenAI - Install Framework',
        cwd: workspaceRoot,
        iconPath: new vscode.ThemeIcon('package')
      });
      
      terminal.show();
      terminal.sendText(installCommand);
      
      // Give visual feedback immediately
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
  }

  /**
   * Get or create a terminal for test execution
   */
  private getOrCreateTerminal(name: string, cwd: string): vscode.Terminal {
    let terminal = this.terminals.get(name);
    
    if (terminal && this.isTerminalAlive(terminal)) {
      return terminal;
    }

    terminal = vscode.window.createTerminal({
      name,
      cwd,
      iconPath: new vscode.ThemeIcon('beaker')
    });

    this.terminals.set(name, terminal);

    const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === terminal) {
        this.terminals.delete(name);
        disposable.dispose();
      }
    });

    return terminal;
  }

  /**
   * Check if terminal is still alive
   */
  private isTerminalAlive(terminal: vscode.Terminal): boolean {
    return vscode.window.terminals.includes(terminal);
  }

  /**
   * Dispose all terminals
   */
  dispose(): void {
    this.terminals.forEach((terminal) => {
      terminal.dispose();
    });
    this.terminals.clear();
  }
}

/**
 * Built-in framework configurations
 */
export const BUILTIN_FRAMEWORKS: Record<string, FrameworkExecutionConfig> = {
  playwright: {
    name: 'Playwright',
    runCommand: 'npx playwright test',
    runSingleFile: 'npx playwright test {file}',
    watchCommand: 'npx playwright test {file} --ui',
    debugCommand: 'npx playwright test {file} --debug'
  },
  jest: {
    name: 'Jest',
    runCommand: 'npm test',
    runSingleFile: 'npx jest {file}',
    watchCommand: 'npx jest {file} --watch',
    debugCommand: 'node --inspect-brk node_modules/.bin/jest {file} --runInBand'
  },
  vitest: {
    name: 'Vitest',
    runCommand: 'npx vitest',
    runSingleFile: 'npx vitest {file}',
    watchCommand: 'npx vitest {file} --ui',
    debugCommand: 'npx vitest {file} --inspect-brk'
  },
  pytest: {
    name: 'pytest',
    runCommand: 'pytest',
    runSingleFile: 'pytest {file}',
    watchCommand: 'pytest-watch {file}',
    debugCommand: 'pytest {file} --pdb'
  },
  'go-testing': {
    name: 'Go testing',
    runCommand: 'go test ./...',
    runSingleFile: 'go test {file}',
    watchCommand: 'gotestsum --watch {file}',
    debugCommand: 'dlv test {file}'
  },
  junit: {
    name: 'JUnit',
    runCommand: 'mvn test',
    runSingleFile: 'mvn test -Dtest={file}'
  }
};

/**
 * Get framework config by name
 */
export function getFrameworkExecutionConfig(frameworkName: string): FrameworkExecutionConfig | null {
  const normalized = frameworkName.toLowerCase().replace(/\s+/g, '-');
  return BUILTIN_FRAMEWORKS[normalized] || null;
}
