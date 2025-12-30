/**
 * Journey Type Definitions
 * 
 * Core data structures for smart journey discovery system.
 * These types represent multi-step user journeys discovered from code.
 */

export interface Journey {
  id: string;
  name: string;
  description: string;
  route?: string; // Primary route for test generation (entry point)
  entryPoint: string;
  steps: JourneyStep[];
  finalOutcome: JourneyOutcome;
  metadata: JourneyMetadata;
}

export interface JourneyStep {
  order: number;
  route: string;
  action: string;
  description: string;
  apiCall?: ApiCall;
  stateChanges?: StateChange[];
  uiElements?: UIElement[];
  nextStep?: StepTransition;
}

export interface ApiCall {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  expectedStatus: number;
  payload?: Record<string, any>;
}

export interface StateChange {
  type: 'localStorage' | 'sessionStorage' | 'cookie' | 'state' | 'context';
  target: string;  // key name or variable name
  operation: 'set' | 'delete' | 'update';
  value?: any;
}

export interface UIElement {
  type: string;  // 'button', 'input', 'form', etc. - discovered from code!
  selector?: string;
  role?: string;
  text?: string;
  action?: string;  // 'click', 'fill', 'submit', etc.
}

export interface FormField {
  name: string;
  type: string;  // 'text', 'email', 'password', etc.
  selector?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export interface StepTransition {
  success?: string;  // Route on success
  error?: string;    // Route on error
  condition?: string; // Condition for transition
}

export interface JourneyOutcome {
  description: string;
  verifications: Verification[];
}

export interface Verification {
  type: 'url' | 'storage' | 'api' | 'ui' | 'custom';
  description: string;
  
  // Type-specific fields
  urlPattern?: string | RegExp;
  storageKey?: string;
  storageType?: 'localStorage' | 'sessionStorage';
  apiEndpoint?: string;
  uiSelector?: string;
  uiExpectedText?: string;
  customCheck?: string;
}

export interface JourneyMetadata {
  category?: string;  // AI-determined category (NOT hardcoded!)
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;  // 0-1
  requiresAuth: boolean;
  estimatedDuration?: string;
  tags: string[];  // Dynamic tags from analysis
}

/**
 * Discovery result returned to client
 */
export interface JourneyDiscoveryResult {
  journeys: Journey[];
  analysisTime: number;
  metadata: {
    totalPaths: number;
    validJourneys: number;
    analysisLayers: string[];
  };
}
