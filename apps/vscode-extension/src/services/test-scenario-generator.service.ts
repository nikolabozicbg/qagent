/**
 * Test Scenario Generator
 * 
 * Analyzes enriched journey context and generates comprehensive test scenarios:
 * - Happy path (main flow)
 * - Validation tests (field constraints)
 * - Error scenarios (API failures, network issues)
 * - Edge cases (boundary conditions, special inputs)
 */

export interface TestScenario {
  type: 'happy-path' | 'validation' | 'error' | 'edge-case';
  name: string;
  description: string;
  steps: ScenarioStep[];
}

export interface ScenarioStep {
  action: string;
  target?: string;
  value?: any;
  expectedResult?: string;
  mockResponse?: any;
}

export class TestScenarioGeneratorService {
  
  /**
   * Generate all test scenarios from enriched journey
   */
  generateScenarios(enrichedJourney: any): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    // 1. Happy path (always first)
    scenarios.push(this.generateHappyPath(enrichedJourney));
    
    // 2. Validation tests (from field validations)
    scenarios.push(...this.generateValidationTests(enrichedJourney));
    
    // 3. Error scenarios (from API calls)
    scenarios.push(...this.generateErrorScenarios(enrichedJourney));
    
    // 4. Edge cases (from edge case list + heuristics)
    scenarios.push(...this.generateEdgeCases(enrichedJourney));
    
    return scenarios;
  }
  
  /**
   * Generate happy path scenario
   */
  private generateHappyPath(journey: any): TestScenario {
    const steps: ScenarioStep[] = [];
    
    // Get journey steps or synthesize from enrichedData
    if (journey.steps && journey.steps.length > 0) {
      // Use existing steps
      steps.push(...journey.steps.map((s: any) => ({
        action: s.action,
        target: s.target,
        value: s.testValue,
        expectedResult: s.description
      })));
    } else if (journey.enrichedData?.components) {
      // Synthesize from components
      for (const comp of journey.enrichedData.components) {
        // Navigate (if first component)
        if (comp === journey.enrichedData.components[0]) {
          steps.push({
            action: 'navigate',
            target: this.inferRouteFromComponent(comp.path),
            expectedResult: 'Page loads successfully'
          });
        }
        
        // Fill fields
        if (comp.fields && comp.fields.length > 0) {
          for (const field of comp.fields) {
            if (this.isInputField(field.type)) {
              steps.push({
                action: 'fill',
                target: field.selector,
                value: this.generateValidTestData(field, comp.validations),
                expectedResult: `${field.selector} filled`
              });
            }
          }
        }
        
        // Submit
        const submitButton = comp.fields?.find((f: any) => 
          f.type?.toLowerCase().includes('button') || 
          f.selector?.includes('submit')
        );
        
        if (submitButton || comp.apis?.length > 0) {
          steps.push({
            action: 'submit',
            target: submitButton?.selector || 'button[type="submit"]',
            expectedResult: 'Form submitted successfully'
          });
        }
        
        // Validate API calls
        if (comp.apis && comp.apis.length > 0) {
          for (const api of comp.apis) {
            steps.push({
              action: 'verify-api',
              target: `${api.method} ${api.endpoint}`,
              expectedResult: `API responds with success status`
            });
          }
        }
      }
    }
    
    return {
      type: 'happy-path',
      name: `should successfully complete ${journey.name.toLowerCase()}`,
      description: `Complete happy path for ${journey.name}`,
      steps
    };
  }
  
  /**
   * Generate validation test scenarios
   */
  private generateValidationTests(journey: any): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    if (!journey.enrichedData?.components) return scenarios;
    
    for (const comp of journey.enrichedData.components) {
      if (!comp.validations || comp.validations.length === 0) continue;
      
      for (const validation of comp.validations) {
        // For each validation rule, create a test
        for (const rule of validation.rules || []) {
          const scenario = this.createValidationScenario(
            journey,
            comp,
            validation.fieldName,
            rule
          );
          if (scenario) scenarios.push(scenario);
        }
      }
    }
    
    return scenarios;
  }
  
  /**
   * Create single validation scenario
   */
  private createValidationScenario(
    journey: any,
    component: any,
    fieldName: string,
    rule: any
  ): TestScenario | null {
    const field = component.fields?.find((f: any) => 
      f.selector?.includes(fieldName) || 
      f.selector === `#${fieldName}` ||
      f.selector === `[name="${fieldName}"]`
    );
    
    if (!field) return null;
    
    const ruleType = rule.type || 'unknown';
    const invalidValue = this.getInvalidValueForRule(ruleType, rule);
    
    return {
      type: 'validation',
      name: `should show error for ${ruleType} validation on ${fieldName}`,
      description: `Test ${fieldName} field ${ruleType} validation`,
      steps: [
        {
          action: 'navigate',
          target: this.inferRouteFromComponent(component.path)
        },
        {
          action: 'fill',
          target: field.selector,
          value: invalidValue,
          expectedResult: `Validation error displayed`
        },
        {
          action: 'submit',
          target: 'button[type="submit"]',
          expectedResult: `Form not submitted`
        },
        {
          action: 'verify',
          expectedResult: rule.errorMessage || `Error message shown for ${fieldName}`
        }
      ]
    };
  }
  
  /**
   * Generate error scenario tests
   */
  private generateErrorScenarios(journey: any): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    if (!journey.enrichedData?.components) return scenarios;
    
    for (const comp of journey.enrichedData.components) {
      if (!comp.apis || comp.apis.length === 0) continue;
      
      for (const api of comp.apis) {
        // Scenario 1: Server error (500)
        scenarios.push({
          type: 'error',
          name: `should handle server error for ${api.endpoint}`,
          description: `Test error handling when API returns 500`,
          steps: [
            {
              action: 'mock-api',
              target: api.endpoint,
              mockResponse: { status: 500, body: { error: 'Internal server error' } }
            },
            {
              action: 'fill-and-submit',
              expectedResult: 'Error message displayed to user'
            }
          ]
        });
        
        // Scenario 2: Network timeout
        scenarios.push({
          type: 'error',
          name: `should handle network timeout for ${api.endpoint}`,
          description: `Test timeout handling`,
          steps: [
            {
              action: 'mock-api',
              target: api.endpoint,
              mockResponse: { timeout: true }
            },
            {
              action: 'fill-and-submit',
              expectedResult: 'Timeout error shown'
            }
          ]
        });
        
        // Scenario 3: Business logic error (e.g., 409 Conflict)
        if (api.method === 'POST' && api.endpoint.includes('register')) {
          scenarios.push({
            type: 'error',
            name: `should handle duplicate registration`,
            description: `Test error when email already exists`,
            steps: [
              {
                action: 'mock-api',
                target: api.endpoint,
                mockResponse: { status: 409, body: { error: 'Email already exists' } }
              },
              {
                action: 'fill-and-submit',
                expectedResult: 'Duplicate email error shown'
              }
            ]
          });
        }
      }
    }
    
    return scenarios;
  }
  
  /**
   * Generate edge case tests
   */
  private generateEdgeCases(journey: any): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    // Edge cases from enrichedData
    if (journey.enrichedData?.edgeCases) {
      for (const edgeCase of journey.enrichedData.edgeCases) {
        scenarios.push({
          type: 'edge-case',
          name: `should handle: ${edgeCase.toLowerCase()}`,
          description: edgeCase,
          steps: [
            {
              action: 'test-edge-case',
              expectedResult: edgeCase
            }
          ]
        });
      }
    }
    
    // Generate additional edge cases from fields
    if (journey.enrichedData?.components) {
      for (const comp of journey.enrichedData.components) {
        if (!comp.fields) continue;
        
        for (const field of comp.fields) {
          if (!this.isInputField(field.type)) continue;
          
          // Edge case: Very long input
          scenarios.push({
            type: 'edge-case',
            name: `should handle very long input for ${field.selector}`,
            description: `Test maximum length handling`,
            steps: [
              {
                action: 'fill',
                target: field.selector,
                value: 'a'.repeat(1000),
                expectedResult: 'Either accepts or shows max length error'
              }
            ]
          });
          
          // Edge case: Special characters
          if (field.type?.includes('text') || field.type?.includes('email')) {
            scenarios.push({
              type: 'edge-case',
              name: `should handle special characters in ${field.selector}`,
              description: `Test special character handling`,
              steps: [
                {
                  action: 'fill',
                  target: field.selector,
                  value: 'test@user#123!$%',
                  expectedResult: 'Gracefully accepts or rejects'
                }
              ]
            });
          }
        }
      }
    }
    
    return scenarios;
  }
  
  /**
   * Helper: Infer route from component path
   */
  private inferRouteFromComponent(componentPath: string): string {
    const lower = componentPath.toLowerCase();
    
    if (lower.includes('login')) return '/login';
    if (lower.includes('register')) return '/register';
    if (lower.includes('profile')) return '/profile';
    if (lower.includes('dashboard')) return '/dashboard';
    if (lower.includes('home')) return '/';
    
    return '/';
  }
  
  /**
   * Helper: Check if field is input
   */
  private isInputField(type: string): boolean {
    if (!type) return false;
    const lower = type.toLowerCase();
    return lower.includes('input') || lower.includes('text') || lower.includes('email') || lower.includes('password');
  }
  
  /**
   * Helper: Generate valid test data
   */
  private generateValidTestData(field: any, validations: any[]): string {
    const selector = field.selector || '';
    
    if (selector.includes('email')) return 'test@example.com';
    if (selector.includes('password')) return 'SecurePass123!';
    if (selector.includes('username')) return 'testuser';
    if (selector.includes('name')) return 'Test User';
    if (selector.includes('phone')) return '+1234567890';
    
    return 'Valid Input';
  }
  
  /**
   * Helper: Get invalid value for validation rule
   */
  private getInvalidValueForRule(ruleType: string, rule: any): string {
    switch (ruleType) {
      case 'required':
        return '';
      case 'email':
        return 'not-an-email';
      case 'min':
        return 'x'; // Too short
      case 'max':
        return 'x'.repeat(1000); // Too long
      case 'pattern':
      case 'regex':
        return 'invalid@@@';
      case 'custom':
        return '   '; // Whitespace
      default:
        return 'invalid';
    }
  }
}
