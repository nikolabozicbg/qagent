import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { E2EJourney, JourneyStep } from './backend-api.service';
import { log } from '../extension';

/**
 * JourneyTestGeneratorService
 * Converts E2E Journeys from holistic analysis into executable Playwright tests
 */
export class JourneyTestGeneratorService {
  
  /**
   * Generate Playwright test from journey
   */
  async generateTest(journey: E2EJourney, workspaceRoot: string): Promise<string> {
    log(`Generating test for journey: ${journey.name}`);
    
    const testCode = this.buildTestCode(journey);
    const fileName = this.getTestFileName(journey.name);
    const testPath = path.join(workspaceRoot, 'tests', 'e2e', fileName);
    
    // Ensure directory exists
    const testDir = path.dirname(testPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Write test file
    fs.writeFileSync(testPath, testCode, 'utf-8');
    log(`Test file created: ${testPath}`);
    
    return testPath;
  }
  
  /**
   * Generate multiple tests from journeys
   */
  async generateTests(journeys: E2EJourney[], workspaceRoot: string): Promise<string[]> {
    const generatedPaths: string[] = [];
    
    for (const journey of journeys) {
      try {
        const testPath = await this.generateTest(journey, workspaceRoot);
        generatedPaths.push(testPath);
      } catch (error) {
        log(`Failed to generate test for ${journey.name}:`, error);
      }
    }
    
    return generatedPaths;
  }
  
  /**
   * Build complete test code
   */
  public buildTestCode(journey: E2EJourney): string {
    const imports = this.generateImports();
    const testBlock = this.generateTestBlock(journey);
    
    return `${imports}\n\n${testBlock}`;
  }
  
  /**
   * Generate imports
   */
  private generateImports(): string {
    return `import { test, expect } from '@playwright/test';`;
  }
  
  /**
   * Generate test block
   */
  private generateTestBlock(journey: E2EJourney): string {
    const description = `${journey.description} (Priority: ${journey.priority})`;
    const steps = journey.steps.map((step, i) => this.generateStepCode(step, i)).join('\n\n');
    
    return `test.describe('${journey.name}', () => {
  test('${description}', async ({ page }) => {
${steps}
  });
});`;
  }
  
  /**
   * Generate code for individual step
   */
  private generateStepCode(step: JourneyStep, stepIndex: number): string {
    const comment = `    // Step ${stepIndex + 1}: ${step.description}`;
    const action = this.generateActionCode(step);
    const assertions = step.assertions?.map(a => this.generateAssertionComment(a)).join('\n') || '';
    
    return `${comment}\n${action}${assertions ? '\n' + assertions : ''}`;
  }
  
  /**
   * Generate action code based on step type
   */
  private generateActionCode(step: JourneyStep): string {
    switch (step.action) {
      case 'navigate':
        return `    await page.goto('${step.target}');`;
      
      case 'click':
        // Try to generate selector from target
        const clickSelector = this.generateSelector(step.target, step.component);
        return `    await page.click('${clickSelector}');`;
      
      case 'fill':
        // For form fills, we need multiple field operations
        if (step.target.includes('form inputs') || step.target.includes('credentials')) {
          return this.generateFormFillCode(step);
        }
        return `    // TODO: Fill ${step.target}`;
      
      case 'submit':
        const submitSelector = this.generateSubmitSelector(step.component);
        return `    await page.click('${submitSelector}');`;
      
      case 'verify':
        return this.generateVerificationCode(step);
      
      case 'wait':
        return `    await page.waitForTimeout(${step.target});`;
      
      default:
        return `    // TODO: ${step.action} ${step.target}`;
    }
  }
  
  /**
   * Generate form fill code
   */
  private generateFormFillCode(step: JourneyStep): string {
    const isLogin = step.component.toLowerCase().includes('login');
    const isRegister = step.component.toLowerCase().includes('register');
    
    if (isLogin) {
      return `    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');`;
    }
    
    if (isRegister) {
      return `    await page.fill('input[name="username"], input[placeholder*="username" i]', 'testuser');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');`;
    }
    
    return `    // TODO: Fill form fields for ${step.component}`;
  }
  
  /**
   * Generate verification code
   */
  private generateVerificationCode(step: JourneyStep): string {
    if (step.target.includes('authenticated') || step.target.includes('logged in')) {
      return `    // Verify authentication
    await expect(page.locator('text=/logout|sign out/i')).toBeVisible({ timeout: 5000 });`;
    }
    
    if (step.target.includes('page loaded')) {
      return `    // Verify page loaded
    await expect(page).toHaveURL(new RegExp('${this.extractRouteFromDescription(step.description)}'));`;
    }
    
    return `    // TODO: Verify ${step.target}`;
  }
  
  /**
   * Generate selector from target and component
   */
  private generateSelector(target: string, component: string): string {
    // If target is a route, generate link selector
    if (target.startsWith('/')) {
      return `a[href="${target}"]`;
    }
    
    // Generate selector based on common patterns
    if (target.includes('button') || target.includes('submit')) {
      return 'button[type="submit"]';
    }
    
    if (target.includes('link')) {
      return 'a';
    }
    
    // Fallback: use text content or target as selector
    return `text=${target}`;
  }
  
  /**
   * Generate submit button selector
   */
  private generateSubmitSelector(component: string): string {
    return 'button[type="submit"]';
  }
  
  /**
   * Generate assertion comment
   */
  private generateAssertionComment(assertion: string): string {
    return `    // Expected: ${assertion}`;
  }
  
  /**
   * Extract route from step description
   */
  private extractRouteFromDescription(description: string): string {
    const match = description.match(/\/[a-z0-9-/]+/i);
    return match ? match[0] : '';
  }
  
  /**
   * Get test file name from journey name
   */
  public getTestFileName(journeyName: string): string {
    return journeyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '.spec.ts';
  }
  
  /**
   * Generate test suite summary
   */
  generateTestSummary(journeys: E2EJourney[]): string {
    const total = journeys.length;
    const highPriority = journeys.filter(j => j.priority >= 85).length;
    const authJourneys = journeys.filter(j => j.tags.includes('auth')).length;
    const formJourneys = journeys.filter(j => j.tags.includes('form')).length;
    
    return `Generated ${total} E2E tests:
  - ${highPriority} high priority (>=85)
  - ${authJourneys} authentication flows
  - ${formJourneys} form interactions`;
  }
}
