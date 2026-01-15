import * as vscode from 'vscode';
import { DashboardService } from '../services/dashboard.service';
import { DashboardData, DashboardFlow } from '../types/dashboard.types';
import { log } from '../extension';

/**
 * DashboardEditorPanel - Premium dashboard in central editor area
 * 
 * Features:
 * - Opens as editor tab (like onboarding wizard)
 * - Full-width premium dashboard (800-1200px optimal)
 * - All glassmorphism effects, charts, trends
 * - Can coexist with file editors
 * - Closable with X button
 * 
 * This is the "Screen 4: Main Dashboard" from UI-UX-DESIGN.md
 */
export class DashboardEditorPanel {
  public static currentPanel: DashboardEditorPanel | undefined;
  private static readonly viewType = 'qagenaiDashboard';

  private readonly panel: vscode.WebviewPanel;
  private dashboardData?: DashboardData;
  private disposables: vscode.Disposable[] = [];
  
  // Live execution state
  private executionState?: {
    flowId: string;
    flowName: string;
    progress: number;
    currentStep: string;
    startTime: number;
  };

  /**
   * Show dashboard panel (singleton pattern)
   */
  public static show(
    context: vscode.ExtensionContext,
    dashboardService: DashboardService
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel already exists, reveal it
    if (DashboardEditorPanel.currentPanel) {
      DashboardEditorPanel.currentPanel.panel.reveal(column);
      DashboardEditorPanel.currentPanel.refresh();
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      DashboardEditorPanel.viewType,
      '⚡ QAgent Dashboard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    DashboardEditorPanel.currentPanel = new DashboardEditorPanel(
      panel,
      context,
      dashboardService
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    private readonly dashboardService: DashboardService
  ) {
    this.panel = panel;

    // Load initial data and render
    this.refresh();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => await this.handleMessage(message),
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * Refresh dashboard data and re-render
   */
  public async refresh(): Promise<void> {
    log('[DashboardPanel] Refreshing...');
    this.dashboardData = await this.dashboardService.getDashboardData();
    this.render();
  }

  /**
   * Render dashboard HTML
   */
  private render(): void {
    this.panel.webview.html = this.getHtmlContent();
  }

  /**
   * Handle messages from webview
   */
  private async handleMessage(message: { command: string; data?: any }): Promise<void> {
    log('[DashboardPanel] Message:', message.command);

    switch (message.command) {
      case 'refresh':
        await this.refresh();
        break;

      case 'selectFlow':
        await vscode.commands.executeCommand('qagenai.openFlowDetail', message.data);
        break;

      case 'runFlowTest':
        // Start live execution tracking
        const flow = this.dashboardData?.flows?.items.find(f => f.id === message.data);
        if (flow) {
          this.startLiveExecution(flow.id, flow.name);
        }
        await vscode.commands.executeCommand('qagenai.runTest', message.data);
        break;
      
      case 'stopExecution':
        this.stopLiveExecution();
        break;

      case 'generateFlowTest':
        await vscode.commands.executeCommand('qagenai.openTestGeneration', message.data);
        break;

      case 'deleteFlow':
        const confirm = await vscode.window.showWarningMessage(
          'Delete this flow?',
          { modal: true },
          'Delete'
        );
        if (confirm === 'Delete') {
          await this.dashboardService.deleteFlow(message.data);
          await this.refresh();
        }
        break;

      case 'startDiscovery':
        await vscode.commands.executeCommand('qagenai.liveSmartDiscovery');
        break;

      case 'filterFlows':
        // TODO: Implement filtering
        log('[DashboardPanel] Filter:', message.data);
        break;

      case 'searchFlows':
        // TODO: Implement search
        log('[DashboardPanel] Search:', message.data);
        break;

      case 'dismissSuccessBanner':
        // Store in workspace state to not show again
        await this.context.workspaceState.update('qagenai.successBannerDismissed', true);
        await this.refresh();
        break;
    }
  }

  /**
   * Show toast notification (SCREENS 4, 6)
   */
  public showToast(text: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000): void {
    this.panel.webview.postMessage({
      type: 'showToast',
      data: { text, type, duration }
    });
  }

  /**
   * Dispose panel and cleanup
   */
  public dispose(): void {
    DashboardEditorPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Generate HTML for premium dashboard
   * (Reuses rendering logic from unified-main.webview.ts)
   */
  private getHtmlContent(): string {
    const flows = this.dashboardData?.flows?.items || [];
    const testing = this.dashboardData?.testing;
    const flowsData = this.dashboardData?.flows;

    if (flows.length === 0) {
      return this.renderEmptyDashboard();
    }

    // Check if we should show Success Banner (SCREEN 6)
    const totalTests = testing?.totalTests || 0;
    const firstTestPassed = totalTests === 1 && (testing?.passingTests || 0) === 1;
    const showSuccessBanner = firstTestPassed;

    // Use real health score from DashboardService
    const score = this.dashboardService.calculateHealthScore();

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
      </div>
    </div>

    ${showSuccessBanner ? this.renderSuccessBanner() : ''}
    ${this.renderProjectHealth(score, testing, flowsData)}
    ${this.renderSmartInsights()}
    ${this.renderFlowsSection(flows)}
    ${this.renderGenerateNewButton()}
    
    <!-- Live Activity Panel -->
    ${this.executionState ? this.renderLiveActivityPanel() : ''}
    
    <!-- Toast Container -->
    <div id="toast-container"></div>
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
        if (originalText && /\\d/.test(originalText)) {
          animateCounter(el, originalText, 1200);
        }
      });
    });

    // Toast Notification System (SCREENS 4, 6)
    function showToast(message, type = 'info', duration = 5000) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.innerHTML = '<div class="toast-content"><span>' + message + '</span><button class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</button></div>';

      container.appendChild(toast);

      // Auto-dismiss
      setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    // Listen for live execution progress updates
    window.addEventListener('message', event => {
      const message = event.data;
      
      if (message.type === 'executionProgress') {
        const { progress, currentStep, elapsed } = message.data;
        
        // Update progress bar
        const progressBar = document.querySelector('.progress-bar-fill');
        if (progressBar) {
          progressBar.style.width = progress + '%';
        }
        
        // Update percentage
        const percentage = document.querySelector('.progress-percentage');
        if (percentage) {
          percentage.textContent = progress + '%';
        }
        
        // Update current step
        const stepEl = document.querySelector('.live-activity-step');
        if (stepEl) {
          stepEl.textContent = currentStep;
        }
        
        // Update elapsed time
        const timeEl = document.querySelector('.live-activity-time > div:first-child');
        if (timeEl) {
          timeEl.textContent = elapsed.toFixed(1) + 's elapsed';
        }
      }
      
      // Toast notifications from backend
      if (message.type === 'showToast') {
        const { text, type, duration } = message.data;
        showToast(text, type, duration);
      }
    });
  </script>
</body>
</html>`;
  }

  // =============================================================================
  // PREMIUM DASHBOARD RENDERING METHODS
  // =============================================================================

  private renderProjectHealth(
    score: number,
    testing?: DashboardData['testing'],
    flows?: DashboardData['flows']
  ): string {
    const flowsActive = `${flows?.passing || 0}/${flows?.total || 0}`;
    
    // Calculate real total runtime from test results
    const avgDuration = this.dashboardService.getAverageTestDuration();
    const totalRuntime = avgDuration > 0 
      ? this.formatDuration(avgDuration * (testing?.totalTests || 0))
      : '--';

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
              <span class="stat-number">${testing?.passingTests || 0}</span>
            </div>
            <div class="stat-icon-count">
              <span class="status-icon warning">⚠️</span>
              <span class="stat-number">${testing?.failingTests || 0}</span>
            </div>
          </div>
          <div class="health-stat">
            <div class="stat-number">${totalRuntime}</div>
            <div class="stat-label">Runtime Total</div>
          </div>
        </div>
        <div class="health-trends">
          ${this.renderRealTrends()}
        </div>
      </div>
    `;
  }

  private renderHealthGauge(score: number): string {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color =
      score >= 80 ? '#10b981' : score >= 60 ? '#00d4ff' : score >= 40 ? '#fbbf24' : '#ef4444';

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
    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - (v / max) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return `
      <svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
  }

  private renderSmartInsights(): string {
    // Get real insights from test data
    const slowTests = this.dashboardService.getSlowTests();
    const failingTests = this.dashboardService.getFailingTests();
    
    const insights: Array<{
      icon: string;
      message: string;
      severity: 'warning' | 'info' | 'critical';
    }> = [];
    
    // Add failing tests insights
    if (failingTests.length > 0) {
      insights.push({
        icon: '❌',
        message: `${failingTests.length} test${failingTests.length > 1 ? 's' : ''} failing - "${failingTests[0].flowName}" and ${failingTests.length - 1} more`,
        severity: 'critical',
      });
    }
    
    // Add slow tests insights
    if (slowTests.length > 0) {
      insights.push({
        icon: '⚡',
        message: `"${slowTests[0].flowName}" test is slow (${slowTests[0].runtime.toFixed(1)}s) - consider optimization`,
        severity: 'warning',
      });
    }
    
    // Add draft flows insight
    const draftCount = this.dashboardData?.flows?.draft || 0;
    if (draftCount > 0) {
      insights.push({
        icon: '💡',
        message: `${draftCount} flow${draftCount > 1 ? 's' : ''} ready for test generation`,
        severity: 'info',
      });
    }
    
    // If no insights, show positive message
    if (insights.length === 0) {
      insights.push({
        icon: '✅',
        message: 'All tests passing! Great work!',
        severity: 'info',
      });
    }

    return `
      <div class="premium-section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span>💡 SMART INSIGHTS</span>
        </div>
        <div class="insights-list">
          ${insights
            .map(
              (insight) => `
            <div class="insight-item ${insight.severity}">
              <span class="insight-icon">${insight.icon}</span>
              <span class="insight-text">${insight.message}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderFlowsSection(flows: DashboardFlow[]): string {
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
          ${flows.map((flow, idx) => this.renderPremiumFlowCard(flow, idx)).join('')}
        </div>
      </div>
    `;
  }

  private renderPremiumFlowCard(flow: DashboardFlow, index: number): string {
    // Debug logging
    if (index === 0) {
      log('[Dashboard] Flow sample:', {
        id: flow.id,
        name: flow.name,
        status: flow.status,
        hasRoutes: !!flow.routes,
        routesLength: flow.routes?.length || 0,
        routes: flow.routes,
        description: flow.description,
      });
    }

    const statusConfig: Record<string, { badge: string; color: string }> = {
      passing: { badge: '✅ PASSING', color: '#10b981' },
      failing: { badge: '❌ FAILING', color: '#ef4444' },
      draft: { badge: '📝 DRAFT', color: '#6b7280' },
      generated: { badge: '✅ GENERATED', color: '#10b981' },
      flaky: { badge: '⚠️ FLAKY', color: '#fbbf24' },
    };

    const status = statusConfig[flow.status] || statusConfig['draft'];
    const lastRun = flow.lastRun ? this.formatTimeAgo(new Date(flow.lastRun)) : 'Never';
    
    // Better route display with fallbacks
    let route = '';
    if (flow.routes && flow.routes.length > 0) {
      route = flow.routes.join(' → ');
    } else if (flow.description) {
      route = flow.description;
    } else {
      route = 'No route specified';
    }
    
    // Get dynamic icon based on flow name
    const icon = this.getFlowIcon(flow.name);
    
    // Get real test results for this flow
    const flowResults = this.dashboardService.getFlowTestResults(flow.id);
    const latestResult = flowResults.length > 0 ? flowResults[flowResults.length - 1] : null;
    const duration = latestResult ? `${latestResult.runtime.toFixed(1)}s` : '--';
    
    // Get actions based on flow status (same as sidebar)
    const actions = this.getFlowActions(flow);
    
    if (index === 0) {
      log('[Dashboard] Actions for flow:', actions);
    }

    return `
      <div class="flow-card" style="animation-delay: ${index * 0.05}s">
        <div class="flow-card-header">
          <div class="flow-card-title">
            <span class="flow-icon">${icon}</span>
            <span>${flow.name}</span>
          </div>
          <div class="flow-status-badge" style="--badge-color: ${status.color}">
            ${status.badge}
          </div>
        </div>
        <div class="flow-card-route">${route}</div>
        <div class="flow-card-meta">
          <span>⚡ Last: ${lastRun}</span>
          <span>|</span>
          <span>⏱ ${duration}</span>
        </div>
        <div class="flow-card-actions">
          ${actions.length > 0 ? actions.map(action => `
            <button 
              class="flow-action-btn flow-action-${action.variant}" 
              onclick="event.stopPropagation(); send('${action.command}', '${flow.id}')" 
              title="${action.label}"
            >
              ${action.icon} ${action.label}
            </button>
          `).join('') : '<span style="color: rgba(255,255,255,0.5); font-size: 12px;">No actions available</span>'}
        </div>
      </div>
    `;
  }

  private renderGenerateNewButton(): string {
    return `
      <div class="generate-new-section">
        <button class="btn-hero" onclick="send('startDiscovery')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Discover New Flows
        </button>
      </div>
    `;
  }

  private renderEmptyDashboard(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      font-family: system-ui;
      background: #0f0f23;
      color: rgba(255,255,255,0.6);
      margin: 0;
      padding: 0;
    }
    .empty { 
      text-align: center;
      max-width: 400px;
    }
    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    .empty-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
      color: rgba(255,255,255,0.9);
    }
    .empty-text {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .empty button {
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
    .empty button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(123, 47, 247, 0.4);
    }
  </style>
</head>
<body>
  <div class="empty">
    <div class="empty-icon">📋</div>
    <div class="empty-title">No flows yet</div>
    <div class="empty-text">
      Start by discovering your app's user journeys.<br/>
      QAgent will analyze your codebase and find critical flows.
    </div>
    <button onclick="vscode.postMessage({command: 'startDiscovery'})">
      🔍 Run Discovery
    </button>
  </div>
  <script>const vscode = acquireVsCodeApi();</script>
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

  /**
   * Get flow icon based on name
   */
  private getFlowIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('login') || lower.includes('signin')) return '🔓';
    if (lower.includes('register') || lower.includes('signup')) return '👥';
    if (lower.includes('account')) return '🏦';
    if (lower.includes('transaction')) return '💳';
    if (lower.includes('payment')) return '💰';
    if (lower.includes('profile')) return '👤';
    if (lower.includes('settings')) return '⚙️';
    if (lower.includes('comment')) return '💬';
    if (lower.includes('post') || lower.includes('create')) return '📝';
    return '📄';
  }

  /**
   * Get inline actions for a flow based on its status
   */
  private getFlowActions(flow: DashboardFlow): Array<{
    icon: string;
    label: string;
    command: string;
    variant: 'primary' | 'secondary' | 'danger';
  }> {
    switch (flow.status) {
      case 'draft':
        return [
          { icon: '✨', label: 'Generate', command: 'generateFlowTest', variant: 'primary' },
        ];
      
      case 'generated':
      case 'passing':
        return [
          { icon: '▶️', label: 'Run', command: 'runFlowTest', variant: 'primary' },
          { icon: '👁️', label: 'Details', command: 'selectFlow', variant: 'secondary' },
        ];
      
      case 'failing':
        return [
          { icon: '🔧', label: 'Fix', command: 'selectFlow', variant: 'danger' },
          { icon: '▶️', label: 'Re-run', command: 'runFlowTest', variant: 'secondary' },
        ];
      
      case 'flaky':
        return [
          { icon: '🔄', label: 'Re-run', command: 'runFlowTest', variant: 'primary' },
          { icon: '👁️', label: 'Details', command: 'selectFlow', variant: 'secondary' },
        ];
      
      default:
        return [];
    }
  }

  /**
   * Success Banner (SCREEN 6) - Shows after first test passes
   */
  private renderSuccessBanner(): string {
    const dismissed = this.context.workspaceState.get('qagenai.successBannerDismissed', false);
    if (dismissed) return '';

    const flows = this.dashboardData?.flows?.items || [];
    const remainingFlows = flows.length - 1;

    return `
      <div class="success-banner">
        <button class="success-banner-close" onclick="send('dismissSuccessBanner')">
          ✕
        </button>
        <div class="success-banner-icon">🎉</div>
        <div class="success-banner-content">
          <div class="success-banner-title">NICE WORK!</div>
          <div class="success-banner-text">
            Your first test passed! ${remainingFlows > 0 ? `Generate tests for ${remainingFlows} more flow${remainingFlows > 1 ? 's' : ''}` : 'Keep up the momentum!'}
          </div>
          ${remainingFlows > 0 ? `
            <button class="success-banner-btn" onclick="send('startDiscovery')">
              ✨ Generate More
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // =============================================================================
  // PREMIUM STYLES (from unified-main.webview.ts)
  // =============================================================================

  private getPremiumStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #0f0f23;
        color: rgba(255, 255, 255, 0.9);
        padding: 24px;
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
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        animation: slideInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
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
        flex-wrap: wrap;
      }

      .flow-action-btn {
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .flow-action-btn:hover {
        background: rgba(0, 212, 255, 0.15);
        border-color: rgba(0, 212, 255, 0.5);
        color: #00d4ff;
        transform: translateY(-2px);
      }

      .flow-action-btn.flow-action-primary {
        background: rgba(0, 212, 255, 0.2);
        border-color: rgba(0, 212, 255, 0.4);
        color: #00d4ff;
      }

      .flow-action-btn.flow-action-primary:hover {
        background: rgba(0, 212, 255, 0.3);
        border-color: #00d4ff;
      }

      .flow-action-btn.flow-action-secondary {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.7);
      }

      .flow-action-btn.flow-action-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .flow-action-btn.flow-action-danger {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.4);
        color: #ef4444;
      }

      .flow-action-btn.flow-action-danger:hover {
        background: rgba(239, 68, 68, 0.25);
        border-color: #ef4444;
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

      /* Live Activity Panel */
      .live-activity-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(123, 47, 247, 0.15));
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border-top: 2px solid rgba(0, 212, 255, 0.5);
        box-shadow: 
          0 -10px 40px rgba(0, 0, 0, 0.3),
          0 0 80px rgba(0, 212, 255, 0.2);
        animation: slideInFromBottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      @keyframes slideInFromBottom {
        from {
          opacity: 0;
          transform: translateY(100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .live-activity-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px 24px;
      }

      .live-activity-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }

      .live-activity-icon {
        font-size: 24px;
        animation: spin 2s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .live-activity-text {
        flex: 1;
      }

      .live-activity-title {
        font-size: 16px;
        font-weight: 700;
        color: #00d4ff;
        margin-bottom: 4px;
      }

      .live-activity-step {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
      }

      .live-activity-time {
        text-align: right;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 600;
      }

      .time-remaining {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 2px;
      }

      .live-stop-btn {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.5);
        color: #ef4444;
      }

      .live-stop-btn:hover {
        background: rgba(239, 68, 68, 0.3);
        border-color: #ef4444;
      }

      .live-activity-progress {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .progress-bar-bg {
        flex: 1;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #00d4ff, #7b2ff7);
        border-radius: 4px;
        transition: width 0.3s ease-out;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.6);
      }

      .progress-percentage {
        font-size: 14px;
        font-weight: 700;
        color: #00d4ff;
        min-width: 45px;
        text-align: right;
      }

      /* Success Banner (SCREEN 6) */
      .success-banner {
        position: relative;
        padding: 24px;
        margin-bottom: 32px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(0, 212, 255, 0.15));
        border: 2px solid rgba(16, 185, 129, 0.5);
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(16, 185, 129, 0.2);
        animation: slideInDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        display: flex;
        align-items: center;
        gap: 20px;
      }

      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .success-banner-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 4px 8px;
        font-size: 14px;
        transition: all 0.3s;
      }

      .success-banner-close:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      .success-banner-icon {
        font-size: 64px;
        animation: bounce 1s ease-in-out infinite;
      }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      .success-banner-content {
        flex: 1;
      }

      .success-banner-title {
        font-size: 28px;
        font-weight: 900;
        color: #10b981;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .success-banner-text {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 16px;
      }

      .success-banner-btn {
        padding: 12px 24px;
        background: linear-gradient(135deg, #10b981, #00d4ff);
        border: none;
        border-radius: 10px;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
      }

      .success-banner-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
      }

      /* Toast Notification System (SCREENS 4, 6) */
      #toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
      }

      .toast {
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .toast.toast-exit {
        animation: toastSlideOut 0.3s ease-in forwards;
      }

      @keyframes toastSlideOut {
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      .toast-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
      }

      .toast-success {
        border-left: 4px solid #10b981;
      }

      .toast-error {
        border-left: 4px solid #ef4444;
      }

      .toast-warning {
        border-left: 4px solid #fbbf24;
      }

      .toast-info {
        border-left: 4px solid #00d4ff;
      }

      .toast-close {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 4px 8px;
        font-size: 12px;
        transition: all 0.3s;
        flex-shrink: 0;
      }

      .toast-close:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }
    `;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Render real trends from test history
   */
  private renderRealTrends(): string {
    const history = this.dashboardService.getTestHistory(7);
    
    if (history.length < 2) {
      return `<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 12px;">Not enough data yet. Run more tests!</div>`;
    }
    
    // Extract data for sparklines
    const testsValues = history.map(h => h.totalTests);
    const passRateValues = history.map(h => 
      h.totalTests > 0 ? Math.round((h.passingTests / h.totalTests) * 100) : 0
    );
    const healthValues = history.map(h => h.healthScore);
    
    // Calculate trends
    const testsTrend = this.calculateTrend(testsValues);
    const passRateTrend = this.calculateTrend(passRateValues);
    const healthTrend = this.calculateTrend(healthValues);
    
    return `
      <div class="trend-item">
        <span class="trend-label">Tests</span>
        ${this.renderSparkline(testsValues)}
        <span class="trend-change ${testsTrend >= 0 ? 'positive' : 'negative'}">
          ${testsTrend >= 0 ? '↗' : '↘'} ${Math.abs(testsTrend)}%
        </span>
      </div>
      <div class="trend-item">
        <span class="trend-label">Pass Rate</span>
        ${this.renderSparkline(passRateValues)}
        <span class="trend-change ${passRateTrend >= 0 ? 'positive' : 'negative'}">
          ${passRateTrend >= 0 ? '↗' : '↘'} ${Math.abs(passRateTrend)}%
        </span>
      </div>
      <div class="trend-item">
        <span class="trend-label">Health</span>
        ${this.renderSparkline(healthValues)}
        <span class="trend-change ${healthTrend >= 0 ? 'positive' : 'negative'}">
          ${healthTrend >= 0 ? '↗' : '↘'} ${Math.abs(healthTrend)}%
        </span>
      </div>
    `;
  }

  /**
   * Calculate trend percentage (compare first and last value)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0] || 1;
    const last = values[values.length - 1] || 0;
    
    if (first === 0) return 0;
    
    return Math.round(((last - first) / first) * 100);
  }

  /**
   * Format duration in seconds to human readable
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  }

  // =============================================================================
  // LIVE EXECUTION TRACKING
  // =============================================================================

  /**
   * Start live execution tracking
   */
  private startLiveExecution(flowId: string, flowName: string): void {
    log(`[DashboardPanel] Starting live execution for: ${flowName}`);
    
    this.executionState = {
      flowId,
      flowName,
      progress: 0,
      currentStep: 'Initializing test...',
      startTime: Date.now(),
    };
    
    // Simulate progress updates (in real implementation, this would come from test runner)
    this.simulateLiveProgress();
  }

  /**
   * Stop live execution tracking
   */
  private stopLiveExecution(): void {
    log('[DashboardPanel] Stopping live execution');
    this.executionState = undefined;
    this.render();
  }

  /**
   * Simulate live progress updates (demo)
   * In production, this would receive real progress from test runner
   */
  private simulateLiveProgress(): void {
    const steps = [
      { progress: 10, step: 'Starting browser...' },
      { progress: 25, step: 'Navigating to page...' },
      { progress: 40, step: 'Filling form fields...' },
      { progress: 60, step: 'Clicking submit button...' },
      { progress: 75, step: 'Waiting for navigation...' },
      { progress: 90, step: 'Verifying assertions...' },
      { progress: 100, step: 'Test completed!' },
    ];
    
    let currentStepIndex = 0;
    
    const interval = setInterval(() => {
      if (!this.executionState || currentStepIndex >= steps.length) {
        clearInterval(interval);
        if (this.executionState) {
          // Complete execution
          setTimeout(() => {
            this.stopLiveExecution();
          }, 1000);
        }
        return;
      }
      
      const step = steps[currentStepIndex];
      this.executionState!.progress = step.progress;
      this.executionState!.currentStep = step.step;
      
      // Update webview
      this.panel.webview.postMessage({
        type: 'executionProgress',
        data: {
          progress: step.progress,
          currentStep: step.step,
          elapsed: (Date.now() - this.executionState!.startTime) / 1000,
        },
      });
      
      currentStepIndex++;
    }, 1200); // Update every 1.2 seconds
  }

  /**
   * Render Live Activity Panel (bottom sticky)
   */
  private renderLiveActivityPanel(): string {
    if (!this.executionState) return '';
    
    const elapsed = ((Date.now() - this.executionState.startTime) / 1000).toFixed(1);
    const estimatedTotal = 8; // seconds
    const remaining = Math.max(0, estimatedTotal - parseFloat(elapsed));
    
    return `
      <div class="live-activity-panel">
        <div class="live-activity-content">
          <div class="live-activity-header">
            <div class="live-activity-icon">🔄</div>
            <div class="live-activity-text">
              <div class="live-activity-title">Running: "${this.executionState.flowName}"</div>
              <div class="live-activity-step">${this.executionState.currentStep}</div>
            </div>
            <div class="live-activity-time">
              <div>${elapsed}s elapsed</div>
              ${remaining > 0 ? `<div class="time-remaining">~${remaining.toFixed(0)}s remaining</div>` : ''}
            </div>
            <button class="icon-btn live-stop-btn" onclick="send('stopExecution')" title="Stop">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="6" width="12" height="12" rx="1"/>
              </svg>
            </button>
          </div>
          <div class="live-activity-progress">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${this.executionState.progress}%"></div>
            </div>
            <div class="progress-percentage">${this.executionState.progress}%</div>
          </div>
        </div>
      </div>
    `;
  }
}
