import * as vscode from 'vscode';
import {
  DashboardData,
  DashboardFlow,
  StackSummary,
  FlowsSummary,
  TestingSummary,
  RiskQueueSummary,
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
  private riskQueueService: RiskQueueService;

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
    const newFlow: DashboardFlow = {
      id: this.generateId(),
      name: flow.name || 'New Flow',
      description: flow.description || '',
      confidence: flow.confidence || 100,
      routes: flow.routes || [],
      components: flow.components || [],
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
    
    // TODO: In Phase 3+, get real coverage data
    // For now, return placeholder data
    return {
      coverage: 0,
      coverageGoal,
      totalTests: 0,
      passingTests: 0,
      failingTests: 0,
      flakyTests: 0,
    };
  }


  private generateId(): string {
    return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
