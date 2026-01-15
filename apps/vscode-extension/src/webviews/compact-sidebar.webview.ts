import * as vscode from 'vscode';
import { DashboardService } from '../services/dashboard.service';
import { DashboardData, DashboardFlow } from '../types/dashboard.types';
import { log } from '../extension';

/**
 * CompactSidebarWebview - Lightweight sidebar view for quick access
 * 
 * Features:
 * - Mini health badge (circular, shows % score only)
 * - Compact flow list (icon + name + status dot)
 * - Quick action buttons (Refresh, Generate, Discover)
 * - Optimized for 300-400px sidebar width
 * - Fast render (< 100ms target)
 */
export class CompactSidebarWebview implements vscode.WebviewViewProvider {
  public static readonly viewType = 'qagenai.sidebar';

  private view?: vscode.WebviewView;
  private dashboardData?: DashboardData;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly dashboardService: DashboardService
  ) {}

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

    // Load initial data
    await this.refresh();

    webviewView.webview.onDidReceiveMessage(
      async (message) => await this.handleMessage(message),
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Refresh sidebar with latest data
   */
  public async refresh(): Promise<void> {
    log('[CompactSidebar] Refreshing...');
    this.dashboardData = await this.dashboardService.getDashboardData();
    await this.render();
  }

  /**
   * Render sidebar HTML
   */
  private async render(): Promise<void> {
    if (!this.view) return;
    this.view.webview.html = this.getHtmlContent();
  }

  /**
   * Handle messages from webview
   */
  private async handleMessage(message: { command: string; data?: any }): Promise<void> {
    log('[CompactSidebar] Message:', message.command);

    switch (message.command) {
      case 'openDashboard':
        await vscode.commands.executeCommand('qagenai.openDashboard');
        break;
      
      case 'openFlowDetail':
        await vscode.commands.executeCommand('qagenai.openFlowDetail', message.data);
        break;
      
      case 'generateTest':
        await vscode.commands.executeCommand('qagenai.openTestGeneration', message.data);
        break;
      
      case 'startDiscovery':
        await vscode.commands.executeCommand('qagenai.liveSmartDiscovery');
        break;
      
      case 'refresh':
        await this.refresh();
        break;
      
      case 'runTest':
        // Run test for a specific flow
        if (message.data) {
          await vscode.commands.executeCommand('qagenai.runTest', message.data);
        }
        break;
    }
  }

  /**
   * Generate HTML content for sidebar
   */
  private getHtmlContent(): string {
    const flows = this.dashboardData?.flows?.items || [];
    const testing = this.dashboardData?.testing;
    // Use real health score from DashboardService
    const healthScore = this.dashboardService.calculateHealthScore();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgent</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="sidebar-container">
    <!-- Mini Health Badge -->
    ${this.renderHealthBadge(healthScore)}
    
    <!-- Flows Section -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">FLOWS (${flows.length})</span>
        <button class="icon-btn" onclick="send('refresh')" title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
      </div>
      
      ${flows.length === 0 ? this.renderEmptyState() : this.renderFlowList(flows)}
    </div>

    <!-- Quick Actions -->
    <div class="actions">
      <button class="action-btn primary" onclick="send('startDiscovery')">
        <span class="btn-icon">🔍</span>
        <span>Discover</span>
      </button>
      <button class="action-btn secondary" onclick="send('generateTest')">
        <span class="btn-icon">✨</span>
        <span>Generate</span>
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function send(command, data) {
      vscode.postMessage({ command, data });
    }
  </script>
</body>
</html>`;
  }

  /**
   * Render mini health badge (circular with score)
   */
  private renderHealthBadge(score: number): string {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#00d4ff' : score >= 40 ? '#fbbf24' : '#ef4444';
    
    return `
      <div class="health-badge" onclick="send('openDashboard')" title="Click to open full dashboard">
        <svg class="health-circle" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
          <circle 
            cx="50" cy="50" r="40" 
            fill="none" 
            stroke="${color}" 
            stroke-width="8"
            stroke-dasharray="${2 * Math.PI * 40}"
            stroke-dashoffset="${2 * Math.PI * 40 * (1 - score / 100)}"
            stroke-linecap="round"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="52" text-anchor="middle" fill="${color}" font-size="22" font-weight="700">${score}%</text>
        </svg>
        <div class="health-label">Health Score</div>
      </div>
    `;
  }

  /**
   * Render compact flow list
   */
  private renderFlowList(flows: DashboardFlow[]): string {
    return `
      <div class="flow-list">
        ${flows.slice(0, 10).map(flow => this.renderCompactFlowCard(flow)).join('')}
        ${flows.length > 10 ? `
          <div class="more-flows">
            +${flows.length - 10} more flows
            <button class="link-btn" onclick="send('openDashboard')">View all →</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render compact flow card (icon + name + status)
   * Now with REAL data: status, timestamp, duration, inline actions
   */
  private renderCompactFlowCard(flow: DashboardFlow): string {
    // Check if this flow is currently running (SCREEN 5)
    const runningFlowId = this.dashboardService.getRunningFlowId();
    const isRunning = runningFlowId === flow.id;

    const statusIcons: Record<string, string> = {
      'passing': '✅',
      'generated': '📦',
      'failing': '❌',
      'draft': '📝',
      'flaky': '⚠️',
      'running': '🔄',
    };

    const statusColors: Record<string, string> = {
      'passing': '#10b981',
      'generated': '#00d4ff',
      'failing': '#ef4444',
      'draft': '#6b7280',
      'flaky': '#fbbf24',
      'running': '#00d4ff',
    };

    const icon = this.getFlowIcon(flow.name);
    const statusIcon = isRunning ? statusIcons['running'] : (statusIcons[flow.status] || '📝');
    const statusColor = isRunning ? statusColors['running'] : (statusColors[flow.status] || '#6b7280');
    const displayStatus = isRunning ? 'RUNNING' : this.formatStatus(flow.status);
    
    // Get test results for this flow
    const flowResults = this.dashboardService.getFlowTestResults(flow.id);
    const latestResult = flowResults.length > 0 ? flowResults[flowResults.length - 1] : null;
    
    // Format timestamp (e.g., "2m ago", "Just now")
    const timeAgo = flow.lastRun ? this.formatTimeAgo(flow.lastRun) : 'Never run';
    
    // Format duration
    const duration = latestResult ? `${latestResult.runtime.toFixed(1)}s` : '';
    
    // Determine inline actions based on status
    const actions = this.getFlowActions(flow);

    return `
      <div class="flow-card">
        <div class="flow-header" onclick="send('openFlowDetail', '${flow.id}')">
          <div class="flow-icon">${icon}</div>
          <div class="flow-info">
            <div class="flow-name">${flow.name}</div>
            <div class="flow-meta">
              <span class="flow-status ${isRunning ? 'running-pulse' : ''}" style="color: ${statusColor}" title="${isRunning ? 'Running...' : flow.status}">
                ${statusIcon} ${displayStatus}
              </span>
              ${duration ? `<span class="flow-duration">${duration}</span>` : ''}
              <span class="flow-time">${timeAgo}</span>
            </div>
          </div>
        </div>
        ${actions.length > 0 ? `
          <div class="flow-actions">
            ${actions.map(action => `
              <button 
                class="action-btn-mini ${action.variant}" 
                onclick="send('${action.command}', '${flow.id}')" 
                title="${action.label}"
              >
                ${action.icon} ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): string {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">No flows yet</div>
        <button class="link-btn" onclick="send('startDiscovery')">
          Run Discovery →
        </button>
      </div>
    `;
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
          { icon: '✨', label: 'Generate', command: 'generateTest', variant: 'primary' },
        ];
      
      case 'generated':
      case 'passing':
        return [
          { icon: '▶️', label: 'Run', command: 'runTest', variant: 'primary' },
          { icon: '📊', label: 'Details', command: 'openFlowDetail', variant: 'secondary' },
        ];
      
      case 'failing':
        return [
          { icon: '🔧', label: 'Fix', command: 'openFlowDetail', variant: 'danger' },
          { icon: '▶️', label: 'Re-run', command: 'runTest', variant: 'secondary' },
        ];
      
      case 'flaky':
        return [
          { icon: '🔄', label: 'Re-run', command: 'runTest', variant: 'primary' },
          { icon: '📊', label: 'Analyze', command: 'openFlowDetail', variant: 'secondary' },
        ];
      
      default:
        return [];
    }
  }

  /**
   * Format time ago (e.g., "2m ago", "1h ago", "Just now")
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Format status label
   */
  private formatStatus(status: string): string {
    switch (status) {
      case 'passing': return 'Pass';
      case 'failing': return 'Fail';
      case 'draft': return 'Draft';
      case 'generated': return 'Ready';
      case 'flaky': return 'Flaky';
      default: return status;
    }
  }

  /**
   * Get styles for compact sidebar
   */
  private getStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 12px;
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        padding: 12px 8px;
      }

      .sidebar-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Health Badge */
      .health-badge {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .health-badge:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
        transform: translateY(-1px);
      }

      .health-circle {
        width: 80px;
        height: 80px;
      }

      .health-label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Section */
      .section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 4px;
      }

      .section-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .icon-btn {
        padding: 4px;
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .icon-btn:hover {
        background: var(--vscode-list-hoverBackground);
      }

      /* Flow List */
      .flow-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .flow-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        transition: all 0.2s;
      }

      .flow-card:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
      }

      .flow-header {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
      }

      .flow-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .flow-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .flow-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--vscode-foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .flow-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        flex-wrap: wrap;
      }

      .flow-status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 600;
      }

      .flow-status.running-pulse {
        animation: pulse-running 1.5s ease-in-out infinite;
      }

      @keyframes pulse-running {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .flow-duration {
        font-family: 'Courier New', monospace;
        font-weight: 600;
      }

      .flow-time {
        opacity: 0.7;
      }

      /* Flow Actions */
      .flow-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .action-btn-mini {
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .action-btn-mini.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-color: transparent;
      }

      .action-btn-mini.primary:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .action-btn-mini.secondary {
        background: var(--vscode-input-background);
        color: var(--vscode-foreground);
      }

      .action-btn-mini.secondary:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
      }

      .action-btn-mini.danger {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.3);
      }

      .action-btn-mini.danger:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: #ef4444;
      }

      /* More Flows */
      .more-flows {
        padding: 8px;
        text-align: center;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .link-btn {
        background: transparent;
        border: none;
        color: var(--vscode-textLink-foreground);
        cursor: pointer;
        font-size: 11px;
        padding: 4px 8px;
        text-decoration: none;
        transition: all 0.2s;
      }

      .link-btn:hover {
        text-decoration: underline;
        color: var(--vscode-textLink-activeForeground);
      }

      /* Empty State */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 32px 16px;
        text-align: center;
      }

      .empty-icon {
        font-size: 48px;
        opacity: 0.3;
      }

      .empty-text {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      /* Quick Actions */
      .actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-top: 8px;
        border-top: 1px solid var(--vscode-panel-border);
      }

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .action-btn.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .action-btn.primary:hover {
        background: var(--vscode-button-hoverBackground);
        transform: translateY(-1px);
      }

      .action-btn.secondary {
        background: var(--vscode-input-background);
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-panel-border);
      }

      .action-btn.secondary:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
      }

      .btn-icon {
        font-size: 14px;
      }
    `;
  }
}
