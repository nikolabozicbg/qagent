import * as vscode from 'vscode';
import * as path from 'path';

/**
 * CodeLens data for a specific method/function
 */
interface MethodCoverageData {
  methodName: string;
  lineNumber: number;
  coverageStatus: 'tested' | 'partial' | 'untested';
  testCount?: number;
  edgeCaseCoverage?: string; // e.g. "1/3 edge cases"
  testFilePath?: string;
}

/**
 * File-level coverage data
 */
interface FileCoverageData {
  filePath: string;
  overallCoverage: number; // 0-100
  methods: MethodCoverageData[];
  hasTest: boolean;
  testFilePath?: string;
}

/**
 * CoverageCodeLensProvider - Shows inline coverage indicators above methods and classes
 * 
 * Display format:
 * - Class level: "🟢 75% covered | Run tests | View coverage"
 * - Method level (tested): "🟢 Tested (3 tests) | Run | View tests"
 * - Method level (partial): "🟡 Partially tested (1/3 edge cases) | Improve"
 * - Method level (untested): "🔴 Not tested | Generate test"
 */
export class CoverageCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  // Cache for file coverage data (in-memory for MVP)
  private coverageCache: Map<string, FileCoverageData> = new Map();

  constructor() {}

  /**
   * Update coverage data for a file
   */
  public updateCoverageData(filePath: string, data: FileCoverageData): void {
    this.coverageCache.set(filePath, data);
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Clear all coverage data
   */
  public clearCoverageData(): void {
    this.coverageCache.clear();
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Refresh CodeLens display
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Provide CodeLens items for a document
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    // Get coverage data for this file
    const filePath = document.uri.fsPath;
    const coverageData = this.coverageCache.get(filePath);

    if (!coverageData) {
      // No coverage data available yet - show minimal CodeLens
      return this.provideMinimalCodeLenses(document);
    }

    // Add class-level CodeLens
    const classLens = this.provideClassLevelCodeLens(document, coverageData);
    if (classLens) {
      codeLenses.push(...classLens);
    }

    // Add method-level CodeLens
    const methodLenses = this.provideMethodLevelCodeLenses(document, coverageData);
    codeLenses.push(...methodLenses);

    return codeLenses;
  }

  /**
   * Provide minimal CodeLens when no coverage data is available
   */
  private provideMinimalCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // Find class declarations
    const classRegex = /^(export\s+)?(abstract\s+)?class\s+(\w+)/gm;
    let match;

    while ((match = classRegex.exec(text)) !== null) {
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);
      const className = match[3];

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '$(sync~spin) Analyzing coverage...',
          command: 'qagenai.analyzeCoverage',
          arguments: [document.uri.fsPath]
        })
      );
    }

    return codeLenses;
  }

  /**
   * Provide class-level CodeLens
   */
  private provideClassLevelCodeLens(
    document: vscode.TextDocument,
    coverageData: FileCoverageData
  ): vscode.CodeLens[] | null {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // Find class declarations (TypeScript/JavaScript)
    const classRegex = /^(export\s+)?(abstract\s+)?class\s+(\w+)/gm;
    let match;

    while ((match = classRegex.exec(text)) !== null) {
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);
      const className = match[3];

      // Build class-level CodeLens with multiple commands
      const icon = this.getCoverageIcon(coverageData.overallCoverage);
      const percentage = Math.round(coverageData.overallCoverage);

      // Primary status display
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: `${icon} ${percentage}% covered`,
          command: 'qagenai.showCoverageDetails',
          arguments: [document.uri.fsPath, className],
          tooltip: `Class coverage: ${percentage}%`
        })
      );

      // Run tests action
      if (coverageData.hasTest && coverageData.testFilePath) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: 'Run tests',
            command: 'qagenai.runTestsForFile',
            arguments: [coverageData.testFilePath],
            tooltip: 'Run tests for this class'
          })
        );
      }

      // View coverage action
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: 'View coverage',
          command: 'qagenai.openCoverageReport',
          arguments: [document.uri.fsPath],
          tooltip: 'Open detailed coverage report'
        })
      );
    }

    return codeLenses.length > 0 ? codeLenses : null;
  }

  /**
   * Provide method-level CodeLens
   */
  private provideMethodLevelCodeLenses(
    document: vscode.TextDocument,
    coverageData: FileCoverageData
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];

    for (const method of coverageData.methods) {
      const line = method.lineNumber;
      const range = new vscode.Range(line, 0, line, 0);

      switch (method.coverageStatus) {
        case 'tested':
          codeLenses.push(...this.createTestedMethodLens(range, method));
          break;
        case 'partial':
          codeLenses.push(...this.createPartialMethodLens(range, method));
          break;
        case 'untested':
          codeLenses.push(...this.createUntestedMethodLens(range, method));
          break;
      }
    }

    return codeLenses;
  }

  /**
   * Create CodeLens for tested methods
   * Format: "🟢 Tested (3 tests) | Run | View tests"
   */
  private createTestedMethodLens(
    range: vscode.Range,
    method: MethodCoverageData
  ): vscode.CodeLens[] {
    const icon = '$(testing-passed-icon)'; // Green check icon
    const testCount = method.testCount || 0;

    return [
      new vscode.CodeLens(range, {
        title: `${icon} Tested${testCount > 0 ? ` (${testCount} tests)` : ''}`,
        command: 'qagenai.showMethodTests',
        arguments: [method.methodName, method.testFilePath],
        tooltip: `${method.methodName} has ${testCount} test${testCount !== 1 ? 's' : ''}`
      }),
      new vscode.CodeLens(range, {
        title: 'Run',
        command: 'qagenai.runMethodTests',
        arguments: [method.methodName, method.testFilePath],
        tooltip: 'Run tests for this method'
      }),
      new vscode.CodeLens(range, {
        title: 'View tests',
        command: 'qagenai.navigateToTest',
        arguments: [method.testFilePath, method.methodName],
        tooltip: 'Navigate to test file'
      })
    ];
  }

  /**
   * Create CodeLens for partially tested methods
   * Format: "🟡 Partially tested (1/3 edge cases) | Improve"
   */
  private createPartialMethodLens(
    range: vscode.Range,
    method: MethodCoverageData
  ): vscode.CodeLens[] {
    const icon = '$(testing-skipped-icon)'; // Yellow warning icon
    const edgeCaseInfo = method.edgeCaseCoverage || 'incomplete coverage';

    return [
      new vscode.CodeLens(range, {
        title: `${icon} Partially tested (${edgeCaseInfo})`,
        command: 'qagenai.showMethodCoverage',
        arguments: [method.methodName],
        tooltip: `${method.methodName} needs more test coverage`
      }),
      new vscode.CodeLens(range, {
        title: 'Improve',
        command: 'qagenai.improveMethodTests',
        arguments: [method.methodName, method.testFilePath],
        tooltip: 'Generate additional test cases'
      })
    ];
  }

  /**
   * Create CodeLens for untested methods
   * Format: "🔴 Not tested | Generate test"
   */
  private createUntestedMethodLens(
    range: vscode.Range,
    method: MethodCoverageData
  ): vscode.CodeLens[] {
    const icon = '$(testing-failed-icon)'; // Red X icon

    return [
      new vscode.CodeLens(range, {
        title: `${icon} Not tested`,
        command: 'qagenai.showMethodInfo',
        arguments: [method.methodName],
        tooltip: `${method.methodName} has no tests`
      }),
      new vscode.CodeLens(range, {
        title: 'Generate test',
        command: 'qagenai.generateTestForMethod',
        arguments: [method.methodName],
        tooltip: 'Generate tests for this method'
      })
    ];
  }

  /**
   * Get coverage icon based on percentage
   */
  private getCoverageIcon(percentage: number): string {
    if (percentage >= 80) {
      return '$(testing-passed-icon)'; // Green check
    } else if (percentage >= 40) {
      return '$(testing-skipped-icon)'; // Yellow warning
    } else {
      return '$(testing-failed-icon)'; // Red X
    }
  }

  /**
   * Resolve CodeLens (optional - can be used for lazy loading)
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }
}
