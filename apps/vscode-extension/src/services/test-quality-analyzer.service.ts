import * as fs from 'fs';
import * as path from 'path';

/**
 * Quality issue severity
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * Individual test quality issue
 */
export interface TestQualityIssue {
  id: string;
  severity: IssueSeverity;
  message: string;
  line?: number;
  suggestion?: string;
}

/**
 * Quality analysis for a single test
 */
export interface TestAnalysis {
  name: string;
  line: number;
  score: number; // 0-100
  issues: TestQualityIssue[];
  status: 'good' | 'warning' | 'error';
}

/**
 * Quality analysis for a test file
 */
export interface TestFileAnalysis {
  filePath: string;
  fileName: string;
  tests: TestAnalysis[];
  totalScore: number;
  goodCount: number;
  warningCount: number;
  errorCount: number;
}

/**
 * Overall quality report
 */
export interface TestQualityReport {
  overallScore: number;
  totalTests: number;
  goodTests: number;
  warningTests: number;
  errorTests: number;
  files: TestFileAnalysis[];
  topIssues: TestQualityIssue[];
}

/**
 * TestQualityAnalyzerService
 * 
 * Analyzes test files for quality issues:
 * - Empty tests
 * - Missing assertions
 * - Placeholder tests (expect(true).toBe(true))
 * - Vague test names
 * - Missing edge cases
 */
export class TestQualityAnalyzerService {
  
  /**
   * Analyze all test files in workspace
   */
  async analyzeWorkspace(workspacePath: string): Promise<TestQualityReport> {
    const testFiles = this.findTestFiles(workspacePath);
    const fileAnalyses: TestFileAnalysis[] = [];
    
    for (const filePath of testFiles) {
      const analysis = await this.analyzeTestFile(filePath);
      if (analysis.tests.length > 0) {
        fileAnalyses.push(analysis);
      }
    }
    
    return this.buildReport(fileAnalyses);
  }
  
  /**
   * Find all test files in workspace
   */
  private findTestFiles(workspacePath: string): string[] {
    const testFiles: string[] = [];
    const testPatterns = ['.test.', '.spec.', '__tests__'];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    const walkDir = (dir: string) => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Skip node_modules and hidden folders
            if (!file.startsWith('.') && file !== 'node_modules') {
              walkDir(fullPath);
            }
          } else {
            // Check if it's a test file
            const isTestFile = testPatterns.some(p => file.includes(p)) &&
                              extensions.some(e => file.endsWith(e));
            if (isTestFile) {
              testFiles.push(fullPath);
            }
          }
        }
      } catch (e) {
        // Ignore permission errors
      }
    };
    
    walkDir(workspacePath);
    return testFiles;
  }
  
  /**
   * Analyze a single test file
   */
  async analyzeTestFile(filePath: string): Promise<TestFileAnalysis> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const tests = this.extractTests(content);
    
    let goodCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let totalScore = 0;
    
    const analyzedTests: TestAnalysis[] = [];
    
    for (const test of tests) {
      const analysis = this.analyzeTest(test.name, test.body, test.line);
      analyzedTests.push(analysis);
      totalScore += analysis.score;
      
      if (analysis.status === 'good') goodCount++;
      else if (analysis.status === 'warning') warningCount++;
      else errorCount++;
    }
    
    return {
      filePath,
      fileName,
      tests: analyzedTests,
      totalScore: tests.length > 0 ? Math.round(totalScore / tests.length) : 100,
      goodCount,
      warningCount,
      errorCount
    };
  }
  
  /**
   * Extract individual tests from file content
   */
  private extractTests(content: string): Array<{ name: string; body: string; line: number }> {
    const tests: Array<{ name: string; body: string; line: number }> = [];
    
    // Match test(), it(), and test.only(), it.only()
    const testRegex = /(?:test|it)(?:\.only)?\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
    
    let match;
    const lines = content.split('\n');
    
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const startIndex = match.index;
      
      // Find line number
      const beforeMatch = content.substring(0, startIndex);
      const lineNumber = beforeMatch.split('\n').length;
      
      // Extract test body (find matching closing brace)
      const bodyStart = match.index + match[0].length;
      const body = this.extractBody(content, bodyStart);
      
      tests.push({
        name: testName,
        body,
        line: lineNumber
      });
    }
    
    return tests;
  }
  
  /**
   * Extract body between braces
   */
  private extractBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let i = startIndex;
    
    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') braceCount--;
      i++;
    }
    
    return content.substring(startIndex, i - 1);
  }
  
  /**
   * Analyze a single test
   */
  private analyzeTest(name: string, body: string, line: number): TestAnalysis {
    const issues: TestQualityIssue[] = [];
    let score = 100;
    
    // Check 1: Empty test body
    const trimmedBody = body.trim();
    if (trimmedBody.length === 0 || trimmedBody === '// TODO' || trimmedBody.startsWith('// ')) {
      issues.push({
        id: 'empty-test',
        severity: 'error',
        message: 'Empty test body',
        line,
        suggestion: 'Add test implementation with assertions'
      });
      score -= 50;
    }
    
    // Check 2: No assertions
    const hasExpect = /expect\s*\(/.test(body);
    const hasAssert = /assert[\.\(]/.test(body);
    const hasAssertion = hasExpect || hasAssert;
    
    if (!hasAssertion && trimmedBody.length > 0) {
      issues.push({
        id: 'no-assertions',
        severity: 'error',
        message: 'Test has no assertions',
        line,
        suggestion: 'Add expect() or assert() to verify behavior'
      });
      score -= 40;
    }
    
    // Check 3: Placeholder assertion
    const placeholderPatterns = [
      /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/,
      /expect\s*\(\s*1\s*\)\s*\.\s*toBe\s*\(\s*1\s*\)/,
      /expect\s*\(\s*['"`].*['"`]\s*\)\s*\.\s*toBe\s*\(\s*['"`].*['"`]\s*\)/,
    ];
    
    const isPlaceholder = placeholderPatterns.some(p => p.test(body));
    if (isPlaceholder) {
      issues.push({
        id: 'placeholder-test',
        severity: 'warning',
        message: 'Placeholder assertion detected',
        line,
        suggestion: 'Replace with meaningful assertions that test actual behavior'
      });
      score -= 30;
    }
    
    // Check 4: Vague test name
    const vagueNames = [
      /^should work$/i,
      /^works$/i,
      /^test$/i,
      /^it works$/i,
      /^basic test$/i,
      /^placeholder$/i,
      /^todo$/i,
    ];
    
    const isVagueName = vagueNames.some(p => p.test(name.trim()));
    if (isVagueName) {
      issues.push({
        id: 'vague-name',
        severity: 'warning',
        message: `Vague test name: "${name}"`,
        line,
        suggestion: 'Use descriptive name like "should return X when Y"'
      });
      score -= 15;
    }
    
    // Check 5: Missing error handling test (info level)
    const testsErrorCase = /error|throw|reject|fail|invalid|null|undefined|empty/i.test(name);
    const bodyHasErrorHandling = /throw|catch|reject|toThrow|rejects/i.test(body);
    
    // This is just informational - don't reduce score
    
    // Check 6: Test is too long (might be testing too much)
    const lineCount = body.split('\n').length;
    if (lineCount > 50) {
      issues.push({
        id: 'test-too-long',
        severity: 'info',
        message: 'Test is very long (50+ lines)',
        line,
        suggestion: 'Consider splitting into smaller, focused tests'
      });
      score -= 5;
    }
    
    // Check 7: Multiple expects without clear structure
    const expectCount = (body.match(/expect\s*\(/g) || []).length;
    if (expectCount > 10) {
      issues.push({
        id: 'too-many-assertions',
        severity: 'info',
        message: `Test has ${expectCount} assertions`,
        line,
        suggestion: 'Consider splitting into multiple focused tests'
      });
      score -= 5;
    }
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    // Determine status
    let status: 'good' | 'warning' | 'error' = 'good';
    if (issues.some(i => i.severity === 'error')) {
      status = 'error';
    } else if (issues.some(i => i.severity === 'warning')) {
      status = 'warning';
    }
    
    return {
      name,
      line,
      score,
      issues,
      status
    };
  }
  
  /**
   * Build overall report from file analyses
   */
  private buildReport(files: TestFileAnalysis[]): TestQualityReport {
    let totalTests = 0;
    let goodTests = 0;
    let warningTests = 0;
    let errorTests = 0;
    let totalScore = 0;
    const allIssues: TestQualityIssue[] = [];
    
    for (const file of files) {
      totalTests += file.tests.length;
      goodTests += file.goodCount;
      warningTests += file.warningCount;
      errorTests += file.errorCount;
      totalScore += file.totalScore * file.tests.length;
      
      // Collect all issues
      for (const test of file.tests) {
        for (const issue of test.issues) {
          allIssues.push({
            ...issue,
            message: `${file.fileName}: ${issue.message}`
          });
        }
      }
    }
    
    // Sort issues by severity (errors first, then warnings, then info)
    const severityOrder = { error: 0, warning: 1, info: 2 };
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return {
      overallScore: totalTests > 0 ? Math.round(totalScore / totalTests) : 100,
      totalTests,
      goodTests,
      warningTests,
      errorTests,
      files,
      topIssues: allIssues.slice(0, 10) // Top 10 issues
    };
  }
}
