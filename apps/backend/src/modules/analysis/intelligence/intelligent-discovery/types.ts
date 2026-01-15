/**
 * Intelligent Test Discovery - Core Types
 * 
 * PRINCIPLES:
 * - No hardcoded enums - use string types with confidence scores
 * - Signal-based classification - multiple signals vote on classification
 * - Extensible - new patterns added via config, not code changes
 * - Confidence-aware - every classification has a confidence score
 */

// ============================================================================
// SIGNAL TYPES - Foundation for classification
// ============================================================================

/**
 * A signal is a piece of evidence that suggests a classification
 * Multiple signals are combined via weighted voting
 */
export interface Signal {
  source: string;       // Where the signal came from (e.g., "html-type", "name-pattern")
  type: string;         // What it suggests (e.g., "PASSWORD", "EMAIL")
  confidence: number;   // How confident we are (0-1)
  weight: number;       // How much this signal should count
  evidence: string;     // Human-readable evidence (e.g., "type=password")
}

/**
 * Result of combining multiple signals
 */
export interface ClassificationResult {
  type: string;
  confidence: number;
  signals: Signal[];
  reasoning: string;    // Human-readable explanation
}

// ============================================================================
// FIELD TYPES - Representing form fields
// ============================================================================

/**
 * Raw field data extracted from source code
 * Contains ALL available information, no assumptions
 */
export interface RawFieldData {
  // Identity - all possible identifiers
  name: string | null;
  id: string | null;
  
  // HTML attributes
  type: string | null;           // input type (text, password, email, etc.)
  placeholder: string | null;
  autocomplete: string | null;
  
  // Accessibility
  ariaLabel: string | null;
  ariaDescribedBy: string | null;
  role: string | null;
  
  // Associated label
  labelText: string | null;
  labelFor: string | null;
  
  // Validation attributes
  required: boolean;
  pattern: string | null;
  minLength: number | null;
  maxLength: number | null;
  min: string | null;
  max: string | null;
  
  // Test attributes (if present)
  dataTestId: string | null;
  dataTest: string | null;
  dataCy: string | null;
  
  // Context
  formId: string | null;
  position: number;              // Position within form
  
  // Source info
  filePath: string;
  componentName: string;
}

/**
 * Classified field with semantic understanding
 */
export interface ClassifiedField {
  raw: RawFieldData;
  
  // Semantic classification
  semantic: {
    type: string;               // "PASSWORD", "EMAIL", "USERNAME", "FIRST_NAME", etc.
    confidence: number;
    signals: Signal[];
  };
  
  // Selector candidates (ranked by score)
  selectors: SelectorCandidate[];
  
  // Test values
  testValues: {
    valid: string;
    invalid: string[];
    edge: string[];
  };
}

// ============================================================================
// SELECTOR TYPES
// ============================================================================

/**
 * A selector candidate with scoring
 */
export interface SelectorCandidate {
  strategy: string;             // "data-testid", "name", "id", "role", "label", "css"
  selector: string;             // The actual selector string
  score: number;                // 0-100, higher is better
  isStable: boolean;            // Does it survive refactoring?
  validated: boolean;           // Has it been runtime-validated?
  playwrightStyle: boolean;     // Is it in Playwright locator format?
}

// ============================================================================
// OUTPUT TYPES - Final structure
// ============================================================================

/**
 * A test step
 */
export interface StepOutput {
  index: number;
  
  action: string;               // "navigate", "fill", "click", "verify", "wait"
  
  target: {
    semantic: string;           // "USERNAME", "PASSWORD", "SUBMIT"
    resolved: string;           // Actual name from app
    confidence: number;
  };
  
  value?: {
    primary: string;
    generator: string;          // "seed_data", "faker", "static", "invalid"
  };
  
  selector?: {
    primary: string;
    candidates: SelectorCandidate[];
  };
  
  expected?: {
    type: string;               // "url", "element", "text", "error"
    value: string;
    matcher: string;            // "equals", "contains", "matches"
  };
  
  reasoning: string;            // Why this step exists
}

/**
 * A test case
 */
export interface CaseOutput {
  id: string;
  name: string;
  
  classification: {
    type: string;               // "happy-path", "validation", "error", "security"
    confidence: number;
    derivedFrom: {
      source: string;           // "form", "field", "flow", "rule"
      rule: string;             // Which rule generated this
      reference: string;        // Form ID, Field ID, etc.
    };
  };
  
  priority: {
    level: string;              // "CRITICAL", "HIGH", "MEDIUM", "LOW"
    riskScore: number;
  };
  
  prerequisites: {
    requiredState: string[];    // e.g., ["user_logged_in"]
  };
  
  steps: StepOutput[];
  
  estimatedDuration: number;    // seconds
}

/**
 * A test suite
 */
export interface SuiteOutput {
  id: string;
  name: string;
  description: string;
  
  domain: {
    primary: string;            // "Authentication", "UserManagement", "Products"
    confidence: number;
  };
  
  priority: {
    level: string;
    score: number;
  };
  
  coverage: {
    routes: string[];
    forms: string[];
    entities: string[];
  };
  
  cases: CaseOutput[];
}

/**
 * Complete discovery result
 */
export interface DiscoveryResult {
  suites: SuiteOutput[];
  
  quality: {
    overall: number;            // 0-1
    fieldResolution: number;
    selectorQuality: number;
    caseCoverage: number;
    recommendation: string;     // "PUBLISH", "REVIEW", "NEEDS_WORK"
  };
  
  metadata: {
    processingTime: number;
    totalRoutes: number;
    totalForms: number;
    totalCases: number;
    totalSteps: number;
  };
}

// ============================================================================
// CONFIGURATION TYPES - Extensible patterns
// ============================================================================

/**
 * Field semantic pattern - loaded from config
 */
export interface FieldSemanticPattern {
  type: string;                 // "PASSWORD", "EMAIL", etc.
  signals: {
    source: string;
    match: {
      attribute: string;        // "type", "name", "autocomplete", etc.
      condition: string;        // "equals", "contains", "matches"
      value: string;            // Value or regex pattern
    };
    weight: number;
    confidence: number;
  }[];
  testValues: {
    valid: string[];
    invalid: string[];
    edge: string[];
  };
}

/**
 * Form purpose pattern - loaded from config
 */
export interface FormPurposePattern {
  type: string;                 // "AUTH_LOGIN", etc.
  requiredFields: string[];     // Field semantic types that MUST be present
  optionalFields: string[];     // Field semantic types that MAY be present
  forbiddenFields: string[];    // Field semantic types that MUST NOT be present
  routePatterns: string[];      // Regex patterns for route matching
  baseConfidence: number;
  priority: string;
}

/**
 * Test derivation rule - loaded from config
 */
export interface TestDerivationRule {
  id: string;
  name: string;
  trigger: {
    type: string;               // "form", "field", "flow"
    condition: string;          // Condition expression
  };
  generates: {
    caseType: string;
    nameTemplate: string;
    stepTemplates: {
      action: string;
      targetRef: string;        // Reference to field or element
      valueRef: string;         // Reference to test value
    }[];
  };
  priority: string;
}

// ============================================================================
// EXTENDED TYPES - Used by classifiers and generators
// ============================================================================

/**
 * Extended RawFormData with additional fields
 */
export interface RawFormData {
  id: string;
  name: string;
  componentName: string;
  filePath: string;
  route: string | null;
  url?: string | null;          // Alternative to route
  submitText?: string | null;   // Submit button text
  submitSelector?: string | null; // Submit button selector
  
  fields: RawFieldData[];
  
  submitButton: {
    text: string | null;
    selector: string | null;
  } | null;
  
  // Detected patterns
  hasValidation: boolean;
  submitEndpoint: string | null;
  successRedirect: string | null;
}

/**
 * Extended ClassifiedForm with domain
 */
export interface ClassifiedForm {
  raw: RawFormData;
  
  purpose: {
    type: string;
    confidence: number;
    signals: Signal[];
  };
  
  domain: {
    primary: string;
    confidence: number;
  };
  
  fields: ClassifiedField[];
  
  alternatives?: {
    purpose: string;
    domain: string;
    confidence: number;
  }[];
}

/**
 * Route information
 */
export interface RouteInfo {
  path: string;
  method?: string;
  component?: string;
  forms?: string[];
}

/**
 * Suite cluster - intermediate grouping result
 */
export interface SuiteCluster {
  id: string;
  name: string;
  domain: {
    primary: string;
    confidence: number;
  };
  priority: {
    level: string;
    score: number;
  };
  forms: ClassifiedForm[];
  routes: string[];
  confidence: number;
}

/**
 * Domain group for route grouping
 */
export interface DomainGroup {
  domain: string;
  routes: RouteInfo[];
  count: number;
}

/**
 * Test case type
 */
export type CaseType = 'happy-path' | 'validation' | 'error' | 'edge' | 'security';

/**
 * Test step for generated cases
 */
export interface TestStep {
  action: string;
  target: string | { semantic: string; resolved: string };
  value: string | null;
  selector: {
    primary: string;
    candidates: SelectorCandidate[];
    confidence: number;
  } | null;
  description: string;
  assertion?: {
    type: string;
    expected: string;
  };
}

/**
 * Test case for generated suites
 */
export interface TestCase {
  id: string;
  name: string;
  classification: {
    type: CaseType;
    confidence: number;
    derivedFrom: {
      formPurpose: string;
      rule: string;
      field?: string;
    };
  };
  preconditions: string[];
  steps: TestStep[];
  expectedOutcome: {
    success: boolean;
    description: string;
  };
  priority: 'high' | 'medium' | 'low';
}

/**
 * Test suite output
 */
export interface TestSuite {
  id: string;
  name: string;
  domain: {
    primary: string;
    confidence: number;
  };
  priority: {
    level: string;
    score: number;
  };
  coverage: {
    routes: string[];
    forms: string[];
    entities: string[];
  };
  cases: TestCase[];
  confidence: number;
  metadata: {
    generatedAt: string;
    formsCount: number;
    casesCount: number;
  };
}
