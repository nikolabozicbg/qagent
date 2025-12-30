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
