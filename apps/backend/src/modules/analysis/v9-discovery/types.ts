/**
 * V9 Discovery Types
 * 
 * Re-exports from shared package plus backend-specific types.
 * This allows the backend to use the canonical types without direct package dependency during development.
 */

// =============================================================================
// Re-export canonical types (mirror of @qagent/shared-discovery-types)
// =============================================================================

export type StepActionType = 'click' | 'fill' | 'submit' | 'navigate' | 'assert' | 'select' | 'hover' | 'wait';
export type EvidenceType = 'url' | 'network' | 'dom' | 'storage' | 'state' | 'console';
export type ProvenanceSource = 'SBG' | 'ROG' | 'MERGED';
export type CasePriority = 'critical' | 'high' | 'medium' | 'low';

export interface StepAction {
  type: StepActionType;
  selector: string | null;
  selectorStability: number | null;
  value: string | null;
  targetRoute: string | null;
  unknownReason: string | null;
}

export interface StepExpectation {
  evidenceType: EvidenceType;
  evidenceRef: string;
  matcher: string;
  description: string;
}

export interface StepProvenance {
  from: ProvenanceSource;
  refs: string[];
  filePath: string | null;
  lineNumber: number | null;
  runtimeObservationId: string | null;
}

export interface StepV9 {
  index: number;
  action: string;
  expected: string | StepExpectation | null;
  provenance: StepProvenance;
  description?: string;
}

export interface CaseProvenance {
  staticGraphRefs: string[];
  runtimeRunRefs: string[];
}

export interface CaseV9 {
  id: string;
  name: string;
  intent: string;
  priority: CasePriority | 'high' | 'medium' | 'low';
  confidence: number;
  preconditions: string[];
  steps: StepV9[];
  successCriteria: string[];
  failureScenarios: string[];
  provenance: CaseProvenance | { from: ProvenanceSource; refs: string[] };
  tags?: string[];
}

export interface SuiteCoverage {
  routes: string[];
  components: string[];
  actions: string[];
}

export interface SuiteV9 {
  id: string;
  name: string;
  description: string;
  tags: string[];
  cases: CaseV9[];
  coverage: SuiteCoverage;
}

export interface DiscoverySummary {
  totalSuites: number;
  totalCases: number;
  totalSteps: number;
  averageConfidence: number;
  provenanceBreakdown: {
    pureStatic: number;
    pureRuntime: number;
    merged: number;
  };
  qualityIndicators: {
    hasHighConfidenceCases: boolean;
    hasCriticalPathCoverage: boolean;
    hasFormInteractionCoverage: boolean;
    completenessScore: number;
  };
}

export interface DiagnosticItem {
  code: string;
  message: string;
  filePath: string | null;
  details: Record<string, unknown> | null;
}

export interface DiscoveryDiagnostics {
  processingTimeMs: number;
  inputStats: {
    sbgNodes: number;
    rogPages: number;
  };
  mergeStats: {
    matchedNodes: number;
    unmatchedStatic: number;
    unmatchedRuntime: number;
  };
}

export interface DiscoveryResultV9 {
  success: boolean;
  suites: SuiteV9[];
  summary: DiscoverySummary;
  diagnostics: DiscoveryDiagnostics;
  timestamp: string;
  version: 'v9';
}

// =============================================================================
// Input Types
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
  filePath: string;
  lineNumber: number | null;
  route: string | null;
  selector: string | null;
  selectorStability: number | null;
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
  timestamp: string;
}

export interface RuntimeObservationV9 {
  id: string;
  type: 'navigation' | 'network' | 'storage' | 'dom-change' | 'console' | 'error';
  timestamp: string;
  url: string;
  data: Record<string, unknown>;
}

export interface RuntimeInteractiveElementV9 {
  id: string;
  selector: string;
  selectorStability: number;
  selectorCandidates: Array<{ selector: string; stability: number; strategy: string }>;
  type: 'button' | 'link' | 'input' | 'form' | 'other';
  text: string | null;
  pageUrl: string;
}

export interface RuntimePageV9 {
  url: string;
  title: string;
  elements: RuntimeInteractiveElementV9[];
  observations: RuntimeObservationV9[];
}

export interface RuntimeObservationGraphV9 {
  version: 'v9-rog';
  project: ProjectInfo;
  pages: RuntimePageV9[];
  observations: RuntimeObservationV9[];
  exploration: {
    startTime: string;
    endTime: string;
    pagesVisited: number;
    interactionsPerformed: number;
    errorsEncountered: number;
  };
}

// =============================================================================
// Runtime-First Verification Types (sent from Electron)
// =============================================================================

/**
 * Candidate action extracted from static analysis.
 */
export interface CandidateAction {
  id: string;
  type: 'link' | 'button' | 'form-submit';
  sourceUrl: string;
  selector: string | null;
  href: string | null;
  text: string | null;
  testId: string | null;
  filePath: string;
  lineNumber: number | null;
}

/**
 * Observable effects from executing an action at runtime.
 */
export interface ActionObservation {
  candidateId: string;
  executed: boolean;
  executionError: string | null;
  urlBefore: string;
  urlAfter: string | null;
  networkCalls: Array<{
    url: string;
    method: string;
    status: number | null;
  }>;
  domMutations: Array<{
    type: 'added' | 'removed' | 'changed';
    selector: string;
    description: string;
  }>;
  storageChanges: Array<{
    storage: 'local' | 'session';
    key: string;
    action: 'set' | 'remove';
  }>;
  screenshotPath: string | null;
}

/**
 * A step that has been verified at runtime.
 */
export interface VerifiedStep {
  id: string;
  candidate: CandidateAction;
  observation: ActionObservation;
  verifiedSelector: string;
  destinationUrl: string | null;
  verificationReason: 'url-change' | 'network-call' | 'dom-mutation' | 'storage-change';
}

/**
 * A verified flow is a sequence of verified steps representing a user journey.
 */
export interface VerifiedFlow {
  id: string;
  startUrl: string;
  endUrl: string;
  steps: VerifiedStep[];
  flowType: 'navigation' | 'form-submission' | 'interaction';
}

/**
 * Statistics from the verification process.
 */
export interface VerificationStats {
  totalCandidates: number;
  candidatesExecuted: number;
  candidatesVerified: number;
  candidatesDiscarded: number;
  discardReasons: Record<string, number>;
}

export interface DiscoveryV9Request {
  project: ProjectInfo;
  staticGraph: StaticBehaviorGraphV9;
  runtimeGraph: RuntimeObservationGraphV9;
  options: {
    quality: 'max' | 'fast';
    timeBudgetMs?: number;
  };
  /** Runtime-verified flows (if available, these override static-to-step conversion) */
  verifiedFlows?: VerifiedFlow[];
  /** Verification statistics */
  verificationStats?: VerificationStats;
}

// =============================================================================
// Internal Types for Processing
// =============================================================================

export interface MergedTestModel {
  suites: InternalSuite[];
  warnings: string[];
}

export interface InternalSuite {
  id: string;
  route: string;
  filePath: string;
  cases: InternalCase[];
  componentIds: string[];
}

export interface InternalCase {
  id: string;
  staticRefs: string[];
  runtimeRefs: string[];
  steps: InternalStep[];
  hasRuntimeEvidence: boolean;
}

export interface InternalStep {
  action: StepAction;
  expected: StepExpectation | string | null;
  from: ProvenanceSource;
  staticRef: string | null;
  runtimeRef: string | null;
  filePath: string | null;
  lineNumber: number | null;
  description?: string;
  targetRoute?: string | null;
}
