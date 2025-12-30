import * as vscode from 'vscode';
import { DashboardService } from '../services/dashboard.service';
import { TestGenerationService } from '../services/test-generation.service';
import { PlaywrightService } from '../services/playwright.service';
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

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly dashboardService: DashboardService,
    private readonly testGenerationService: TestGenerationService
  ) {
    this.playwrightService = new PlaywrightService();
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
      this.view.webview.html = this.getHtmlContent();
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
    // TODO: Integrate TestHealthService - mock data for now
    const healthScore = 87;
    const trend = '+5';
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
}
