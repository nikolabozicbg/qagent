import { DiscoveredFlow, ProjectType } from './onboarding.types';
import { RiskPriority } from './risk-queue.types';

/**
 * Dashboard tab names
 */
export type DashboardTab = 'overview' | 'flows';

/**
 * Flow status in the dashboard
 */
export type FlowStatus = 'draft' | 'generated' | 'passing' | 'failing' | 'flaky';

/**
 * Extended flow with status for dashboard display
 */
export interface DashboardFlow extends DiscoveredFlow {
  status: FlowStatus;
  testFilePath?: string;
  lastRun?: Date;
}

/**
 * Stack summary for dashboard header
 */
export interface StackSummary {
  projectType: ProjectType;
  framework: string;
  version?: string;
  testingFramework?: string;
  isConfigured: boolean;
}

/**
 * Flows/Endpoints summary
 */
export interface FlowsSummary {
  total: number;
  draft: number;
  generated: number;
  passing: number;
  failing: number;
  items: DashboardFlow[];
}

/**
 * Testing summary stats
 */
export interface TestingSummary {
  coverage: number;
  coverageGoal: number;
  totalTests: number;
  passingTests: number;
  failingTests: number;
  flakyTests: number;
}

/**
 * Risk queue summary for dashboard
 */
export interface RiskQueueSummary {
  totalItems: number;
  criticalCount: number;
  highCount: number;
  topItems: DashboardRiskItem[];
}

/**
 * Risk factor for display
 */
export interface DashboardRiskFactor {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

/**
 * Risk queue item for dashboard display
 */
export interface DashboardRiskItem {
  id: string;
  name: string;
  path: string;
  riskScore: number;
  priority: RiskPriority;
  factors: DashboardRiskFactor[];
  hasTest: boolean;
  linesOfCode: number;
  importCount: number;
}

/**
 * Complete dashboard data
 */
export interface DashboardData {
  stack: StackSummary;
  flows: FlowsSummary;
  testing: TestingSummary;
  riskQueue: RiskQueueSummary;
  lastRefresh: Date;
}

// =============================================================================
// EXTENDED DASHBOARD TYPES (Screens 4-9)
// =============================================================================

export type FlowPriority = 'critical' | 'high' | 'standard';
export type FilterType = 'all' | 'critical' | 'high';

export interface FlowMetadata {
  filePath: string;
  fileSize: number; // in bytes
  testCases: number;
  assertions: number;
  linesOfCode: number;
  components: string[];
  apiCalls: ApiCall[];
  formFields: FormField[];
  detectedIssues?: string[];
  suggestions?: string[];
}

export interface ApiCall {
  method: string; // GET, POST, etc
  endpoint: string;
  mocked: boolean;
  avgResponseTime?: number; // in ms
}

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  validation?: string;
}

export interface ProjectHealth {
  score: number; // 0-100
  flowsActive: number;
  flowsTotal: number;
  passingCount: number;
  warningCount: number;
  failingCount: number;
  totalRuntime: number; // in seconds
  trends: Trends;
}

export interface Trends {
  tests: TrendData;
  passRate: TrendData;
  speed: TrendData;
}

export interface TrendData {
  values: number[]; // Last N data points for sparkline
  change: number; // Percentage change (e.g., 15 for +15%)
  direction: 'up' | 'down' | 'stable';
}

export interface SmartInsight {
  id: string;
  type: 'performance' | 'suggestion' | 'update-needed' | 'detection';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  flowId?: string;
  actionable?: boolean;
}

export interface ExecutionHistory {
  runs: TestRun[];
  successRate: number; // 0-100
  avgRuntime: number; // in seconds
  performanceTrend: number[]; // Last N runtimes for chart
}

export interface TestRun {
  id: string;
  timestamp: Date;
  status: 'passed' | 'failed' | 'flaky';
  runtime: number; // in seconds
  testsPassed: number;
  testsFailed: number;
  artifacts?: Artifacts;
}

export interface Artifacts {
  screenshots: string[]; // File paths
  videos: string[]; // File paths
  htmlReport?: string; // File path
}

export interface GenerationProgress {
  currentStep: string;
  percentage: number; // 0-100
  completedSteps: GenerationStep[];
  insights: DiscoveryInsight[];
  smartDecisions: SmartDecision[];
  estimatedTime: number; // in seconds
}

export interface GenerationStep {
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  duration?: number; // in seconds
}

export interface DiscoveryInsight {
  type: 'form-field' | 'api-call' | 'redirect' | 'error-scenario';
  description: string;
}

export interface SmartDecision {
  icon: string;
  description: string;
}

export interface CodeStats {
  lines: number;
  testCases: number;
  assertions: number;
  imports: number;
  generatedTime: number; // in seconds
}

export interface ExecutionState {
  currentTest: number;
  totalTests: number;
  percentage: number; // 0-100
  currentStep: string;
  completedSteps: string[];
  pendingSteps: string[];
  elapsedTime: number; // in seconds
  testResults: TestResult[];
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  duration?: number; // in seconds
  error?: string;
  steps?: TestStep[];
}

export interface TestStep {
  description: string;
  status: 'completed' | 'failed' | 'skipped';
}

export interface NetworkActivity {
  method: string;
  url: string;
  status: number;
  duration: number; // in ms
}

export interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalRuntime: number; // in seconds
  passRate: number; // 0-100
  testCases: TestCaseResult[];
  coverage: CoverageData;
  artifacts: Artifacts;
}

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number; // in seconds
  assertions: AssertionResult[];
}

export interface AssertionResult {
  description: string;
  status: 'passed' | 'failed';
}

export interface CoverageData {
  components: {
    total: number;
    covered: number;
    percentage: number;
  };
  apiCalls: {
    total: number;
    covered: number;
    percentage: number;
  };
  userPaths: {
    total: number;
    covered: number;
    percentage: number;
  };
  totalPercentage: number;
}

// Message types for webview communication
export interface DashboardMessage {
  command: 
    | 'refreshDashboard'
    | 'openConfig'
    | 'filterFlows'
    | 'searchFlows'
    | 'selectFlow'
    | 'runFlow'
    | 'editFlow'
    | 'regenFlow'
    | 'generateNew'
    | 'deleteFlow'
    | 'pauseGeneration'
    | 'cancelGeneration'
    | 'pauseExecution'
    | 'stopExecution'
    | 'debugExecution';
  data?: any;
}
