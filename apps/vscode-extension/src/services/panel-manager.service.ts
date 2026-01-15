import * as vscode from 'vscode';
import { DashboardService } from './dashboard.service';
import { DashboardEditorPanel } from '../panels/dashboard-editor.panel';
import { log } from '../extension';

/**
 * PanelManager - Central manager for all editor panels
 * 
 * Responsibilities:
 * - Open/close editor panels (Dashboard, Flow Detail, Test Generation, etc.)
 * - Manage panel lifecycle and state
 * - Coordinate between panels
 * - Singleton management for each panel type
 * 
 * Panel Types:
 * - dashboard: Main premium dashboard (Screen 4)
 * - flow-detail: Flow detail view (Screen 5) - TODO
 * - test-generation: Test generation split view (Screen 6-7) - TODO
 * - test-execution: Live test execution (Screen 8) - TODO
 * - test-results: Test results summary (Screen 9) - TODO
 */
export class PanelManager {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly dashboardService: DashboardService
  ) {}

  /**
   * Open premium dashboard in central editor
   */
  public openDashboard(): void {
    log('[PanelManager] Opening dashboard panel');
    DashboardEditorPanel.show(this.context, this.dashboardService);
  }

  /**
   * Open flow detail view in central editor
   * TODO: Implement FlowDetailPanel (Screen 5)
   */
  public openFlowDetail(flowId: string): void {
    log('[PanelManager] Opening flow detail:', flowId);
    // TODO: Implement FlowDetailPanel.show(this.context, flowId, this.dashboardService);
    vscode.window.showInformationMessage(`Flow Detail for ${flowId} - Coming soon!`);
  }

  /**
   * Open test generation split view in central editor
   * TODO: Implement TestGenerationPanel (Screen 6-7)
   */
  public openTestGeneration(flowId?: string): void {
    log('[PanelManager] Opening test generation:', flowId);
    // TODO: Implement TestGenerationPanel.show(this.context, flowId);
    vscode.window.showInformationMessage('Test Generation - Coming soon!');
  }

  /**
   * Open test execution view in central editor
   * TODO: Implement TestExecutionPanel (Screen 8)
   */
  public openTestExecution(flowId: string): void {
    log('[PanelManager] Opening test execution:', flowId);
    // TODO: Implement TestExecutionPanel.show(this.context, flowId);
    vscode.window.showInformationMessage(`Test Execution for ${flowId} - Coming soon!`);
  }

  /**
   * Open test results view in central editor
   * TODO: Implement TestResultsPanel (Screen 9)
   */
  public openTestResults(flowId: string): void {
    log('[PanelManager] Opening test results:', flowId);
    // TODO: Implement TestResultsPanel.show(this.context, flowId);
    vscode.window.showInformationMessage(`Test Results for ${flowId} - Coming soon!`);
  }

  /**
   * Refresh all open panels
   */
  public async refreshAll(): Promise<void> {
    log('[PanelManager] Refreshing all panels');
    
    // Refresh dashboard if open
    if (DashboardEditorPanel.currentPanel) {
      await DashboardEditorPanel.currentPanel.refresh();
    }
    
    // TODO: Refresh other panels when implemented
  }

  /**
   * Close all open panels
   */
  public closeAll(): void {
    log('[PanelManager] Closing all panels');
    
    // Close dashboard if open
    if (DashboardEditorPanel.currentPanel) {
      DashboardEditorPanel.currentPanel.dispose();
    }
    
    // TODO: Close other panels when implemented
  }
}
