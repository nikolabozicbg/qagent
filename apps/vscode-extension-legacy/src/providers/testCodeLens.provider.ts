import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Function info extracted from source code
 */
interface FunctionInfo {
  name: string;
  line: number;
  isExported: boolean;
  isAsync: boolean;
  type: 'function' | 'method' | 'arrow';
}

/**
 * Test status for a function
 */
interface TestStatus {
  hasTest: boolean;
  testCount: number;
  testFilePath?: string;
}

/**
 * TestCodeLensProvider - Shows "⚡ Generate Test" above functions
 * 
 * Features:
 * - Auto-detects exported functions, methods, arrow functions
 * - Checks if tests exist by searching test files
 * - Shows appropriate action: Generate / Run / View
 */
export class TestCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  // Cache test file mappings
  private testFileCache = new Map<string, string[]>();
  private testContentCache = new Map<string, string>();

  // Supported file extensions
  private supportedExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  constructor() {
    // Watch for file changes to invalidate cache
    vscode.workspace.onDidSaveTextDocument(() => {
      this.clearCache();
      this._onDidChangeCodeLenses.fire();
    });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.testFileCache.clear();
    this.testContentCache.clear();
  }

  /**
   * Refresh CodeLens
   */
  public refresh(): void {
    this.clearCache();
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Provide CodeLens for document
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    // Skip non-supported files
    const ext = path.extname(document.fileName);
    if (!this.supportedExtensions.includes(ext)) {
      return [];
    }

    // Skip test files themselves
    if (this.isTestFile(document.fileName)) {
      return [];
    }

    // Skip node_modules
    if (document.fileName.includes('node_modules')) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const functions = this.extractFunctions(document);
    const testFiles = this.findTestFiles(document.fileName);

    for (const func of functions) {
      const testStatus = this.checkTestStatus(func.name, testFiles);
      const range = new vscode.Range(func.line, 0, func.line, 0);

      if (testStatus.hasTest) {
        // Has tests - show Run and View
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `✅ ${testStatus.testCount} test${testStatus.testCount > 1 ? 's' : ''}`,
            command: 'qagenai.showFunctionTests',
            arguments: [func.name, testStatus.testFilePath],
            tooltip: `${func.name} has ${testStatus.testCount} test${testStatus.testCount > 1 ? 's' : ''}`
          }),
          new vscode.CodeLens(range, {
            title: '▶ Run',
            command: 'qagenai.runFunctionTests',
            arguments: [func.name, testStatus.testFilePath, document.fileName],
            tooltip: 'Run tests for this function'
          })
        );
      } else {
        // No tests - show Generate
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '⚡ Generate Test',
            command: 'qagenai.generateTestForFunction',
            arguments: [document.fileName, func.name, func.line],
            tooltip: `Generate tests for ${func.name}`
          }),
          new vscode.CodeLens(range, {
            title: '⚠️ No tests',
            command: 'qagenai.showNoTestWarning',
            arguments: [func.name],
            tooltip: `${func.name} has no tests`
          })
        );
      }
    }

    return codeLenses;
  }

  /**
   * Extract functions from document
   */
  private extractFunctions(document: vscode.TextDocument): FunctionInfo[] {
    const text = document.getText();
    const functions: FunctionInfo[] = [];
    
    // Patterns to match:
    // 1. export function name(...) 
    // 2. export const name = (...) =>
    // 3. export const name = function(...)
    // 4. export async function name(...)
    // 5. public/private method(...) in classes
    // 6. name(...) { in classes

    const patterns = [
      // Exported functions
      /^(export\s+)?(async\s+)?function\s+(\w+)\s*\(/gm,
      // Exported arrow functions
      /^export\s+(const|let)\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*(:\s*\w+)?\s*=>/gm,
      // Exported function expressions
      /^export\s+(const|let)\s+(\w+)\s*=\s*(async\s+)?function/gm,
      // Class methods (public/private/protected)
      /^\s*(public|private|protected)?\s*(async\s+)?(\w+)\s*\([^)]*\)\s*(:\s*[\w<>[\],\s|]+)?\s*{/gm,
    ];

    // Pattern 1: export function (including export default)
    const funcRegex = /^(export\s+)?(default\s+)?(async\s+)?function\s+(\w+)\s*\(/gm;
    let match;
    while ((match = funcRegex.exec(text)) !== null) {
      const line = document.positionAt(match.index).line;
      const name = match[4];
      // Skip common non-function names
      if (!this.shouldSkipFunction(name)) {
        functions.push({
          name,
          line,
          isExported: !!match[1] || !!match[2],
          isAsync: !!match[3],
          type: 'function'
        });
      }
    }

    // Pattern 2: export const name = () =>
    const arrowRegex = /^(export\s+)?(const|let)\s+(\w+)\s*=\s*(async\s+)?(\([^)]*\)|[a-zA-Z_]\w*)\s*=>/gm;
    while ((match = arrowRegex.exec(text)) !== null) {
      const line = document.positionAt(match.index).line;
      const name = match[3];
      if (!this.shouldSkipFunction(name) && match[1]) { // Only exported
        functions.push({
          name,
          line,
          isExported: true,
          isAsync: !!match[4],
          type: 'arrow'
        });
      }
    }

    // Pattern 3: Class methods
    const methodRegex = /^\s*(public|private|protected|static)?\s*(async\s+)?(\w+)\s*\([^)]*\)\s*(:\s*[^{]+)?\s*\{/gm;
    while ((match = methodRegex.exec(text)) !== null) {
      const line = document.positionAt(match.index).line;
      const name = match[3];
      // Skip constructor and common lifecycle methods
      if (!this.shouldSkipFunction(name) && name !== 'constructor') {
        functions.push({
          name,
          line,
          isExported: false,
          isAsync: !!match[2],
          type: 'method'
        });
      }
    }

    // Dedupe by line number
    const seen = new Set<number>();
    return functions.filter(f => {
      if (seen.has(f.line)) return false;
      seen.add(f.line);
      return true;
    });
  }

  /**
   * Check if function name should be skipped
   */
  private shouldSkipFunction(name: string): boolean {
    const skipNames = [
      'constructor', 'render', 'componentDidMount', 'componentWillUnmount',
      'componentDidUpdate', 'shouldComponentUpdate', 'getDerivedStateFromProps',
      'getSnapshotBeforeUpdate', 'componentDidCatch', 'if', 'for', 'while',
      'switch', 'catch', 'finally', 'get', 'set'
    ];
    return skipNames.includes(name) || name.startsWith('_');
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const name = path.basename(filePath).toLowerCase();
    return (
      name.includes('.test.') ||
      name.includes('.spec.') ||
      name.includes('__tests__') ||
      name.endsWith('.test.ts') ||
      name.endsWith('.test.tsx') ||
      name.endsWith('.test.js') ||
      name.endsWith('.spec.ts') ||
      name.endsWith('.spec.tsx') ||
      name.endsWith('.spec.js')
    );
  }

  /**
   * Find test files for a source file
   */
  private findTestFiles(sourceFilePath: string): string[] {
    if (this.testFileCache.has(sourceFilePath)) {
      return this.testFileCache.get(sourceFilePath)!;
    }

    const testFiles: string[] = [];
    const dir = path.dirname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, path.extname(sourceFilePath));
    const ext = path.extname(sourceFilePath);

    // Common test file patterns
    const testPatterns = [
      `${baseName}.test${ext}`,
      `${baseName}.spec${ext}`,
      `${baseName}.test.tsx`,
      `${baseName}.spec.tsx`,
    ];

    // Check same directory
    for (const pattern of testPatterns) {
      const testPath = path.join(dir, pattern);
      if (fs.existsSync(testPath)) {
        testFiles.push(testPath);
      }
    }

    // Check __tests__ directory
    const testsDir = path.join(dir, '__tests__');
    if (fs.existsSync(testsDir)) {
      for (const pattern of testPatterns) {
        const testPath = path.join(testsDir, pattern);
        if (fs.existsSync(testPath)) {
          testFiles.push(testPath);
        }
      }
    }

    // Check tests directory at same level
    const parentTestsDir = path.join(path.dirname(dir), 'tests');
    if (fs.existsSync(parentTestsDir)) {
      for (const pattern of testPatterns) {
        const testPath = path.join(parentTestsDir, pattern);
        if (fs.existsSync(testPath)) {
          testFiles.push(testPath);
        }
      }
    }

    this.testFileCache.set(sourceFilePath, testFiles);
    return testFiles;
  }

  /**
   * Check if a function has tests
   */
  private checkTestStatus(functionName: string, testFiles: string[]): TestStatus {
    let totalTestCount = 0;
    let foundTestFile: string | undefined;

    for (const testFile of testFiles) {
      const content = this.getTestFileContent(testFile);
      if (!content) continue;

      // Look for test patterns mentioning this function
      const patterns = [
        new RegExp(`(describe|it|test)\\s*\\(['\`"].*${functionName}.*['\`"]`, 'gi'),
        new RegExp(`(describe|it|test)\\s*\\(['\`"][^'"\`]*${functionName}[^'"\`]*['\`"]`, 'gi'),
      ];

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          totalTestCount += matches.length;
          foundTestFile = testFile;
        }
      }
    }

    return {
      hasTest: totalTestCount > 0,
      testCount: totalTestCount,
      testFilePath: foundTestFile
    };
  }

  /**
   * Get test file content (cached)
   */
  private getTestFileContent(testFilePath: string): string | null {
    if (this.testContentCache.has(testFilePath)) {
      return this.testContentCache.get(testFilePath)!;
    }

    try {
      const content = fs.readFileSync(testFilePath, 'utf-8');
      this.testContentCache.set(testFilePath, content);
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Resolve CodeLens
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }
}
