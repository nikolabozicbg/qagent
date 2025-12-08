import { Injectable } from '@nestjs/common';

/**
 * Test Enforcement Layer
 * 
 * Validates and auto-corrects generated tests to match framework requirements.
 * This layer runs AFTER AI generation to ensure correctness regardless of AI behavior.
 */

export interface EnforcementResult {
  isValid: boolean;
  correctedCode?: string;
  violations: string[];
  enforcementApplied: boolean;
}

export interface FrameworkRules {
  framework: string;
  requiredImports: string[];
  forbiddenImports: string[];
  requiredPatterns: RegExp[];
  forbiddenPatterns: Array<{ pattern: RegExp; description: string }>;
  replacementRules: Array<{ from: RegExp; to: string }>;
}

@Injectable()
export class TestEnforcementService {
  
  /**
   * Enforce Playwright E2E test rules
   */
  enforcePlaywrightE2E(generatedCode: string, sourceFileName: string): EnforcementResult {
    const rules = this.getPlaywrightRules();
    const violations: string[] = [];
    let correctedCode = generatedCode;
    let enforcementApplied = false;
    
    // 1. Check for forbidden imports
    for (const forbidden of rules.forbiddenImports) {
      if (correctedCode.includes(forbidden)) {
        violations.push(`Forbidden import detected: ${forbidden}`);
        enforcementApplied = true;
      }
    }
    
    // 2. Remove all forbidden imports
    correctedCode = this.removeForbiddenImports(correctedCode, rules);
    
    // 3. Remove component imports (any relative imports)
    correctedCode = this.removeComponentImports(correctedCode);
    
    // 4. Remove jest.mock() calls
    correctedCode = this.removeJestMocks(correctedCode);
    
    // 5. Ensure Playwright import exists
    if (!correctedCode.includes("from '@playwright/test'")) {
      correctedCode = this.addPlaywrightImport(correctedCode);
      enforcementApplied = true;
    }
    
    // 6. Convert React Testing Library patterns to Playwright
    const converted = this.convertToPlaywright(correctedCode, sourceFileName);
    if (converted !== correctedCode) {
      correctedCode = converted;
      enforcementApplied = true;
      violations.push('Converted React Testing Library patterns to Playwright');
    }
    
    // 7. Final validation
    const isValid = this.validatePlaywrightTest(correctedCode);
    
    return {
      isValid,
      correctedCode: enforcementApplied ? correctedCode : undefined,
      violations,
      enforcementApplied
    };
  }
  
  /**
   * Get Playwright enforcement rules
   */
  private getPlaywrightRules(): FrameworkRules {
    return {
      framework: 'playwright',
      requiredImports: ["from '@playwright/test'"],
      forbiddenImports: [
        '@testing-library/react',
        '@testing-library/jest-dom',
        'react-dom/test-utils'
      ],
      requiredPatterns: [
        /test\.describe\(/,
        /test\(/,
        /page\.goto\(/
      ],
      forbiddenPatterns: [
        { pattern: /render\s*\(/, description: 'render() call from React Testing Library' },
        { pattern: /screen\./g, description: 'screen from React Testing Library' },
        { pattern: /jest\.mock\(/g, description: 'jest.mock() (not used in Playwright)' }
      ],
      replacementRules: [
        { from: /describe\(/g, to: 'test.describe(' },
        { from: /it\(/g, to: 'test(' }
      ]
    };
  }
  
  /**
   * Remove forbidden imports
   */
  private removeForbiddenImports(code: string, rules: FrameworkRules): string {
    let cleaned = code;
    
    for (const forbidden of rules.forbiddenImports) {
      // Remove entire import line
      const importRegex = new RegExp(`import\\s+.*from\\s+['"]${forbidden.replace(/\//g, '\\/')}['"];?\\n?`, 'g');
      cleaned = cleaned.replace(importRegex, '');
    }
    
    return cleaned;
  }
  
  /**
   * Remove component imports (relative paths starting with ./ or ../)
   */
  private removeComponentImports(code: string): string {
    // Remove imports like: import Component from './path' or '../path'
    const relativeImportRegex = /import\s+.*from\s+['"]\.\/?.*['"];?\n?/g;
    return code.replace(relativeImportRegex, '');
  }
  
  /**
   * Remove jest.mock() calls
   */
  private removeJestMocks(code: string): string {
    // Remove jest.mock(...) statements including multiline
    const jestMockRegex = /jest\.mock\([^)]*\)[^;]*;?\n?/g;
    return code.replace(jestMockRegex, '');
  }
  
  /**
   * Add Playwright import at the top
   */
  private addPlaywrightImport(code: string): string {
    return `import { test, expect } from '@playwright/test';\n\n${code}`;
  }
  
  /**
   * Convert React Testing Library test to Playwright E2E test
   */
  private convertToPlaywright(code: string, sourceFileName: string): string {
    // Infer route from filename (e.g., privacy/page.tsx -> /privacy)
    const route = this.inferRouteFromFilename(sourceFileName);
    
    // Extract test descriptions
    const testDescriptions = this.extractTestDescriptions(code);
    
    // Generate Playwright test
    const pageName = sourceFileName.replace(/page\.(tsx?|jsx?)/, '').replace(/\//g, ' ').trim() || 'Home';
    
    let playwrightTest = `import { test, expect } from '@playwright/test';\n\n`;
    playwrightTest += `test.describe('${pageName} Page E2E', () => {\n`;
    
    // Convert each test
    for (const desc of testDescriptions) {
      playwrightTest += `  test('${desc}', async ({ page }) => {\n`;
      playwrightTest += `    await page.goto('${route}');\n`;
      
      // Try to extract what was being tested
      const elementToTest = this.extractElementFromDescription(desc);
      if (elementToTest) {
        playwrightTest += `    await expect(page.getByText(/${elementToTest}/i)).toBeVisible();\n`;
      } else {
        playwrightTest += `    // TODO: Add specific assertions based on page content\n`;
        playwrightTest += `    await expect(page.locator('main')).toBeVisible();\n`;
      }
      
      playwrightTest += `  });\n\n`;
    }
    
    // Add default navigation test if no tests found
    if (testDescriptions.length === 0) {
      playwrightTest += `  test('should load the page', async ({ page }) => {\n`;
      playwrightTest += `    await page.goto('${route}');\n`;
      playwrightTest += `    await expect(page).toHaveURL('${route}');\n`;
      playwrightTest += `  });\n`;
    }
    
    playwrightTest += `});\n`;
    
    return playwrightTest;
  }
  
  /**
   * Infer route from filename
   */
  private inferRouteFromFilename(filename: string): string {
    // Extract route from path like: privacy/page.tsx -> /privacy
    const match = filename.match(/([^\/]+)\/page\.(tsx?|jsx?)/);
    if (match) {
      return `/${match[1]}`;
    }
    return '/';
  }
  
  /**
   * Extract test descriptions from code
   */
  private extractTestDescriptions(code: string): string[] {
    const descriptions: string[] = [];
    
    // Match test('description', ...) or it('description', ...)
    const testRegex = /(?:test|it)\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = testRegex.exec(code)) !== null) {
      descriptions.push(match[1]);
    }
    
    return descriptions;
  }
  
  /**
   * Extract element name from test description
   */
  private extractElementFromDescription(description: string): string | null {
    // Extract quoted text or key words
    const quotedMatch = description.match(/['"]([^'"]+)['"]/);
    if (quotedMatch) {
      return quotedMatch[1];
    }
    
    // Extract common patterns
    const patterns = [
      /renders?\s+(.+?)(?:\s+heading|\s+section|\s+content|$)/i,
      /displays?\s+(.+?)(?:\s+heading|\s+section|\s+content|$)/i,
      /shows?\s+(.+?)(?:\s+heading|\s+section|\s+content|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Validate that code is a proper Playwright test
   */
  private validatePlaywrightTest(code: string): boolean {
    const checks = {
      hasPlaywrightImport: code.includes("from '@playwright/test'"),
      hasNoForbiddenImports: !code.includes('@testing-library/react'),
      hasNoRender: !code.includes('render('),
      hasPageGoto: code.includes('page.goto('),
      hasTestDescribe: code.includes('test.describe(') || code.includes('test(')
    };
    
    return Object.values(checks).every(check => check);
  }
  
  /**
   * Enforce Jest unit test rules
   */
  enforceJest(generatedCode: string, sourceFileName: string): EnforcementResult {
    const violations: string[] = [];
    let correctedCode = generatedCode;
    let enforcementApplied = false;
    
    // 1. Ensure Jest/Testing Library imports
    if (!correctedCode.includes("from '@jest/globals'") && 
        !correctedCode.includes("from 'jest'")) {
      // Add Jest imports if missing
      correctedCode = `import { describe, it, expect, beforeEach } from '@jest/globals';\n\n${correctedCode}`;
      enforcementApplied = true;
    }
    
    // 2. Remove Playwright imports (wrong framework)
    if (correctedCode.includes('@playwright/test')) {
      correctedCode = correctedCode.replace(/import\s+.*from\s+['"]@playwright\/test['"];?\n?/g, '');
      violations.push('Removed Playwright imports (wrong framework for unit tests)');
      enforcementApplied = true;
    }
    
    // 3. Convert test.describe to describe
    if (correctedCode.includes('test.describe(')) {
      correctedCode = correctedCode.replace(/test\.describe\(/g, 'describe(');
      enforcementApplied = true;
    }
    
    // 4. Remove async page fixtures (E2E pattern)
    correctedCode = correctedCode.replace(/async\s*\(\{\s*page\s*\}\)\s*=>/g, '() =>');
    correctedCode = correctedCode.replace(/await\s+page\./g, '// ');
    
    const isValid = this.validateJestTest(correctedCode);
    
    return { isValid, correctedCode: enforcementApplied ? correctedCode : undefined, violations, enforcementApplied };
  }
  
  /**
   * Enforce Vitest unit test rules
   */
  enforceVitest(generatedCode: string, sourceFileName: string): EnforcementResult {
    const violations: string[] = [];
    let correctedCode = generatedCode;
    let enforcementApplied = false;
    
    // Ensure Vitest imports
    if (!correctedCode.includes("from 'vitest'")) {
      correctedCode = `import { describe, it, expect, beforeEach } from 'vitest';\n\n${correctedCode}`;
      enforcementApplied = true;
    }
    
    // Remove wrong framework imports
    correctedCode = correctedCode.replace(/import\s+.*from\s+['"]@playwright\/test['"];?\n?/g, '');
    correctedCode = correctedCode.replace(/import\s+.*from\s+['"]@jest\/globals['"];?\n?/g, '');
    
    const isValid = correctedCode.includes("from 'vitest'");
    return { isValid, correctedCode: enforcementApplied ? correctedCode : undefined, violations, enforcementApplied };
  }
  
  /**
   * Enforce pytest rules
   */
  enforcePytest(generatedCode: string, sourceFileName: string): EnforcementResult {
    const violations: string[] = [];
    let correctedCode = generatedCode;
    let enforcementApplied = false;
    
    // Ensure pytest import
    if (!correctedCode.includes('import pytest')) {
      correctedCode = `import pytest\n\n${correctedCode}`;
      enforcementApplied = true;
    }
    
    // Remove JavaScript/TypeScript test frameworks
    if (correctedCode.includes('@playwright/test') || correctedCode.includes('jest')) {
      violations.push('Removed JavaScript test framework imports (wrong for Python)');
      correctedCode = correctedCode.replace(/import\s+.*from\s+['"]@playwright\/test['"];?\n?/g, '');
      enforcementApplied = true;
    }
    
    const isValid = correctedCode.includes('import pytest') && correctedCode.includes('def test_');
    return { isValid, correctedCode: enforcementApplied ? correctedCode : undefined, violations, enforcementApplied };
  }
  
  /**
   * Enforce Go testing rules
   */
  enforceGoTesting(generatedCode: string, sourceFileName: string): EnforcementResult {
    const violations: string[] = [];
    let correctedCode = generatedCode;
    let enforcementApplied = false;
    
    // Ensure testing import
    if (!correctedCode.includes('import "testing"')) {
      correctedCode = `import "testing"\n\n${correctedCode}`;
      enforcementApplied = true;
    }
    
    // Remove wrong language frameworks
    if (correctedCode.includes('from ') || correctedCode.includes('@playwright')) {
      violations.push('Removed non-Go imports');
      correctedCode = correctedCode.replace(/import\s+.*from\s+.*\n?/g, '');
      enforcementApplied = true;
    }
    
    const isValid = correctedCode.includes('import "testing"') && correctedCode.includes('func Test');
    return { isValid, correctedCode: enforcementApplied ? correctedCode : undefined, violations, enforcementApplied };
  }
  
  /**
   * Validate Jest test structure
   */
  private validateJestTest(code: string): boolean {
    return (
      (code.includes("from '@jest/globals'") || code.includes('jest')) &&
      !code.includes('@playwright/test') &&
      (code.includes('describe(') || code.includes('it(') || code.includes('test('))
    );
  }
  
  /**
   * Main enforcement entry point
   */
  enforce(generatedCode: string, framework: string, sourceFileName: string): EnforcementResult {
    const normalizedFramework = framework.toLowerCase().replace(/\s+/g, '-');
    
    switch (normalizedFramework) {
      case 'playwright':
        return this.enforcePlaywrightE2E(generatedCode, sourceFileName);
      
      case 'jest':
        return this.enforceJest(generatedCode, sourceFileName);
      
      case 'vitest':
        return this.enforceVitest(generatedCode, sourceFileName);
      
      case 'pytest':
        return this.enforcePytest(generatedCode, sourceFileName);
      
      case 'go-testing':
      case 'go':
        return this.enforceGoTesting(generatedCode, sourceFileName);
      
      case 'junit':
      case 'junit5':
        // TODO: JUnit enforcement
        return { isValid: true, violations: ['JUnit enforcement not yet implemented'], enforcementApplied: false };
      
      default:
        // No enforcement for unknown frameworks - pass through
        console.warn(`No enforcement rules for framework: ${framework}`);
        return { isValid: true, violations: [], enforcementApplied: false };
    }
  }
}
