/**
 * Discovery V9 Canonical Types
 * 
 * This is the single source of truth for what the UI renders.
 * All fields are explicit - if unknown, use null with a reason string.
 */

// =============================================================================
// STEP TYPES
// =============================================================================

export type StepActionType = 'click' | 'fill' | 'submit' | 'navigate' | 'assert' | 'select' | 'hover' | 'wait';

export type EvidenceType = 'url' | 'network' | 'dom' | 'storage' | 'state' | 'console';

export type ProvenanceSource = 'SBG' | 'ROG' | 'MERGED';

export interface StepAction {
  type: StepActionType;
  /** CSS selector, data-testid, or role-based selector. null if SELECTOR_REQUIRED */
  selector: string | null;
  /** Stability score 0-1. Higher = more stable (data-testid > role > text > CSS) */
  selectorStability: number | null;
  /** Value for fill/select actions. Can be placeholder like {{email}} */
  value: string | null;
  /** Target route for navigate actions */
  targetRoute: string | null;
  /** Reason if selector or value is null */
  unknownReason: string | null;
}

export interface StepExpectation {
  evidenceType: EvidenceType;
  /** Reference to specific evidence (URL, network endpoint, DOM element, storage key, etc.) */
  evidenceRef: string;
  /** How to match the evidence (exact, contains, regex pattern, etc.) */
  matcher: string;
  /** Human-readable description of what to expect */
  description: string;
}

export interface StepProvenance {
  /** Where this step originated */
  from: ProvenanceSource;
  /** References to source nodes/observations */
  refs: string[];
  /** File path if from static analysis */
  filePath: string | null;
  /** Line number if from static analysis */
  lineNumber: number | null;
  /** Runtime observation ID if from runtime */
  runtimeObservationId: string | null;
}

export interface StepV9 {
  index: number;
  action: StepAction;
  /** What should happen after this step */
  expected: StepExpectation | null;
  provenance: StepProvenance;
  /** Human-readable step description */
  description: string;
}

// =============================================================================
// CASE TYPES
// =============================================================================

export type CasePriority = 'critical' | 'high' | 'medium' | 'low';

export interface CaseProvenance {
  /** References to static graph nodes that contributed to this case */
  staticGraphRefs: string[];
  /** References to runtime observation runs that contributed to this case */
  runtimeRunRefs: string[];
}

export interface CaseV9 {
  id: string;
  /** Human-readable test case name */
  name: string;
  /** What this test verifies (intent/purpose) */
  intent: string;
  priority: CasePriority;
  /** Confidence score 0-1 based on evidence quality */
  confidence: number;
  /** What must be true before running this test */
  preconditions: string[];
  steps: StepV9[];
  /** What indicates test success - must reference evidence */
  successCriteria: string[];
  /** Known failure scenarios - must reference evidence */
  failureScenarios: string[];
  provenance: CaseProvenance;
  /** Tags for categorization */
  tags: string[];
}

// =============================================================================
// SUITE TYPES
// =============================================================================

export interface SuiteCoverage {
  /** Routes covered by this suite */
  routes: string[];
  /** Forms covered by this suite */
  forms: string[];
  /** API endpoints covered by this suite */
  apiEndpoints: string[];
}

export interface SuiteV9 {
  id: string;
  /** Human-readable suite name */
  name: string;
  /** What this suite tests */
  description: string;
  /** Tags for categorization */
  tags: string[];
  cases: CaseV9[];
  coverage: SuiteCoverage;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface DiscoverySummary {
  totalSuites: number;
  totalCases: number;
  totalSteps: number;
  /** Percentage of cases that have runtime evidence (0-100) */
  verifiedCaseRate: number;
  /** Average selector stability score (0-1) */
  selectorStabilityScore: number;
  /** Percentage of steps with runtime evidence (0-100) */
  runtimeEvidenceRate: number;
}

export interface DiscoveryDiagnostics {
  errors: DiagnosticItem[];
  warnings: DiagnosticItem[];
  /** Path to artifacts folder if persisted */
  artifactsPath: string | null;
}

export interface DiagnosticItem {
  code: string;
  message: string;
  /** File path if relevant */
  filePath: string | null;
  /** Additional context */
  details: Record<string, unknown> | null;
}

export interface DiscoveryResultV9 {
  success: boolean;
  suites: SuiteV9[];
  summary: DiscoverySummary;
  diagnostics: DiscoveryDiagnostics;
  /** Timestamp of discovery run */
  timestamp: string;
  /** Version identifier */
  version: 'v9';
}

// =============================================================================
// INPUT TYPES (for backend endpoint)
// =============================================================================

export interface ProjectInfo {
  name: string;
  framework: string;
  frameworkVersion: string | null;
  router: string | null;
}

export interface StaticBehaviorNodeV9 {
  id: string;
  type: 'page' | 'form' | 'button' | 'link' | 'input' | 'api-call' | 'navigation' | 'state-mutation';
  /** File path where this node was found */
  filePath: string;
  lineNumber: number | null;
  /** Route if this is a page */
  route: string | null;
  /** Selector if extractable from code */
  selector: string | null;
  /** Selector stability score */
  selectorStability: number | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

export interface StaticBehaviorEdgeV9 {
  id: string;
  type: 'triggers' | 'navigates-to' | 'submits' | 'calls-api' | 'mutates-state';
  sourceId: string;
  targetId: string;
}

export interface StaticBehaviorGraphV9 {
  version: 'v9-sbg';
  project: ProjectInfo;
  nodes: StaticBehaviorNodeV9[];
  edges: StaticBehaviorEdgeV9[];
  /** Extraction timestamp */
  timestamp: string;
}

export interface RuntimeObservationV9 {
  id: string;
  type: 'navigation' | 'network' | 'storage' | 'dom-change' | 'console' | 'error';
  timestamp: string;
  /** URL where observation occurred */
  url: string;
  /** Observation-specific data */
  data: Record<string, unknown>;
}

export interface RuntimeInteractiveElementV9 {
  id: string;
  /** Best available selector */
  selector: string;
  /** Selector stability score 0-1 */
  selectorStability: number;
  /** All candidate selectors with scores */
  selectorCandidates: Array<{ selector: string; stability: number; strategy: string }>;
  /** Element type */
  type: 'button' | 'link' | 'input' | 'form' | 'other';
  /** Visible text */
  text: string | null;
  /** URL where element was found */
  pageUrl: string;
}

export interface RuntimePageV9 {
  url: string;
  title: string;
  /** Interactive elements found on this page */
  elements: RuntimeInteractiveElementV9[];
  /** Observations during page visit */
  observations: RuntimeObservationV9[];
}

export interface RuntimeObservationGraphV9 {
  version: 'v9-rog';
  project: ProjectInfo;
  pages: RuntimePageV9[];
  /** All observations across all pages */
  observations: RuntimeObservationV9[];
  /** Exploration metadata */
  exploration: {
    startTime: string;
    endTime: string;
    pagesVisited: number;
    interactionsPerformed: number;
    errorsEncountered: number;
  };
}

export interface DiscoveryV9Request {
  project: ProjectInfo;
  staticGraph: StaticBehaviorGraphV9;
  runtimeGraph: RuntimeObservationGraphV9;
  options: {
    quality: 'max' | 'fast';
    timeBudgetMs?: number;
  };
}
