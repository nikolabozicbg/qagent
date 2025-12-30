import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { QuickScanResults, RiskFile } from '../types';

/**
 * FileScannerService - Scans workspace for files and coverage
 */
export class FileScannerService {
  
  private readonly SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
  private readonly TEST_PATTERNS = [
    /\.spec\.(ts|tsx|js|jsx)$/,
    /\.test\.(ts|tsx|js|jsx)$/,
    /__tests__\//,
    /\.e2e\.(ts|tsx|js|jsx)$/,
  ];
  private readonly IGNORE_DIRS = [
    'node_modules', 'dist', 'build', '.git', 'coverage',
    '.next', '.nuxt', '.cache', 'out', 'lib'
  ];

  /**
   * Run a quick scan of the workspace
   */
  async quickScan(workspaceRoot?: string): Promise<QuickScanResults> {
    const root = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
      return this.emptyResults();
    }

    const startTime = Date.now();
    const allFiles: string[] = [];
    const sourceFiles: string[] = [];
    const testFiles: string[] = [];

    // Recursively scan directory
    await this.scanDirectory(root, allFiles, sourceFiles, testFiles);

    // Calculate risk for source files without tests
    const riskFiles = await this.calculateRiskFiles(root, sourceFiles, testFiles);

    // Try to parse coverage if available
    const coverage = await this.parseCoverage(root);

    return {
      totalFiles: allFiles.length,
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
      coverageBaseline: coverage,
      riskFiles: riskFiles.slice(0, 10), // Top 10 risk files
      scanDuration: Date.now() - startTime,
    };
  }

  /**
   * Recursively scan directory for files
   */
  private async scanDirectory(
    dir: string,
    allFiles: string[],
    sourceFiles: string[],
    testFiles: string[]
  ): Promise<void> {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip ignored directories
          if (this.IGNORE_DIRS.includes(entry.name)) continue;
          await this.scanDirectory(fullPath, allFiles, sourceFiles, testFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          
          if (this.SOURCE_EXTENSIONS.includes(ext)) {
            allFiles.push(fullPath);
            
            // Check if it's a test file
            const isTest = this.TEST_PATTERNS.some(pattern => pattern.test(fullPath));
            if (isTest) {
              testFiles.push(fullPath);
            } else {
              sourceFiles.push(fullPath);
            }
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  /**
   * Calculate risk score for files
   */
  private async calculateRiskFiles(
    root: string,
    sourceFiles: string[],
    testFiles: string[]
  ): Promise<RiskFile[]> {
    const riskFiles: RiskFile[] = [];

    // Create a map of test coverage
    const testedFiles = new Set<string>();
    for (const testFile of testFiles) {
      // Try to find corresponding source file
      const baseName = path.basename(testFile)
        .replace(/\.(spec|test|e2e)\.(ts|tsx|js|jsx)$/, '.$2');
      testedFiles.add(baseName);
    }

    for (const sourceFile of sourceFiles) {
      const relativePath = path.relative(root, sourceFile);
      const fileName = path.basename(sourceFile);
      
      // Skip index files and types
      if (fileName === 'index.ts' || fileName.endsWith('.d.ts')) continue;

      // Calculate risk factors
      const hasTest = testedFiles.has(fileName);
      const fileSize = this.getFileSize(sourceFile);
      const complexity = await this.estimateComplexity(sourceFile);
      const isBusinessCritical = this.isBusinessCritical(relativePath);

      // Risk score calculation
      let riskScore = 0;
      
      // No test coverage: +40
      if (!hasTest) riskScore += 40;
      
      // Large file (>200 lines): +20
      if (fileSize > 200) riskScore += 20;
      
      // High complexity: +20
      if (complexity > 10) riskScore += 20;
      
      // Business critical path: +20
      if (isBusinessCritical) riskScore += 20;

      if (riskScore > 30) {
        const reasons: string[] = [];
        if (!hasTest) reasons.push('No tests');
        if (fileSize > 200) reasons.push('Large file');
        if (complexity > 10) reasons.push('High complexity');
        if (isBusinessCritical) reasons.push('Business critical');

        riskFiles.push({
          path: relativePath,
          name: fileName,
          coverage: hasTest ? 50 : 0, // Simplified
          riskScore,
          reason: reasons.join(', '),
        });
      }
    }

    // Sort by risk score descending
    return riskFiles.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Get file size in lines
   */
  private getFileSize(filePath: string): number {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  /**
   * Estimate cyclomatic complexity (simplified)
   */
  private async estimateComplexity(filePath: string): Promise<number> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Count complexity indicators
      const ifCount = (content.match(/\bif\s*\(/g) || []).length;
      const forCount = (content.match(/\bfor\s*\(/g) || []).length;
      const whileCount = (content.match(/\bwhile\s*\(/g) || []).length;
      const switchCount = (content.match(/\bswitch\s*\(/g) || []).length;
      const caseCount = (content.match(/\bcase\s+/g) || []).length;
      const catchCount = (content.match(/\bcatch\s*\(/g) || []).length;
      const ternaryCount = (content.match(/\?.*:/g) || []).length;
      const andOrCount = (content.match(/&&|\|\|/g) || []).length;

      return 1 + ifCount + forCount + whileCount + switchCount + 
             caseCount + catchCount + ternaryCount + andOrCount;
    } catch {
      return 1;
    }
  }

  /**
   * Check if file is in business-critical path
   */
  private isBusinessCritical(relativePath: string): boolean {
    const criticalPatterns = [
      /payment/i, /checkout/i, /auth/i, /login/i,
      /order/i, /cart/i, /billing/i, /subscription/i,
      /user/i, /account/i, /security/i
    ];
    return criticalPatterns.some(pattern => pattern.test(relativePath));
  }

  /**
   * Try to parse coverage report
   */
  private async parseCoverage(root: string): Promise<number> {
    const coveragePaths = [
      'coverage/coverage-summary.json',
      'coverage/lcov-report/index.html',
      'coverage-final.json',
    ];

    for (const coveragePath of coveragePaths) {
      const fullPath = path.join(root, coveragePath);
      if (fs.existsSync(fullPath)) {
        try {
          if (coveragePath.endsWith('.json')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const data = JSON.parse(content);
            
            // coverage-summary.json format
            if (data.total?.lines?.pct !== undefined) {
              return Math.round(data.total.lines.pct);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // No coverage found, estimate based on test ratio
    return 0;
  }

  private emptyResults(): QuickScanResults {
    return {
      totalFiles: 0,
      sourceFiles: 0,
      testFiles: 0,
      coverageBaseline: 0,
      riskFiles: [],
      scanDuration: 0,
    };
  }
}
