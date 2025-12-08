/**
 * C# Test Executor
 * 
 * Executes .NET tests using `dotnet test` command.
 * Supports: xUnit, NUnit, MSTest
 */

import {
  BaseTestExecutor,
  TestExecutionParams,
  TestRunResult,
  TestCase,
  TestStatus,
} from '../test-executor.interface';

export class CSharpTestExecutor extends BaseTestExecutor {
  protected language = 'csharp';
  protected supportedFrameworks = ['xUnit', 'NUnit', 'MSTest'];

  /**
   * Execute dotnet test command
   */
  async execute(params: TestExecutionParams): Promise<TestRunResult> {
    const command = this.getRunCommand(params);
    const startTime = Date.now();

    const { output, exitCode } = await this.executeCommand(
      command,
      params.workspacePath,
      params.timeout || 60000 // 60s default for C# tests
    );

    const duration = Date.now() - startTime;
    const result = this.parseResults(output, command);

    return {
      ...result,
      duration,
      timestamp: new Date(),
    };
  }

  /**
   * Generate dotnet test command with appropriate filters
   */
  getRunCommand(params: TestExecutionParams): string {
    let command = 'dotnet test';

    // Add filter based on scope
    const filter = this.buildScopeFilter(params);
    if (filter) {
      command += ` --filter "${filter}"`;
    }

    // Add coverage if requested
    if (params.withCoverage) {
      command += ' --collect:"XPlat Code Coverage"';
    }

    // Add verbosity
    if (params.verbose) {
      command += ' --verbosity detailed';
    } else {
      command += ' --verbosity normal';
    }

    // Disable build if running single file/method (faster)
    if (params.scope === 'file' || params.scope === 'method') {
      command += ' --no-build';
    }

    return command;
  }

  /**
   * Build filter expression for dotnet test
   * 
   * Examples:
   * - Unit: Category=Unit
   * - Integration: Category=Integration
   * - File: FullyQualifiedName~PaymentServiceTests
   * - Method: FullyQualifiedName=Namespace.ClassName.MethodName
   */
  protected buildScopeFilter(params: TestExecutionParams): string {
    const filters: string[] = [];

    // Test type filter (Category attribute)
    if (params.testType) {
      const categoryMap = {
        unit: 'Unit',
        integration: 'Integration',
        e2e: 'E2E',
        component: 'Component',
      };
      filters.push(`Category=${categoryMap[params.testType]}`);
    }

    // File-specific filter
    if (params.scope === 'file' && params.filePath) {
      const testFileName = this.getTestFileNameFromPath(params.filePath);
      filters.push(`FullyQualifiedName~${testFileName}`);
    }

    // Method-specific filter
    if (params.scope === 'method' && params.methodName) {
      filters.push(`FullyQualifiedName=${params.methodName}`);
    }

    return filters.join('&');
  }

  /**
   * Parse dotnet test output into structured result
   * 
   * Example output:
   * ```
   * Starting test execution, please wait...
   * A total of 1 test files matched the specified pattern.
   * 
   * Passed!  - Failed:     0, Passed:    15, Skipped:     0, Total:    15, Duration: 2 s
   * ```
   */
  parseResults(output: string, command: string): TestRunResult {
    const testCases: TestCase[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalTests = 0;
    let duration = 0;

    // Parse summary line: "Passed!  - Failed: 0, Passed: 15, Skipped: 0, Total: 15, Duration: 2 s"
    const summaryMatch = output.match(
      /Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+),\s*Duration:\s*([\d.]+)\s*([ms])/i
    );

    if (summaryMatch) {
      failed = parseInt(summaryMatch[1], 10);
      passed = parseInt(summaryMatch[2], 10);
      skipped = parseInt(summaryMatch[3], 10);
      totalTests = parseInt(summaryMatch[4], 10);
      
      const durationValue = parseFloat(summaryMatch[5]);
      const durationUnit = summaryMatch[6];
      duration = durationUnit === 's' ? durationValue * 1000 : durationValue;
    }

    // Parse individual test results
    // Example: "  X PaymentServiceTests.ProcessPayment [FAIL]"
    // Example: "  √ PaymentServiceTests.ValidateCard [PASS]"
    const testLineRegex = /^\s*([X√✓✗])\s+(.+?)\s+\[(\w+)\]/gm;
    let match;

    while ((match = testLineRegex.exec(output)) !== null) {
      const symbol = match[1];
      const testName = match[2];
      const statusText = match[3];

      let status: TestStatus = 'passed';
      if (symbol === 'X' || symbol === '✗' || statusText === 'FAIL') {
        status = 'failed';
      } else if (statusText === 'SKIP') {
        status = 'skipped';
      }

      testCases.push({
        name: testName,
        status,
        duration: 0, // dotnet test doesn't provide per-test duration in normal output
      });
    }

    // Parse failure details
    // Example:
    // "  Failed PaymentServiceTests.ProcessPayment [25ms]
    //    Error Message:
    //     Assert.Equal() Failure"
    const failureRegex = /Failed\s+(.+?)\s+\[(\d+)ms\]\s+Error Message:\s+(.+?)(?=\n\s*Stack|$)/gs;
    let failureMatch;

    while ((failureMatch = failureRegex.exec(output)) !== null) {
      const testName = failureMatch[1];
      const testDuration = parseInt(failureMatch[2], 10);
      const errorMessage = failureMatch[3].trim();

      const existingTest = testCases.find(t => t.name === testName);
      if (existingTest) {
        existingTest.duration = testDuration;
        existingTest.errorMessage = errorMessage;
      } else {
        testCases.push({
          name: testName,
          status: 'failed',
          duration: testDuration,
          errorMessage,
        });
      }
    }

    const success = failed === 0 && totalTests > 0;

    return {
      success,
      totalTests,
      passed,
      failed,
      skipped,
      duration,
      testCases,
      rawOutput: output,
      command,
      timestamp: new Date(),
    };
  }

  /**
   * Helper: Extract test class name from source file path
   * Example: "Services/PaymentService.cs" -> "PaymentServiceTests"
   */
  private getTestFileNameFromPath(filePath: string): string {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    const nameWithoutExt = fileName.replace(/\.(cs|ts|js|py)$/, '');
    
    // If already a test file
    if (nameWithoutExt.endsWith('Tests') || nameWithoutExt.endsWith('Test')) {
      return nameWithoutExt;
    }
    
    // Convert source file to test file name
    return `${nameWithoutExt}Tests`;
  }
}
