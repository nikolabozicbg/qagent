/**
 * V6 Intelligent Test Generation - Types
 * 
 * LLM-FIRST ARCHITECTURE
 * - LLM is the brain, code is just translator
 * - No hardcoded heuristics
 * - Everything derived from data + LLM understanding
 */

// =============================================================================
// SCANNER OUTPUT (Extended from V5 with additional data)
// =============================================================================

import { ScannerPayload, ScannerPage, ScannerElement, ScannerConstraint } from '../v5-discovery/types';

/**
 * Enhanced Scanner Payload - extends V5 with route graph, actions, UI indicators
 * 
 * NOTE: For now, we work with existing ScannerPayload and derive what we can.
 * Future scanner updates will provide this data directly.
 */
export interface EnhancedScannerPayload extends ScannerPayload {
  // NEW: Route Graph (how pages are connected)
  routeGraph?: {
    edges: Array<{
      from: string;       // pageId or 'external'
      to: string;         // pageId
      trigger: string;    // actionId that causes transition
      evidence: string;   // how we know (href, router.push, redirect)
    }>;
  };
  
  // NEW: Actions Map (all clickable elements + what they do)
  actions?: Array<{
    id: string;
    pageId: string;
    selector: string;
    kind: 'link' | 'button' | 'submit' | 'tab' | 'modal-open' | 'modal-close';
    targetUrl?: string;
    opensModal?: string;
    formId?: string;
    text?: string;
  }>;
  
  // NEW: API Map (form submit → endpoint)
  apiMap?: Array<{
    formId: string;
    method: string;
    endpoint: string;
    entityHint?: string;  // 'user', 'bankAccount', 'transaction'
  }>;
  
  // NEW: UI State Indicators
  uiIndicators?: {
    successMessages: Array<{ selector: string; textPattern: string }>;
    errorMessages: Array<{ selector: string; textPattern: string }>;
    loadingStates: Array<{ selector: string }>;
    toasts: Array<{ selector: string; type: 'success' | 'error' | 'info' }>;
  };
  
  // NEW: Sample Data (for dynamic URLs)
  sampleData?: {
    dynamicUrls: Record<string, string[]>;    // '/users/[id]' → ['/users/1', '/users/2']
    listItemLinks: Record<string, string[]>;  // pageId → [href1, href2]
    formSubmitRedirects: Record<string, string>; // formId → redirect URL
  };
  
  // NEW: Auth Boundary (which routes need auth)
  authBoundary?: {
    publicRoutes: string[];
    protectedRoutes: string[];
    loginRoute: string;
    loginRedirectParam?: string;  // e.g., 'returnUrl', 'next'
  };
}

// =============================================================================
// LLM ANALYZER OUTPUT - App Understanding
// =============================================================================

/**
 * AppUnderstanding - LLM's semantic understanding of the application
 * 
 * This is the KEY difference from V5:
 * - V5: hardcoded rules → "if URL contains 'sign-in' → auth domain"
 * - V6: LLM understands → "this is a banking app with user registration, transactions, etc."
 */
export interface AppUnderstanding {
  /** One-sentence description of the application */
  description: string;
  
  /** Application type (e-commerce, banking, blog, saas, etc.) */
  appType: string;
  
  /** Main user features - what a user can DO */
  features: AppFeature[];
  
  /** Data entities and their relationships */
  dataEntities: DataEntity[];
  
  /** Recommended test execution order (respects dependencies) */
  testExecutionOrder: string[];  // featureIds in order
  
  /** Critical paths that MUST work */
  criticalPaths: string[];       // featureIds
  
  /** Auth requirements */
  auth: {
    hasAuth: boolean;
    loginFeatureId?: string;
    registrationFeatureId?: string;
    protectedFeatureIds: string[];
  };
}

export interface AppFeature {
  /** Unique identifier */
  id: string;
  
  /** Human-readable name (e.g., "User Registration", "Create Bank Account") */
  name: string;
  
  /** What this feature does */
  description: string;
  
  /** Priority based on business impact */
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  /** Risk level - how bad if this breaks? */
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  
  /** Feature category for grouping */
  category: string;  // 'auth', 'financial', 'content', 'settings', etc.
  
  // === What's involved ===
  
  /** Pages involved in this feature */
  pages: string[];  // pageIds
  
  /** Forms involved */
  forms: string[];  // formIds (derived from elements)
  
  /** Actions involved */
  actions: string[];  // actionIds
  
  // === Dependencies ===
  
  /** What must be true before testing this feature */
  preconditions: FeaturePrecondition[];
  
  /** Features that must be completed before this one */
  dependsOn: string[];  // featureIds
  
  // === Expected Outcomes ===
  
  /** How to know this feature succeeded */
  successIndicator: {
    type: 'redirect' | 'message' | 'element-visible' | 'element-hidden' | 'api-response' | 'state-change';
    target: string;  // URL, selector, or description
    description: string;
  };
  
  /** How to know this feature failed */
  failureIndicator?: {
    type: 'message' | 'element-visible' | 'stays-on-page';
    target: string;
    description: string;
  };
}

export interface FeaturePrecondition {
  /** Type of precondition */
  type: 'auth' | 'data' | 'state' | 'navigation';
  
  /** Human-readable description */
  description: string;
  
  /** Which feature creates this precondition (for test ordering) */
  setupFeatureId?: string;
  
  /** Steps to achieve this precondition (if known) */
  setupSteps?: string[];
}

export interface DataEntity {
  /** Entity name (e.g., 'User', 'BankAccount', 'Transaction') */
  name: string;
  
  /** Which feature creates this entity */
  createdBy: string;  // featureId
  
  /** Which features require this entity to exist */
  requiredFor: string[];  // featureIds
  
  /** Key fields of this entity */
  fields: string[];
  
  /** Example data for testing */
  exampleData?: Record<string, string>;
}

// =============================================================================
// TEST PLAN GENERATOR OUTPUT - Per-Feature Test Plans
// =============================================================================

/**
 * FeatureTestPlan - LLM-generated test plan for a single feature
 * 
 * This is the "QA Engineer's test plan" - steps in human terms,
 * not selectors. The Step Compiler will translate to actual selectors.
 */
export interface FeatureTestPlan {
  /** Feature this plan is for */
  featureId: string;
  
  /** Feature name */
  featureName: string;
  
  /** Test cases for this feature */
  cases: TestCase[];
}

export interface TestCase {
  /** Unique identifier */
  id: string;
  
  /** Descriptive name */
  name: string;
  
  /** Test type */
  type: 'happy-path' | 'validation' | 'security' | 'edge-case' | 'negative' | 'boundary';
  
  /** Priority */
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  /** Why this test exists */
  rationale: string;
  
  /** What must be true before this test */
  preconditions: TestPrecondition[];
  
  /** Test steps (in human terms - field names, not selectors) */
  steps: TestStep[];
  
  /** What should happen */
  expectedResult: ExpectedResult;
  
  /** Data requirements */
  dataRequirements?: {
    entities: string[];      // what test data is needed
    cleanup: boolean;        // should data be cleaned after
    isolationLevel: 'none' | 'test' | 'suite';  // data isolation needs
  };
}

export interface TestPrecondition {
  /** Type of precondition */
  type: 'auth' | 'data' | 'navigation' | 'state';
  
  /** Description */
  description: string;
  
  /** How to achieve this (steps in human terms) */
  setupSteps?: string[];
}

export interface TestStep {
  /** Action type */
  action: 'navigate' | 'fill' | 'click' | 'select' | 'check' | 'uncheck' | 'wait' | 'assert' | 'hover' | 'scroll';
  
  /** Target in human terms (field name, button text, URL) */
  target: string;
  
  /** Value to use (for fill/select actions) */
  value?: string;
  
  /** Why this value was chosen (for edge cases) */
  valueReason?: string;
  
  /** Additional context */
  context?: string;
}

export interface ExpectedResult {
  /** Result type */
  type: 'redirect' | 'error-visible' | 'success-visible' | 'state-change' | 'element-visible' | 'element-hidden' | 'value-changed';
  
  /** Target (URL, selector description, or state) */
  target: string;
  
  /** Human description */
  description: string;
}

// =============================================================================
// STEP COMPILER OUTPUT - Compiled Test Cases
// =============================================================================

/**
 * CompiledTestSuite - Ready-to-execute test suite
 * 
 * This is what the Step Compiler produces:
 * - Field names → actual selectors
 * - Dynamic URLs → real URLs from sample data
 * - Deduplication applied
 * - Proper test ordering
 */
export interface CompiledTestSuite {
  /** Suite ID */
  id: string;
  
  /** Suite name */
  name: string;
  
  /** Feature this suite tests */
  featureId: string;
  
  /** Priority (inherited from feature) */
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  /** Test cases in execution order */
  cases: CompiledTestCase[];
  
  /** Suite-level setup (if any) */
  setup?: CompiledStep[];
  
  /** Suite-level teardown (if any) */
  teardown?: CompiledStep[];
}

export interface CompiledTestCase {
  /** Case ID */
  id: string;
  
  /** Case name */
  name: string;
  
  /** Test type */
  type: string;
  
  /** Priority */
  priority: string;
  
  /** Case-level precondition steps (login, navigate, etc.) */
  setup: CompiledStep[];
  
  /** Main test steps */
  steps: CompiledStep[];
  
  /** Assertions */
  assertions: CompiledAssertion[];
  
  /** Cleanup steps */
  teardown: CompiledStep[];
  
  /** Which constraint this tests (for validation tests) */
  testedConstraint?: string;
  
  /** Source tracking */
  source: {
    featureId: string;
    testPlanCaseId: string;
    compiledAt: string;
  };
}

export interface CompiledStep {
  /** Action type */
  action: string;
  
  /** Actual CSS/Playwright selector */
  selector: string;
  
  /** Value to use */
  value?: string;
  
  /** What to wait for after this step */
  waitFor?: string;
  
  /** Timeout override */
  timeout?: number;
  
  /** Description for debugging */
  description: string;
  
  /** Source tracking */
  source: {
    originalTarget: string;       // What the test plan said
    resolvedFrom: string;         // How we resolved it
    confidence: number;           // How confident we are
  };
}

export interface CompiledAssertion {
  /** Assertion type */
  type: 'url' | 'visible' | 'hidden' | 'text' | 'value' | 'enabled' | 'disabled' | 'checked';
  
  /** Target selector (for element assertions) */
  selector?: string;
  
  /** Expected value */
  expected: string;
  
  /** Confidence level */
  confidence: number;
  
  /** Source */
  source: string;
  
  /** Description */
  description: string;
}

// =============================================================================
// QUALITY VALIDATOR OUTPUT
// =============================================================================

export interface ValidationResult {
  /** Overall pass/fail */
  valid: boolean;
  
  /** Quality score (0-1) */
  score: number;
  
  /** Issues found */
  issues: ValidationIssue[];
  
  /** Coverage metrics */
  coverage: {
    features: { total: number; tested: number; coverage: number };
    constraints: { total: number; tested: number; coverage: number };
    criticalPaths: { total: number; tested: number; coverage: number };
  };
  
  /** Duplicate detection */
  duplicates: {
    found: boolean;
    count: number;
    locations: string[];
  };
  
  /** Selector quality */
  selectorQuality: {
    dataTestIdUsage: number;    // percentage using data-testid
    stableSelectors: number;    // percentage using stable selectors
    riskySelectors: string[];   // selectors that might be flaky
  };
}

export interface ValidationIssue {
  /** Unique ID */
  id: string;
  
  /** Issue type */
  type: 'missing-selector' | 'invalid-url' | 'missing-constraint-test' | 'duplicate-step' | 
        'missing-precondition' | 'circular-dependency' | 'flaky-selector' | 'missing-assertion';
  
  /** Severity */
  severity: 'error' | 'warning' | 'info';
  
  /** Location (suite/case/step) */
  location: string;
  
  /** What's wrong */
  description: string;
  
  /** How to fix */
  suggestion: string;
  
  /** Can be auto-fixed? */
  autoFixable: boolean;
}

// =============================================================================
// V6 PIPELINE OUTPUT
// =============================================================================

export interface V6Result {
  /** Success flag */
  success: boolean;
  
  /** Overall quality score */
  score: number;
  
  /** App understanding (for debugging/review) */
  appUnderstanding: AppUnderstanding;
  
  /** Compiled test suites */
  suites: CompiledTestSuite[];
  
  /** Validation result */
  validation: ValidationResult;
  
  /** Processing stats */
  stats: {
    featuresDetected: number;
    testCasesGenerated: number;
    constraintsCovered: number;
    processingTimeMs: number;
    llmCallsCount: number;
  };
  
  /** Items needing human review */
  reviewNeeded: Array<{
    type: string;
    description: string;
    location: string;
  }>;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/** Map of field name → element for quick lookup */
export type FieldElementMap = Map<string, ScannerElement>;

/** Map of formId → elements for quick lookup */
export type FormElementsMap = Map<string, ScannerElement[]>;

/** Map of pageId → elements for quick lookup */
export type PageElementsMap = Map<string, ScannerElement[]>;

/** Map of elementId → constraints for quick lookup */
export type ElementConstraintsMap = Map<string, ScannerConstraint[]>;
