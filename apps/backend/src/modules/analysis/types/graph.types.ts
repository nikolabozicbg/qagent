/**
 * Graph Type Definitions
 * 
 * Data structures for navigation graph analysis.
 * Used by NavigationGraphService for path discovery.
 */

export interface NavigationGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, Edge[]>;
}

export interface GraphNode {
  route: string;
  component: string;
  metadata: NodeMetadata;
}

export interface NodeMetadata {
  type: 'page' | 'modal' | 'redirect' | 'api' | 'unknown';
  authRequired: boolean;
  apiCalls: string[];  // API endpoints called from this page
  stateChanges: string[];  // State operations performed
  uiElements: string[];  // UI elements found (dynamic!)
}

export interface Edge {
  source: string;
  target: string;
  condition?: string;  // e.g., "response.status === 200"
  trigger?: string;    // e.g., "onClick", "onSubmit"
  weight: number;      // Priority/importance score
  data?: any;          // Additional metadata
}

export interface PathResult {
  route: string;
  steps: Step[];
  depth: number;
}

export interface Step {
  from: string;
  to: string;
  edge: Edge;
}

/**
 * Analysis context passed between layers
 */
export interface AnalysisContext {
  workspacePath: string;
  navigationGraph: NavigationGraph;
  components: ComponentAnalysis[];
  routeMetadata: Map<string, NodeMetadata>;
}

export interface ComponentAnalysis {
  filePath: string;
  route: string;
  componentName: string;
  code: string;
  ast?: any;  // Babel AST
}

/**
 * Journey - Complete user flow through multiple pages
 * This represents a real E2E test scenario
 */
export interface Journey {
  name: string;  // Human-readable name
  route?: string;  // Primary route for test generation (entry point)
  steps: JourneyStep[];
  priority: number;  // Higher = more important to test
  expectedOutcomes: string[];  // What should happen at the end
  tags: string[];  // For categorization
}

export interface JourneyStep {
  route: string;
  component: string;
  actions: string[];  // Actions to perform (e.g., "api:/login", "form_interaction")
  validations: string[];  // Validations to check (e.g., "auth_required", "input_validation")
}
