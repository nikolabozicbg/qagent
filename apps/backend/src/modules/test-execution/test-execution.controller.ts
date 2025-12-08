/**
 * Test Execution Controller
 * 
 * Endpoints for running tests across different languages and frameworks.
 */

import { Controller, Post, Body, Logger, Get, Query } from '@nestjs/common';
import { TestExecutionService } from './test-execution.service';
import { TestExecutionParams, TestRunResult } from './test-executor.interface';

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

  constructor(private readonly testExecutionService: TestExecutionService) {}

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

    return await this.testExecutionService.executeTests(params);
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
}
