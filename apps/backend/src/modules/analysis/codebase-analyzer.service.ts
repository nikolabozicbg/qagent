import { Injectable } from '@nestjs/common';
import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { FrameworkDetectorService, DetectedFrameworks } from './framework-detector.service';
import { LanguageDetectorService } from '../language-providers/language-detector.service';
import { ProviderRegistryService } from '../language-providers/provider-registry.service';
import { Framework } from '../language-providers/base/language-provider.interface';

export interface CoverageGap {
  filePath: string;
  hasTest: boolean;
  linesOfCode: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  relativePath: string;
  fileType: string;
  language?: string; // Added for multi-language support
}

export interface AnalysisReport {
  totalFiles: number;
  testedFiles: number;
  untestedFiles: number;
  coveragePercent: number;
  frameworks: DetectedFrameworks;
  gaps: CoverageGap[];
}

@Injectable()
export class CodebaseAnalyzerService {
  constructor(
    private readonly frameworkDetector: FrameworkDetectorService,
    private readonly languageDetector: LanguageDetectorService,
    private readonly providerRegistry: ProviderRegistryService
  ) {}

  /**
   * Analyze workspace for test coverage gaps (multi-language aware)
   */
  async analyzeWorkspace(workspacePath: string): Promise<AnalysisReport> {
    console.log(`🔍 Analyzing workspace: ${workspacePath}`);
    
    // 1. Detect languages in workspace
    const languages = await this.languageDetector.detectLanguages(workspacePath);
    console.log(`   Detected languages: ${languages.join(', ')}`);
    
    // 2. Get providers for detected languages
    const providers = this.providerRegistry.getProviders(languages);
    
    // 3. Collect all source/test files from all providers
    const allSourceFiles: Array<{ file: string; language: string }> = [];
    const allTestFiles: Array<{ file: string; language: string }> = [];
    const allFrameworks: Framework[] = [];
    
    for (const provider of providers) {
      const language = provider.getMetadata().language;
      
      // Find source files for this language
      const sourceFiles = await provider.findSourceFiles(workspacePath);
      allSourceFiles.push(...sourceFiles.map(file => ({ file, language })));
      
      // Find test files for this language
      const testFiles = await provider.findTestFiles(workspacePath);
      console.log(`   [DEBUG] Found test files for ${language}:`, testFiles.length);
      if (testFiles.length < 10) {
          testFiles.forEach(f => console.log(`   [DEBUG] Test file: ${f}`));
      } else {
          console.log(`   [DEBUG] First 5 test files:`, testFiles.slice(0, 5));
      }
      allTestFiles.push(...testFiles.map(file => ({ file, language })));
      
      // Detect frameworks for this language
      const frameworks = await provider.detectFrameworks(workspacePath);
      allFrameworks.push(...frameworks);
    }
    
    console.log(`   Found ${allSourceFiles.length} source files`);
    console.log(`   Found ${allTestFiles.length} test files`);
    console.log(`   Detected ${allFrameworks.length} frameworks`);
    
    // Fallback to old JS-only detector for frameworks (backwards compat)
    const legacyFrameworks = await this.frameworkDetector.detectFrameworks(workspacePath);
    
    // 4. Calculate coverage gaps (language-aware)
    const gaps = await this.calculateCoverageGapsMultiLanguage(
      allSourceFiles,
      allTestFiles,
      workspacePath,
      providers
    );
    
    // 5. Calculate metrics
    const testedFiles = gaps.filter(g => g.hasTest).length;
    const untestedFiles = gaps.filter(g => !g.hasTest).length;
    const coveragePercent = allSourceFiles.length > 0 
      ? Math.round((testedFiles / allSourceFiles.length) * 100) 
      : 0;
    
    console.log(`   Coverage: ${coveragePercent}% (${testedFiles}/${allSourceFiles.length} files)`);
    console.log(`   ✅ Analysis complete: ${coveragePercent}% coverage`);
    
    return {
      totalFiles: allSourceFiles.length,
      testedFiles,
      untestedFiles,
      coveragePercent,
      frameworks: legacyFrameworks, // Keep for backwards compatibility
      gaps: gaps.sort((a, b) => this.priorityValue(b.priority) - this.priorityValue(a.priority))
    };
  }
  
  /**
   * Find all TypeScript/JavaScript source files
   */
  private async findSourceFiles(workspacePath: string): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ];
    
    const ignore = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.spec.js',
      '**/*.test.js',
      '**/*.d.ts'
    ];
    
    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: workspacePath,
        absolute: true,
        ignore
      });
      files.push(...matches);
    }
    
    return [...new Set(files)]; // Remove duplicates
  }
  
  /**
   * Find all test files
   */
  private async findTestFiles(workspacePath: string): Promise<string[]> {
    const patterns = [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.test.js',
      '**/*.test.jsx'
    ];
    
    const ignore = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**'
    ];
    
    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: workspacePath,
        absolute: true,
        ignore
      });
      files.push(...matches);
    }
    
    return files;
  }
  
  /**
   * Calculate coverage gaps for multi-language projects
   */
  private async calculateCoverageGapsMultiLanguage(
    sourceFiles: Array<{ file: string; language: string }>,
    testFiles: Array<{ file: string; language: string }>,
    workspacePath: string,
    providers: any[]
  ): Promise<CoverageGap[]> {
    const gaps: CoverageGap[] = [];
    
    for (const { file: sourceFile, language } of sourceFiles) {
      // Find the provider for this language
      const provider = providers.find(p => p.getMetadata().language === language);
      
      // Check if this source file has a corresponding test
      const hasTest = provider
        ? await this.hasCorrespondingTestForProvider(sourceFile, testFiles, provider, workspacePath)
        : this.hasCorrespondingTest(sourceFile, testFiles.map(t => t.file), workspacePath);
      
      const linesOfCode = await this.countLines(sourceFile);
      
      const priority = this.calculatePriority(sourceFile, linesOfCode, hasTest);
      
      const reason = this.getPriorityReason(sourceFile, linesOfCode, hasTest);
      const relativePath = path.relative(workspacePath, sourceFile);
      const fileType = this.frameworkDetector.detectFileType(sourceFile);
      
      gaps.push({
        filePath: sourceFile,
        relativePath,
        hasTest,
        linesOfCode,
        priority,
        reason,
        fileType,
        language
      });
    }
    
    return gaps;
  }
  
  /**
   * Check if source file has a corresponding test using language provider
   */
  private async hasCorrespondingTestForProvider(
    sourceFile: string,
    testFiles: Array<{ file: string; language: string }>,
    provider: any,
    workspacePath: string
  ): Promise<boolean> {
    // Get expected test file path from provider
    const expectedTestFile = provider.getTestFileForSource(sourceFile);
    
    // 1. Check provider's recommendation (colocated)
    if (expectedTestFile) {
       if (testFiles.some(t => t.file === expectedTestFile || t.file.endsWith(path.basename(expectedTestFile)))) {
           return true;
       }
    }
    
    // 2. FALLBACK: Use our enhanced smart detection (for E2E, __tests__, etc.)
    // This is CRITICAL for E2E tests in separate folders which providers might not handle
    return this.hasCorrespondingTest(sourceFile, testFiles.map(t => t.file), workspacePath);
  }

  /**
   * Check if source file has a corresponding test file
   */
  private hasCorrespondingTest(sourceFile: string, testFiles: string[], workspacePath?: string): boolean {
    const sourceBasename = path.basename(sourceFile, path.extname(sourceFile));
    const sourceDir = path.dirname(sourceFile);
    
    // Normalize test files for robust comparison
    const normalizedTestFiles = new Set(testFiles.map(f => path.normalize(f)));

    // 1. Standard Colocated & Relative Checks (Jest/Vitest/Unit style)
    const testVariants = [
      `${sourceBasename}.spec.ts`, `${sourceBasename}.test.ts`,
      `${sourceBasename}.spec.tsx`, `${sourceBasename}.test.tsx`,
      `${sourceBasename}.spec.js`, `${sourceBasename}.test.js`,
      `${sourceBasename}.spec.jsx`, `${sourceBasename}.test.jsx`
    ];
    
    // Check exact matches in same dir
    for (const variant of testVariants) {
      const candidate = path.normalize(path.join(sourceDir, variant));
      if (normalizedTestFiles.has(candidate)) return true;
    }
    
    // Check __tests__ in same dir
    const testsDir = path.join(sourceDir, '__tests__');
    for (const variant of testVariants) {
      const candidate = path.normalize(path.join(testsDir, variant));
      if (normalizedTestFiles.has(candidate)) return true;
    }

    // 2. Project-Level Structure Checks (E2E / Integration style)
    const projectRoot = this.findProjectRoot(sourceDir, workspacePath);
    
    const isDebugTarget = sourceBasename === 'page' || sourceBasename === 'layout';
    if (isDebugTarget) {
        // console.log(`[DEBUG ANALYZER] Checking ${sourceFile}`);
    }

    if (projectRoot) {
        const commonTestDirs = [
            path.join(projectRoot, 'e2e'),
            path.join(projectRoot, 'tests'),
            path.join(projectRoot, 'test'),
            path.join(projectRoot, 'src', 'tests'),
            path.join(projectRoot, '__tests__'),
            // Also check for e2e inside apps/frontend/e2e if we are in a monorepo source but projectRoot detected as root
            workspacePath ? path.join(workspacePath, 'e2e') : null
        ].filter(Boolean) as string[];

        // Logic for handling generic file names (page, layout, index)
        const parentDirName = path.basename(path.dirname(sourceFile));
        const lowerBasename = sourceBasename.toLowerCase();
        const isGenericFile = ['page', 'layout', 'index', 'route', 'loading', 'error', 'not-found'].includes(lowerBasename);
        
        const searchNames = [sourceBasename];
        if (isGenericFile) {
            searchNames.push(`${parentDirName}-${sourceBasename}`); // e.g. dashboard-page
            searchNames.push(`${parentDirName}`); // e.g. dashboard.spec.ts
        }

        for (const dir of commonTestDirs) {
            if (!fs.existsSync(dir)) continue;

            for (const name of searchNames) {
                for (const variantSuffix of ['.spec.ts', '.test.ts', '.spec.tsx', '.test.tsx', '.spec.js', '.test.js']) {
                     const candidateRaw = path.join(dir, `${name}${variantSuffix}`);
                     const candidate = path.normalize(candidateRaw);
                     
                     if (normalizedTestFiles.has(candidate)) {
                         if (isDebugTarget) {
                             console.log(`   [DEBUG MATCH] Found test for ${path.basename(sourceFile)} in ${dir}: ${path.basename(candidate)}`);
                         }
                         return true;
                     }
                }
            }
        }
    }
    
    return false;
  }

  /**
   * Find the project root for a given directory (nearest package.json or config)
   */
  private findProjectRoot(currentDir: string, stopAt?: string): string | null {
      let dir = currentDir;
      const root = path.parse(dir).root;
      let depth = 0;
      while (dir && dir !== root && depth < 20) {
          if (fs.existsSync(path.join(dir, 'package.json')) || 
              fs.existsSync(path.join(dir, 'playwright.config.ts')) ||
              fs.existsSync(path.join(dir, 'next.config.js')) ||
              fs.existsSync(path.join(dir, 'nx.json')) ||
              fs.existsSync(path.join(dir, 'turbo.json'))) {
              return dir;
          }
          if (stopAt && dir === stopAt) return dir; 
          dir = path.dirname(dir);
          depth++;
      }
      return stopAt || null;
  }

  /**
   * Count lines of code in a file
   */
  private async countLines(filePath: string): Promise<number> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      // Count non-empty, non-comment lines
      return lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('//') && 
               !trimmed.startsWith('/*') &&
               !trimmed.startsWith('*');
      }).length;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Calculate priority based on file characteristics
   */
  private calculatePriority(
    filePath: string,
    linesOfCode: number,
    hasTest: boolean
  ): 'high' | 'medium' | 'low' {
    if (hasTest) return 'low';
    
    const filename = path.basename(filePath).toLowerCase();
    
    // High priority: services, controllers, critical business logic
    if (
      filename.includes('service') ||
      filename.includes('controller') ||
      filename.includes('payment') ||
      filename.includes('auth') ||
      filename.includes('api') ||
      linesOfCode > 100
    ) {
      return 'high';
    }
    
    // Medium priority: utilities, helpers, components
    if (
      filename.includes('util') ||
      filename.includes('helper') ||
      filename.includes('component') ||
      linesOfCode > 50
    ) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Get reason for priority
   */
  private getPriorityReason(
    filePath: string,
    linesOfCode: number,
    hasTest: boolean
  ): string {
    if (hasTest) {
      return 'Has test coverage';
    }
    
    const filename = path.basename(filePath).toLowerCase();
    
    if (filename.includes('service')) {
      return 'Critical: Business logic service';
    }
    if (filename.includes('controller')) {
      return 'Critical: API endpoint handler';
    }
    if (filename.includes('payment')) {
      return 'Critical: Payment processing';
    }
    if (filename.includes('auth')) {
      return 'Critical: Authentication/Authorization';
    }
    if (linesOfCode > 100) {
      return `Large file: ${linesOfCode} LOC`;
    }
    if (linesOfCode > 50) {
      return 'Medium complexity';
    }
    
    return 'No test coverage';
  }
  
  /**
   * Convert priority to numeric value for sorting
   */
  private priorityValue(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }
}
