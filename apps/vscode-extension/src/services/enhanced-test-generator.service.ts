/**
 * EnhancedTestGeneratorService
 * 
 * Generates high-quality Playwright tests from enriched journey context
 * Uses real selectors, validations, and edge cases extracted from codebase
 */
export class EnhancedTestGeneratorService {
  
  /**
   * Generate complete test suite from enriched context
   */
  async generateTest(enrichedContext: any): Promise<string> {
    const { journey, componentsAnalysis, testDataSuggestions, edgeCases } = enrichedContext;
    
    // DEBUG: Log what we received
    console.log('[EnhancedTestGen] Components:', componentsAnalysis?.length || 0);
    if (componentsAnalysis && componentsAnalysis[0]) {
      console.log('[EnhancedTestGen] First component elements:', componentsAnalysis[0].elements?.length || 0);
      console.log('[EnhancedTestGen] Elements:', JSON.stringify(componentsAnalysis[0].elements, null, 2));
    }
    
    // Build test structure
    const imports = this.generateImports();
    const describe = this.generateDescribe(journey);
    const happyPath = this.generateHappyPathTest(journey, componentsAnalysis, testDataSuggestions);
    const validationTests = this.generateValidationTests(componentsAnalysis, testDataSuggestions);
    const errorHandlingTests = this.generateErrorHandlingTests(componentsAnalysis);
    const edgeCaseTests = this.generateEdgeCaseTests(edgeCases, componentsAnalysis);
    
    return `${imports}\n\n${describe}\n${happyPath}\n${validationTests}\n${errorHandlingTests}\n${edgeCaseTests}\n});\n`;
  }
  
  /**
   * Generate imports
   */
  private generateImports(): string {
    return `import { test, expect } from '@playwright/test';`;
  }
  
  /**
   * Generate test.describe block
   */
  private generateDescribe(journey: any): string {
    return `test.describe('${journey.name}', () => {`;
  }
  
  /**
   * Generate happy path test
   */
  private generateHappyPathTest(
    journey: any,
    components: any[],
    testData: any
  ): string {
    const steps: string[] = [];
    
    // Find primary component (usually first non-navigation step)
    const primaryComponent = components.find(c => 
      c.elements.length > 0 || c.validations.length > 0
    );
    
    console.log('[EnhancedTestGen] Primary component found:', !!primaryComponent);
    if (primaryComponent) {
      console.log('[EnhancedTestGen] Primary component elements:', primaryComponent.elements.length);
    }
    
    if (!primaryComponent) {
      console.log('[EnhancedTestGen] No primary component, using basic path');
      return this.generateBasicHappyPath(journey);
    }
    
    // Generate test steps
    steps.push(`  test('should successfully complete ${journey.name.toLowerCase()}', async ({ page }) => {`);
    
    // Navigate to route
    const route = this.extractRoute(journey);
    steps.push(`    // Navigate to ${route}`);
    steps.push(`    await page.goto('${route}');`);
    steps.push('');
    
    // Check page loaded with form/elements visible
    const formSelector = this.findFormSelector(primaryComponent);
    if (formSelector) {
      steps.push(`    // Verify form is visible`);
      steps.push(`    await expect(page.locator('${formSelector}')).toBeVisible();`);
      steps.push('');
    }
    
    // Fill form fields with valid test data
    // Accept any element that has input-related selectors (id, name, placeholder, type="text"/"password")
    const inputElements = primaryComponent.elements.filter((e: any) => {
      // Exclude forms, buttons, and checkboxes
      const elementType = (e.elementType || '').toLowerCase();
      if (['form', 'button', 'a', 'div', 'span'].includes(elementType)) return false;
      
      // Exclude elements with selectors that indicate non-input (form names, button names)
      const hasFormLikeName = e.allSelectors?.some((s: any) => 
        s.type === 'name' && (s.value.includes('form') || s.value === 'remember')
      );
      if (hasFormLikeName) return false;
      
      // Accept explicit input elements
      if (e.elementType === 'input') return true;
      
      // Accept elements with input-like selectors (e.g. FormInputWrapper with id/name)
      const hasInputSelector = e.allSelectors?.some((s: any) => 
        s.type === 'id' || 
        s.type === 'placeholder' ||
        (s.type === 'name' && !s.value.includes('form')) || // name but not form-related
        (s.type === 'attribute' && (s.value.includes('type="text"') || s.value.includes('type="password"') || s.value.includes('type="email"')))
      );
      
      return hasInputSelector;
    });
    if (inputElements.length > 0) {
      steps.push(`    // Fill form fields`);
      
      // De-duplicate inputs by field name (e.g. #username and [name="username"] are same field)
      const uniqueInputs = new Map<string, any>();
      for (const input of inputElements) {
        // Extract field identifier from selector
        const fieldMatch = input.bestSelector.match(/(?:#|\[name=")([^"\]]+)/);
        const fieldName = fieldMatch ? fieldMatch[1] : input.bestSelector;
        
        // Keep only the first occurrence (usually best selector)
        if (!uniqueInputs.has(fieldName)) {
          uniqueInputs.set(fieldName, input);
        }
      }
      
      for (const input of uniqueInputs.values()) {
        const testValue = this.getTestValue(input, testData.validTestData);
        steps.push(`    await page.fill('${input.bestSelector}', '${testValue}');`);
      }
      
      // FALLBACK: If we only detected username but no password, add common password selectors
      if (uniqueInputs.size === 1 && uniqueInputs.has('username')) {
        steps.push(`    await page.fill('[name="password"]', 'SecurePassword123'); // Fallback: common password selector`);
      }
      
      steps.push('');
    }
    
    // Submit form
    const submitButton = this.findSubmitButton(primaryComponent);
    if (submitButton) {
      steps.push(`    // Submit form`);
      steps.push(`    await page.click('${submitButton}');`);
      steps.push('');
    } else {
      // FALLBACK: Try common submit button selectors
      steps.push(`    // Submit form (fallback selector)`);
      steps.push(`    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Submit")');`);
      steps.push('');
    }
    
    // Check for API call
    const apiCall = primaryComponent.apiCalls[0];
    if (apiCall) {
      steps.push(`    // Wait for API call`);
      steps.push(`    const responsePromise = page.waitForResponse(`);
      steps.push(`      resp => resp.url().includes('${apiCall.endpoint}') && resp.request().method() === '${apiCall.method}'`);
      steps.push(`    );`);
      steps.push('');
      steps.push(`    const response = await responsePromise;`);
      steps.push(`    expect(response.status()).toBe(200);`);
      steps.push('');
    }
    
    // Check for navigation on success
    if (primaryComponent.navigationFlow?.onSuccess) {
      steps.push(`    // Verify successful navigation`);
      steps.push(`    await expect(page).toHaveURL('${primaryComponent.navigationFlow.onSuccess}', { timeout: 5000 });`);
    }
    
    steps.push(`  });\n`);
    
    return steps.join('\n');
  }
  
  /**
   * Generate validation tests from component validations
   */
  private generateValidationTests(components: any[], testData: any): string {
    const tests: string[] = [];
    
    tests.push(`  // ============================================`);
    tests.push(`  // VALIDATION TESTS (Auto-generated from code)`);
    tests.push(`  // ============================================\n`);
    
    for (const component of components) {
      for (const validation of component.validations) {
        for (const rule of validation.rules) {
          const invalidData = testData.invalidTestData[`${validation.fieldName}_${rule.type}`];
          if (!invalidData) continue;
          
          const testName = `Validation - ${this.formatRuleMessage(rule)}`;
          tests.push(`  test('${testName}', async ({ page }) => {`);
          tests.push(`    await page.goto('${this.extractRouteFromComponent(component)}');`);
          tests.push('');
          
          // Fill invalid data
          const inputSelector = this.findInputSelector(component, validation.fieldName);
          if (inputSelector) {
            tests.push(`    // Enter invalid ${validation.fieldName}`);
            tests.push(`    await page.fill('${inputSelector}', '${invalidData[validation.fieldName]}');`);
            
            // Try to submit
            const submitBtn = this.findSubmitButton(component);
            if (submitBtn) {
              tests.push(`    await page.click('${submitBtn}');`);
            }
            tests.push('');
            
            // Verify error message
            if (invalidData.errorSelector) {
              tests.push(`    // Verify error message (extracted from code: "${rule.errorMessage}")`);
              tests.push(`    await expect(page.locator('${invalidData.errorSelector}'))`);
              tests.push(`      .toContainText('${rule.errorMessage}');`);
            }
          }
          
          tests.push(`  });\n`);
        }
      }
    }
    
    return tests.join('\n');
  }
  
  /**
   * Generate error handling tests
   */
  private generateErrorHandlingTests(components: any[]): string {
    const tests: string[] = [];
    
    tests.push(`  // ============================================`);
    tests.push(`  // ERROR HANDLING TESTS`);
    tests.push(`  // ============================================\n`);
    
    for (const component of components) {
      for (const apiCall of component.apiCalls) {
        if (apiCall.errorHandling) {
          // API error test
          tests.push(`  test('API Error - ${apiCall.method} ${apiCall.endpoint} fails', async ({ page }) => {`);
          tests.push(`    await page.goto('${this.extractRouteFromComponent(component)}');`);
          tests.push('');
          tests.push(`    // Mock API error response`);
          tests.push(`    await page.route('**${apiCall.endpoint}', route => {`);
          tests.push(`      route.fulfill({`);
          tests.push(`        status: 401,`);
          tests.push(`        contentType: 'application/json',`);
          tests.push(`        body: JSON.stringify({ message: 'Unauthorized' })`);
          tests.push(`      });`);
          tests.push(`    });`);
          tests.push('');
          
          // Fill and submit
          tests.push(`    // Fill form and submit`);
          const inputs = component.elements.filter((e: any) => e.elementType === 'input');
          for (const input of inputs.slice(0, 2)) {
            tests.push(`    await page.fill('${input.bestSelector}', 'test-value');`);
          }
          
          const submitBtn = this.findSubmitButton(component);
          if (submitBtn) {
            tests.push(`    await page.click('${submitBtn}');`);
          }
          tests.push('');
          
          // Verify error displayed
          if (apiCall.errorHandling.errorSelector) {
            tests.push(`    // Verify error message is displayed`);
            tests.push(`    await expect(page.locator('${apiCall.errorHandling.errorSelector}'))`);
            tests.push(`      .toBeVisible();`);
          }
          
          tests.push(`  });\n`);
        }
      }
    }
    
    return tests.join('\n');
  }
  
  /**
   * Generate edge case tests
   */
  private generateEdgeCaseTests(edgeCases: string[], components: any[]): string {
    const tests: string[] = [];
    
    tests.push(`  // ============================================`);
    tests.push(`  // EDGE CASES`);
    tests.push(`  // ============================================\n`);
    
    // Generate tests for identified edge cases
    for (const edgeCase of edgeCases.slice(0, 3)) { // Limit to top 3
      const testName = edgeCase.replace(/^.+?: /, '');
      tests.push(`  test('Edge case - ${testName}', async ({ page }) => {`);
      tests.push(`    // TODO: Implement edge case test`);
      tests.push(`    // ${edgeCase}`);
      tests.push(`  });\n`);
    }
    
    return tests.join('\n');
  }
  
  /**
   * Generate basic happy path when no components found
   */
  private generateBasicHappyPath(journey: any): string {
    const route = this.extractRoute(journey);
    return `  test('should complete ${journey.name.toLowerCase()}', async ({ page }) => {
    await page.goto('${route}');
    // TODO: Add assertions
  });\n`;
  }
  
  /**
   * Helper: Extract route from journey
   */
  private extractRoute(journey: any): string {
    const navStep = journey.steps.find((s: any) => s.action === 'navigate');
    return navStep?.target || '/';
  }
  
  /**
   * Helper: Extract route from component
   */
  private extractRouteFromComponent(component: any): string {
    // Try to infer from component path
    const path = component.component;
    if (path.includes('/pages/') || path.includes('/app/')) {
      const match = path.match(/\/(pages|app)\/(.+?)\.(tsx?|jsx?)/);
      if (match) {
        return '/' + match[2].replace(/\/index$/, '');
      }
    }
    return '/';
  }
  
  /**
   * Helper: Find form selector
   */
  private findFormSelector(component: any): string | undefined {
    const form = component.elements.find((e: any) => e.elementType === 'form');
    return form?.bestSelector;
  }
  
  /**
   * Helper: Find submit button
   */
  private findSubmitButton(component: any): string | undefined {
    const button = component.elements.find((e: any) => 
      e.elementType === 'button' && 
      (e.context?.includes('type="submit"') || e.bestSelector.includes('submit'))
    );
    return button?.bestSelector;
  }
  
  /**
   * Helper: Find input selector for field
   */
  private findInputSelector(component: any, fieldName: string): string | undefined {
    const input = component.elements.find((e: any) => 
      e.elementType === 'input' && 
      (e.bestSelector.includes(fieldName) || e.context?.includes(fieldName))
    );
    return input?.bestSelector;
  }
  
  /**
   * Helper: Get test value for input
   */
  private getTestValue(input: any, validTestData: any): string {
    // Try to match by selector name
    for (const [key, value] of Object.entries(validTestData)) {
      if (input.bestSelector.toLowerCase().includes(key.toLowerCase())) {
        return String(value);
      }
    }
    
    // Fallback: Generate value based on input type/placeholder
    const selector = input.bestSelector.toLowerCase();
    const context = (input.context || '').toLowerCase();
    
    if (selector.includes('email') || context.includes('type="email"')) {
      return 'test.user@example.com';
    }
    if (selector.includes('password')) {
      return 'SecurePassword123';
    }
    if (selector.includes('username') || selector.includes('user')) {
      return 'testuser';
    }
    if (selector.includes('name')) {
      return 'Test User';
    }
    if (selector.includes('phone') || selector.includes('tel')) {
      return '1234567890';
    }
    
    // Generic fallback
    return 'test-value';
  }
  
  /**
   * Helper: Format validation rule message
   */
  private formatRuleMessage(rule: any): string {
    return rule.errorMessage || `${rule.field} ${rule.type}`;
  }
  
  /**
   * Get test filename
   */
  getTestFileName(journeyName: string): string {
    const slug = journeyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${slug}.spec.ts`;
  }
}
