/**
 * Test Executor Interface
 * 
 * Universal interface for executing tests across different languages and frameworks.
 * Each language provider implements this interface with language-specific logic.
 */

export type TestScope = 'all' | 'unit' | 'integration' | 'e2e' | 'component' | 'file' | 'method';
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending';

/**
 * Parameters for test execution
 */
export interface TestExecutionParams {
  workspacePath: string;
  scope: TestScope;
  testType?: 'unit' | 'integration' | 'e2e' | 'component';
  filePath?: string;
  methodName?: string;
  withCoverage?: boolean;
  verbose?: boolean;
  timeout?: number;
}

/**
 * Individual test result
 */
export interface TestCase {
  name: string;
  status: TestStatus;
  duration: number; // milliseconds
  errorMessage?: string;
  stackTrace?: string;
  filePath?: string;
  line?: number;
}

/**
 * Test run result
 */
export interface TestRunResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // milliseconds
  coverage?: CoverageResult;
  testCases: TestCase[];
  rawOutput: string;
  command: string;
  timestamp: Date;
}

/**
 * Coverage result (if collected)
 */
export interface CoverageResult {
  linesCovered: number;
  linesTotal: number;
  percentage: number;
  files: FileCoverage[];
}

export interface FileCoverage {
  path: string;
  linesCovered: number;
  linesTotal: number;
  percentage: number;
}

/**
 * Test Executor Interface
 * 
 * Implemented by language-specific executors (C#, TypeScript, Python, etc.)
 */
export interface ITestExecutor {
  /**
   * Execute tests with given parameters
   */
  execute(params: TestExecutionParams): Promise<TestRunResult>;

  /**
   * Generate the shell command for test execution
   */
  getRunCommand(params: TestExecutionParams): string;

  /**
   * Parse test framework output into structured result
   */
  parseResults(output: string, command: string): TestRunResult;

  /**
   * Check if this executor supports the given framework
   */
  supportsFramework(framework: string): boolean;

  /**
   * Get the language this executor handles
   */
  getLanguage(): string;
}

/**
 * Base Test Executor
 * 
 * Provides common functionality for all language-specific executors
 */
export abstract class BaseTestExecutor implements ITestExecutor {
  protected abstract language: string;
  protected abstract supportedFrameworks: string[];

  abstract execute(params: TestExecutionParams): Promise<TestRunResult>;
  abstract getRunCommand(params: TestExecutionParams): string;
  abstract parseResults(output: string, command: string): TestRunResult;

  supportsFramework(framework: string): boolean {
    return this.supportedFrameworks.some(f => 
      f.toLowerCase() === framework.toLowerCase()
    );
  }

  getLanguage(): string {
    return this.language;
  }

  /**
   * Helper: Execute shell command and capture output
   */
  protected async executeCommand(
    command: string, 
    cwd: string, 
    timeout: number = 30000
  ): Promise<{ output: string; exitCode: number }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });
      return { output: stdout + stderr, exitCode: 0 };
    } catch (error: any) {
      // Test failures often result in non-zero exit code
      return {
        output: (error.stdout || '') + (error.stderr || ''),
        exitCode: error.code || 1,
      };
    }
  }

  /**
   * Helper: Build filter arguments for test scope
   */
  protected buildScopeFilter(params: TestExecutionParams): string {
    // Override in language-specific executors
    return '';
  }
}
