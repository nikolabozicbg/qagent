/**
 * Analysis Payload Types
 * 
 * These types define the contract between:
 * - Client (local scanner) - produces AnalysisPayload
 * - Backend (cloud) - consumes AnalysisPayload, returns DiscoveryResponse
 * 
 * All types are JSON-serializable (no Map, Set, functions).
 */

// ============================================
// INPUT: What client sends to backend
// ============================================

export interface AnalysisPayload {
  // Project metadata
  project: ProjectInfo;
  
  // Parsed structural data
  components: ComponentInfo[];
  routes: RouteInfo[];
  forms: FormInfo[];
  apis: APIInfo[];
  types: TypeInfo[];
  selectors: SelectorInfo[];
  behaviors: BehaviorInfo[];
  
  // Relationship data (critical for quality)
  relationships: RelationshipData;
}

export interface ProjectInfo {
  name: string;
  framework: {
    name: string;                    // 'next', 'react', 'vue', etc.
    version: string;
    router: string | null;           // 'app-router', 'pages-router', 'react-router', etc.
    stateManagement: string[];       // 'redux', 'zustand', 'context', etc.
  };
  stats: {
    totalFiles: number;
    totalLines: number;
  };
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  
  // What it renders
  renderedElements: string[];        // HTML elements and child components
  isInteractive: boolean;            // Has buttons, inputs, etc.
  
  // What it uses
  props: PropInfo[];
  hooks: string[];                   // useState, useEffect, custom hooks
  
  // Behavior hints
  hasState: boolean;
  hasEffects: boolean;
  hasForms: boolean;
  
  // Complexity score (0-1)
  complexity: number;
}

export interface PropInfo {
  name: string;
  type: string | null;
  isRequired: boolean;
}

export interface RouteInfo {
  path: string;
  component: string | null;          // Component name rendered on this route
  filePath: string;
  
  isProtected: boolean;
  isDynamic: boolean;
  params: string[];                  // e.g., ['id', 'slug']
  
  // What's on this page
  forms: string[];                   // Form IDs on this route
  apis: string[];                    // API calls made on this route
}

export interface FormInfo {
  id: string;
  name: string;
  componentName: string;
  filePath: string;
  route: string | null;              // Route where this form is located
  
  fields: FieldInfo[];
  submitButton: {
    text: string | null;
    selector: string | null;
  } | null;
  
  // Behavior
  submitEndpoint: string | null;     // API endpoint on submit
  hasValidation: boolean;
  validationRules: Record<string, string[]>;  // field -> rules
  
  // Flow
  successRedirect: string | null;
  
  // Metadata
  library: string | null;            // 'react-hook-form', 'formik', etc.
  
  // Test data (if available from mining)
  testData?: Record<string, string>;
}

export interface FieldInfo {
  name: string;
  type: string;                      // 'text', 'email', 'password', 'select', etc.
  label: string | null;
  isRequired: boolean;
  
  // Selectors (prioritized)
  selector: string | null;           // Best selector
  selectorStrategy: string;          // 'testId', 'name', 'label', etc.
  
  // Validation
  validations: {
    type: string;                    // 'required', 'email', 'minLength', etc.
    value: string | number | null;
    message: string | null;
  }[];
}

export interface APIInfo {
  method: string;                    // GET, POST, PUT, DELETE
  path: string;                      // /api/users, /api/products/:id
  
  // Where it's called from
  calledFrom: {
    component: string;
    filePath: string;
  }[];
  
  // Request/Response hints
  requestType: string | null;        // TypeScript type name
  responseType: string | null;
  
  hasAuth: boolean;
}

export interface TypeInfo {
  name: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  filePath: string;
  
  // Properties (for interface/type)
  properties: {
    name: string;
    type: string;
    isOptional: boolean;
  }[];
  
  // Semantic hints
  semanticType: string | null;       // 'entity', 'dto', 'props', 'state', etc.
  
  // Usage
  usedBy: string[];                  // Components/files that import this type
}

export interface SelectorInfo {
  element: string;                   // button, input, div, etc.
  selector: string;                  // [data-testid="..."], #id, .class
  strategy: string;                  // testId, id, class, aria
  
  component: string;                 // Which component contains this
  filePath: string;
  
  isInteractive: boolean;
  interactionType: string | null;    // click, fill, select, etc.
}

export interface BehaviorInfo {
  type: string;                      // 'form-submit', 'navigation', 'api-call', 'state-update'
  description: string;
  
  trigger: {
    element: string | null;
    event: string;                   // onClick, onSubmit, onChange, etc.
    selector: string | null;
  };
  
  outcome: {
    type: string;                    // 'api-call', 'navigation', 'state-change', 'ui-update'
    target: string | null;           // API endpoint, route, state key
  };
  
  component: string;
  filePath: string;
}

/**
 * Relationship data - HOW things connect
 * This is critical for generating meaningful test flows
 */
export interface RelationshipData {
  // Component -> Types it uses
  componentToTypes: Record<string, string[]>;
  
  // Component -> APIs it calls
  componentToApis: Record<string, string[]>;
  
  // Route -> Component rendered
  routeToComponent: Record<string, string>;
  
  // Navigation links between pages
  navigationLinks: {
    from: string;                    // Source route or component
    to: string;                      // Target route
    linkText: string | null;
    selector: string | null;
  }[];
  
  // Form -> Entity it creates/updates
  formToEntity: Record<string, string>;
  
  // Entity -> All routes that display/modify it
  entityToRoutes: Record<string, string[]>;
  
  // User flows (sequences of pages)
  inferredFlows: {
    name: string;
    description: string;
    steps: string[];                 // Route paths in order
    entities: string[];              // Entities involved
    importance: number;              // 0-1
  }[];
}

// ============================================
// OUTPUT: What backend returns
// ============================================

export interface DiscoveryResponse {
  success: boolean;
  
  suites: TestSuiteOutput[];
  
  summary: {
    totalSuites: number;
    totalCases: number;
    totalSteps: number;
    coverage: {
      routes: { total: number; covered: number };
      forms: { total: number; covered: number };
      entities: { total: number; covered: number };
    };
  };
  
  // For debugging/transparency
  analysis: {
    detectedEntities: string[];
    detectedFlows: string[];
    processingTime: number;
    aiModel: string | null;
  };
}

export interface TestSuiteOutput {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  
  testCases: TestCaseOutput[];
  
  // What this suite covers
  coverage: {
    routes: string[];
    forms: string[];
    entities: string[];
  };
}

export interface TestCaseOutput {
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'validation' | 'error-handling' | 'edge-case' | 'security' | 'navigation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  steps: TestStepOutput[];
  
  // Test data hints
  testData?: {
    valid?: Record<string, any>;
    invalid?: Record<string, any>;
  };
  
  // Estimated duration in seconds
  estimatedDuration: number;
}

export interface TestStepOutput {
  index: number;
  action: string;                    // navigate, click, fill, verify, wait, etc.
  target: string;                    // Route, element name, or verification target
  
  selector: string | null;           // CSS/data-testid selector
  value: string | null;              // For fill actions
  
  description: string;               // Human-readable step description
  
  // Expected outcome
  expectedOutcome?: string;
  
  // API call info (if action triggers API)
  api?: {
    method: string;
    endpoint: string;
    expectedStatus: number;
  };
}
