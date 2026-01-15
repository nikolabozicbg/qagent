/**
 * Test Execution Controller
 * 
 * Endpoints for running tests across different languages and frameworks.
 */

import { Controller, Post, Body, Logger, Get, Query } from '@nestjs/common';
import { TestExecutionService } from './test-execution.service';
import { TestExecutionParams, TestRunResult } from './test-executor.interface';
import { AnalysisGateway } from '../analysis/analysis.gateway';

/**
 * DTO for test execution request
 */
export class RunTestsDto {
  workspacePath: string;
  scope: 'all' | 'unit' | 'integration' | 'e2e' | 'component' | 'file' | 'method';
  testType?: 'unit' | 'integration' | 'e2e' | 'component';
  filePath?: string;
  methodName?: string;
  withCoverage?: boolean;
  verbose?: boolean;
  timeout?: number;
}

/**
 * DTO for preview command request
 */
export class PreviewCommandDto {
  workspacePath: string;
  scope: 'all' | 'unit' | 'integration' | 'e2e' | 'component' | 'file' | 'method';
  testType?: 'unit' | 'integration' | 'e2e' | 'component';
  filePath?: string;
  methodName?: string;
  withCoverage?: boolean;
}

@Controller('test')
export class TestExecutionController {
  private readonly logger = new Logger(TestExecutionController.name);

  constructor(
    private readonly testExecutionService: TestExecutionService,
    private readonly gateway: AnalysisGateway,
  ) {}

  /**
   * Execute tests
   * 
   * POST /test/run
   * 
   * Examples:
   * - Run all tests: { workspacePath: "/path", scope: "all" }
   * - Run unit tests: { workspacePath: "/path", scope: "unit", testType: "unit" }
   * - Run specific file: { workspacePath: "/path", scope: "file", filePath: "PaymentService.cs" }
   */
  @Post('run')
  async runTests(@Body() dto: RunTestsDto): Promise<TestRunResult> {
    this.logger.log(`POST /test/run - scope: ${dto.scope}, testType: ${dto.testType}`);

    const params: TestExecutionParams = {
      workspacePath: dto.workspacePath,
      scope: dto.scope,
      testType: dto.testType,
      filePath: dto.filePath,
      methodName: dto.methodName,
      withCoverage: dto.withCoverage || false,
      verbose: dto.verbose || false,
      timeout: dto.timeout,
    };

    // Emit initial console message
    this.gateway.emitTestRunConsole(dto.workspacePath, {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Starting test execution: scope=${dto.scope}, type=${dto.testType || 'all'}`
    });

    // Execute tests with streaming
    const result = await this.executeTestsWithStreaming(params, dto.workspacePath);

    return result;
  }

  /**
   * Execute tests with WebSocket streaming
   */
  private async executeTestsWithStreaming(
    params: TestExecutionParams,
    workspacePath: string
  ): Promise<TestRunResult> {
    try {
      // Emit console: Starting
      this.gateway.emitTestRunConsole(workspacePath, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Preparing test environment...'
      });

      // Execute tests
      const result = await this.testExecutionService.executeTests(params);

      // Emit test updates (simulated - in real implementation, this would come from executor)
      if (params.filePath) {
        this.gateway.emitTestRunUpdate(workspacePath, {
          testFile: params.filePath,
          status: result.failed > 0 ? 'failed' : 'passed',
          duration: result.duration,
        });
      } else {
        // For "all" scope, emit multiple test files
        this.gateway.emitTestRunUpdate(workspacePath, {
          testFile: 'all tests',
          status: result.failed > 0 ? 'failed' : 'passed',
          duration: result.duration,
        });
      }

      // Emit console: Results
      this.gateway.emitTestRunConsole(workspacePath, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Tests completed: ${result.passed}/${result.totalTests} passed, ${result.failed} failed`
      });

      // Emit complete event
      this.gateway.emitTestRunComplete(workspacePath, {
        passed: result.passed,
        failed: result.failed,
        total: result.totalTests,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      this.logger.error('Test execution failed:', error);
      
      // Emit error
      this.gateway.emitTestRunConsole(workspacePath, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Test execution failed: ${error.message}`
      });

      throw error;
    }
  }

  /**
   * Preview command without executing
   * 
   * GET /test/command
   * 
   * Returns the shell command that would be executed.
   * Useful for debugging and showing users what will run.
   */
  @Get('command')
  async previewCommand(@Query() query: PreviewCommandDto): Promise<{ command: string }> {
    this.logger.log(`GET /test/command - scope: ${query.scope}`);

    const params: TestExecutionParams = {
      workspacePath: query.workspacePath,
      scope: query.scope,
      testType: query.testType,
      filePath: query.filePath,
      methodName: query.methodName,
      withCoverage: query.withCoverage || false,
    };

    const command = await this.testExecutionService.getRunCommand(params);
    return { command };
  }

  /**
   * Get supported languages
   * 
   * GET /test/languages
   */
  @Get('languages')
  getSupportedLanguages(): { languages: string[] } {
    const languages = this.testExecutionService.getSupportedLanguages();
    return { languages };
  }

  /**
   * Generate test for a specific flow (Desktop app endpoint)
   * POST /test/generate
   */
  @Post('generate')
  async generateTest(@Body() body: {
    flowId: string;
    projectPath: string;
    framework: 'playwright' | 'cypress';
    includeEdgeCases?: boolean;
    includeAccessibility?: boolean;
  }) {
    this.logger.log(`POST /test/generate - Flow: ${body.flowId}, Framework: ${body.framework}`);

    // Forward to existing analyze/generate-test endpoint
    // This is a convenience wrapper for the desktop app
    return {
      success: true,
      message: 'Use POST /analyze/generate-test instead',
      redirect: '/analyze/generate-test'
    };
  }

  /**
   * Get test results (Desktop app endpoint)
   * GET /test/results?projectPath=/path&testId=123
   */
  @Get('results')
  async getTestResults(
    @Query('projectPath') projectPath: string,
    @Query('testId') testId?: string
  ) {
    this.logger.log(`GET /test/results - Project: ${projectPath}, TestId: ${testId}`);

    // Mock results for now - would be stored in-memory or database
    const mockResults = [
      {
        id: 'run-1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        framework: 'playwright',
        passed: 12,
        failed: 0,
        skipped: 1,
        total: 13,
        duration: 8234,
        tests: [
          {
            id: 'test-1',
            testFile: 'login.spec.ts',
            testName: 'User Login - Happy Path',
            status: 'passed',
            duration: 1234
          },
          {
            id: 'test-2',
            testFile: 'login.spec.ts',
            testName: 'User Login - Invalid Credentials',
            status: 'passed',
            duration: 987
          }
        ]
      }
    ];

    if (testId) {
      const result = mockResults.find(r => r.id === testId);
      return result || { error: 'Test run not found' };
    }

    return mockResults;
  }
}
