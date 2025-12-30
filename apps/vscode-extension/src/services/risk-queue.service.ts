import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  RiskQueueItem,
  RiskFactor,
  RiskPriority,
  CRITICAL_PATH_KEYWORDS,
  EXCLUDED_DIRS,
  getPriorityFromScore,
} from '../types/risk-queue.types';

/**
 * RiskQueueService - Analyzes source files and calculates risk scores
 * 
 * Risk Score Formula (0-100):
 * - No test file: +40 points
 * - Lines of code: up to +30 points (LOC / 20, max 30)
 * - Import count: up to +20 points (imports * 3, max 20)
 * - Critical path: +10 points (auth, payment, etc.)
 */
export class RiskQueueService {
  private cachedResults?: RiskQueueItem[];
  private lastAnalysis?: Date;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Analyze workspace and return risk queue
   */
  async analyzeWorkspace(forceRefresh = false): Promise<RiskQueueItem[]> {
    // Return cached if valid
    if (!forceRefresh && this.cachedResults && this.lastAnalysis) {
      const age = Date.now() - this.lastAnalysis.getTime();
      if (age < this.CACHE_TTL_MS) {
        return this.cachedResults;
      }
    }

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return [];
    }

    const sourceFiles = await this.findSourceFiles(workspaceRoot);
    const testFiles = await this.findTestFiles(workspaceRoot);
    
    const results: RiskQueueItem[] = [];
    
    for (const filePath of sourceFiles) {
      const item = await this.analyzeFile(filePath, workspaceRoot, testFiles);
      if (item && item.riskScore > 0) {
        results.push(item);
      }
    }

    // Sort by risk score descending
    results.sort((a, b) => b.riskScore - a.riskScore);

    this.cachedResults = results;
    this.lastAnalysis = new Date();

    return results;
  }

  /**
   * Get top N risky files
   */
  async getTopRiskFiles(limit = 10): Promise<RiskQueueItem[]> {
    const all = await this.analyzeWorkspace();
    return all.slice(0, limit);
  }

  /**
   * Get risk summary for dashboard
   */
  async getRiskSummary(): Promise<{
    totalItems: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    topItems: RiskQueueItem[];
  }> {
    const items = await this.analyzeWorkspace();
    
    return {
      totalItems: items.length,
      criticalCount: items.filter(i => i.priority === 'critical').length,
      highCount: items.filter(i => i.priority === 'high').length,
      mediumCount: items.filter(i => i.priority === 'medium').length,
      lowCount: items.filter(i => i.priority === 'low').length,
      topItems: items.slice(0, 5),
    };
  }

  /**
   * Refresh cache
   */
  async refresh(): Promise<RiskQueueItem[]> {
    return this.analyzeWorkspace(true);
  }

  // ============================================
  // Private Methods
  // ============================================

  private async findSourceFiles(root: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip excluded directories
            if (!EXCLUDED_DIRS.includes(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            // Include TypeScript/JavaScript source files
            const ext = path.extname(entry.name).toLowerCase();
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
              // Exclude test files and config files
              if (!this.isTestFile(entry.name) && !this.isConfigFile(entry.name)) {
                files.push(fullPath);
              }
            }
          }
        }
      } catch {
        // Ignore permission errors
      }
    };

    walk(root);
    return files;
  }

  private async findTestFiles(root: string): Promise<Set<string>> {
    const testFiles = new Set<string>();
    
    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile() && this.isTestFile(entry.name)) {
            // Store the base name for matching
            const baseName = this.getBaseNameForTest(entry.name);
            testFiles.add(baseName);
            testFiles.add(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    walk(root);
    return testFiles;
  }

  private isTestFile(fileName: string): boolean {
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(fileName) ||
           fileName.includes('__tests__');
  }

  private isConfigFile(fileName: string): boolean {
    const configPatterns = [
      /^\./, // Hidden files
      /config\./i,
      /\.config\./,
      /\.d\.ts$/, // Type definitions
      /index\.(ts|js)$/, // Index files (usually just re-exports)
    ];
    return configPatterns.some(p => p.test(fileName));
  }

  private getBaseNameForTest(testFileName: string): string {
    // Convert "Button.test.tsx" to "Button"
    return testFileName
      .replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '')
      .toLowerCase();
  }

  private async analyzeFile(
    filePath: string,
    workspaceRoot: string,
    testFiles: Set<string>
  ): Promise<RiskQueueItem | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(workspaceRoot, filePath);
      
      // Calculate metrics
      const linesOfCode = content.split('\n').length;
      const importCount = this.countImports(content);
      const hasTest = this.hasTestFile(fileName, relativePath, testFiles);
      const isInCriticalPath = this.isInCriticalPath(filePath, content);

      // Calculate risk factors
      const factors: RiskFactor[] = [];
      let totalScore = 0;

      // Factor 1: No test coverage (40 points max)
      if (!hasTest) {
        const score = 40;
        totalScore += score;
        factors.push({
          name: 'No Test',
          score,
          maxScore: 40,
          description: 'No corresponding test file found',
        });
      }

      // Factor 2: File size (30 points max)
      const sizeScore = Math.min(Math.floor(linesOfCode / 20), 30);
      if (sizeScore > 0) {
        totalScore += sizeScore;
        factors.push({
          name: 'File Size',
          score: sizeScore,
          maxScore: 30,
          description: `${linesOfCode} lines of code`,
        });
      }

      // Factor 3: Dependencies (20 points max)
      const depScore = Math.min(importCount * 3, 20);
      if (depScore > 0) {
        totalScore += depScore;
        factors.push({
          name: 'Dependencies',
          score: depScore,
          maxScore: 20,
          description: `${importCount} imports`,
        });
      }

      // Factor 4: Critical path (10 points max)
      if (isInCriticalPath) {
        totalScore += 10;
        factors.push({
          name: 'Critical Path',
          score: 10,
          maxScore: 10,
          description: 'Contains auth/payment/security logic',
        });
      }

      // Cap at 100
      totalScore = Math.min(totalScore, 100);

      return {
        id: this.generateId(filePath),
        name: fileName,
        path: filePath,
        relativePath,
        riskScore: totalScore,
        priority: getPriorityFromScore(totalScore),
        factors,
        hasTest,
        linesOfCode,
        importCount,
      };
    } catch {
      return null;
    }
  }

  private countImports(content: string): number {
    const importMatches = content.match(/^import\s+/gm) || [];
    const requireMatches = content.match(/require\s*\(/g) || [];
    return importMatches.length + requireMatches.length;
  }

  private hasTestFile(
    fileName: string,
    relativePath: string,
    testFiles: Set<string>
  ): boolean {
    // Check various test file naming conventions
    const baseName = fileName.replace(/\.(ts|tsx|js|jsx)$/, '').toLowerCase();
    
    // Check if test file exists with common patterns
    if (testFiles.has(baseName)) return true;
    if (testFiles.has(`${baseName}.test`)) return true;
    if (testFiles.has(`${baseName}.spec`)) return true;
    
    // Check __tests__ directory
    const dirName = path.dirname(relativePath);
    const testInDir = `${dirName}/__tests__/${baseName}`;
    if (testFiles.has(testInDir.toLowerCase())) return true;

    return false;
  }

  private isInCriticalPath(filePath: string, content: string): boolean {
    const lowerPath = filePath.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    return CRITICAL_PATH_KEYWORDS.some(keyword => 
      lowerPath.includes(keyword) || 
      lowerContent.includes(keyword)
    );
  }

  private generateId(filePath: string): string {
    // Create a stable ID from file path
    return Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '').slice(0, 12);
  }
}
