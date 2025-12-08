import * as vscode from 'vscode';
import * as path from 'path';
import { BackendApiService } from './backend-api.service';
import { CoverageTreeProvider } from '../coverageTreeProvider';

/**
 * Test type enum
 */
export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e'
}

/**
 * Test generation request
 */
export interface TestGenerationRequest {
  sourceFilePath: string;
  sourceCode: string;
  testType: TestType;
  framework?: string;
  outputPath?: string;
}

/**
 * Test generation result
 */
export interface TestGenerationResult {
  testCode: string;
  testFilePath: string;
  sourceFilePath: string;
  framework: string;
  testType: string;
  coverage?: {
    estimated: number;
    testCases: number;
  };
}

/**
 * Service for test generation orchestration
 */
export class TestGenerationService {
  constructor(
    private backendApi: BackendApiService,
    private coverageProvider: CoverageTreeProvider
  ) {}

  /**
   * Generate test using agent system
   */
  async generateTest(request: TestGenerationRequest): Promise<TestGenerationResult> {
    const { sourceFilePath, sourceCode, testType, framework, outputPath } = request;
    
    const fileName = path.basename(sourceFilePath);
    const language = this.getLanguageFromExtension(path.extname(sourceFilePath));
    
    // Get framework info from coverage report
    const report = this.coverageProvider.getReport();
    const frameworks = report?.frameworks || {};
    
    // Build query with explicit test type for detection
    const query = this.buildTestGenerationQuery(fileName, testType, framework);
    
    // DEBUG LOGGING
    console.log('🔍 TestGenerationService - Sending to agent:');
    console.log('  Query:', query);
    console.log('  Test Type:', testType);
    console.log('  Framework:', framework);
    console.log('  Frameworks context:', JSON.stringify(frameworks));
    console.log('  Current file:', sourceFilePath);
    
    // Call agent with context
    const agentResponse = await this.backendApi.callAgent(query, {
      query,  // Add query to context for framework detection
      code: sourceCode,
      currentFile: sourceFilePath,
      fileName,
      language,
      workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      frameworks
    });
    
    // Extract generated test from agent actions
    const createFileAction = agentResponse.data.actions?.find((a: any) => a.tool === 'create_file');
    
    if (!createFileAction) {
      throw new Error('Agent did not generate test file');
    }
    
    const testCode = createFileAction.arguments?.content;
    const testFilePath = this.getTestFilePathForFramework(sourceFilePath, outputPath, testType, framework);
    
    return {
      testCode,
      testFilePath,
      sourceFilePath,
      framework: framework || (frameworks as any)[testType]?.name || 'unknown',
      testType: testType.charAt(0).toUpperCase() + testType.slice(1),
      coverage: {
        estimated: 85, // TODO: calculate from analysis
        testCases: this.countTestCases(testCode)
      }
    };
  }
  
  /**
   * Build test generation query with explicit test type
   */
  private buildTestGenerationQuery(fileName: string, testType: TestType, framework?: string): string {
    const testTypeLabel = testType === TestType.E2E ? 'E2E' : testType;
    return `Generate ${testTypeLabel} test for ${fileName}${framework ? ` using ${framework}` : ''}`;
  }
  
  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(ext: string): string {
    const extMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java',
      '.cs': 'csharp'
    };
    return extMap[ext] || 'unknown';
  }
  
  /**
   * Get test file path from source file path
   */
  private getTestFilePath(sourceFilePath: string): string {
    const ext = path.extname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, ext);
    const dir = path.dirname(sourceFilePath);
    
    return path.join(dir, `${baseName}.spec${ext}`);
  }
  
  /**
   * Get test file path based on framework output path configuration
   */
  private getTestFilePathForFramework(
    sourceFilePath: string, 
    outputPath: string | undefined, 
    testType: TestType,
    framework: string = ''
  ): string {
    const ext = path.extname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, ext);
    
    // Find project root to resolve relative outputPath (e.g. 'e2e')
    // This supports monorepos where e2e folder is inside apps/frontend/e2e
    const projectRoot = this.findProjectRoot(sourceFilePath);
    console.log(`[TestGen] Project root for ${sourceFilePath}: ${projectRoot}`);
    
    // Try to detect output directory from framework config
    let effectiveOutputPath = outputPath;
    
    // If Playwright, try to read playwright.config.ts
    if (framework.toLowerCase() === 'playwright' || testType === TestType.E2E) {
        const configTestDir = this.readPlaywrightConfig(projectRoot);
        if (configTestDir) {
            effectiveOutputPath = configTestDir;
            console.log(`[TestGen] Detected testDir from playwright.config.ts: ${configTestDir}`);
        } else if (!effectiveOutputPath) {
            // Default fallback if no config and no output path
            effectiveOutputPath = 'e2e';
        }
    }
    
    // Fallback for other types if no output path
    if (!effectiveOutputPath) {
        // Colocated test
        return this.getTestFilePath(sourceFilePath);
    }
    
    // Determine test file extension based on test type
    const testExt = testType === TestType.E2E ? '.spec' + ext : '.test' + ext;
    
    // Resolve absolute output path
    const absoluteOutputPath = path.isAbsolute(effectiveOutputPath)
      ? effectiveOutputPath
      : path.join(projectRoot, effectiveOutputPath);
      
    console.log(`[TestGen] Absolute output path: ${absoluteOutputPath}`);
    
    // Handle generic filenames (page.tsx, layout.tsx) to avoid collisions in flat E2E directory
    let testFileName = `${baseName}${testExt}`;
    
    // Only rename if we are using a centralized directory (effectiveOutputPath is set)
    if (effectiveOutputPath) {
        const isGenericFilename = /^(page|layout|template|error|loading|not-found|index)$/i.test(baseName);
        
        if (isGenericFilename) {
            // Get parent directory name
            const parentDir = path.basename(path.dirname(sourceFilePath));
            
            // If parent is 'app' or 'pages', it might be the root index, but 'app-page' is still unique compared to 'about-page'
            // Prepend parent dir name: e.g. "about-page.spec.tsx"
            testFileName = `${parentDir}-${baseName}${testExt}`;
            console.log(`[TestGen] Renamed generic file ${baseName} to ${testFileName} to avoid collision`);
        }
    }
    
    const finalPath = path.join(absoluteOutputPath, testFileName);
    console.log(`[TestGen] Final test file path: ${finalPath}`);
    
    return finalPath;
  }

  /**
   * Read testDir from playwright.config.ts
   */
  private readPlaywrightConfig(projectRoot: string): string | null {
    const fs = require('fs');
    const configPath = path.join(projectRoot, 'playwright.config.ts');
    
    if (fs.existsSync(configPath)) {
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            // Regex to find testDir: '...' or testDir: "..."
            const match = content.match(/testDir:\s*['"]([^'"]+)['"]/);
            if (match && match[1]) {
                let dir = match[1];
                // Remove leading ./
                if (dir.startsWith('./')) {
                    dir = dir.substring(2);
                }
                return dir;
            }
        } catch (error) {
            console.error('[TestGen] Error reading playwright config:', error);
        }
    }
    return null;
  }

  /**
   * Find project root by looking for package.json or playwright.config.ts
   */
  private findProjectRoot(startPath: string): string {
    const fs = require('fs');
    let currentDir = path.dirname(startPath);
    const root = path.parse(currentDir).root;
    
    while (currentDir && currentDir !== root) {
      if (fs.existsSync(path.join(currentDir, 'package.json')) || 
          fs.existsSync(path.join(currentDir, 'playwright.config.ts'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback to workspace folder
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || path.dirname(startPath);
  }
  
  /**
   * Count test cases in generated code
   */
  private countTestCases(code: string): number {
    const itMatches = code.match(/\bit\(/g);
    const testMatches = code.match(/\btest\(/g);
    return (itMatches?.length || 0) + (testMatches?.length || 0);
  }
}
