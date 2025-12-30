import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StackType, TechnologyStack, TechnologyInfo, TestTypeMatrix, FrameworkInfo, FrameworkStatus, TestType } from '../types/enhanced-analysis.types';
import { FileScannerService, ScannedFile } from './file-scanner.service';
import { TestFileDetectorService } from './test-file-detector.service';

/**
 * ProjectDetectionService
 * 
 * Detects project type (Frontend/Backend/Fullstack) from:
 * - package.json dependencies
 * - Folder structure (src/components, src/controllers)
 * - Config files (next.config.js, nest-cli.json)
 * 
 * Returns TechnologyStack[] with detected frameworks and test type matrix.
 */
export class ProjectDetectionService {
  private fileScanner = new FileScannerService();
  private testDetector = new TestFileDetectorService();
  
  /**
   * Detect technology stacks in workspace
   */
  async detectStacks(workspaceRoot: string): Promise<TechnologyStack[]> {
    const stacks: TechnologyStack[] = [];
    
    // Read package.json
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return stacks;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };
    
    // Detect Frontend
    const frontendStack = await this.detectFrontend(workspaceRoot, allDeps);
    if (frontendStack) {
      // Scan files and populate counts
      await this.populateStackCounts(workspaceRoot, frontendStack);
      stacks.push(frontendStack);
    }
    
    // Detect Backend
    const backendStack = await this.detectBackend(workspaceRoot, allDeps);
    if (backendStack) {
      // Scan files and populate counts
      await this.populateStackCounts(workspaceRoot, backendStack);
      stacks.push(backendStack);
    }
    
    return stacks;
  }
  
  /**
   * Detect Frontend stack (React, Vue, Angular, Next.js, etc.)
   */
  private detectFrontend(workspaceRoot: string, deps: Record<string, string>): TechnologyStack | null {
    const technologies: TechnologyInfo[] = [];
    let detected = false;
    
    // React detection
    if (deps['react'] || deps['react-dom']) {
      detected = true;
      const version = deps['react'] || deps['react-dom'];
      technologies.push({
        language: 'TypeScript',
        displayName: `React ${this.parseVersion(version)}`,
        projectType: 'spa',
        confidence: 95,
        indicators: ['react', 'react-dom'],
        icon: '⚛️',
        color: '#61DAFB'
      });
      
      // Next.js detection
      if (deps['next']) {
        technologies.push({
          language: 'TypeScript',
          displayName: `Next.js ${this.parseVersion(deps['next'])}`,
          projectType: 'spa',
          confidence: 98,
          indicators: ['next.config.js', 'app/', 'pages/'],
          icon: '▲',
          color: '#000000'
        });
      }
    }
    
    // Vue detection
    if (deps['vue']) {
      detected = true;
      technologies.push({
        language: 'TypeScript',
        displayName: `Vue ${this.parseVersion(deps['vue'])}`,
        projectType: 'spa',
        confidence: 95,
        indicators: ['vue', 'vue.config.js'],
        icon: '💚',
        color: '#42b883'
      });
    }
    
    if (!detected) {
      return null;
    }
    
    // Build test type matrix for Frontend
    const testTypes = this.buildFrontendTestMatrix(workspaceRoot, deps);
    
    return {
      type: 'frontend',
      name: technologies[0]?.displayName || 'Frontend',
      technologies,
      testTypes,
      fileCount: 0, // Will be populated by analysis
      testedCount: 0,
      coverage: 0
    };
  }
  
  /**
   * Detect Backend stack (NestJS, Express, Fastify, etc.)
   */
  private detectBackend(workspaceRoot: string, deps: Record<string, string>): TechnologyStack | null {
    const technologies: TechnologyInfo[] = [];
    let detected = false;
    
    // NestJS detection
    if (deps['@nestjs/core'] || deps['@nestjs/common']) {
      detected = true;
      const version = deps['@nestjs/core'] || deps['@nestjs/common'];
      technologies.push({
        language: 'TypeScript',
        displayName: `NestJS ${this.parseVersion(version)}`,
        projectType: 'web-api',
        confidence: 98,
        indicators: ['nest-cli.json', '@nestjs/core', 'src/main.ts'],
        icon: '🐈',
        color: '#E0234E'
      });
    }
    
    // Express detection
    if (deps['express'] && !deps['@nestjs/core']) {
      detected = true;
      technologies.push({
        language: 'JavaScript',
        displayName: `Express ${this.parseVersion(deps['express'])}`,
        projectType: 'web-api',
        confidence: 90,
        indicators: ['express', 'app.js', 'server.js'],
        icon: '🚂',
        color: '#000000'
      });
    }
    
    // Fastify detection
    if (deps['fastify']) {
      detected = true;
      technologies.push({
        language: 'JavaScript',
        displayName: `Fastify ${this.parseVersion(deps['fastify'])}`,
        projectType: 'web-api',
        confidence: 92,
        indicators: ['fastify', 'server.js'],
        icon: '⚡',
        color: '#000000'
      });
    }
    
    if (!detected) {
      return null;
    }
    
    // Build test type matrix for Backend
    const testTypes = this.buildBackendTestMatrix(workspaceRoot, deps);
    
    return {
      type: 'backend',
      name: technologies[0]?.displayName || 'Backend',
      technologies,
      testTypes,
      fileCount: 0,
      testedCount: 0,
      coverage: 0
    };
  }
  
  /**
   * Build test type matrix for Frontend
   */
  private buildFrontendTestMatrix(workspaceRoot: string, deps: Record<string, string>): TestTypeMatrix[] {
    const matrix: TestTypeMatrix[] = [];
    
    // Read package.json to detect available scripts
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    let availableScripts: Record<string, string> = {};
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      availableScripts = packageJson.scripts || {};
    } catch (error) {
      // Fallback if package.json not readable
    }
    
    // Component Tests (React Testing Library)
    const hasRTL = deps['@testing-library/react'] !== undefined;
    const hasJest = deps['jest'] !== undefined;
    console.log('[ProjectDetection] Frontend deps check:', { hasRTL, hasJest, deps: Object.keys(deps) });
    const componentRunCommand = this.detectRunCommand(availableScripts, ['test:component', 'test', 'jest']);
    
    // Unit Tests (Jest) - for utility functions, helpers, etc.
    const unitRunCommand = this.detectRunCommand(availableScripts, ['test:unit', 'test', 'jest']);
    
    matrix.push({
      testType: 'unit',
      framework: {
        name: 'Jest',
        version: hasJest ? this.parseVersion(deps['jest']) : undefined,
        status: hasJest ? 'installed' : 'missing',
        configFiles: ['jest.config.js'],
        marketShare: 88,
        reason: 'Industry standard for JavaScript/TypeScript unit testing',
        installCommand: 'npm install --save-dev jest @types/jest ts-jest',
        setupGuide: 'https://jestjs.io/docs/getting-started'
      },
      status: hasJest ? 'installed' : 'missing',
      coverage: 0,
      filesTotal: 0,
      filesTested: 0,
      filesUntested: 0,
      outputPath: 'src/**/*.spec.ts',
      runCommand: unitRunCommand || 'npm test',
      recommendedFiles: []
    });
    
    // Component Tests (React Testing Library)
    matrix.push({
      testType: 'component',
      framework: {
        name: hasRTL ? 'React Testing Library' : 'Jest',
        version: hasRTL ? this.parseVersion(deps['@testing-library/react']) : this.parseVersion(deps['jest']),
        status: hasRTL ? 'installed' : (hasJest ? 'not-configured' : 'missing'),
        configFiles: ['jest.config.js', 'setupTests.ts'],
        marketShare: 85,
        reason: 'Industry standard for React component testing',
        installCommand: 'npm install --save-dev @testing-library/react @testing-library/jest-dom',
        setupGuide: 'https://testing-library.com/docs/react-testing-library/intro/'
      },
      status: hasRTL ? 'installed' : (hasJest ? 'not-configured' : 'missing'),
      coverage: 0,
      filesTotal: 0,
      filesTested: 0,
      filesUntested: 0,
      outputPath: 'src/__tests__/components/',
      runCommand: componentRunCommand || 'npm test',
      recommendedFiles: []
    });
    
    // E2E Tests (Playwright)
    const hasPlaywright = deps['@playwright/test'] !== undefined;
    const e2eRunCommand = this.detectRunCommand(availableScripts, ['test:e2e', 'e2e', 'playwright']);
    
    // Playwright can run directly with npx, so mark as installed if package exists
    const playwrightStatus: 'installed' | 'not-configured' | 'missing' = hasPlaywright ? 'installed' : 'missing';
    
    matrix.push({
      testType: 'e2e',
      framework: {
        name: 'Playwright',
        version: hasPlaywright ? this.parseVersion(deps['@playwright/test']) : undefined,
        status: playwrightStatus,
        configFiles: ['playwright.config.ts'],
        marketShare: 67,
        reason: 'Modern, fast, and reliable E2E testing for web apps',
        installCommand: 'npm init playwright@latest',
        setupGuide: 'https://playwright.dev/docs/intro'
      },
      status: playwrightStatus,
      coverage: 0,
      filesTotal: 0,
      filesTested: 0,
      filesUntested: 0,
      outputPath: 'tests/e2e/',
      runCommand: e2eRunCommand || 'npx playwright test', // Use default if no script
      recommendedFiles: []
    });
    
    // Visual Tests (Chromatic) - optional
    const hasChromatic = deps['chromatic'] !== undefined;
    const visualRunCommand = this.detectRunCommand(availableScripts, ['chromatic', 'test:visual']);
    
    matrix.push({
      testType: 'visual',
      framework: {
        name: 'Chromatic',
        version: hasChromatic ? this.parseVersion(deps['chromatic']) : undefined,
        status: hasChromatic ? 'installed' : 'missing',
        marketShare: 45,
        reason: 'Visual regression testing with Storybook integration',
        installCommand: 'npm install --save-dev chromatic',
        setupGuide: 'https://www.chromatic.com/docs/'
      },
      status: hasChromatic ? 'installed' : 'missing',
      coverage: 0,
      filesTotal: 0,
      filesTested: 0,
      filesUntested: 0,
      outputPath: '.chromatic/',
      runCommand: visualRunCommand || 'npx chromatic',
      recommendedFiles: []
    });
    
    return matrix;
  }
  
  /**
   * Build test type matrix for Backend
   */
  private buildBackendTestMatrix(workspaceRoot: string, deps: Record<string, string>): TestTypeMatrix[] {
    const matrix: TestTypeMatrix[] = [];
    
    // Read package.json to detect available scripts
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    let availableScripts: Record<string, string> = {};
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      availableScripts = packageJson.scripts || {};
    } catch (error) {
      // Fallback if package.json not readable
    }
    
    // Unit Tests (Jest)
    const hasJest = deps['jest'] !== undefined;
    console.log('[ProjectDetection] Backend deps check:', { hasJest, deps: Object.keys(deps) });
    const unitRunCommand = this.detectRunCommand(availableScripts, ['test:unit', 'test', 'jest']);
    
    matrix.push({
      testType: 'unit',
      framework: {
        name: 'Jest',
        version: hasJest ? this.parseVersion(deps['jest']) : undefined,
        status: hasJest ? 'installed' : 'missing',
        configFiles: ['jest.config.js'],
        marketShare: 88,
        reason: 'Industry standard for Node.js unit testing',
        installCommand: 'npm install --save-dev jest @types/jest ts-jest',
        setupGuide: 'https://jestjs.io/docs/getting-started'
      },
      status: hasJest ? 'installed' : 'missing',
      coverage: 0,
      filesTotal: 0,
      filesTested: 0,
      filesUntested: 0,
      outputPath: 'src/**/*.spec.ts',
      runCommand: unitRunCommand || 'npm test',
      recommendedFiles: []
    });
    
    // Integration Tests (Supertest)
    const hasSupertest = deps['supertest'] !== undefined;
    const integrationRunCommand = this.detectRunCommand(availableScripts, ['test:integration', 'test:int', 'test']);
    
    matrix.push({
      testType: 'integration',
      framework: {
        name: 'Supertest',
        version: hasSupertest ? this.parseVersion(deps['supertest']) : undefined,
        status: hasSupertest ? 'installed' : 'missing',
        marketShare: 75,
        reason: 'HTTP assertion library for Node.js integration testing',
        installCommand: 'npm install --save-dev supertest @types/supertest',
        setupGuide: 'https://github.com/visionmedia/supertest'
      },
      status: hasSupertest ? 'installed' : 'missing',
      coverage: 0,
      filesTotal: 0,
      filesTested: 0,
      filesUntested: 0,
      outputPath: 'test/integration/*.spec.ts',
      runCommand: integrationRunCommand || 'npm test',
      recommendedFiles: []
    });
    
    // E2E API Tests (Supertest)
    const e2eRunCommand = this.detectRunCommand(availableScripts, ['test:e2e', 'test:api', 'test']);
    
    matrix.push({
      testType: 'api',
      framework: {
        name: 'Supertest',
        version: hasSupertest ? this.parseVersion(deps['supertest']) : undefined,
        status: hasSupertest ? 'installed' : 'not-configured',
        marketShare: 75,
        reason: 'Full API flow testing with real database',
        installCommand: 'npm install --save-dev supertest @types/supertest',
        setupGuide: 'https://github.com/visionmedia/supertest'
      },
      status: hasSupertest ? 'not-configured' : 'missing',
      coverage: 0,
      filesTotal: 0,
      filesTested: 0,
      filesUntested: 0,
      outputPath: 'test/e2e/*.spec.ts',
      runCommand: e2eRunCommand || 'npm test',
      recommendedFiles: []
    });
    
    return matrix;
  }
  
  /**
   * Parse version from dependency string (e.g. "^18.2.0" -> "18.2.0")
   */
  private parseVersion(versionString: string): string {
    if (!versionString) return '';
    return versionString.replace(/^[\^~]/, '');
  }
  
  /**
   * Detect run command from available package.json scripts
   * Tries candidates in order and returns first match, or null if none found
   */
  private detectRunCommand(scripts: Record<string, string>, candidates: string[]): string | null {
    // Try each candidate script name
    for (const candidate of candidates) {
      if (scripts[candidate]) {
        return `npm run ${candidate}`;
      }
    }
    
    // No matching script found
    return null;
  }
  
  /**
   * Populate file counts for a stack by scanning workspace
   */
  private async populateStackCounts(workspaceRoot: string, stack: TechnologyStack): Promise<void> {
    // Scan files for this stack
    const sourceFiles = await this.fileScanner.scanStackFiles(workspaceRoot, stack.type);
    
    // Match test files to source files
    await this.testDetector.matchTestFiles(workspaceRoot, sourceFiles);
    
    // Categorize files by test type
    const filesByTestType = this.testDetector.categorizeFilesByTestType(sourceFiles);
    
    // Populate counts in test type matrix
    for (const testTypeMatrix of stack.testTypes) {
      const filesForType = filesByTestType.get(testTypeMatrix.testType) || [];
      
      testTypeMatrix.filesTotal = filesForType.length;
      testTypeMatrix.filesTested = filesForType.filter(f => f.hasTest).length;
      testTypeMatrix.filesUntested = filesForType.filter(f => !f.hasTest).length;
      
      // Calculate coverage
      if (testTypeMatrix.filesTotal > 0) {
        testTypeMatrix.coverage = Math.round(
          (testTypeMatrix.filesTested / testTypeMatrix.filesTotal) * 100
        );
      }
      
      // Store files for later use (TreeView children)
      testTypeMatrix.recommendedFiles = filesForType.map(f => f.relativePath);
    }
    
    // Calculate overall stack counts
    stack.fileCount = sourceFiles.length;
    stack.testedCount = sourceFiles.filter(f => f.hasTest).length;
    stack.coverage = stack.fileCount > 0 
      ? Math.round((stack.testedCount / stack.fileCount) * 100)
      : 0;
    
    // Store scanned files for TreeView display
    stack.scannedFiles = sourceFiles;
  }
}
