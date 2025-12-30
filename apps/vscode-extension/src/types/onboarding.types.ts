/**
 * Onboarding wizard step names (5 steps)
 */
export type OnboardingStep = 
  | 'welcome'
  | 'framework-detection'
  | 'e2e-setup'
  | 'flow-discovery'
  | 'ready';

/**
 * Full onboarding state
 */
export interface OnboardingState {
  currentStep: OnboardingStep;
  completed: boolean;
  detectedStack: DetectedStack;
  e2eConfig: E2EConfig;
  discoveredFlows: DiscoveredFlow[];
  scanResults: QuickScanResults | null;
}

/**
 * Project type based on detected stack
 */
export type ProjectType = 'frontend' | 'backend' | 'fullstack';

/**
 * Detected technology stack
 */
export interface DetectedStack {
  projectType?: ProjectType;
  frontend?: {
    framework: string;
    version: string;
    buildTool?: string;
  };
  backend?: {
    framework: string;
    version: string;
    orm?: string;
  };
  e2e?: {
    framework: string;
    installed: boolean;
    configPath?: string;
  };
  unit?: {
    framework: string;
    installed: boolean;
  };
  api?: {
    spec: 'openapi' | 'postman' | 'har';
    path: string;
  };
  isMonorepo: boolean;
  packages?: string[];
}

/**
 * E2E configuration
 */
export interface E2EConfig {
  baseUrl: string;
  auth: {
    type: 'none' | 'form' | 'bearer';
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
    };
  };
  importedSources: ImportedSource[];
}

/**
 * Imported test source
 */
export interface ImportedSource {
  type: 'recording' | 'postman' | 'openapi' | 'har' | 'description';
  name: string;
  path?: string;
  content?: string;
}

/**
 * AI-discovered user flow (for frontend)
 */
export interface DiscoveredFlow {
  id: string;
  name: string;
  description: string;
  confidence: number;
  routes: string[];
  components: string[];
  filePath?: string; // Path to the PRIMARY page component file
  testSuggestions?: string[]; // AI-generated test ideas
  requiresAuth?: boolean; // Whether flow requires authentication
  priority?: 'high' | 'medium' | 'low'; // Flow priority for testing
  selected: boolean;
  journeyData?: any; // Store full E2EJourney data from holistic analysis (public property for VS Code storage)
}

/**
 * Discovered API endpoint (for backend)
 */
export interface DiscoveredEndpoint {
  id: string;
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  controller: string;
  description: string;
  selected: boolean;
}

/**
 * Quick scan results
 */
export interface QuickScanResults {
  totalFiles: number;
  sourceFiles: number;
  testFiles: number;
  coverageBaseline: number;
  riskFiles: RiskFile[];
  scanDuration: number;
}

/**
 * File with risk score
 */
export interface RiskFile {
  path: string;
  name: string;
  coverage: number;
  riskScore: number;
  reason: string;
}
