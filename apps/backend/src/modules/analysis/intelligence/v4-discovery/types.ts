/**
 * V4 Discovery - Types
 * 
 * Graph-based application model for universal test discovery.
 * No hardcoded patterns - uses graph structure + LLM for semantics.
 */

// =============================================================================
// GRAPH MODEL - Universal representation of any web app
// =============================================================================

/**
 * Application Graph - represents the entire app structure
 */
export interface AppGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Node types - what exists in the app
 */
export type GraphNode = 
  | RouteNode 
  | FormNode 
  | FieldNode 
  | ButtonNode 
  | LinkNode 
  | ApiNode;

export interface BaseNode {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
}

export interface RouteNode extends BaseNode {
  type: 'route';
  path: string;
  isDynamic: boolean;
  params: string[];
  filePath: string;
}

export interface FormNode extends BaseNode {
  type: 'form';
  name: string;
  submitSelector: string | null;
  submitText: string | null;
}

export interface FieldNode extends BaseNode {
  type: 'field';
  // Raw data - no classification
  name: string | null;
  htmlType: string;
  selector: string;
  label: string | null;
  placeholder: string | null;
  isRequired: boolean;
  // All available signals for LLM
  signals: FieldSignals;
}

export interface FieldSignals {
  name: string | null;
  id: string | null;
  htmlType: string;
  placeholder: string | null;
  label: string | null;
  ariaLabel: string | null;
  autocomplete: string | null;
  pattern: string | null;
  minLength: number | null;
  maxLength: number | null;
}

export interface ButtonNode extends BaseNode {
  type: 'button';
  text: string | null;
  selector: string;
  buttonType: 'submit' | 'button' | 'reset';
}

export interface LinkNode extends BaseNode {
  type: 'link';
  text: string | null;
  href: string;
  selector: string;
}

export interface ApiNode extends BaseNode {
  type: 'api';
  method: string;
  endpoint: string;
  hasAuth: boolean;
}

/**
 * Edge types - relationships between nodes
 */
export interface GraphEdge {
  id: string;
  type: EdgeType;
  source: string;  // node id
  target: string;  // node id
}

export type EdgeType = 
  | 'route_contains_form'      // Route → Form
  | 'route_contains_link'      // Route → Link
  | 'form_has_field'           // Form → Field
  | 'form_has_submit'          // Form → Button
  | 'form_calls_api'           // Form → API
  | 'link_navigates_to'        // Link → Route
  | 'button_triggers_api'      // Button → API
  | 'route_redirects_to';      // Route → Route (after action)

// =============================================================================
// JOURNEY MODEL - User flows discovered from graph
// =============================================================================

/**
 * A journey is a connected path through the graph
 * Discovered via graph traversal, not hardcoded
 */
export interface Journey {
  id: string;
  entryNode: string;           // Starting route id
  nodes: string[];             // All nodes in this journey
  edges: string[];             // All edges traversed
  isAuthRequired: boolean;     // Has protected routes
  isCyclic: boolean;           // Contains loops
  formId?: string;             // For form-based journeys: the specific form
  formName?: string;           // For form-based journeys: form name for suite naming
}

// =============================================================================
// OUTPUT MODEL - What LLM generates
// =============================================================================

export interface Suite {
  id: string;
  name: string;                // LLM generates
  description: string;         // LLM generates
  journey: Journey;            // Graph-based source
  cases: Case[];
}

export interface Case {
  id: string;
  name: string;                // LLM generates
  description: string;         // LLM generates
  type: CaseType;
  preconditions: string[];     // LLM generates
  steps: Step[];
  expectedOutcome: string;     // LLM generates
}

// Case types - universal, not app-specific
export type CaseType = 
  | 'happy-path'      // Normal successful flow
  | 'validation'      // Input validation errors
  | 'error'           // System/API errors
  | 'edge'            // Boundary conditions
  | 'security';       // Auth/permission tests

export interface Step {
  id: string;
  action: StepAction;
  target: string;              // Selector or URL (from graph)
  value?: string;              // LLM generates realistic data
  assertion?: Assertion;
  reasoning?: string;          // LLM explains why this step
}

export type StepAction = 
  | 'navigate'
  | 'fill'
  | 'click'
  | 'select'
  | 'check'
  | 'upload'
  | 'wait'
  | 'assert';

export interface Assertion {
  type: AssertionType;
  expected: string;
}

export type AssertionType = 
  | 'visible'
  | 'hidden'
  | 'text'
  | 'url'
  | 'value'
  | 'count'
  | 'enabled'
  | 'disabled';

// =============================================================================
// LLM INTERFACE - What we send/receive from LLM
// =============================================================================

export interface LLMInput {
  graph: AppGraph;
  journey: Journey;
  context: {
    appName: string;
    framework: string;
    routes: string[];
  };
}

export interface LLMOutput {
  suiteName: string;
  suiteDescription: string;
  cases: Array<{
    name: string;
    description: string;
    type: CaseType;
    preconditions: string[];
    expectedOutcome: string;
    testData: Record<string, string>;  // Field id → realistic value
    edgeCases: string[];               // What could go wrong
  }>;
}

// =============================================================================
// QUALITY METRICS
// =============================================================================

export interface QualityMetrics {
  // Graph quality
  graphCompleteness: number;   // All routes have forms/links mapped
  edgeCoverage: number;        // All relationships discovered
  
  // Journey quality
  journeyCount: number;        // How many distinct journeys
  avgJourneyLength: number;    // Average steps per journey
  
  // Output quality
  caseTypeDistribution: Record<CaseType, number>;
  selectorValidity: number;    // % selectors that exist
  
  // LLM quality (self-reported)
  nameClarity: number;
  dataRealism: number;
}
