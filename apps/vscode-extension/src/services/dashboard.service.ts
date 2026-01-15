import * as vscode from 'vscode';
import {
  DashboardData,
  DashboardFlow,
  StackSummary,
  FlowsSummary,
  TestingSummary,
  RiskQueueSummary,
  TestResult,
  TestRun,
} from '../types/dashboard.types';
import { OnboardingState, DiscoveredFlow, DetectedStack } from '../types/onboarding.types';
import { RiskQueueService } from './risk-queue.service';
import { log } from '../extension';

/**
 * DashboardService - Aggregates data for the main dashboard
 * 
 * Pulls data from:
 * - Onboarding state (flows, stack)
 * - Workspace state (test results, coverage)
 * - Configuration (goals, settings)
 */
export class DashboardService {
  private static readonly ONBOARDING_STATE_KEY = 'qagenai.onboardingState';
  private static readonly FLOWS_KEY = 'qagenai.dashboardFlows';
  private static readonly TEST_RESULTS_KEY = 'qagenai.testResults';
  private static readonly TEST_HISTORY_KEY = 'qagenai.testHistory';
  private riskQueueService: RiskQueueService;
  
  // Track currently running test (SCREEN 5)
  private runningFlowId: string | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.riskQueueService = new RiskQueueService(context);
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const onboardingState = this.getOnboardingState();
    const flows = await this.getFlows();
    const riskSummary = await this.riskQueueService.getRiskSummary();
    
    return {
      stack: this.getStackSummary(onboardingState?.detectedStack),
      flows: this.getFlowsSummary(flows),
      testing: this.getTestingSummary(),
      riskQueue: {
        totalItems: riskSummary.totalItems,
        criticalCount: riskSummary.criticalCount,
        highCount: riskSummary.highCount,
        topItems: riskSummary.topItems.map(item => ({
          id: item.id,
          name: item.name,
          path: item.relativePath,
          riskScore: item.riskScore,
          priority: item.priority,
          factors: item.factors,
          hasTest: item.hasTest,
          linesOfCode: item.linesOfCode,
          importCount: item.importCount,
        })),
      },
      lastRefresh: new Date(),
    };
  }

  /**
   * Get all flows (from onboarding + any added later)
   */
  async getFlows(): Promise<DashboardFlow[]> {
    // First check for saved dashboard flows (workspaceState)
    const savedFlows = this.context.workspaceState.get<DashboardFlow[]>(DashboardService.FLOWS_KEY);
    log('Dashboard flows from workspaceState:', savedFlows?.length || 0);
    
    if (savedFlows && savedFlows.length > 0) {
      log('Returning saved flows:', savedFlows.map(f => f.name));
      return savedFlows;
    }

    // Fall back to onboarding discovered flows (globalState)
    const onboardingState = this.getOnboardingState();
    log('Onboarding state:', {
      hasState: !!onboardingState,
      flowCount: onboardingState?.discoveredFlows?.length || 0,
      completed: onboardingState?.completed,
      flowNames: onboardingState?.discoveredFlows?.map(f => f.name) || [],
    });
    
    if (onboardingState?.discoveredFlows && onboardingState.discoveredFlows.length > 0) {
      const dashboardFlows = onboardingState.discoveredFlows.map(flow => this.toDashboardFlow(flow));
      log('Converting', dashboardFlows.length, 'flows to dashboard format');
      // Save for future use
      await this.saveFlows(dashboardFlows);
      return dashboardFlows;
    }

    log('No flows found anywhere');
    return [];
  }

  /**
   * Save flows to workspace state
   */
  async saveFlows(flows: DashboardFlow[]): Promise<void> {
    await this.context.workspaceState.update(DashboardService.FLOWS_KEY, flows);
  }

  /**
   * Add a new flow
   */
  async addFlow(flow: Partial<DashboardFlow>): Promise<DashboardFlow> {
    const flows = await this.getFlows();
    
    // Extract data from journeyData if available
    let routes: string[] = flow.routes || [];
    let components: string[] = flow.components || [];
    let description = flow.description || '';
    
    if (flow.journeyData) {
      log('[DashboardService] journeyData keys:', Object.keys(flow.journeyData));
      log('[DashboardService] journeyData.journey:', (flow.journeyData as any).journey);
      const journey = (flow.journeyData as any).journey;
      
      // Extract routes from journey
      if (journey?.routes && Array.isArray(journey.routes)) {
        routes = journey.routes;
      }
      
      // Extract components from journey steps or componentsAnalysis
      if (journey?.steps && Array.isArray(journey.steps)) {
        components = journey.steps.map((s: any) => s.component || s.name).filter(Boolean);
      }
      
      // Use journey description if not provided
      if (!description && journey?.description) {
        description = journey.description;
      }
    }
    
    const newFlow: DashboardFlow = {
      id: this.generateId(),
      name: flow.name || 'New Flow',
      description,
      confidence: flow.confidence || 100,
      routes,
      components,
      selected: true,
      status: 'draft',
      ...flow,
    };
    
    flows.push(newFlow);
    await this.saveFlows(flows);
    return newFlow;
  }

  /**
   * Update a flow
   */
  async updateFlow(id: string, updates: Partial<DashboardFlow>): Promise<DashboardFlow | null> {
    const flows = await this.getFlows();
    const index = flows.findIndex(f => f.id === id);
    
    if (index === -1) return null;
    
    flows[index] = { ...flows[index], ...updates };
    await this.saveFlows(flows);
    return flows[index];
  }

  /**
   * Delete a flow
   */
  async deleteFlow(id: string): Promise<boolean> {
    const flows = await this.getFlows();
    const filtered = flows.filter(f => f.id !== id);
    
    if (filtered.length === flows.length) return false;
    
    await this.saveFlows(filtered);
    return true;
  }

  /**
   * Get stack information
   */
  getStackInfo(): StackSummary {
    const onboardingState = this.getOnboardingState();
    return this.getStackSummary(onboardingState?.detectedStack);
  }

  /**
   * Refresh all data (clear caches)
   */
  async refresh(): Promise<DashboardData> {
    // Refresh risk queue cache
    await this.riskQueueService.refresh();
    return this.getDashboardData();
  }

  /**
   * Get risk queue service for direct access
   */
  getRiskQueueService(): RiskQueueService {
    return this.riskQueueService;
  }

  /**
   * Set currently running flow (SCREEN 5)
   */
  setRunningFlow(flowId: string | null): void {
    this.runningFlowId = flowId;
  }

  /**
   * Get currently running flow ID (SCREEN 5)
   */
  getRunningFlowId(): string | null {
    return this.runningFlowId;
  }

  // ============================================
  // Private Methods
  // ============================================

  private getOnboardingState(): OnboardingState | undefined {
    return this.context.globalState.get<OnboardingState>(DashboardService.ONBOARDING_STATE_KEY);
  }

  private toDashboardFlow(flow: DiscoveredFlow): DashboardFlow {
    // Explicitly preserve journeyData from DiscoveredFlow
    return {
      ...flow,
      status: 'draft',
      journeyData: flow.journeyData, // Ensure journey data is preserved (public property for VS Code storage)
    } as DashboardFlow;
  }

  private getStackSummary(stack?: DetectedStack): StackSummary {
    if (!stack) {
      return {
        projectType: 'frontend',
        framework: 'Unknown',
        isConfigured: false,
      };
    }

    const projectType = stack.projectType || 'frontend';
    let framework = 'Unknown';
    let version: string | undefined;
    let testingFramework: string | undefined;

    if (projectType === 'backend' && stack.backend) {
      framework = stack.backend.framework;
      version = stack.backend.version;
    } else if (stack.frontend) {
      framework = stack.frontend.framework;
      version = stack.frontend.version;
    }

    if (stack.e2e) {
      testingFramework = stack.e2e.framework;
    } else if (stack.unit) {
      testingFramework = stack.unit.framework;
    }

    return {
      projectType,
      framework,
      version,
      testingFramework,
      isConfigured: true,
    };
  }

  private getFlowsSummary(flows: DashboardFlow[]): FlowsSummary {
    return {
      total: flows.length,
      draft: flows.filter(f => f.status === 'draft').length,
      generated: flows.filter(f => f.status === 'generated').length,
      passing: flows.filter(f => f.status === 'passing').length,
      failing: flows.filter(f => f.status === 'failing').length,
      items: flows,
    };
  }

  private getTestingSummary(): TestingSummary {
    // Get coverage goal from settings
    const coverageGoal = vscode.workspace.getConfiguration('qagenai').get<number>('coverageGoal') || 80;
    
    // Get real test results from workspace state
    const testResults = this.getTestResults();
    
    // Calculate real metrics
    const totalTests = testResults.length;
    const passingTests = testResults.filter(r => r.status === 'passed').length;
    const failingTests = testResults.filter(r => r.status === 'failed').length;
    
    // Calculate flaky tests (tests that have both passed and failed in recent runs)
    const flakyTests = this.calculateFlakyTests(testResults);
    
    // Get coverage from latest test run (if available)
    const latestRun = this.getLatestTestRun();
    const coverage = latestRun?.coverage || 0;
    
    return {
      coverage,
      coverageGoal,
      totalTests,
      passingTests,
      failingTests,
      flakyTests,
    };
  }


  private generateId(): string {
    return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // Test Results & Health Score
  // ============================================

  /**
   * Get all test results from workspace state
   */
  getTestResults(): Array<TestRun & { flowId: string; flowName: string }> {
    return this.context.workspaceState.get<Array<TestRun & { flowId: string; flowName: string }>>(
      DashboardService.TEST_RESULTS_KEY
    ) || [];
  }

  /**
   * Get test results for a specific flow
   */
  getFlowTestResults(flowId: string): Array<TestRun> {
    const allResults = this.getTestResults();
    return allResults.filter(r => r.flowId === flowId);
  }

  /**
   * Get latest test run across all flows
   */
  getLatestTestRun(): (TestRun & { flowId: string; flowName: string; coverage?: number }) | undefined {
    const results = this.getTestResults();
    if (results.length === 0) return undefined;
    
    return results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }

  /**
   * Record a test execution result
   */
  async recordTestResult(flowId: string, flowName: string, result: TestRun): Promise<void> {
    const results = this.getTestResults();
    
    // Add flow info to result
    const testResult = {
      ...result,
      flowId,
      flowName,
    };
    
    results.push(testResult);
    
    // Keep only last 100 results to avoid bloat
    const trimmedResults = results.slice(-100);
    
    await this.context.workspaceState.update(DashboardService.TEST_RESULTS_KEY, trimmedResults);
    
    // Update test history for trends
    await this.updateTestHistory();
    
    log(`[DashboardService] Recorded test result for flow ${flowName}:`, result.status);
  }

  /**
   * Calculate health score (0-100)
   * Formula: (passingTests / totalTests * 70) + (coverage / coverageGoal * 30)
   */
  calculateHealthScore(): number {
    const testing = this.getTestingSummary();
    
    // If no tests, health = 0
    if (testing.totalTests === 0) {
      return 0;
    }
    
    // Test pass rate (70% weight)
    const testScore = (testing.passingTests / testing.totalTests) * 70;
    
    // Coverage score (30% weight)
    const coverageScore = testing.coverageGoal > 0 
      ? (testing.coverage / testing.coverageGoal) * 30
      : 0;
    
    // Total score
    const healthScore = Math.min(100, Math.round(testScore + coverageScore));
    
    log(`[DashboardService] Health score: ${healthScore}% (tests: ${testScore.toFixed(1)}, coverage: ${coverageScore.toFixed(1)})`);
    
    return healthScore;
  }

  /**
   * Calculate flaky tests (tests with inconsistent results)
   */
  private calculateFlakyTests(testResults: Array<TestRun & { flowId: string }>): number {
    // Group by flowId
    const flowGroups = new Map<string, TestRun[]>();
    
    testResults.forEach(result => {
      if (!flowGroups.has(result.flowId)) {
        flowGroups.set(result.flowId, []);
      }
      flowGroups.get(result.flowId)!.push(result);
    });
    
    // Count flows with both passed and failed results
    let flakyCount = 0;
    
    flowGroups.forEach(runs => {
      // Look at last 5 runs
      const recentRuns = runs.slice(-5);
      const hasPassed = recentRuns.some(r => r.status === 'passed');
      const hasFailed = recentRuns.some(r => r.status === 'failed');
      
      if (hasPassed && hasFailed) {
        flakyCount++;
      }
    });
    
    return flakyCount;
  }

  /**
   * Update test history for trend charts
   */
  private async updateTestHistory(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get existing history
    interface TestHistoryEntry {
      date: string;
      healthScore: number;
      totalTests: number;
      passingTests: number;
      failingTests: number;
      coverage: number;
    }
    
    const history = this.context.workspaceState.get<TestHistoryEntry[]>(
      DashboardService.TEST_HISTORY_KEY
    ) || [];
    
    // Calculate current stats
    const testing = this.getTestingSummary();
    const healthScore = this.calculateHealthScore();
    
    // Find today's entry or create new one
    const todayIndex = history.findIndex(h => h.date === today);
    const todayEntry: TestHistoryEntry = {
      date: today,
      healthScore,
      totalTests: testing.totalTests,
      passingTests: testing.passingTests,
      failingTests: testing.failingTests,
      coverage: testing.coverage,
    };
    
    if (todayIndex >= 0) {
      // Update existing entry
      history[todayIndex] = todayEntry;
    } else {
      // Add new entry
      history.push(todayEntry);
    }
    
    // Keep only last 30 days
    const trimmedHistory = history.slice(-30);
    
    await this.context.workspaceState.update(DashboardService.TEST_HISTORY_KEY, trimmedHistory);
  }

  /**
   * Get test history for trend charts
   */
  getTestHistory(days: number = 7): Array<{
    date: string;
    healthScore: number;
    totalTests: number;
    passingTests: number;
    failingTests: number;
    coverage: number;
  }> {
    const history = this.context.workspaceState.get<Array<{
      date: string;
      healthScore: number;
      totalTests: number;
      passingTests: number;
      failingTests: number;
      coverage: number;
    }>>(
      DashboardService.TEST_HISTORY_KEY
    ) || [];
    
    // Return last N days
    return history.slice(-days);
  }

  /**
   * Get average test duration across all tests
   */
  getAverageTestDuration(): number {
    const results = this.getTestResults();
    if (results.length === 0) return 0;
    
    const totalRuntime = results.reduce((sum, r) => sum + r.runtime, 0);
    return totalRuntime / results.length;
  }

  /**
   * Get slow tests (> 10 seconds)
   */
  getSlowTests(): Array<{ flowId: string; flowName: string; runtime: number }> {
    const results = this.getTestResults();
    return results
      .filter(r => r.runtime > 10)
      .map(r => ({
        flowId: r.flowId,
        flowName: r.flowName,
        runtime: r.runtime,
      }))
      .sort((a, b) => b.runtime - a.runtime)
      .slice(0, 5); // Top 5 slowest
  }

  /**
   * Get failing tests with error messages
   */
  getFailingTests(): Array<{ 
    flowId: string; 
    flowName: string; 
    error?: string;
    timestamp: Date;
  }> {
    const results = this.getTestResults();
    return results
      .filter(r => r.status === 'failed')
      .map(r => ({
        flowId: r.flowId,
        flowName: r.flowName,
        error: r.artifacts?.htmlReport, // Error details can be in artifacts
        timestamp: r.timestamp,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Last 10 failures
  }
}
