import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Line coverage data
 */
export interface LineCoverage {
  lineNumber: number;
  hits: number;
  isCovered: boolean;
}

/**
 * Function/method coverage data
 */
export interface FunctionCoverage {
  name: string;
  lineNumber: number;
  hits: number;
  isCovered: boolean;
}

/**
 * Branch coverage data
 */
export interface BranchCoverage {
  lineNumber: number;
  branchNumber: number;
  taken: number;
  isCovered: boolean;
}

/**
 * File coverage summary
 */
export interface FileCoverageSummary {
  filePath: string;
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
  lineDetails: LineCoverage[];
  functionDetails: FunctionCoverage[];
  branchDetails: BranchCoverage[];
}

/**
 * Workspace coverage summary
 */
export interface WorkspaceCoverageSummary {
  overall: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  files: Map<string, FileCoverageSummary>;
}

/**
 * CoverageParserService - Parses coverage reports from Jest, Vitest, c8, Istanbul, etc.
 * 
 * Supports:
 * - LCOV format (coverage/lcov.info)
 * - JSON summary (coverage/coverage-summary.json)
 * - Istanbul JSON (coverage/coverage-final.json)
 * - Clover XML (coverage/clover.xml)
 */
export class CoverageParserService {
  /**
   * Find coverage files in workspace
   */
  public async findCoverageFiles(workspacePath: string): Promise<{
    lcov?: string;
    jsonSummary?: string;
    jsonFinal?: string;
    clover?: string;
  }> {
    const coveragePaths = [
      'coverage',
      '.coverage',
      'test-results',
      'coverage-reports'
    ];

    const result: {
      lcov?: string;
      jsonSummary?: string;
      jsonFinal?: string;
      clover?: string;
    } = {};

    for (const coverageDir of coveragePaths) {
      const basePath = path.join(workspacePath, coverageDir);
      
      if (fs.existsSync(basePath)) {
        // Check for LCOV
        const lcovPath = path.join(basePath, 'lcov.info');
        if (fs.existsSync(lcovPath)) {
          result.lcov = lcovPath;
        }

        // Check for JSON summary
        const jsonSummaryPath = path.join(basePath, 'coverage-summary.json');
        if (fs.existsSync(jsonSummaryPath)) {
          result.jsonSummary = jsonSummaryPath;
        }

        // Check for JSON final (Istanbul)
        const jsonFinalPath = path.join(basePath, 'coverage-final.json');
        if (fs.existsSync(jsonFinalPath)) {
          result.jsonFinal = jsonFinalPath;
        }

        // Check for Clover XML
        const cloverPath = path.join(basePath, 'clover.xml');
        if (fs.existsSync(cloverPath)) {
          result.clover = cloverPath;
        }
      }
    }

    return result;
  }

  /**
   * Parse coverage from workspace
   * Auto-detects format and returns parsed data
   */
  public async parseCoverage(workspacePath: string): Promise<WorkspaceCoverageSummary | null> {
    const coverageFiles = await this.findCoverageFiles(workspacePath);

    // Priority: JSON Summary > LCOV > JSON Final > Clover
    if (coverageFiles.jsonSummary) {
      return this.parseJsonSummary(coverageFiles.jsonSummary);
    } else if (coverageFiles.lcov) {
      return this.parseLcov(coverageFiles.lcov, workspacePath);
    } else if (coverageFiles.jsonFinal) {
      return this.parseJsonFinal(coverageFiles.jsonFinal);
    } else if (coverageFiles.clover) {
      // TODO: Implement Clover XML parser
      console.warn('Clover XML parsing not yet implemented');
      return null;
    }

    return null;
  }

  /**
   * Parse JSON summary format (coverage-summary.json)
   * Format used by Istanbul, Jest, Vitest
   */
  private parseJsonSummary(filePath: string): WorkspaceCoverageSummary | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      const files = new Map<string, FileCoverageSummary>();
      let totalLines = 0;
      let coveredLines = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      let totalBranches = 0;
      let coveredBranches = 0;
      let totalStatements = 0;
      let coveredStatements = 0;

      // Process each file
      for (const [filePath, fileData] of Object.entries(data)) {
        if (filePath === 'total') continue; // Skip total entry

        const summary = fileData as any;

        // Calculate percentages
        const linesPercentage = summary.lines.total > 0
          ? (summary.lines.covered / summary.lines.total) * 100
          : 0;
        const functionsPercentage = summary.functions.total > 0
          ? (summary.functions.covered / summary.functions.total) * 100
          : 0;
        const branchesPercentage = summary.branches.total > 0
          ? (summary.branches.covered / summary.branches.total) * 100
          : 0;
        const statementsPercentage = summary.statements.total > 0
          ? (summary.statements.covered / summary.statements.total) * 100
          : 0;

        files.set(filePath, {
          filePath,
          lines: {
            total: summary.lines.total,
            covered: summary.lines.covered,
            percentage: Math.round(linesPercentage)
          },
          functions: {
            total: summary.functions.total,
            covered: summary.functions.covered,
            percentage: Math.round(functionsPercentage)
          },
          branches: {
            total: summary.branches.total,
            covered: summary.branches.covered,
            percentage: Math.round(branchesPercentage)
          },
          statements: {
            total: summary.statements.total,
            covered: summary.statements.covered,
            percentage: Math.round(statementsPercentage)
          },
          lineDetails: [], // Not available in summary format
          functionDetails: [], // Not available in summary format
          branchDetails: [] // Not available in summary format
        });

        // Accumulate totals
        totalLines += summary.lines.total;
        coveredLines += summary.lines.covered;
        totalFunctions += summary.functions.total;
        coveredFunctions += summary.functions.covered;
        totalBranches += summary.branches.total;
        coveredBranches += summary.branches.covered;
        totalStatements += summary.statements.total;
        coveredStatements += summary.statements.covered;
      }

      return {
        overall: {
          lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
          functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
          branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
          statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0
        },
        files
      };
    } catch (error) {
      console.error('Failed to parse JSON summary:', error);
      return null;
    }
  }

  /**
   * Parse LCOV format (lcov.info)
   * Format used by Jest, Vitest, c8
   */
  private parseLcov(filePath: string, workspacePath: string): WorkspaceCoverageSummary | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const files = new Map<string, FileCoverageSummary>();

      let currentFile: string | null = null;
      let currentFileData: Partial<FileCoverageSummary> = {};
      let lineDetails: LineCoverage[] = [];
      let functionDetails: FunctionCoverage[] = [];
      let branchDetails: BranchCoverage[] = [];

      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // New file record
        if (trimmed.startsWith('SF:')) {
          // Save previous file data
          if (currentFile && currentFileData.lines) {
            files.set(currentFile, {
              filePath: currentFile,
              lines: currentFileData.lines!,
              functions: currentFileData.functions!,
              branches: currentFileData.branches!,
              statements: currentFileData.statements || currentFileData.lines!,
              lineDetails,
              functionDetails,
              branchDetails
            } as FileCoverageSummary);
          }

          // Start new file
          currentFile = trimmed.substring(3);
          currentFileData = {};
          lineDetails = [];
          functionDetails = [];
          branchDetails = [];
        }

        // Function name
        else if (trimmed.startsWith('FN:')) {
          const parts = trimmed.substring(3).split(',');
          const lineNumber = parseInt(parts[0], 10);
          const functionName = parts[1] || 'anonymous';
          functionDetails.push({
            name: functionName,
            lineNumber,
            hits: 0, // Will be updated by FNDA
            isCovered: false
          });
        }

        // Function data (execution count)
        else if (trimmed.startsWith('FNDA:')) {
          const parts = trimmed.substring(5).split(',');
          const hits = parseInt(parts[0], 10);
          const functionName = parts[1];
          const func = functionDetails.find(f => f.name === functionName);
          if (func) {
            func.hits = hits;
            func.isCovered = hits > 0;
          }
        }

        // Functions found/hit
        else if (trimmed.startsWith('FNF:')) {
          const total = parseInt(trimmed.substring(4), 10);
          currentFileData.functions = { total, covered: 0, percentage: 0 };
        }
        else if (trimmed.startsWith('FNH:')) {
          const covered = parseInt(trimmed.substring(4), 10);
          if (currentFileData.functions) {
            currentFileData.functions.covered = covered;
            currentFileData.functions.percentage = Math.round((covered / currentFileData.functions.total) * 100);
          }
        }

        // Branch data
        else if (trimmed.startsWith('BRDA:')) {
          const parts = trimmed.substring(5).split(',');
          const lineNumber = parseInt(parts[0], 10);
          const branchNumber = parseInt(parts[1], 10);
          const taken = parts[3] === '-' ? 0 : parseInt(parts[3], 10);
          branchDetails.push({
            lineNumber,
            branchNumber,
            taken,
            isCovered: taken > 0
          });
        }

        // Branches found/hit
        else if (trimmed.startsWith('BRF:')) {
          const total = parseInt(trimmed.substring(4), 10);
          currentFileData.branches = { total, covered: 0, percentage: 0 };
        }
        else if (trimmed.startsWith('BRH:')) {
          const covered = parseInt(trimmed.substring(4), 10);
          if (currentFileData.branches) {
            currentFileData.branches.covered = covered;
            currentFileData.branches.percentage = Math.round((covered / currentFileData.branches.total) * 100);
          }
        }

        // Line data
        else if (trimmed.startsWith('DA:')) {
          const parts = trimmed.substring(3).split(',');
          const lineNumber = parseInt(parts[0], 10);
          const hits = parseInt(parts[1], 10);
          lineDetails.push({
            lineNumber,
            hits,
            isCovered: hits > 0
          });
        }

        // Lines found/hit
        else if (trimmed.startsWith('LF:')) {
          const total = parseInt(trimmed.substring(3), 10);
          currentFileData.lines = { total, covered: 0, percentage: 0 };
        }
        else if (trimmed.startsWith('LH:')) {
          const covered = parseInt(trimmed.substring(3), 10);
          if (currentFileData.lines) {
            currentFileData.lines.covered = covered;
            currentFileData.lines.percentage = Math.round((covered / currentFileData.lines.total) * 100);
          }
        }

        // End of record
        else if (trimmed === 'end_of_record') {
          if (currentFile && currentFileData.lines) {
            files.set(currentFile, {
              filePath: currentFile,
              lines: currentFileData.lines!,
              functions: currentFileData.functions || { total: 0, covered: 0, percentage: 0 },
              branches: currentFileData.branches || { total: 0, covered: 0, percentage: 0 },
              statements: currentFileData.statements || currentFileData.lines!,
              lineDetails,
              functionDetails,
              branchDetails
            } as FileCoverageSummary);
          }
          currentFile = null;
          currentFileData = {};
          lineDetails = [];
          functionDetails = [];
          branchDetails = [];
        }
      }

      // Calculate overall coverage
      let totalLines = 0;
      let coveredLines = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      let totalBranches = 0;
      let coveredBranches = 0;

      for (const [_, fileData] of files) {
        totalLines += fileData.lines.total;
        coveredLines += fileData.lines.covered;
        totalFunctions += fileData.functions.total;
        coveredFunctions += fileData.functions.covered;
        totalBranches += fileData.branches.total;
        coveredBranches += fileData.branches.covered;
      }

      return {
        overall: {
          lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
          functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
          branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
          statements: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
        },
        files
      };
    } catch (error) {
      console.error('Failed to parse LCOV:', error);
      return null;
    }
  }

  /**
   * Parse Istanbul JSON final format (coverage-final.json)
   */
  private parseJsonFinal(filePath: string): WorkspaceCoverageSummary | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      const files = new Map<string, FileCoverageSummary>();
      let totalLines = 0;
      let coveredLines = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      let totalBranches = 0;
      let coveredBranches = 0;
      let totalStatements = 0;
      let coveredStatements = 0;

      // Process each file
      for (const [filePathKey, fileData] of Object.entries(data)) {
        const coverage = fileData as any;

        // Process lines
        const lineDetails: LineCoverage[] = [];
        const lineMap = coverage.statementMap || {};
        const lineCounts = coverage.s || {};
        for (const [statementId, count] of Object.entries(lineCounts)) {
          const statement = lineMap[statementId];
          if (statement && statement.start) {
            lineDetails.push({
              lineNumber: statement.start.line,
              hits: count as number,
              isCovered: (count as number) > 0
            });
          }
        }

        // Process functions
        const functionDetails: FunctionCoverage[] = [];
        const functionMap = coverage.fnMap || {};
        const functionCounts = coverage.f || {};
        for (const [functionId, count] of Object.entries(functionCounts)) {
          const func = functionMap[functionId];
          if (func) {
            functionDetails.push({
              name: func.name || 'anonymous',
              lineNumber: func.decl.start.line,
              hits: count as number,
              isCovered: (count as number) > 0
            });
          }
        }

        // Process branches
        const branchDetails: BranchCoverage[] = [];
        const branchMap = coverage.branchMap || {};
        const branchCounts = coverage.b || {};
        for (const [branchId, counts] of Object.entries(branchCounts)) {
          const branch = branchMap[branchId];
          if (branch) {
            (counts as number[]).forEach((count, index) => {
              branchDetails.push({
                lineNumber: branch.loc.start.line,
                branchNumber: index,
                taken: count,
                isCovered: count > 0
              });
            });
          }
        }

        // Calculate totals
        const linesCovered = lineDetails.filter(l => l.isCovered).length;
        const linesTotal = lineDetails.length;
        const functionsCovered = functionDetails.filter(f => f.isCovered).length;
        const functionsTotal = functionDetails.length;
        const branchesCovered = branchDetails.filter(b => b.isCovered).length;
        const branchesTotal = branchDetails.length;

        files.set(filePathKey, {
          filePath: filePathKey,
          lines: {
            total: linesTotal,
            covered: linesCovered,
            percentage: linesTotal > 0 ? Math.round((linesCovered / linesTotal) * 100) : 0
          },
          functions: {
            total: functionsTotal,
            covered: functionsCovered,
            percentage: functionsTotal > 0 ? Math.round((functionsCovered / functionsTotal) * 100) : 0
          },
          branches: {
            total: branchesTotal,
            covered: branchesCovered,
            percentage: branchesTotal > 0 ? Math.round((branchesCovered / branchesTotal) * 100) : 0
          },
          statements: {
            total: linesTotal,
            covered: linesCovered,
            percentage: linesTotal > 0 ? Math.round((linesCovered / linesTotal) * 100) : 0
          },
          lineDetails,
          functionDetails,
          branchDetails
        });

        // Accumulate
        totalLines += linesTotal;
        coveredLines += linesCovered;
        totalFunctions += functionsTotal;
        coveredFunctions += functionsCovered;
        totalBranches += branchesTotal;
        coveredBranches += branchesCovered;
      }

      return {
        overall: {
          lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
          functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
          branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
          statements: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
        },
        files
      };
    } catch (error) {
      console.error('Failed to parse JSON final:', error);
      return null;
    }
  }

  /**
   * Get coverage for specific file
   */
  public async getFileCoverage(
    workspacePath: string,
    filePath: string
  ): Promise<FileCoverageSummary | null> {
    const coverageData = await this.parseCoverage(workspacePath);
    if (!coverageData) return null;

    return coverageData.files.get(filePath) || null;
  }
}
