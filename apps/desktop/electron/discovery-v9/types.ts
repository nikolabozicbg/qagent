/**
 * V9 Discovery Types for Electron Orchestrator
 */

// ============================================================================
// Static Behavior Graph (SBG) - from code scanning
// ============================================================================

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

// ============================================================================
// Runtime Observation Graph (ROG) - from Playwright exploration
// ============================================================================

export interface RuntimeInteractiveElementV9 {
  id: string;
  selector: string;
  selectorStability: number;
  selectorCandidates: Array<{ selector: string; stability: number; strategy: string }>;
  type: 'button' | 'link' | 'input' | 'form' | 'other';
  text: string | null;
  pageUrl: string;
}

export interface RuntimeObservationV9 {
  id: string;
  type: 'navigation' | 'network' | 'storage' | 'dom-change' | 'console' | 'error';
  timestamp: string;
  url: string;
  data: Record<string, unknown>;
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

// ============================================================================
// Common Types
// ============================================================================

export interface ProjectInfo {
  name: string;
  framework: string;
  frameworkVersion: string | null;
  router: string | null;
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

// ============================================================================
// Result Types (matching backend output)
// ============================================================================

export interface StepProvenance {
  from: 'SBG' | 'ROG' | 'MERGED';
  refs: string[];
  filePath: string | null;
  lineNumber: number | null;
  runtimeObservationId: string | null;
}

export interface StepV9 {
  index: number;
  action: string;
  expected: string | null;
  provenance: StepProvenance;
  description?: string;
}

export interface CaseV9 {
  id: string;
  name: string;
  intent: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  preconditions: string[];
  steps: StepV9[];
  successCriteria: string[];
  failureScenarios: string[];
  provenance: { from: 'SBG' | 'ROG' | 'MERGED'; refs: string[] };
}

export interface SuiteV9 {
  id: string;
  name: string;
  description: string;
  tags: string[];
  cases: CaseV9[];
  coverage: {
    routes: string[];
    components: string[];
    actions: string[];
  };
}

export interface DiscoveryResultV9 {
  success: boolean;
  suites: SuiteV9[];
  summary: {
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
  };
  diagnostics: {
    processingTimeMs: number;
    inputStats: { sbgNodes: number; rogPages: number };
    mergeStats: { matchedNodes: number; unmatchedStatic: number; unmatchedRuntime: number };
  };
  timestamp: string;
  version: 'v9';
}

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface DiscoveryV9Progress {
  stage: 'scanning' | 'exploring' | 'calling-backend' | 'persisting' | 'complete' | 'error';
  message: string;
  percent: number;
  details?: {
    filesScanned?: number;
    pagesExplored?: number;
    elementsFound?: number;
  };
}

export interface DiscoveryV9Config {
  projectPath: string;
  baseUrl: string;
  maxPages?: number;
  maxInteractionsPerPage?: number;
  explorationTimeoutMs?: number;
  backendUrl?: string;
  persistArtifacts?: boolean;
}

export interface DiscoveryV9Artifacts {
  sbg: StaticBehaviorGraphV9;
  rog: RuntimeObservationGraphV9;
  result: DiscoveryResultV9;
  artifactsPath: string;
}
