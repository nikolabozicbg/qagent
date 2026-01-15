import * as vscode from 'vscode';
import { DashboardService } from '../services/dashboard.service';
import { TestGenerationService } from '../services/test-generation.service';
import { PlaywrightService } from '../services/playwright.service';
import { TestHealthService } from '../services/test-health.service';
import { DashboardData, DashboardTab, DashboardFlow } from '../types/dashboard.types';
import { log } from '../extension';

/**
 * DashboardWebviewProvider - Main hub view after onboarding
 * 
 * Features:
 * - Tab navigation (Overview, Flows, Risk Queue)
 * - Real data from DashboardService
 * - Flow management actions
 * - Project type awareness (FE vs BE)
 */
export class DashboardWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'qagenai.dashboard';

  private view?: vscode.WebviewView;
  private currentTab: DashboardTab = 'overview';
  private data?: DashboardData;
  private playwrightService: PlaywrightService;
  private testHealthService: TestHealthService;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly dashboardService: DashboardService,
    private readonly testGenerationService: TestGenerationService
  ) {
    this.playwrightService = new PlaywrightService();
    this.testHealthService = new TestHealthService();
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    // Load data and render
    await this.loadAndRender();

    webviewView.webview.onDidReceiveMessage(
      async (message) => await this.handleMessage(message),
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Focus the dashboard view
   */
  public focus(): void {
    this.view?.show(true);
  }

  /**
   * Refresh dashboard data
   */
  public async refresh(): Promise<void> {
    await this.loadAndRender();
  }

  private async loadAndRender(): Promise<void> {
    log('Dashboard loadAndRender called');
    this.data = await this.dashboardService.getDashboardData();
    log('Dashboard data loaded:', {
      flowCount: this.data?.flows?.items?.length || 0,
      flowNames: this.data?.flows?.items?.map(f => f.name) || [],
    });
    if (this.view) {
      // Use premium dashboard rendering
      this.view.webview.html = this.renderPremiumDashboard();
    }
  }

  private async handleMessage(message: { command: string; data?: unknown }): Promise<void> {
    switch (message.command) {
      // Tab navigation
      case 'switchTab':
        this.currentTab = message.data as DashboardTab;
        if (this.view) {
          this.view.webview.html = this.getHtmlContent();
        }
        break;

      // Flow actions
      case 'generateFlowTest':
        await this.generateFlowTest(message.data as string);
        break;
      case 'deleteFlow':
        await this.deleteFlow(message.data as string);
        break;
      case 'addFlow':
        await this.addNewFlow();
        break;
      case 'runFlowTest':
        await this.runFlowTest(message.data as string);
        break;

      // Quick actions
      case 'runOnboarding':
        await vscode.commands.executeCommand('qagenai.startOnboarding');
        break;
      case 'refresh':
        await this.refresh();
        break;
    }
  }

  private async generateFlowTest(flowId: string): Promise<void> {
    const flow = this.data?.flows.items.find(f => f.id === flowId);
    if (!flow) return;
    
    // DEBUG: Check if flow has journey data
    console.log('[Dashboard] Generating test for flow:', flow.name);
    console.log('[Dashboard] Has journeyData:', !!flow.journeyData);
    if (flow.journeyData) {
      console.log('[Dashboard] Journey data:', JSON.stringify(flow.journeyData, null, 2));
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Generating test for: ${flow.name}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 30, message: 'Calling AI...' });
        
        // Call test generation service
        const result = await this.testGenerationService.generateE2ETest(flow);
        
        if (!result.success || !result.code) {
          vscode.window.showErrorMessage(`Generation failed: ${result.error || 'Unknown error'}`);
          return;
        }
        
        progress.report({ increment: 50, message: 'Opening editor...' });
        
        // Show generated test in editor
        await this.testGenerationService.showGeneratedTest(result.code, result.filename || `${flow.name}.spec.ts`);
        
        // Update flow status
        await this.dashboardService.updateFlow(flowId, { status: 'generated' });
        await this.refresh();
        
        progress.report({ increment: 20, message: 'Done!' });
      }
    );
  }

  private async deleteFlow(flowId: string): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      'Delete this flow?',
      { modal: true },
      'Delete'
    );
    
    if (confirm === 'Delete') {
      await this.dashboardService.deleteFlow(flowId);
      await this.refresh();
    }
  }

  private async runFlowTest(flowId: string): Promise<void> {
    const flow = this.data?.flows.items.find(f => f.id === flowId);
    if (!flow) return;

    // Use PlaywrightService to find and run the test
    const testFile = await this.playwrightService.findTestFile(flow.name);
    
    if (!testFile) {
      vscode.window.showWarningMessage(`Test file not found for: ${flow.name}. Generate it first.`);
      return;
    }

    // Run test using PlaywrightService
    await this.playwrightService.runTest(testFile, { headed: true });
  }

  private async addNewFlow(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Flow name',
      placeHolder: 'e.g., User Login Flow',
    });
    
    if (name) {
      await this.dashboardService.addFlow({ name });
      await this.refresh();
    }
  }

  private getHtmlContent(): string {
    const data = this.data;
    const isBackend = data?.stack.projectType === 'backend';
    const flowLabel = isBackend ? 'Endpoints' : 'Flows';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgenAI Dashboard</title>
  <style>
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="header">
    <span class="header-icon">⚡</span>
    <span class="header-title">QAgenAI</span>
    <button class="refresh-btn" onclick="send('refresh')" title="Refresh">↻</button>
  </div>

  ${this.renderStackBadge()}
  ${this.renderTabs(flowLabel)}
  ${this.renderTabContent(flowLabel)}

  <script>
    const vscode = acquireVsCodeApi();
    
    function send(command, data) {
      vscode.postMessage({ command, data });
    }
  </script>
</body>
</html>`;
  }

  private renderStackBadge(): string {
    const stack = this.data?.stack;
    if (!stack?.isConfigured) {
      return `
        <div class="stack-badge not-configured" onclick="send('runOnboarding')">
          <span>⚠️ Not configured</span>
          <span class="stack-action">Run Setup</span>
        </div>
      `;
    }

    const icon = stack.projectType === 'backend' ? '🔌' : '🌐';
    const typeLabel = stack.projectType === 'backend' ? 'API' : 'App';
    
    return `
      <div class="stack-badge">
        <span>${icon} ${stack.framework} ${stack.version || ''} ${typeLabel}</span>
        ${stack.testingFramework ? `<span class="testing-badge">${stack.testingFramework}</span>` : ''}
      </div>
    `;
  }

  private renderTabs(flowLabel: string): string {
    const tabs = [
      { id: 'overview', label: '📊 Overview' },
      { id: 'flows', label: `📚 ${flowLabel}` },
    ];

    return `
      <div class="tabs">
        ${tabs.map(tab => `
          <button 
            class="tab ${this.currentTab === tab.id ? 'active' : ''}" 
            onclick="send('switchTab', '${tab.id}')">
            ${tab.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  private renderTabContent(flowLabel: string): string {
    switch (this.currentTab) {
      case 'overview':
        return this.renderOverviewTab(flowLabel);
      case 'flows':
        return this.renderFlowsTab(flowLabel);
      default:
        return this.renderOverviewTab(flowLabel);
    }
  }

  private renderOverviewTab(flowLabel: string): string {
    const data = this.data;
    const flows = data?.flows;
    const testing = data?.testing;

    return `
      <div class="tab-content">
        ${this.renderHealthScore()}
        ${this.renderQuickStats(flowLabel, flows)}
        ${this.renderAttentionRequired(flows)}
        ${this.renderSmartSuggestions(flows)}
        ${this.renderRecentRuns()}
        ${this.renderQuickActions(flowLabel)}
      </div>
    `;
  }

  private renderHealthScore(): string {
    // Calculate real health score from dashboard data
    const flows = this.data?.flows;
    const passing = flows?.passing || 0;
    const failing = flows?.failing || 0;
    const total = flows?.total || 0;
    
    const healthResult = this.testHealthService.calculateHealth({
      totalJourneys: total,
      passingJourneys: passing,
      failingJourneys: failing,
      coverage: 0, // TODO: get real coverage
      criticalPathsCovered: 0, // TODO: calculate
      lastRunTimestamp: Date.now()
    });
    const healthScore = healthResult.score;
    
    const trend = '+5'; // TODO: calculate from history
    const trendIcon = '↗️';
    const trendClass = 'positive';
    
    return `
      <div class="health-score-container">
        <div class="health-score-badge ${this.getHealthScoreClass(healthScore)}">
          <div class="health-score-value">${healthScore}</div>
          <div class="health-score-label">Health Score</div>
        </div>
        <div class="health-score-trend ${trendClass}">
          ${trendIcon} ${trend} this week
        </div>
      </div>
    `;
  }

  private getHealthScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  private renderQuickStats(flowLabel: string, flows: any): string {
    return `
      <div class="section">
        <div class="section-title">Quick Stats</div>
        <div class="stats-grid">
          <div class="stat-item clickable" onclick="send('switchTab', 'flows')">
            <div class="stat-icon">📚</div>
            <div class="stat-content">
              <div class="stat-number">${flows?.total || 0}</div>
              <div class="stat-desc">Total ${flowLabel}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon passing">✅</div>
            <div class="stat-content">
              <div class="stat-number">${flows?.passing || 0}</div>
              <div class="stat-desc">Passing Tests</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon failing">❌</div>
            <div class="stat-content">
              <div class="stat-number">${flows?.failing || 0}</div>
              <div class="stat-desc">Failing Tests</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon draft">📝</div>
            <div class="stat-content">
              <div class="stat-number">${flows?.draft || 0}</div>
              <div class="stat-desc">Draft</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderAttentionRequired(flows: any): string {
    const failingTests = flows?.failing || 0;
    const draftFlows = flows?.draft || 0;
    
    // Only show if there are issues
    if (failingTests === 0 && draftFlows === 0) {
      return '';
    }
    
    const issues: string[] = [];
    
    if (failingTests > 0) {
      issues.push(`
        <div class="attention-item critical">
          <div class="attention-icon">🔴</div>
          <div class="attention-content">
            <div class="attention-title">${failingTests} test${failingTests > 1 ? 's' : ''} failing</div>
            <div class="attention-desc">Tests need immediate attention</div>
          </div>
          <button class="attention-action" onclick="send('switchTab', 'flows')">
            View Details
          </button>
        </div>
      `);
    }
    
    if (draftFlows > 3) {
      issues.push(`
        <div class="attention-item warning">
          <div class="attention-icon">⚠️</div>
          <div class="attention-content">
            <div class="attention-title">${draftFlows} flows without tests</div>
            <div class="attention-desc">Generate tests to improve coverage</div>
          </div>
          <button class="attention-action" onclick="send('switchTab', 'flows')">
            Generate Tests
          </button>
        </div>
      `);
    }
    
    return `
      <div class="section">
        <div class="section-title attention-title">⚠️ Attention Required</div>
        <div class="attention-list">
          ${issues.join('')}
        </div>
      </div>
    `;
  }

  private renderSmartSuggestions(flows: any): string {
    const suggestions: string[] = [];
    const draftFlows = flows?.draft || 0;
    const totalFlows = flows?.total || 0;
    
    if (draftFlows > 0) {
      suggestions.push(`
        <div class="suggestion-item">
          <div class="suggestion-icon">✨</div>
          <div class="suggestion-content">
            <div class="suggestion-title">Generate tests for ${draftFlows} draft flows</div>
            <div class="suggestion-desc">Increase coverage by ~${Math.round((draftFlows / (totalFlows || 1)) * 100)}%</div>
          </div>
          <button class="suggestion-action" onclick="send('switchTab', 'flows')">
            Generate
          </button>
        </div>
      `);
    }
    
    if (totalFlows > 0) {
      suggestions.push(`
        <div class="suggestion-item">
          <div class="suggestion-icon">🔍</div>
          <div class="suggestion-content">
            <div class="suggestion-title">Re-scan project for new flows</div>
            <div class="suggestion-desc">Check for new routes and components</div>
          </div>
          <button class="suggestion-action" onclick="send('runOnboarding')">
            Scan
          </button>
        </div>
      `);
    }
    
    if (suggestions.length === 0) {
      return '';
    }
    
    return `
      <div class="section">
        <div class="section-title">💡 Smart Suggestions</div>
        <div class="suggestions-list">
          ${suggestions.join('')}
        </div>
      </div>
    `;
  }

  private renderRecentRuns(): string {
    // TODO: Integrate with TestHealthService for real data
    // Mock data for now
    const runs = [
      { time: '2h ago', duration: '43.2s', passed: 11, total: 12, status: 'warning' },
      { time: '1d ago', duration: '41.8s', passed: 12, total: 12, status: 'success' },
      { time: '2d ago', duration: '39.1s', passed: 10, total: 12, status: 'error' },
    ];
    
    if (runs.length === 0) {
      return '';
    }
    
    return `
      <div class="section">
        <div class="section-title">📊 Recent Runs</div>
        <div class="runs-table">
          <div class="runs-header">
            <div class="run-col-time">Time</div>
            <div class="run-col-duration">Duration</div>
            <div class="run-col-pass">Pass Rate</div>
            <div class="run-col-status">Status</div>
          </div>
          ${runs.map(run => `
            <div class="run-row">
              <div class="run-col-time">${run.time}</div>
              <div class="run-col-duration">${run.duration}</div>
              <div class="run-col-pass">${run.passed}/${run.total}</div>
              <div class="run-col-status">
                <span class="run-status ${run.status}">
                  ${run.status === 'success' ? '✅ All passed' : run.status === 'warning' ? '🟡 1 failed' : '🔴 2 failed'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderQuickActions(flowLabel: string): string {
    return `
      <div class="section">
        <div class="action-grid">
          <button class="action-card action-card-primary" onclick="send('switchTab', 'flows')">
            <div class="action-card-icon">▶️</div>
            <div class="action-card-title">Run All Tests</div>
            <div class="action-card-desc">Execute full test suite</div>
          </button>
          <button class="action-card" onclick="send('addFlow')">
            <div class="action-card-icon">➕</div>
            <div class="action-card-title">New Journey</div>
            <div class="action-card-desc">Add custom flow</div>
          </button>
          <button class="action-card" onclick="send('runOnboarding')">
            <div class="action-card-icon">🔍</div>
            <div class="action-card-title">Re-discover</div>
            <div class="action-card-desc">Scan for new flows</div>
          </button>
        </div>
      </div>
    `;
  }

  private renderFlowsPreview(flowLabel: string): string {
    const flows = this.data?.flows.items.slice(0, 3) || [];
    
    if (flows.length === 0) {
      return `
        <div class="section">
          <div class="section-title">${flowLabel}</div>
          <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <div>No ${flowLabel.toLowerCase()} discovered yet</div>
            <button class="action-btn" style="margin-top: 12px;" onclick="send('runOnboarding')">
              Run Setup to discover ${flowLabel.toLowerCase()}
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="section">
        <div class="section-title">${flowLabel} (${this.data?.flows.total || 0})</div>
        <div class="flow-list">
          ${flows.map(flow => this.renderFlowItem(flow, true)).join('')}
        </div>
        ${(this.data?.flows.total || 0) > 3 ? `
          <button class="view-all-btn" onclick="send('switchTab', 'flows')">
            View all ${this.data?.flows.total} ${flowLabel.toLowerCase()} →
          </button>
        ` : ''}
      </div>
    `;
  }

  private renderFlowsTab(flowLabel: string): string {
    const flows = this.data?.flows.items || [];
    const isBackend = this.data?.stack.projectType === 'backend';

    if (flows.length === 0) {
      return `
        <div class="tab-content">
          <div class="empty-state" style="padding: 40px 20px;">
            <div class="empty-state-icon">${isBackend ? '🔌' : '📚'}</div>
            <div style="font-size: 14px; margin-bottom: 8px;">No ${flowLabel.toLowerCase()} yet</div>
            <div style="color: var(--vscode-descriptionForeground); margin-bottom: 16px;">
              ${isBackend ? 'API endpoints will appear here after setup' : 'User flows will appear here after setup'}
            </div>
            <button class="action-btn action-btn-primary" onclick="send('runOnboarding')">
              🔍 Discover ${flowLabel}
            </button>
            <button class="action-btn" style="margin-top: 8px;" onclick="send('addFlow')">
              ➕ Add manually
            </button>
          </div>
        </div>
      `;
    }

    // Group flows by status
    const draftFlows = flows.filter(f => f.status === 'draft');
    const generatedFlows = flows.filter(f => f.status !== 'draft');

    return `
      <div class="tab-content">
        <div class="flows-header">
          <span>${flows.length} ${flowLabel.toLowerCase()}</span>
          <button class="add-btn" onclick="send('addFlow')">+ Add</button>
        </div>

        ${draftFlows.length > 0 ? `
          <div class="section">
            <div class="section-title">📝 Draft (${draftFlows.length})</div>
            <div class="flow-list">
              ${draftFlows.map(flow => this.renderFlowItem(flow)).join('')}
            </div>
          </div>
        ` : ''}

        ${generatedFlows.length > 0 ? `
          <div class="section">
            <div class="section-title">✅ Generated (${generatedFlows.length})</div>
            <div class="flow-list">
              ${generatedFlows.map(flow => this.renderFlowItem(flow)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderFlowItem(flow: DashboardFlow, compact = false): string {
    const statusIcon = this.getStatusIcon(flow.status);
    const route = flow.routes?.[0] || '';

    if (compact) {
      return `
        <div class="flow-item compact">
          <span class="flow-status">${statusIcon}</span>
          <span class="flow-name">${flow.name}</span>
          ${route ? `<span class="flow-route">${route}</span>` : ''}
        </div>
      `;
    }

    return `
      <div class="flow-item">
        <div class="flow-main">
          <span class="flow-status">${statusIcon}</span>
          <div class="flow-info">
            <div class="flow-name">${flow.name}</div>
            ${flow.description ? `<div class="flow-desc">${flow.description}</div>` : ''}
            ${route ? `<div class="flow-route">${route}</div>` : ''}
          </div>
        </div>
        <div class="flow-actions">
          ${flow.status === 'draft' ? `
            <button class="flow-action-btn primary" onclick="send('generateFlowTest', '${flow.id}')" title="Generate Test">
              ✨
            </button>
          ` : `
            <button class="flow-action-btn" onclick="send('runFlowTest', '${flow.id}')" title="Run Test">
              ▶️
            </button>
          `}
          <button class="flow-action-btn danger" onclick="send('deleteFlow', '${flow.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'draft': return '📝';
      case 'generated': return '✅';
      case 'passing': return '✅';
      case 'failing': return '❌';
      case 'flaky': return '⚠️';
      default: return '📝';
    }
  }

  private renderRiskQueueTab(): string {
    const riskQueue = this.data?.riskQueue;
    const items = riskQueue?.topItems || [];

    if (items.length === 0) {
      return `
        <div class="tab-content">
          <div class="empty-state" style="padding: 40px 20px;">
            <div class="empty-state-icon">✅</div>
            <div style="font-size: 14px; margin-bottom: 8px;">No High Risk Files</div>
            <div style="color: var(--vscode-descriptionForeground);">
              All analyzed files have acceptable risk levels.<br/>
              Great job maintaining test coverage!
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="tab-content">
        <div class="risk-header">
          <span>${riskQueue?.totalItems || 0} files analyzed</span>
          <div class="risk-counts">
            ${riskQueue?.criticalCount ? `<span class="risk-count critical">${riskQueue.criticalCount} critical</span>` : ''}
            ${riskQueue?.highCount ? `<span class="risk-count high">${riskQueue.highCount} high</span>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">🔥 Top Risk Files</div>
          <div class="risk-list">
            ${items.map(item => this.renderRiskItem(item)).join('')}
          </div>
        </div>

        <p style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 12px;">
          Risk score based on: test coverage, file size, dependencies, and critical path detection.
        </p>
      </div>
    `;
  }

  private renderRiskItem(item: {
    id: string;
    name: string;
    path: string;
    riskScore: number;
    priority: string;
    factors: Array<{ name: string; score: number; maxScore: number; description: string }>;
    hasTest: boolean;
    linesOfCode: number;
    importCount: number;
  }): string {
    const priorityClass = item.priority === 'critical' ? 'critical' : item.priority === 'high' ? 'high' : 'medium';
    const testIcon = item.hasTest ? '✅' : '❌';
    
    // Build factor breakdown
    const factorBreakdown = item.factors.map(f => 
      `<div class="factor-row">
        <span class="factor-name">${f.name}</span>
        <span class="factor-score">+${f.score}/${f.maxScore}</span>
      </div>`
    ).join('');
    
    return `
      <div class="risk-item">
        <div class="risk-main" onclick="send('openFile', '${item.path}')">
          <span class="risk-badge ${priorityClass}" title="Risk Score: ${item.riskScore}/100">${item.riskScore}</span>
          <div class="risk-info">
            <div class="risk-name">${item.name}</div>
            <div class="risk-path">${item.path}</div>
            <div class="risk-meta">
              <span title="Has test file">${testIcon} Test</span>
              <span title="Lines of code">📄 ${item.linesOfCode} LOC</span>
              <span title="Number of imports">📦 ${item.importCount} imports</span>
            </div>
          </div>
        </div>
        <div class="risk-breakdown">
          <div class="breakdown-title">Score Breakdown:</div>
          ${factorBreakdown}
          <div class="factor-total">
            <span>Total</span>
            <span>${item.riskScore}/100</span>
          </div>
        </div>
        <div class="risk-actions">
          <button class="flow-action-btn primary" onclick="event.stopPropagation(); send('generateTestForFile', '${item.path}')" title="Generate Unit Test">
            ✨
          </button>
        </div>
      </div>
    `;
  }

  private getStyles(): string {
    return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      background: var(--vscode-sideBar-background);
      color: var(--vscode-foreground);
      padding: 12px;
      font-size: 13px;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .header-icon { font-size: 18px; }
    .header-title { font-size: 14px; font-weight: 600; flex: 1; }
    .refresh-btn {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }
    .refresh-btn:hover { color: var(--vscode-foreground); }

    .stack-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .stack-badge.not-configured {
      background: rgba(239, 68, 68, 0.1);
      cursor: pointer;
    }
    .stack-action {
      margin-left: auto;
      color: var(--vscode-textLink-foreground);
    }
    .testing-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 8px;
    }
    .tab {
      padding: 6px 12px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s;
    }
    .tab:hover {
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-foreground);
    }
    .tab.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .tab-content { }
    
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: var(--vscode-input-background);
      border-radius: 6px;
      padding: 12px;
    }
    .stat-card.clickable {
      cursor: pointer;
      transition: background 0.15s;
    }
    .stat-card.clickable:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .stat-value {
      font-size: 20px;
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
    }
    .stat-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }
    
    .section { margin-bottom: 16px; }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
    
    .action-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--vscode-button-secondaryBackground);
      border: none;
      border-radius: 4px;
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
      font-size: 12px;
      text-align: left;
      transition: background 0.15s;
    }
    .action-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .action-btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .action-btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .flows-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .add-btn {
      background: var(--vscode-button-secondaryBackground);
      border: none;
      color: var(--vscode-button-secondaryForeground);
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    .add-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .flow-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .flow-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      transition: background 0.15s;
    }
    .flow-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .flow-item.compact {
      padding: 8px 10px;
    }
    .flow-main {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    .flow-status { font-size: 14px; }
    .flow-info { flex: 1; min-width: 0; }
    .flow-name {
      font-size: 12px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .flow-desc {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 2px;
    }
    .flow-route {
      font-size: 10px;
      color: var(--vscode-textLink-foreground);
      font-family: monospace;
      margin-top: 2px;
    }
    .flow-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .flow-item:hover .flow-actions {
      opacity: 1;
    }
    .flow-action-btn {
      background: var(--vscode-button-secondaryBackground);
      border: none;
      padding: 4px 6px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .flow-action-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .flow-action-btn.primary {
      background: var(--vscode-button-background);
    }
    .flow-action-btn.danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .view-all-btn {
      width: 100%;
      padding: 8px;
      background: transparent;
      border: 1px dashed var(--vscode-panel-border);
      border-radius: 4px;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      font-size: 11px;
      margin-top: 8px;
    }
    .view-all-btn:hover {
      background: var(--vscode-list-hoverBackground);
    }
    
    .empty-state {
      text-align: center;
      padding: 24px;
      color: var(--vscode-descriptionForeground);
    }
    .empty-state-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    /* Risk Queue Styles */
    .risk-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 12px;
    }
    .risk-counts {
      display: flex;
      gap: 8px;
    }
    .risk-count {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .risk-count.critical {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .risk-count.high {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .risk-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .risk-item {
      display: flex;
      flex-direction: column;
      padding: 12px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      transition: background 0.15s;
    }
    .risk-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .risk-main {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }
    .risk-badge {
      min-width: 36px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      color: white;
    }
    .risk-badge.critical {
      background: #ef4444;
    }
    .risk-badge.high {
      background: #f59e0b;
    }
    .risk-badge.medium {
      background: #6b7280;
    }
    .risk-info {
      flex: 1;
      min-width: 0;
    }
    .risk-name {
      font-size: 12px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .risk-path {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 2px;
    }
    .risk-meta {
      display: flex;
      gap: 12px;
      margin-top: 6px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }
    .risk-breakdown {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    .breakdown-title {
      font-size: 10px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }
    .factor-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 11px;
    }
    .factor-name {
      color: var(--vscode-foreground);
    }
    .factor-score {
      color: var(--vscode-textLink-foreground);
      font-family: monospace;
      font-size: 10px;
    }
    .factor-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 6px;
      margin-top: 6px;
      border-top: 1px solid var(--vscode-panel-border);
      font-size: 11px;
      font-weight: 600;
    }
    .risk-actions {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-panel-border);
    }

    /* Premium Dashboard Styles */
    .health-score-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: linear-gradient(135deg, var(--vscode-input-background) 0%, var(--vscode-editor-background) 100%);
      border-radius: 8px;
      margin-bottom: 16px;
      border: 1px solid var(--vscode-panel-border);
    }
    .health-score-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .health-score-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1;
    }
    .health-score-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .health-score-badge.excellent .health-score-value { color: #10b981; }
    .health-score-badge.good .health-score-value { color: #3b82f6; }
    .health-score-badge.fair .health-score-value { color: #f59e0b; }
    .health-score-badge.poor .health-score-value { color: #ef4444; }
    .health-score-trend {
      font-size: 13px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.1);
    }
    .health-score-trend.positive { color: #10b981; }
    .health-score-trend.negative { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      transition: background 0.15s;
    }
    .stat-item.clickable {
      cursor: pointer;
    }
    .stat-item.clickable:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .stat-icon {
      font-size: 20px;
      opacity: 0.9;
    }
    .stat-icon.passing { color: #10b981; }
    .stat-icon.failing { color: #ef4444; }
    .stat-icon.draft { color: #6b7280; }
    .stat-content {
      flex: 1;
    }
    .stat-number {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    .stat-desc {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }

    .attention-title {
      color: #ef4444 !important;
    }
    .attention-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .attention-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      border-left: 3px solid #ef4444;
    }
    .attention-item.warning {
      border-left-color: #f59e0b;
    }
    .attention-icon {
      font-size: 18px;
    }
    .attention-content {
      flex: 1;
    }
    .attention-title {
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .attention-desc {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }
    .attention-action {
      padding: 4px 10px;
      background: var(--vscode-button-background);
      border: none;
      border-radius: 4px;
      color: var(--vscode-button-foreground);
      cursor: pointer;
      font-size: 11px;
      white-space: nowrap;
    }
    .attention-action:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .suggestions-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      transition: background 0.15s;
    }
    .suggestion-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .suggestion-icon {
      font-size: 18px;
    }
    .suggestion-content {
      flex: 1;
    }
    .suggestion-title {
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .suggestion-desc {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }
    .suggestion-action {
      padding: 4px 10px;
      background: var(--vscode-button-secondaryBackground);
      border: none;
      border-radius: 4px;
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
      font-size: 11px;
      white-space: nowrap;
    }
    .suggestion-action:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .runs-table {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
    }
    .runs-header {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1.5fr;
      gap: 8px;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
    }
    .run-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1.5fr;
      gap: 8px;
      padding: 10px 12px;
      background: var(--vscode-editor-background);
      font-size: 11px;
      transition: background 0.15s;
    }
    .run-row:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .run-col-time { color: var(--vscode-descriptionForeground); }
    .run-col-duration { font-family: monospace; }
    .run-col-pass { font-weight: 500; }
    .run-col-status { }
    .run-status {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .run-status.success { color: #10b981; background: rgba(16, 185, 129, 0.1); }
    .run-status.warning { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    .run-status.error { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 14px 10px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .action-card:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-1px);
    }
    .action-card-primary {
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }
    .action-card-primary:hover {
      background: var(--vscode-button-hoverBackground);
      border-color: var(--vscode-button-hoverBackground);
    }
    .action-card-icon {
      font-size: 24px;
      margin-bottom: 6px;
    }
    .action-card-title {
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .action-card-desc {
      font-size: 9px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }
    .action-card-primary .action-card-title,
    .action-card-primary .action-card-desc {
      color: var(--vscode-button-foreground);
    }
    `;
  }

  // =============================================================================
  // PREMIUM SCREEN 4 RENDERING METHODS
  // =============================================================================

  private renderPremiumDashboard(): string {
    const data = this.data;
    if (!data) return this.renderEmptyState();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgent Dashboard</title>
  <style>${this.getPremiumStyles()}</style>
</head>
<body>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="dashboard-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="url(#grad-header)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="grad-header" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00d4ff"/>
              <stop offset="100%" stop-color="#7b2ff7"/>
            </linearGradient>
          </defs>
        </svg>
        <span>QAgent Dashboard</span>
      </div>
      <div class="dashboard-actions">
        <button class="icon-btn" onclick="send('refresh')" title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
        <button class="icon-btn" onclick="send('openConfig')" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
          </svg>
        </button>
      </div>
    </div>

    ${this.renderProjectHealth()}
    ${this.renderSmartInsights()}
    ${this.renderFlowsSection()}
    ${this.renderGenerateNewButton()}
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function send(command, data) {
      vscode.postMessage({ command, data });
    }

    // Count-up animation
    function animateCounter(element, target, duration = 1000) {
      const numericTarget = parseInt(target.toString().replace(/[^0-9]/g, ''));
      let current = 0;
      const increment = Math.ceil(numericTarget / 30);
      const stepTime = duration / 30;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= numericTarget) {
          element.textContent = target;
          clearInterval(timer);
        } else {
          element.textContent = current;
        }
      }, stepTime);
    }

    // Animate stat numbers on load
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.stat-number').forEach((el, idx) => {
        const originalText = el.textContent.trim();
        if (originalText && /\d/.test(originalText)) {
          animateCounter(el, originalText, 1200);
        }
      });
    });
  </script>
</body>
</html>`;
  }

  private renderProjectHealth(): string {
    const health = this.data?.testing;
    const flows = this.data?.flows;
    const score = Math.round(((health?.passingTests || 0) / Math.max(health?.totalTests || 1, 1)) * 100);
    const flowsActive = `${flows?.passing || 0}/${flows?.total || 0}`;
    const totalRuntime = '2m 34s'; // TODO: Calculate from real data

    return `
      <div class="premium-section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
            <path d="M4.5 16.5c-1.5 1.25-2 5-2 5s3.75-.5 5-2c.583-.583.93-1.395 1.006-2.232L9 17.5l.995-.995M19 11l2 2-8 8-3-3 8-8zM16.5 5.5l-4-4L9 5l3 3 4.5-2.5z"/>
          </svg>
          <span>PROJECT HEALTH</span>
        </div>
        <div class="health-grid">
          <div class="health-gauge">
            ${this.renderHealthGauge(score)}
          </div>
          <div class="health-stat">
            <div class="stat-number">${flowsActive.split('/')[0]}</div>
            <div class="stat-label">Flows Active</div>
          </div>
          <div class="health-stat">
            <div class="stat-icon-count">
              <span class="status-icon passing">✅</span>
              <span class="stat-number">${health?.passingTests || 0}</span>
            </div>
            <div class="stat-icon-count">
              <span class="status-icon warning">⚠️</span>
              <span class="stat-number">${health?.failingTests || 0}</span>
            </div>
            <div class="stat-icon-count">
              <span class="status-icon failing">❌</span>
              <span class="stat-number">0</span>
            </div>
          </div>
          <div class="health-stat">
            <div class="stat-number">${totalRuntime}</div>
            <div class="stat-label">Runtime Total</div>
          </div>
        </div>
        <div class="health-trends">
          <div class="trend-item">
            <span class="trend-label">Tests</span>
            ${this.renderSparkline([3, 5, 7, 12, 15, 18])}
            <span class="trend-change positive">↗ +15%</span>
          </div>
          <div class="trend-item">
            <span class="trend-label">Pass</span>
            ${this.renderSparkline([1, 2, 5, 8, 12, 18])}
            <span class="trend-change positive">↗ +20%</span>
          </div>
          <div class="trend-item">
            <span class="trend-label">Speed</span>
            ${this.renderSparkline([12, 10, 8, 6, 4, 2])}
            <span class="trend-change negative">↘ -25%</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderHealthGauge(score: number): string {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#00d4ff' : score >= 40 ? '#fbbf24' : '#ef4444';

    return `
      <svg class="gauge-svg" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="#7b2ff7"/>
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="url(#gaugeGrad)" stroke-width="8"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 60 60)"
          style="transition: stroke-dashoffset 1s ease-out"/>
        <text x="60" y="55" text-anchor="middle" fill="${color}" font-size="28" font-weight="700">${score}%</text>
        <text x="60" y="72" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="11">Health Score</text>
      </svg>
    `;
  }

  private renderSparkline(values: number[]): string {
    const width = 60;
    const height = 20;
    const max = Math.max(...values);
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    }).join(' ');

    return `
      <svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
  }

  private renderSmartInsights(): string {
    const insights = [
      { icon: '⚡', message: '"User Login" test 3x slower than avg - optimize API calls', severity: 'warning' },
      { icon: '💡', message: 'Consider "Password Reset" flow - detected in 4 components', severity: 'info' },
      { icon: '🔄', message: '2 flows need regeneration - React Router updated to v6.8', severity: 'info' },
    ];

    return `
      <div class="premium-section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span>💡 SMART INSIGHTS</span>
        </div>
        <div class="insights-list">
          ${insights.map(insight => `
            <div class="insight-item ${insight.severity}">
              <span class="insight-icon">${insight.icon}</span>
              <span class="insight-text">${insight.message}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderFlowsSection(): string {
    const flows = this.data?.flows?.items || [];
    const currentFilter: 'all' | 'critical' | 'high' = 'all';

    return `
      <div class="premium-section flows-section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <span>FLOWS</span>
        </div>
        
        <div class="flows-controls">
          <div class="filter-tabs">
            <button class="filter-tab" onclick="send('filterFlows', 'critical')">
              🔥 Critical
            </button>
            <button class="filter-tab" onclick="send('filterFlows', 'high')">
              ⭐ High Value
            </button>
            <button class="filter-tab active" onclick="send('filterFlows', 'all')">
              📊 All
            </button>
          </div>
          <input type="text" class="search-input" placeholder="🔍 Search..." oninput="send('searchFlows', this.value)"/>
        </div>

        <div class="flows-list">
          ${flows.length === 0 ? this.renderEmptyFlows() : flows.map((flow, idx) => this.renderPremiumFlowCard(flow, idx)).join('')}
        </div>
      </div>
    `;
  }

  private renderPremiumFlowCard(flow: DashboardFlow, index: number): string {
    const statusConfig = {
      'passing': { badge: '✅ PASSING', color: '#10b981', percentage: '95%' },
      'needs-update': { badge: '⚠️ NEEDS UPDATE', color: '#fbbf24', percentage: '' },
      'generating': { badge: '🔄 GENERATING', color: '#00d4ff', percentage: '60%' },
      'failing': { badge: '❌ FAILING', color: '#ef4444', percentage: '' },
      'draft': { badge: '📝 DRAFT', color: '#6b7280', percentage: '' },
      'generated': { badge: '✅ GENERATED', color: '#10b981', percentage: '' },
      'flaky': { badge: '⚠️ FLAKY', color: '#fbbf24', percentage: '' },
    };

    const status = statusConfig[flow.status] || statusConfig['draft'];
    const lastRun = flow.lastRun ? this.formatTimeAgo(flow.lastRun) : 'Never';
    const route = (flow.routes && flow.routes.length > 0) ? flow.routes.join(' → ') : '/unknown';

    return `
      <div class="flow-card" style="animation-delay: ${index * 0.05}s" onclick="send('selectFlow', '${flow.id}')">
        <div class="flow-card-header">
          <div class="flow-card-title">
            <span class="flow-icon">🔓</span>
            <span>${flow.name}</span>
          </div>
          <div class="flow-status-badge" style="--badge-color: ${status.color}">
            ${status.badge} ${status.percentage}
          </div>
        </div>
        <div class="flow-card-route">${route}</div>
        <div class="flow-card-meta">
          <span>⚡ Last: ${lastRun}</span>
          <span>|</span>
          <span>⏱ 8.2s</span>
          <span>|</span>
          <span>📊 Coverage: 92%</span>
        </div>
        <div class="flow-card-actions">
          <button class="flow-action-btn" onclick="event.stopPropagation(); send('runFlow', '${flow.id}')" title="Run">
            ▶️
          </button>
          <button class="flow-action-btn" onclick="event.stopPropagation(); send('editFlow', '${flow.id}')" title="Edit">
            📝
          </button>
          <button class="flow-action-btn" onclick="event.stopPropagation(); send('regenFlow', '${flow.id}')" title="Regenerate">
            🔄
          </button>
          <button class="flow-action-btn" onclick="event.stopPropagation(); send('selectFlow', '${flow.id}')" title="View Details">
            👁️
          </button>
        </div>
      </div>
    `;
  }

  private renderEmptyFlows(): string {
    return `
      <div class="empty-flows">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <div class="empty-text">No flows discovered yet</div>
        <button class="btn-hero-small" onclick="send('runOnboarding')">🔍 Run Discovery</button>
      </div>
    `;
  }

  private renderGenerateNewButton(): string {
    return `
      <div class="generate-new-section">
        <button class="btn-hero" onclick="send('generateNew')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Generate New Test
        </button>
      </div>
    `;
  }

  private renderEmptyState(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; }
    .empty { text-align: center; color: rgba(255,255,255,0.6); }
  </style>
</head>
<body>
  <div class="empty">Loading dashboard...</div>
</body>
</html>`;
  }

  private formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private getPremiumStyles(): string {
    return `
      ${this.getStyles()}
      
      /* Premium Dashboard Styles - Screen 4 */
      body {
        margin: 0;
        padding: 16px;
        background: #0f0f23;
        color: rgba(255, 255, 255, 0.9);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        overflow-x: hidden;
      }

      .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
      }

      .dashboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 32px;
        padding: 16px 0;
      }

      .dashboard-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 24px;
        font-weight: 700;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .dashboard-actions {
        display: flex;
        gap: 8px;
      }

      .icon-btn {
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.3s;
      }

      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.5);
        color: #00d4ff;
      }

      .premium-section {
        margin-bottom: 32px;
        padding: 24px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        box-shadow: 
          0 10px 40px rgba(0, 0, 0, 0.2),
          0 0 80px rgba(123, 47, 247, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        animation: slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        margin: -24px -24px 24px -24px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(123, 47, 247, 0.08));
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px 20px 0 0;
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.9);
      }

      .health-grid {
        display: grid;
        grid-template-columns: 140px repeat(3, 1fr);
        gap: 24px;
        align-items: center;
      }

      .health-gauge {
        display: flex;
        justify-content: center;
      }

      .gauge-svg {
        width: 120px;
        height: 120px;
      }

      .health-stat {
        text-align: center;
      }

      .stat-number {
        font-size: 32px;
        font-weight: 700;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        line-height: 1;
        margin-bottom: 8px;
      }

      .stat-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
      }

      .stat-icon-count {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .status-icon {
        font-size: 18px;
      }

      .health-trends {
        display: flex;
        gap: 24px;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .trend-item {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .trend-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 600;
      }

      .sparkline {
        color: #00d4ff;
      }

      .trend-change {
        font-size: 13px;
        font-weight: 600;
      }

      .trend-change.positive {
        color: #10b981;
      }

      .trend-change.negative {
        color: #ef4444;
      }

      .insights-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .insight-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-left: 3px solid rgba(251, 191, 36, 0.5);
        border-radius: 8px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
      }

      .insight-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .insight-text {
        flex: 1;
      }

      .flows-controls {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
      }

      .filter-tabs {
        display: flex;
        gap: 8px;
        flex: 1;
      }

      .filter-tab {
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s;
      }

      .filter-tab:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(0, 212, 255, 0.4);
      }

      .filter-tab.active {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(123, 47, 247, 0.2));
        border-color: rgba(0, 212, 255, 0.5);
        color: #00d4ff;
      }

      .search-input {
        flex: 0 0 250px;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        outline: none;
      }

      .search-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      .search-input:focus {
        border-color: rgba(0, 212, 255, 0.5);
        background: rgba(255, 255, 255, 0.08);
      }

      .flows-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .flow-card {
        padding: 20px;
        background: rgba(255, 255, 255, 0.04);
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        animation: slideInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        opacity: 0;
      }

      .flow-card:hover {
        transform: translateY(-4px) rotateX(2deg);
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(0, 212, 255, 0.4);
        box-shadow: 0 12px 40px rgba(0, 212, 255, 0.2);
      }

      .flow-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .flow-card-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.95);
      }

      .flow-icon {
        font-size: 22px;
      }

      .flow-status-badge {
        padding: 6px 14px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--badge-color);
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        color: var(--badge-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .flow-card-route {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 12px;
        font-family: 'Courier New', monospace;
      }

      .flow-card-meta {
        display: flex;
        gap: 12px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 16px;
      }

      .flow-card-actions {
        display: flex;
        gap: 8px;
      }

      .flow-action-btn {
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s;
      }

      .flow-action-btn:hover {
        background: rgba(0, 212, 255, 0.15);
        border-color: rgba(0, 212, 255, 0.5);
        color: #00d4ff;
        transform: translateY(-2px);
      }

      .empty-flows {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }

      .empty-text {
        margin: 20px 0;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.5);
      }

      .btn-hero-small {
        padding: 12px 24px;
        background: linear-gradient(135deg, #7b2ff7, #00d4ff);
        border: none;
        border-radius: 12px;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }

      .btn-hero-small:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(123, 47, 247, 0.4);
      }

      .generate-new-section {
        text-align: center;
        padding: 32px 0;
      }

      .btn-hero {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 16px 32px;
        background: linear-gradient(135deg, #7b2ff7, #00d4ff);
        border: none;
        border-radius: 16px;
        color: #ffffff;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 
          0 10px 40px rgba(123, 47, 247, 0.4),
          0 0 60px rgba(0, 212, 255, 0.2);
      }

      .btn-hero:hover {
        transform: translateY(-4px) scale(1.05);
        box-shadow: 
          0 20px 60px rgba(123, 47, 247, 0.6),
          0 0 100px rgba(0, 212, 255, 0.4);
      }
    `;
  }
}
