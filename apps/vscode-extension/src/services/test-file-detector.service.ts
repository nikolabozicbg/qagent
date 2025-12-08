import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ScannedFile } from './file-scanner.service';
import { TestType } from '../types/enhanced-analysis.types';

/**
 * Test file match result
 */
export interface TestFileMatch {
  testType: TestType;
  testFilePath: string;
  framework: string;
}

/**
 * TestFileDetector Service
 * 
 * Detects test files and matches them to source files.
 * Determines test type (unit, component, integration, e2e) based on:
 * - File naming conventions (.test.ts, .spec.ts, .e2e-spec.ts)
 * - File location (test/, __tests__/, e2e/)
 * - Import patterns (React Testing Library, Supertest, Playwright)
 */
export class TestFileDetectorService {
  
  /**
   * Match source files with their test files
   */
  async matchTestFiles(workspaceRoot: string, sourceFiles: ScannedFile[]): Promise<void> {
    for (const sourceFile of sourceFiles) {
      const match = await this.findTestFileForSource(workspaceRoot, sourceFile);
      
      if (match) {
        sourceFile.hasTest = true;
        sourceFile.testFilePath = match.testFilePath;
      }
    }
  }
  
  /**
   * Find test file for a source file
   */
  private async findTestFileForSource(
    workspaceRoot: string,
    sourceFile: ScannedFile
  ): Promise<TestFileMatch | null> {
    const sourceDir = path.dirname(sourceFile.path);
    const sourceBaseName = path.basename(sourceFile.path, path.extname(sourceFile.path));
    const sourceExt = path.extname(sourceFile.path);
    
    // For page.tsx/layout.tsx, generate prefixed name (e.g. privacy-page for src/app/privacy/page.tsx)
    const parentDir = path.basename(path.dirname(sourceFile.path));
    const prefixedBaseName = (sourceBaseName === 'page' || sourceBaseName === 'layout') 
      ? `${parentDir}-${sourceBaseName}` 
      : sourceBaseName;
    
    // Common test file naming patterns
    const testPatterns = [
      // Co-located tests (same directory)
      `${sourceBaseName}.test${sourceExt}`,
      `${sourceBaseName}.spec${sourceExt}`,
      `${sourceBaseName}.test.ts`,
      `${sourceBaseName}.spec.ts`,
      `${sourceBaseName}.test.tsx`,
      `${sourceBaseName}.spec.tsx`,
      
      // __tests__ directory
      path.join(sourceDir, '__tests__', `${sourceBaseName}.test${sourceExt}`),
      path.join(sourceDir, '__tests__', `${sourceBaseName}.spec${sourceExt}`),
      path.join(sourceDir, '__tests__', `${sourceBaseName}.test.ts`),
      path.join(sourceDir, '__tests__', `${sourceBaseName}.spec.ts`),
      
      // test/ directory (sibling to src/)
      sourceFile.path.replace('/src/', '/test/').replace(sourceExt, `.spec${sourceExt}`),
      sourceFile.path.replace('/src/', '/test/').replace(sourceExt, `.test${sourceExt}`),
      
      // E2E specific patterns (standard)
      sourceFile.path.replace('/src/', '/test/e2e/').replace(sourceExt, '.e2e-spec.ts'),
      path.join(workspaceRoot, 'test', 'e2e', `${sourceBaseName}.e2e-spec.ts`),
      
      // E2E in root e2e/ folder (Playwright convention)
      path.join(workspaceRoot, 'e2e', `${sourceBaseName}.spec.ts`),
      path.join(workspaceRoot, 'e2e', `${sourceBaseName}.spec.tsx`),
      path.join(workspaceRoot, 'e2e', `${prefixedBaseName}.spec.ts`),
      path.join(workspaceRoot, 'e2e', `${prefixedBaseName}.spec.tsx`),
      
      // E2E with different naming patterns
      path.join(workspaceRoot, 'e2e', `${parentDir}.spec.ts`),
      path.join(workspaceRoot, 'e2e', `${parentDir}.spec.tsx`),
      path.join(workspaceRoot, 'tests', `${prefixedBaseName}.spec.ts`),
      path.join(workspaceRoot, 'tests', `${prefixedBaseName}.spec.tsx`)
    ];
    
    // Check each pattern
    for (const testPath of testPatterns) {
      const fullPath = path.isAbsolute(testPath) ? testPath : path.join(sourceDir, testPath);
      
      if (fs.existsSync(fullPath)) {
        // Determine test type and framework
        const testType = this.detectTestType(fullPath);
        const framework = await this.detectFramework(fullPath);
        
        return {
          testType,
          testFilePath: fullPath,
          framework
        };
      }
    }
    
    return null;
  }
  
  /**
   * Detect test type from file path and content
   */
  private detectTestType(testFilePath: string): TestType {
    const lowerPath = testFilePath.toLowerCase();
    const fileName = path.basename(testFilePath);
    
    // E2E tests
    if (lowerPath.includes('/e2e/') || fileName.includes('.e2e-spec.') || fileName.includes('.e2e.')) {
      return 'e2e';
    }
    
    // Integration tests
    if (lowerPath.includes('/integration/') || fileName.includes('.integration.')) {
      return 'integration';
    }
    
    // Component tests (React/Vue components)
    if (lowerPath.includes('/components/') && (testFilePath.endsWith('.tsx') || testFilePath.endsWith('.jsx'))) {
      return 'component';
    }
    
    // API tests
    if (lowerPath.includes('/api/') || fileName.includes('.api.')) {
      return 'api';
    }
    
    // Default to unit tests
    return 'unit';
  }
  
  /**
   * Detect testing framework from test file imports
   */
  private async detectFramework(testFilePath: string): Promise<string> {
    try {
      const content = fs.readFileSync(testFilePath, 'utf-8');
      
      // React Testing Library
      if (content.includes('@testing-library/react') || content.includes('render') && content.includes('screen')) {
        return 'React Testing Library';
      }
      
      // Playwright
      if (content.includes('@playwright/test') || content.includes("import { test, expect } from '@playwright/test'")) {
        return 'Playwright';
      }
      
      // Cypress
      if (content.includes('cy.visit') || content.includes('cypress')) {
        return 'Cypress';
      }
      
      // Supertest
      if (content.includes('supertest') || content.includes('request(app)')) {
        return 'Supertest';
      }
      
      // Jest (default for .test.* and .spec.* files)
      if (content.includes('jest') || content.includes('describe(') || content.includes('test(') || content.includes('it(')) {
        return 'Jest';
      }
      
      // Vitest
      if (content.includes('vitest') || content.includes("from 'vitest'")) {
        return 'Vitest';
      }
      
      return 'Jest'; // Default
    } catch (error) {
      return 'Unknown';
    }
  }
  
  /**
   * Get all test files in workspace
   */
  async findAllTestFiles(workspaceRoot: string): Promise<string[]> {
    const testFiles: string[] = [];
    
    const patterns = [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/*.e2e-spec.{ts,js}',
      'test/**/*.{ts,tsx,js,jsx}',
      '__tests__/**/*.{ts,tsx,js,jsx}'
    ];
    
    for (const pattern of patterns) {
      const foundFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceRoot, pattern),
        '**/node_modules/**'
      );
      
      for (const fileUri of foundFiles) {
        testFiles.push(fileUri.fsPath);
      }
    }
    
    // Remove duplicates
    return [...new Set(testFiles)];
  }
  
  /**
   * Categorize files by test type
   */
  categorizeFilesByTestType(sourceFiles: ScannedFile[]): Map<TestType, ScannedFile[]> {
    const categorized = new Map<TestType, ScannedFile[]>();
    
    // Initialize categories
    const testTypes: TestType[] = ['unit', 'integration', 'e2e', 'component', 'api', 'hook'];
    for (const testType of testTypes) {
      categorized.set(testType, []);
    }
    
    for (const file of sourceFiles) {
      // Determine appropriate test type for this file
      let testType: TestType = 'unit'; // default
      
      // Frontend files
      if (file.type === 'component') {
        testType = 'component';
      } else if (file.type === 'hook') {
        testType = 'hook';
      } else if (file.type === 'page') {
        testType = 'e2e'; // Pages typically tested with E2E
      }
      
      // Backend files
      else if (file.type === 'service') {
        testType = 'unit';
      } else if (file.type === 'controller') {
        testType = 'integration'; // Controllers tested with integration tests
      }
      
      categorized.get(testType)?.push(file);
    }
    
    return categorized;
  }
}
