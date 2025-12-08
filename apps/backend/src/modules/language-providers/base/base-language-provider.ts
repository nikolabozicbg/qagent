import { promises as fs } from 'fs';
import * as path from 'path';
import { glob, GlobOptions } from 'glob';
import { 
  LanguageProvider, 
  Framework, 
  LanguageMetadata, 
  ProjectType, 
  TestType,
  FrameworkRecommendation,
  TestTypeRecommendation 
} from './language-provider.interface';

export abstract class BaseLanguageProvider implements LanguageProvider {
  abstract getMetadata(): LanguageMetadata;
  abstract detectFrameworks(workspacePath: string): Promise<Framework[]>;
  abstract findSourceFiles(workspacePath: string): Promise<string[]>;
  abstract findTestFiles(workspacePath: string): Promise<string[]>;
  abstract getTestFileForSource(sourceFile: string): string | null;
  abstract getSourceFileForTest(testFile: string): string | null;
  abstract getTestGenerationPrompt(sourceCode: string, framework: Framework): string;
  
  // NEW: Framework recommendations (must be implemented by subclasses)
  abstract recommendFrameworks(projectType: ProjectType, workspacePath: string): Promise<FrameworkRecommendation[]>;
  
  // NEW: Test type recommendations (default implementation, can be overridden)
  recommendTestType(sourceFile: string, projectType: ProjectType): TestTypeRecommendation[] {
    // Default implementation based on file path patterns
    const fileName = this.getBaseName(sourceFile).toLowerCase();
    const recommendations: TestTypeRecommendation[] = [];
    
    // Controllers/Endpoints → Integration tests
    if (fileName.includes('controller') || fileName.includes('endpoint') || fileName.includes('route')) {
      recommendations.push({
        testType: 'integration',
        priority: 'primary',
        framework: 'default',
        reason: 'API endpoint - test with real HTTP requests',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'npm test'
      });
    }
    
    // Services/Business Logic → Unit tests
    if (fileName.includes('service') || fileName.includes('util') || fileName.includes('helper')) {
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework: 'default',
        reason: 'Business logic - fast isolated tests',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'npm test'
      });
    }
    
    // Components → Component tests
    if (fileName.includes('component') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
      recommendations.push({
        testType: 'component',
        priority: 'primary',
        framework: 'default',
        reason: 'UI component - test rendering and interactions',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'npm test'
      });
    }
    
    // Default to unit tests
    if (recommendations.length === 0) {
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework: 'default',
        reason: 'Default recommendation for general code',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'npm test'
      });
    }
    
    return recommendations;
  }
  
  // NEW: Output path generation (default implementation, can be overridden)
  getOutputPath(sourceFile: string, testType: TestType, framework: string, workspacePath: string): string {
    // Default: same directory with .test/.spec suffix
    const defaultPath = this.getTestFileForSource(sourceFile);
    if (defaultPath) {
      return defaultPath;
    }
    
    // Fallback: construct based on test type
    const ext = this.getFileExtension(sourceFile);
    const baseName = this.getBaseName(sourceFile).replace(ext, '');
    return path.join(this.getDirName(sourceFile), `${baseName}.test${ext}`);
  }

  // Shared utility methods
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  protected async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  protected async readJsonFile<T = any>(filePath: string): Promise<T | null> {
    try {
      const content = await this.readFile(filePath);
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  protected async findFiles(pattern: string, options: GlobOptions = {}): Promise<string[]> {
    try {
      const results = await glob(pattern, {
        absolute: true,
        nodir: true,
        ...options
      });
      return results.map(r => r.toString());
    } catch (error) {
      console.error(`Error finding files with pattern ${pattern}:`, error);
      return [];
    }
  }

  protected getFileExtension(filePath: string): string {
    return path.extname(filePath);
  }

  protected getBaseName(filePath: string): string {
    return path.basename(filePath);
  }

  protected getDirName(filePath: string): string {
    return path.dirname(filePath);
  }

  protected removeExtension(filePath: string): string {
    const ext = path.extname(filePath);
    return filePath.slice(0, -ext.length);
  }

  protected countLines(content: string): number {
    return content.split('\n').length;
  }

  protected async getLineCount(filePath: string): Promise<number> {
    try {
      const content = await this.readFile(filePath);
      return this.countLines(content);
    } catch {
      return 0;
    }
  }
}
