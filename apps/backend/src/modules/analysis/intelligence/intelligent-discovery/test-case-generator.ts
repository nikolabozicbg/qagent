/**
 * Test Case Generator
 * 
 * Generates test cases from classified forms using rule-based strategies.
 * Produces happy-path, validation, error, and edge case tests.
 * 
 * PRINCIPLES:
 * - Based on form purpose, not hardcoded form names
 * - Generates multiple case types per form
 * - Uses classified field semantics for realistic test data
 * - No app-specific logic
 */

import {
  ClassifiedForm,
  ClassifiedField,
  TestCase,
  TestStep,
  SuiteCluster,
  TestSuite,
  CaseType,
} from './types';

// ============================================================================
// TEST DATA GENERATION
// ============================================================================

/**
 * Generate realistic test value for a field based on semantic type
 */
function generateFieldValue(field: ClassifiedField, variant: 'valid' | 'invalid' | 'edge' | 'empty'): string {
  const { testValues } = field;
  
  switch (variant) {
    case 'valid':
      return testValues.valid;
    case 'invalid':
      return testValues.invalid[0] || '';
    case 'edge':
      return testValues.edge[0] || testValues.valid;
    case 'empty':
      return '';
    default:
      return testValues.valid;
  }
}

/**
 * Generate a human-readable case name
 */
function generateCaseName(formPurpose: string, caseType: CaseType, variant?: string): string {
  const purposeMap: Record<string, string> = {
    'AUTH_LOGIN': 'login',
    'AUTH_REGISTER': 'register',
    'AUTH_FORGOT_PASSWORD': 'request password reset',
    'AUTH_RESET_PASSWORD': 'reset password',
    'PROFILE_EDIT': 'update profile',
    'CONTACT_FORM': 'submit contact form',
    'SEARCH_FORM': 'search',
    'BANK_ACCOUNT_CREATE': 'add bank account',
    'PAYMENT_FORM': 'make payment',
    'TRANSACTION_CREATE': 'create transaction',
    'CHECKOUT_ADDRESS': 'enter shipping address',
    'PRODUCT_CREATE': 'create product',
    'CRUD_CREATE': 'create record',
    'CRUD_EDIT': 'update record',
  };
  
  const action = purposeMap[formPurpose] || 'submit form';
  
  switch (caseType) {
    case 'happy-path':
      return `User can ${action} with valid data`;
    case 'validation':
      return `User cannot ${action} with ${variant || 'invalid'} data`;
    case 'error':
      return `System handles ${action} error gracefully`;
    case 'edge':
      return `${action.charAt(0).toUpperCase() + action.slice(1)} handles edge case: ${variant}`;
    case 'security':
      return `${action.charAt(0).toUpperCase() + action.slice(1)} is protected against ${variant}`;
    default:
      return `User can ${action}`;
  }
}

// ============================================================================
// STEP GENERATION
// ============================================================================

/**
 * Generate a navigate step
 */
function createNavigateStep(url: string): TestStep {
  return {
    action: 'navigate',
    target: url,
    value: null,
    selector: null,
    description: `Navigate to ${url}`,
  };
}

/**
 * Generate a fill step for a field
 */
function createFillStep(field: ClassifiedField, value: string): TestStep {
  const primarySelector = field.selectors[0];
  
  return {
    action: 'fill',
    target: {
      semantic: field.semantic.type,
      resolved: field.raw.name || field.raw.id || 'unknown',
    },
    value,
    selector: {
      primary: primarySelector?.selector || `[name="${field.raw.name}"]`,
      candidates: field.selectors,
      confidence: primarySelector?.score || 50,
    },
    description: `Enter ${field.semantic.type.toLowerCase()} "${value}"`,
  };
}

/**
 * Generate a click step
 */
function createClickStep(selector: string, description: string): TestStep {
  return {
    action: 'click',
    target: selector,
    value: null,
    selector: {
      primary: selector,
      candidates: [],
      confidence: 70,
    },
    description,
  };
}

/**
 * Generate an assertion step
 */
function createAssertStep(type: string, target: string, expected: string): TestStep {
  return {
    action: 'assert',
    target,
    value: expected,
    selector: null,
    description: `Verify ${type}: ${expected}`,
    assertion: {
      type,
      expected,
    },
  };
}

// ============================================================================
// CASE GENERATION RULES
// ============================================================================

interface CaseGenerationRule {
  caseType: CaseType;
  appliesTo: (form: ClassifiedForm) => boolean;
  generate: (form: ClassifiedForm) => TestCase[];
}

/**
 * Rule: Generate happy-path case for all forms
 */
const happyPathRule: CaseGenerationRule = {
  caseType: 'happy-path',
  appliesTo: () => true,
  generate(form: ClassifiedForm): TestCase[] {
    const steps: TestStep[] = [];
    
    // Navigate to form
    const url = form.raw.route || form.raw.url || '/';
    steps.push(createNavigateStep(url));
    
    // Fill all fields with valid data
    for (const field of form.fields) {
      const value = generateFieldValue(field, 'valid');
      steps.push(createFillStep(field, value));
    }
    
    // Submit
    const submitSelector = form.raw.submitSelector || 'button[type="submit"]';
    steps.push(createClickStep(submitSelector, 'Submit form'));
    
    // Assert success (generic - will be refined by form purpose)
    const successAssertions = getSuccessAssertions(form.purpose.type);
    for (const assertion of successAssertions) {
      steps.push(createAssertStep(assertion.type, assertion.target, assertion.expected));
    }
    
    return [{
      id: `case-${form.purpose.type.toLowerCase()}-happy`,
      name: generateCaseName(form.purpose.type, 'happy-path'),
      classification: {
        type: 'happy-path',
        confidence: 0.95,
        derivedFrom: {
          formPurpose: form.purpose.type,
          rule: 'happy-path-rule',
        },
      },
      preconditions: getPreconditions(form.purpose.type),
      steps,
      expectedOutcome: {
        success: true,
        description: getExpectedOutcome(form.purpose.type, true),
      },
      priority: 'high',
    }];
  },
};

/**
 * Rule: Generate validation error cases for forms with required fields
 */
const validationRule: CaseGenerationRule = {
  caseType: 'validation',
  appliesTo: (form) => form.fields.length > 0,
  generate(form: ClassifiedForm): TestCase[] {
    const cases: TestCase[] = [];
    
    // Case 1: Empty form submission
    const emptySteps: TestStep[] = [
      createNavigateStep(form.raw.route || form.raw.url || '/'),
      createClickStep(form.raw.submitSelector || 'button[type="submit"]', 'Submit empty form'),
      createAssertStep('validation', 'form', 'shows validation errors'),
    ];
    
    cases.push({
      id: `case-${form.purpose.type.toLowerCase()}-empty`,
      name: generateCaseName(form.purpose.type, 'validation', 'empty fields'),
      classification: {
        type: 'validation',
        confidence: 0.9,
        derivedFrom: {
          formPurpose: form.purpose.type,
          rule: 'validation-empty-rule',
        },
      },
      preconditions: getPreconditions(form.purpose.type),
      steps: emptySteps,
      expectedOutcome: {
        success: false,
        description: 'Form shows validation errors for required fields',
      },
      priority: 'medium',
    });
    
    // Case 2: Individual invalid fields
    for (const field of form.fields) {
      if (field.testValues.invalid.length === 0) continue;
      
      const invalidSteps: TestStep[] = [
        createNavigateStep(form.raw.route || form.raw.url || '/'),
      ];
      
      // Fill all fields with valid data except this one
      for (const f of form.fields) {
        const value = f === field 
          ? generateFieldValue(f, 'invalid')
          : generateFieldValue(f, 'valid');
        invalidSteps.push(createFillStep(f, value));
      }
      
      invalidSteps.push(createClickStep(form.raw.submitSelector || 'button[type="submit"]', 'Submit form'));
      invalidSteps.push(createAssertStep('validation', field.semantic.type.toLowerCase(), `shows invalid ${field.semantic.type.toLowerCase()} error`));
      
      cases.push({
        id: `case-${form.purpose.type.toLowerCase()}-invalid-${field.semantic.type.toLowerCase()}`,
        name: generateCaseName(form.purpose.type, 'validation', `invalid ${field.semantic.type.toLowerCase()}`),
        classification: {
          type: 'validation',
          confidence: 0.85,
          derivedFrom: {
            formPurpose: form.purpose.type,
            rule: 'validation-invalid-field-rule',
            field: field.semantic.type,
          },
        },
        preconditions: getPreconditions(form.purpose.type),
        steps: invalidSteps,
        expectedOutcome: {
          success: false,
          description: `Form shows validation error for invalid ${field.semantic.type.toLowerCase()}`,
        },
        priority: 'medium',
      });
    }
    
    return cases;
  },
};

/**
 * Rule: Generate edge cases for specific field types
 */
const edgeCaseRule: CaseGenerationRule = {
  caseType: 'edge',
  appliesTo: (form) => form.fields.some(f => f.testValues.edge.length > 0),
  generate(form: ClassifiedForm): TestCase[] {
    const cases: TestCase[] = [];
    
    // Edge case for long input
    const hasLongFields = form.fields.some(f => 
      ['USERNAME', 'EMAIL', 'DESCRIPTION', 'MESSAGE', 'SEARCH'].includes(f.semantic.type)
    );
    
    if (hasLongFields) {
      const edgeSteps: TestStep[] = [
        createNavigateStep(form.raw.route || form.raw.url || '/'),
      ];
      
      for (const field of form.fields) {
        const value = generateFieldValue(field, 'edge');
        edgeSteps.push(createFillStep(field, value));
      }
      
      edgeSteps.push(createClickStep(form.raw.submitSelector || 'button[type="submit"]', 'Submit form'));
      
      cases.push({
        id: `case-${form.purpose.type.toLowerCase()}-edge-long-input`,
        name: generateCaseName(form.purpose.type, 'edge', 'long input values'),
        classification: {
          type: 'edge',
          confidence: 0.7,
          derivedFrom: {
            formPurpose: form.purpose.type,
            rule: 'edge-long-input-rule',
          },
        },
        preconditions: getPreconditions(form.purpose.type),
        steps: edgeSteps,
        expectedOutcome: {
          success: true,
          description: 'Form handles long input values gracefully',
        },
        priority: 'low',
      });
    }
    
    return cases;
  },
};

/**
 * Rule: Generate auth-specific test cases
 */
const authSpecificRule: CaseGenerationRule = {
  caseType: 'error',
  appliesTo: (form) => form.domain.primary === 'Authentication',
  generate(form: ClassifiedForm): TestCase[] {
    const cases: TestCase[] = [];
    
    if (form.purpose.type === 'AUTH_LOGIN') {
      // Invalid credentials case
      const invalidCredSteps: TestStep[] = [
        createNavigateStep(form.raw.route || form.raw.url || '/'),
      ];
      
      for (const field of form.fields) {
        let value = generateFieldValue(field, 'valid');
        // Use wrong password
        if (field.semantic.type === 'PASSWORD') {
          value = 'WrongPassword123!';
        }
        invalidCredSteps.push(createFillStep(field, value));
      }
      
      invalidCredSteps.push(createClickStep(form.raw.submitSelector || 'button[type="submit"]', 'Submit login'));
      invalidCredSteps.push(createAssertStep('error', 'message', 'shows invalid credentials error'));
      
      cases.push({
        id: 'case-auth-login-invalid-credentials',
        name: 'User cannot login with invalid credentials',
        classification: {
          type: 'error',
          confidence: 0.9,
          derivedFrom: {
            formPurpose: 'AUTH_LOGIN',
            rule: 'auth-invalid-credentials-rule',
          },
        },
        preconditions: [],
        steps: invalidCredSteps,
        expectedOutcome: {
          success: false,
          description: 'Shows invalid credentials error message',
        },
        priority: 'high',
      });
    }
    
    if (form.purpose.type === 'AUTH_REGISTER') {
      // Password mismatch case (if confirm password exists)
      const hasConfirmPassword = form.fields.some(f => f.semantic.type === 'CONFIRM_PASSWORD');
      
      if (hasConfirmPassword) {
        const mismatchSteps: TestStep[] = [
          createNavigateStep(form.raw.route || form.raw.url || '/'),
        ];
        
        for (const field of form.fields) {
          let value = generateFieldValue(field, 'valid');
          if (field.semantic.type === 'CONFIRM_PASSWORD') {
            value = 'DifferentPassword456!';
          }
          mismatchSteps.push(createFillStep(field, value));
        }
        
        mismatchSteps.push(createClickStep(form.raw.submitSelector || 'button[type="submit"]', 'Submit registration'));
        mismatchSteps.push(createAssertStep('validation', 'password', 'shows password mismatch error'));
        
        cases.push({
          id: 'case-auth-register-password-mismatch',
          name: 'User cannot register with mismatched passwords',
          classification: {
            type: 'validation',
            confidence: 0.9,
            derivedFrom: {
              formPurpose: 'AUTH_REGISTER',
              rule: 'auth-password-mismatch-rule',
            },
          },
          preconditions: [],
          steps: mismatchSteps,
          expectedOutcome: {
            success: false,
            description: 'Shows password mismatch validation error',
          },
          priority: 'high',
        });
      }
    }
    
    return cases;
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSuccessAssertions(formPurpose: string): Array<{ type: string; target: string; expected: string }> {
  const assertionMap: Record<string, Array<{ type: string; target: string; expected: string }>> = {
    'AUTH_LOGIN': [
      { type: 'redirect', target: 'url', expected: 'redirects to dashboard or home' },
      { type: 'element', target: 'user-menu', expected: 'shows logged in user' },
    ],
    'AUTH_REGISTER': [
      { type: 'redirect', target: 'url', expected: 'redirects to login or dashboard' },
      { type: 'message', target: 'success', expected: 'shows success message' },
    ],
    'AUTH_FORGOT_PASSWORD': [
      { type: 'message', target: 'success', expected: 'shows email sent message' },
    ],
    'PROFILE_EDIT': [
      { type: 'message', target: 'success', expected: 'shows profile updated message' },
    ],
    'BANK_ACCOUNT_CREATE': [
      { type: 'message', target: 'success', expected: 'shows account added message' },
      { type: 'element', target: 'account-list', expected: 'shows new account in list' },
    ],
    'TRANSACTION_CREATE': [
      { type: 'message', target: 'success', expected: 'shows transaction created message' },
    ],
  };
  
  return assertionMap[formPurpose] || [
    { type: 'message', target: 'success', expected: 'shows success message' },
  ];
}

function getPreconditions(formPurpose: string): string[] {
  const preconditionMap: Record<string, string[]> = {
    'AUTH_LOGIN': ['User account exists'],
    'AUTH_REGISTER': ['User is not already registered'],
    'AUTH_FORGOT_PASSWORD': ['User account exists'],
    'AUTH_RESET_PASSWORD': ['User has valid reset token'],
    'PROFILE_EDIT': ['User is logged in'],
    'BANK_ACCOUNT_CREATE': ['User is logged in'],
    'TRANSACTION_CREATE': ['User is logged in', 'User has bank account'],
    'CHECKOUT_ADDRESS': ['User has items in cart'],
    'PAYMENT_FORM': ['User is in checkout flow'],
  };
  
  return preconditionMap[formPurpose] || [];
}

function getExpectedOutcome(formPurpose: string, success: boolean): string {
  if (!success) {
    return 'Form shows appropriate error message';
  }
  
  const outcomeMap: Record<string, string> = {
    'AUTH_LOGIN': 'User is logged in and redirected to dashboard',
    'AUTH_REGISTER': 'User account is created successfully',
    'AUTH_FORGOT_PASSWORD': 'Password reset email is sent',
    'AUTH_RESET_PASSWORD': 'Password is updated successfully',
    'PROFILE_EDIT': 'Profile is updated successfully',
    'BANK_ACCOUNT_CREATE': 'Bank account is added to user profile',
    'TRANSACTION_CREATE': 'Transaction is created and visible in history',
    'CHECKOUT_ADDRESS': 'Shipping address is saved and checkout continues',
    'PAYMENT_FORM': 'Payment is processed successfully',
    'CONTACT_FORM': 'Message is sent successfully',
    'SEARCH_FORM': 'Search results are displayed',
  };
  
  return outcomeMap[formPurpose] || 'Form submission is successful';
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

const allRules: CaseGenerationRule[] = [
  happyPathRule,
  validationRule,
  edgeCaseRule,
  authSpecificRule,
];

/**
 * Generate test cases for a single form
 */
export function generateTestCases(form: ClassifiedForm): TestCase[] {
  const cases: TestCase[] = [];
  
  for (const rule of allRules) {
    if (rule.appliesTo(form)) {
      const generatedCases = rule.generate(form);
      cases.push(...generatedCases);
    }
  }
  
  return cases;
}

/**
 * Generate test suites from suite clusters
 */
export function generateTestSuites(clusters: SuiteCluster[]): TestSuite[] {
  return clusters.map(cluster => {
    const allCases: TestCase[] = [];
    
    // Generate cases for each form in the cluster
    for (const form of cluster.forms) {
      const formCases = generateTestCases(form);
      allCases.push(...formCases);
    }
    
    // Deduplicate cases by ID
    const uniqueCases = Array.from(
      new Map(allCases.map(c => [c.id, c])).values()
    );
    
    // Calculate suite-level confidence
    const avgCaseConfidence = uniqueCases.length > 0
      ? uniqueCases.reduce((sum, c) => sum + c.classification.confidence, 0) / uniqueCases.length
      : 0;
    
    return {
      id: cluster.id,
      name: cluster.name,
      domain: cluster.domain,
      priority: cluster.priority,
      coverage: {
        routes: cluster.routes,
        forms: cluster.forms.map(f => f.raw.id || f.raw.route || 'unknown'),
        entities: extractEntities(cluster.routes),
      },
      cases: uniqueCases,
      confidence: Math.min(cluster.confidence, avgCaseConfidence),
      metadata: {
        generatedAt: new Date().toISOString(),
        formsCount: cluster.forms.length,
        casesCount: uniqueCases.length,
      },
    };
  });
}

/**
 * Extract entity names from routes
 */
function extractEntities(routes: string[]): string[] {
  const entities = new Set<string>();
  
  for (const route of routes) {
    const segments = route.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
    for (const segment of segments) {
      // Skip IDs and common prefixes
      if (/^\d+$/.test(segment) || /^[a-f0-9-]{36}$/i.test(segment)) continue;
      if (['api', 'v1', 'v2', 'v3', 'new', 'edit', 'delete'].includes(segment.toLowerCase())) continue;
      
      // Add as entity
      entities.add(segment.toLowerCase());
    }
  }
  
  return Array.from(entities);
}

/**
 * Filter cases by priority
 */
export function filterCasesByPriority(cases: TestCase[], minPriority: 'high' | 'medium' | 'low'): TestCase[] {
  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  const minLevel = priorityOrder[minPriority];
  
  return cases.filter(c => priorityOrder[c.priority] >= minLevel);
}

/**
 * Get case statistics
 */
export function getCaseStatistics(suites: TestSuite[]): {
  totalSuites: number;
  totalCases: number;
  byType: Record<CaseType, number>;
  byPriority: Record<string, number>;
  avgConfidence: number;
} {
  const allCases = suites.flatMap(s => s.cases);
  
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  
  for (const c of allCases) {
    byType[c.classification.type] = (byType[c.classification.type] || 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
  }
  
  const avgConfidence = allCases.length > 0
    ? allCases.reduce((sum, c) => sum + c.classification.confidence, 0) / allCases.length
    : 0;
  
  return {
    totalSuites: suites.length,
    totalCases: allCases.length,
    byType: byType as Record<CaseType, number>,
    byPriority,
    avgConfidence,
  };
}
