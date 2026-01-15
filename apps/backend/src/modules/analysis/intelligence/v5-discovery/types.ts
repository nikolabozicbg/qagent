/**
 * V5 Discovery - Types
 * 
 * ZERO WEAKNESS ARCHITECTURE
 * - No enums - all strings for flexibility
 * - Source tracking for all generated data
 * - Confidence scores for uncertainty
 * - Data-driven validation
 */

// =============================================================================
// SCANNER OUTPUT - What Electron sends (raw data, zero interpretation)
// =============================================================================

/**
 * Universal Scanner Payload - the "ground truth" for all validation
 */
export interface ScannerPayload {
  /** Auto-detected configuration */
  config: ScannerConfig;
  
  /** All pages/routes discovered */
  pages: ScannerPage[];
  
  /** All interactive elements with ranked selectors */
  elements: ScannerElement[];
  
  /** Validation constraints extracted from code */
  constraints: ScannerConstraint[];
  
  /** Multi-step flows detected from navigation patterns */
  flows: ScannerFlow[];
  
  /** Validation schemas that couldn't be parsed (need LLM) */
  unknownValidations: UnknownValidation[];
  
  /** Project metadata */
  project: {
    name: string;
    framework: string;
    version: string;
  };
}

export interface ScannerConfig {
  /** Detected test framework (cypress, playwright, etc.) */
  detectedTestFramework: string | null;
  
  /** Selector priority order (auto-detected or default) */
  selectorPriority: string[];
  
  /** How the framework was detected */
  detectionReason: string | null;
}

export interface ScannerPage {
  /** Unique identifier */
  id: string;
  
  /** Source file path */
  file: string;
  
  /** Route URL */
  url: string;
  
  /** Element IDs on this page */
  elementIds: string[];
  
  /** Whether this appears to be a protected route */
  isProtected: boolean;
}

export interface ScannerElement {
  /** Unique identifier */
  id: string;
  
  /** Which page this element belongs to */
  pageId: string;
  
  /** HTML tag name */
  tagName: string;
  
  /** All HTML attributes (raw, no interpretation) */
  attributes: Record<string, string | boolean | number>;
  
  /** Text content if any */
  textContent: string | null;
  
  /** Nearby text (labels, siblings) */
  nearbyText: string[];
  
  /** All possible selectors, ranked by stability */
  selectors: RankedSelector[];
  
  /** Best selector (highest rank) */
  bestSelector: string;
  
  /** Form ID if this element is part of a form */
  formId: string | null;
}

export interface RankedSelector {
  /** The actual selector string */
  value: string;
  
  /** Rank (1 = best) */
  rank: number;
  
  /** Stability level */
  stability: 'highest' | 'high' | 'medium' | 'low';
  
  /** What attribute this selector is based on */
  basedOn: string;
}

export interface ScannerConstraint {
  /** Field name this constraint applies to */
  field: string;
  
  /** Element ID this constraint applies to */
  elementId: string;
  
  /** Validation rules */
  rules: ConstraintRule[];
  
  /** Example values that satisfy all rules */
  validExamples: string[];
  
  /** Example values that violate specific rules */
  invalidExamples: InvalidExample[];
  
  /** Source of the constraint (zod, yup, html5, etc.) */
  source: string;
}

export interface ConstraintRule {
  /** Rule type (required, minLength, maxLength, pattern, email, etc.) */
  type: string;
  
  /** Rule value if applicable */
  value?: string | number;
  
  /** Regex pattern if applicable */
  pattern?: string;
  
  /** Description of the rule */
  description?: string;
}

export interface InvalidExample {
  /** The invalid value */
  value: string;
  
  /** Which rule it violates */
  violates: string;
  
  /** Why it's invalid */
  reason: string;
}

export interface ScannerFlow {
  /** Unique identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Steps in the flow */
  steps: FlowStep[];
  
  /** How this flow was detected */
  detection: string;
}

export interface FlowStep {
  /** Page ID */
  pageId: string;
  
  /** URL */
  url: string;
  
  /** Action that triggers next step */
  nextAction: string | null;
  
  /** Next page ID */
  nextPageId: string | null;
}

export interface UnknownValidation {
  /** Field name */
  field: string;
  
  /** Code snippet containing validation logic */
  codeSnippet: string;
  
  /** File where this was found */
  file: string;
}

// =============================================================================
// ANALYZER OUTPUT - LLM semantic understanding
// =============================================================================

export interface AnalyzerOutput {
  /** Logical domain groupings */
  domains: Domain[];
  
  /** User journeys (sequences of actions) */
  journeys: Journey[];
  
  /** Authentication boundary */
  authBoundary: AuthBoundary;
  
  /** Validation result */
  validation: AnalyzerValidation;
}

export interface Domain {
  /** Domain name (LLM-generated, not enum) */
  name: string;
  
  /** Pages belonging to this domain */
  pageIds: string[];
  
  /** Purpose description */
  purpose: string;
}

export interface Journey {
  /** Unique identifier */
  id: string;
  
  /** Journey name */
  name: string;
  
  /** Page IDs in sequence */
  pageSequence: string[];
  
  /** Form IDs involved */
  formIds: string[];
  
  /** Field names involved */
  fields: string[];
  
  /** Journey type (authentication, checkout, etc. - string, not enum) */
  type: string;
  
  /** Goal of this journey */
  goal: string;
}

export interface AuthBoundary {
  /** Public pages (no auth required) */
  publicPageIds: string[];
  
  /** Protected pages (auth required) */
  protectedPageIds: string[];
}

export interface AnalyzerValidation {
  /** Whether the analyzer output is valid */
  valid: boolean;
  
  /** Issues found during validation */
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  /** Issue type */
  type: string;
  
  /** What was not found */
  notFound: string;
  
  /** Where it was referenced */
  referencedIn: string;
}

// =============================================================================
// GENERATOR OUTPUT - Test suites with source tracking
// =============================================================================

export interface GeneratorOutput {
  /** Generated test suites */
  suites: GeneratedSuite[];
}

export interface GeneratedSuite {
  /** Unique identifier */
  id: string;
  
  /** Suite name */
  name: string;
  
  /** Domain this suite belongs to */
  domain: string;
  
  /** Test cases */
  cases: GeneratedCase[];
}

export interface GeneratedCase {
  /** Unique identifier */
  id: string;
  
  /** Case name */
  name: string;
  
  /** Case type (happy-path, validation, etc. - string, not enum) */
  type: string;
  
  /** Which constraint this case tests (for validation cases) */
  testedConstraint: string | null;
  
  /** Test steps */
  steps: GeneratedStep[];
  
  /** Assertions */
  assertions: GeneratedAssertion[];
}

export interface GeneratedStep {
  /** Unique identifier */
  id: string;
  
  /** Step description */
  description: string;
  
  /** Action type (navigate, fill, click, etc. - string, not enum) */
  action: string;
  
  /** Target (URL or selector) */
  target: string;
  
  /** Value to input (for fill actions) */
  value: string | null;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Source tracking - where this data came from */
  source: StepSource;
}

export interface StepSource {
  /** Where the selector came from */
  selector?: string;
  
  /** Where the value came from */
  value?: string;
  
  /** Where the URL came from */
  url?: string;
  
  /** Which page this step is on (for validation) */
  pageId?: string;
  
  /** LLM-generated source identifier */
  llm?: string;
}

export interface GeneratedAssertion {
  /** Assertion type (url, visible, containsText, etc. - string, not enum) */
  type: string;
  
  /** Expected value or target */
  expected: string;
  
  /** Target selector (for element assertions) */
  target: string | null;
  
  /** Confidence score */
  confidence: number;
  
  /** Source tracking */
  source: string;
  
  /** Reason for this assertion */
  reason: string | null;
}

// =============================================================================
// VALIDATOR OUTPUT - Data-driven validation results
// =============================================================================

export interface ValidatorResult {
  /** Overall validity */
  valid: boolean;
  
  /** Quality score (0-1) */
  score: number;
  
  /** Results of each check */
  checks: ValidatorChecks;
  
  /** All issues found */
  issues: ValidatorIssue[];
}

export interface ValidatorChecks {
  /** Selector existence check */
  selectorExists: CheckResult;
  
  /** Value constraint satisfaction check */
  valueSatisfiesConstraints: CheckResult;
  
  /** Step on correct page check */
  stepOnCorrectPage: CheckResult;
  
  /** Assertion selector exists check */
  assertionSelectorExists: CheckResult;
  
  /** Constraint coverage check */
  constraintCoverage: CoverageResult;
}

export interface CheckResult {
  /** Number of checks passed */
  passed: number;
  
  /** Number of checks failed */
  failed: number;
}

export interface CoverageResult {
  /** Number of constraints covered */
  covered: number;
  
  /** Total number of constraints */
  total: number;
  
  /** Which constraints are not covered */
  uncovered: string[];
}

export interface ValidatorIssue {
  /** Unique identifier for tracking */
  id: string;
  
  /** Issue type */
  type: string;
  
  /** Where the issue was found */
  location: string;
  
  /** What element/value caused the issue */
  target: string;
  
  /** Severity level */
  severity: 'error' | 'warning';
  
  /** Suggested fix */
  suggestion: string;
}

// =============================================================================
// CRITIC OUTPUT - LLM review with checklist
// =============================================================================

export interface CriticResult {
  /** Quality score (0-1) */
  score: number;
  
  /** Checklist results */
  checklist: ChecklistItem[];
  
  /** Issues found */
  issues: CriticIssue[];
}

export interface ChecklistItem {
  /** Item description */
  item: string;
  
  /** Whether it passed */
  passed: boolean;
  
  /** Evidence (which test case satisfies this) */
  evidence: string | null;
  
  /** Why it's missing (if not passed) */
  reason: string | null;
  
  /** Whether this item was applicable */
  applicable: boolean;
}

export interface CriticIssue {
  /** Unique identifier */
  id: string;
  
  /** Issue type */
  type: string;
  
  /** Description */
  description: string;
  
  /** Suggestion */
  suggestion: string;
}

// =============================================================================
// SELF-HEAL OUTPUT - Iteration tracking
// =============================================================================

export interface SelfHealResult {
  /** Whether healing is complete */
  done: boolean;
  
  /** Current iteration */
  iteration: number;
  
  /** Fixed issues */
  fixed: string[];
  
  /** Remaining issues */
  remaining: string[];
  
  /** Issues marked for manual review */
  manualReviewNeeded: ManualReviewItem[];
  
  /** Final output (when done) */
  output: GeneratorOutput | null;
  
  /** Final scores */
  scores: {
    validator: number;
    critic: number;
    combined: number;
  } | null;
}

export interface ManualReviewItem {
  /** Issue ID */
  issueId: string;
  
  /** Issue description */
  description: string;
  
  /** Why it couldn't be fixed */
  reason: string;
  
  /** Number of attempts made */
  attempts: number;
}

// =============================================================================
// FINAL OUTPUT - What the API returns
// =============================================================================

export interface V5DiscoveryResult {
  /** Success flag */
  success: boolean;
  
  /** Final quality score */
  score: number;
  
  /** Number of iterations taken */
  iterations: number;
  
  /** Final test suites */
  suites: GeneratedSuite[];
  
  /** Coverage metrics */
  coverage: {
    pages: { total: number; tested: number };
    constraints: { total: number; tested: number };
    flows: { total: number; tested: number };
  };
  
  /** Items needing manual review */
  manualReviewNeeded: ManualReviewItem[];
  
  /** Debug information */
  debug: {
    scannerStats: Record<string, number>;
    analyzerDomains: string[];
    generatorCaseCount: number;
    validatorScore: number;
    criticScore: number;
    processingTimeMs: number;
  };
}

// =============================================================================
// LLM INTERFACE - For prompts and responses
// =============================================================================

export interface LLMRequest {
  /** System prompt */
  systemPrompt: string;
  
  /** User prompt */
  userPrompt: string;
  
  /** Expected response schema (for validation) */
  responseSchema: string;
}

export interface LLMResponse<T> {
  /** Parsed response */
  data: T;
  
  /** Raw response */
  raw: string;
  
  /** Whether parsing succeeded */
  success: boolean;
  
  /** Error if parsing failed */
  error: string | null;
}
