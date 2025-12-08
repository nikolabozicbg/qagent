/**
 * Test Execution Service
 * 
 * Orchestrates test execution across different languages and frameworks.
 * Selects the appropriate executor based on project analysis.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ITestExecutor, TestExecutionParams, TestRunResult } from './test-executor.interface';
import { CSharpTestExecutor } from './executors/csharp.executor';
import { EnhancedAnalysisService } from '../analysis/enhanced-analysis.service';

@Injectable()
export class TestExecutionService {
  private readonly logger = new Logger(TestExecutionService.name);
  private readonly executors: Map<string, ITestExecutor> = new Map();

  constructor(
    private readonly enhancedAnalysisService: EnhancedAnalysisService,
  ) {
    // Register all executors
    this.registerExecutor(new CSharpTestExecutor());
    // Future executors:
    // this.registerExecutor(new TypeScriptTestExecutor());
    // this.registerExecutor(new PythonTestExecutor());
  }

  /**
   * Execute tests with automatic language/framework detection
   */
  async executeTests(params: TestExecutionParams): Promise<TestRunResult> {
    this.logger.log(`Executing tests: scope=${params.scope}, type=${params.testType}`);

    try {
      // Detect project language
      const language = await this.detectLanguage(params.workspacePath);
      this.logger.log(`Detected language: ${language}`);

      // Get appropriate executor
      const executor = this.getExecutor(language);
      if (!executor) {
        throw new Error(`No executor found for language: ${language}`);
      }

      // Execute tests
      const result = await executor.execute(params);

      this.logger.log(
        `Test execution completed: ${result.passed}/${result.totalTests} passed, ` +
        `${result.failed} failed, duration: ${result.duration}ms`
      );

      return result;
    } catch (error) {
      this.logger.error('Test execution failed:', error);
      throw error;
    }
  }

  /**
   * Get run command without executing (for preview/debugging)
   */
  async getRunCommand(params: TestExecutionParams): Promise<string> {
    const language = await this.detectLanguage(params.workspacePath);
    const executor = this.getExecutor(language);
    
    if (!executor) {
      throw new Error(`No executor found for language: ${language}`);
    }

    return executor.getRunCommand(params);
  }

  /**
   * Detect primary language of the project
   */
  private async detectLanguage(workspacePath: string): Promise<string> {
    const analysis = await this.enhancedAnalysisService.analyzeWorkspace(workspacePath);
    
    if (!analysis || !analysis.project || analysis.project.technologies.length === 0) {
      throw new Error('Could not detect project language');
    }

    // Use primary technology (first one)
    return analysis.project.technologies[0].language.toLowerCase();
  }

  /**
   * Register an executor
   */
  private registerExecutor(executor: ITestExecutor): void {
    const language = executor.getLanguage().toLowerCase();
    this.executors.set(language, executor);
    this.logger.log(`Registered executor for language: ${language}`);
  }

  /**
   * Get executor for a specific language
   */
  private getExecutor(language: string): ITestExecutor | undefined {
    return this.executors.get(language.toLowerCase());
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.executors.has(language.toLowerCase());
  }
}
