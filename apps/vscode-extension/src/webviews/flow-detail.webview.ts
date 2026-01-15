import * as vscode from 'vscode';
import { DashboardFlow, ExecutionHistory, FlowMetadata } from '../types/dashboard.types';

/**
 * FlowDetailWebviewProvider - Detailed view of a single flow (Screen 5)
 * 
 * Features:
 * - Flow overview with actions
 * - Two-column layout (Execution History + Test Details)
 * - Flow composition (route diagram, components, APIs, forms)
 * - Smart suggestions for improvements
 */
export class FlowDetailWebviewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private flow: DashboardFlow | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {}

  public show(flow: DashboardFlow): void {
    this.flow = flow;

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      this.panel.webview.html = this.getHtmlContent();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'qagenai.flowDetail',
      `Flow: ${flow.name}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      }
    );

    this.panel.webview.html = this.getHtmlContent();

    this.panel.webview.onDidReceiveMessage(
      async (message) => await this.handleMessage(message),
      undefined,
      []
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private async handleMessage(message: { command: string; data?: any }): Promise<void> {
    switch (message.command) {
      case 'runTest':
        await vscode.commands.executeCommand('qagenai.runFlowTest', this.flow?.id);
        break;
      case 'regenerate':
        await vscode.commands.executeCommand('qagenai.regenerateFlow', this.flow?.id);
        break;
      case 'edit':
        await vscode.commands.executeCommand('qagenai.editFlow', this.flow?.id);
        break;
      case 'delete':
        await vscode.commands.executeCommand('qagenai.deleteFlow', this.flow?.id);
        this.panel?.dispose();
        break;
      case 'viewAnalytics':
        vscode.window.showInformationMessage('Analytics feature coming soon!');
        break;
      case 'backToDashboard':
        await vscode.commands.executeCommand('qagenai.dashboard.focus');
        this.panel?.dispose();
        break;
    }
  }

  private getHtmlContent(): string {
    if (!this.flow) {
      return '<html><body>No flow selected</body></html>';
    }

    const flow = this.flow;
    const metadata = this.generateMockMetadata(flow);
    const history = this.generateMockHistory();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${flow.name} - Flow Detail</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="flow-detail-container">
    <!-- Header with Back Button -->
    <div class="flow-detail-header">
      <button class="back-btn" onclick="send('backToDashboard')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Dashboard
      </button>
      <div class="flow-title-section">
        <span class="flow-icon">🔓</span>
        <h1>${flow.name} Flow</h1>
      </div>
      <button class="icon-btn" onclick="send('viewAnalytics')" title="Settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
        </svg>
      </button>
    </div>

    ${this.renderFlowOverview(flow)}
    ${this.renderTwoColumnLayout(flow, metadata, history)}
    ${this.renderFlowComposition(metadata)}
    ${this.renderSmartSuggestions()}
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function send(command, data) {
      vscode.postMessage({ command, data });
    }

    // Animate numbers
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.stat-value').forEach(el => {
        const target = parseInt(el.textContent.replace(/[^0-9]/g, ''));
        if (target) {
          let current = 0;
          const increment = Math.ceil(target / 30);
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              el.textContent = target + (el.textContent.includes('%') ? '%' : '');
              clearInterval(timer);
            } else {
              el.textContent = current + (el.textContent.includes('%') ? '%' : '');
            }
          }, 30);
        }
      });
    });
  </script>
</body>
</html>`;
  }

  private renderFlowOverview(flow: DashboardFlow): string {
    const statusConfig = {
      'passing': { label: 'PASSING', color: '#10b981', percentage: '95%' },
      'failing': { label: 'FAILING', color: '#ef4444', percentage: '' },
      'draft': { label: 'DRAFT', color: '#6b7280', percentage: '' },
      'generated': { label: 'GENERATED', color: '#10b981', percentage: '' },
      'flaky': { label: 'FLAKY', color: '#fbbf24', percentage: '' },
    };

    const status = statusConfig[flow.status] || statusConfig['draft'];
    const lastUpdated = flow.lastRun ? this.formatTimeAgo(flow.lastRun) : 'Never';
    const route = (flow.routes && flow.routes.length > 0) ? flow.routes.join(' → ') : '/signin → /dashboard';

    return `
      <div class="premium-section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
          </svg>
          <span>FLOW OVERVIEW</span>
        </div>
        <div class="overview-content">
          <div class="overview-meta">
            <span class="flow-name-large">🔓 ${flow.name}</span>
            <span class="separator">•</span>
            <span class="priority-label">Critical Path</span>
            <span class="separator">•</span>
            <span class="status-label" style="color: ${status.color}">✅ ${status.label} (${status.percentage || '—'})</span>
          </div>
          <div class="overview-route">
            <span class="route-text">${route}</span>
            <span class="separator">•</span>
            <span>Last updated: ${lastUpdated}</span>
          </div>
          <div class="overview-actions">
            <button class="action-btn primary" onclick="send('runTest')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Run Test
            </button>
            <button class="action-btn" onclick="send('regenerate')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Regenerate
            </button>
            <button class="action-btn" onclick="send('edit')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            <button class="action-btn danger" onclick="send('delete')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Delete
            </button>
            <button class="action-btn" onclick="send('viewAnalytics')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 21H4.6c-.56 0-.84 0-1.054-.109a1 1 0 0 1-.437-.437C3 20.24 3 19.96 3 19.4V3m4 12 3.5-3.5L14 15l7-7"/>
              </svg>
              Analytics
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderTwoColumnLayout(flow: DashboardFlow, metadata: FlowMetadata, history: ExecutionHistory): string {
    return `
      <div class="two-column-layout">
        <!-- Left Column: Execution History -->
        <div class="premium-section">
          <div class="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>EXECUTION HISTORY</span>
          </div>
          
          <div class="history-content">
            <div class="last-runs">
              <div class="runs-label">📊 LAST 10 RUNS</div>
              <div class="runs-visual">
                ${history.runs.slice(0, 10).map((run, idx) => {
                  const icon = run.status === 'passed' ? '✅' : run.status === 'flaky' ? '⚠️' : '❌';
                  return `<span class="run-dot ${run.status}" title="${run.status}">${icon}</span>`;
                }).join('')}
              </div>
              ${history.runs[3]?.status === 'flaky' ? '<div class="flaky-note">^ 1 flaky test detected</div>' : ''}
            </div>

            <div class="success-rate">
              <div class="stat-label">SUCCESS RATE: ${history.successRate}%</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${history.successRate}%"></div>
              </div>
            </div>

            <div class="performance-trend">
              <div class="stat-label">⏱️ PERFORMANCE TREND</div>
              ${this.renderPerformanceChart(history.performanceTrend)}
              <div class="trend-stat">Avg: ${history.avgRuntime.toFixed(1)}s</div>
            </div>
          </div>
        </div>

        <!-- Right Column: Test Details -->
        <div class="premium-section">
          <div class="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
            <span>TEST DETAILS</span>
          </div>

          <div class="test-details-content">
            <div class="detail-item">
              <span class="detail-label">📁 test-login.spec.ts</span>
            </div>
            <div class="detail-stats">
              <div class="detail-stat">
                <span class="stat-icon">✓</span>
                <span class="stat-value">${metadata.testCases}</span>
                <span class="stat-label">test cases</span>
              </div>
              <div class="detail-stat">
                <span class="stat-icon">✓</span>
                <span class="stat-value">92%</span>
                <span class="stat-label">coverage</span>
              </div>
            </div>
            <div class="detail-stats">
              <div class="detail-stat">
                <span class="stat-icon">⏱</span>
                <span class="stat-value">8.2s</span>
                <span class="stat-label">Avg time</span>
              </div>
              <div class="detail-stat">
                <span class="stat-icon">📦</span>
                <span class="stat-value">${(metadata.fileSize / 1024).toFixed(1)}kb</span>
                <span class="stat-label">Size</span>
              </div>
            </div>
            <div class="detail-stats">
              <div class="detail-stat">
                <span class="stat-icon">🔄</span>
                <span class="stat-value">2m ago</span>
                <span class="stat-label">Last run</span>
              </div>
            </div>

            <div class="detail-actions">
              <button class="detail-action-btn" onclick="send('edit')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                </svg>
                View Full Test
              </button>
              <button class="detail-action-btn" onclick="send('viewAnalytics')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 21H4.6c-.56 0-.84 0-1.054-.109a1 1 0 0 1-.437-.437C3 20.24 3 19.96 3 19.4V3m4 12 3.5-3.5L14 15l7-7"/>
                </svg>
                Coverage Report
              </button>
              <button class="detail-action-btn" onclick="send('viewAnalytics')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Performance
              </button>
              <button class="detail-action-btn" onclick="send('viewAnalytics')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                </svg>
                Debug Last Failure
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderFlowComposition(metadata: FlowMetadata): string {
    return `
      <div class="premium-section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <span>FLOW COMPOSITION</span>
        </div>

        <div class="composition-content">
          <!-- Route Flow Diagram -->
          <div class="subsection">
            <div class="subsection-title">🛣️ ROUTE FLOW</div>
            <div class="route-diagram">
              ${this.renderRouteDiagram()}
            </div>
          </div>

          <!-- Components Tested -->
          <div class="subsection">
            <div class="subsection-title">📦 COMPONENTS TESTED</div>
            <div class="components-list">
              ${metadata.components.map(comp => `
                <div class="component-item">
                  <span class="component-name">• ${comp}</span>
                  <span class="component-coverage">✅ 95% coverage</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- API Calls -->
          <div class="subsection">
            <div class="subsection-title">🌐 API CALLS</div>
            <div class="api-list">
              ${metadata.apiCalls.map(api => `
                <div class="api-item">
                  <span class="api-method">${api.method}</span>
                  <span class="api-endpoint">${api.endpoint}</span>
                  <span class="api-status">✅ Mocked (${api.avgResponseTime || '1.2'}s avg)</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Form Fields -->
          <div class="subsection">
            <div class="subsection-title">📝 FORM FIELDS VALIDATED</div>
            <div class="form-fields-list">
              ${metadata.formFields.map(field => `
                <div class="form-field-item">
                  <span class="field-name">• ${field.name}</span>
                  <span class="field-validation">(${field.required ? 'required' : 'optional'}${field.validation ? ', ' + field.validation : ''})</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderSmartSuggestions(): string {
    const suggestions = [
      { icon: '💡', text: 'Add test for "Forgot Password" link (detected in UI)' },
      { icon: '🔍', text: 'Consider testing password visibility toggle' },
      { icon: '⚠️', text: 'API response time increased 20% - may cause timeout' },
      { icon: '📱', text: 'Add mobile viewport test (detected responsive CSS)' },
    ];

    return `
      <div class="premium-section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span>💡 SMART SUGGESTIONS</span>
        </div>

        <div class="suggestions-content">
          ${suggestions.map(s => `
            <div class="suggestion-item">
              <span class="suggestion-icon">${s.icon}</span>
              <span class="suggestion-text">${s.text}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderRouteDiagram(): string {
    return `
      <svg class="route-flow-svg" viewBox="0 0 600 80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00d4ff"/>
            <stop offset="100%" stop-color="#7b2ff7"/>
          </linearGradient>
        </defs>
        
        <!-- /signin box -->
        <rect x="10" y="20" width="100" height="40" rx="8" fill="rgba(0, 212, 255, 0.1)" stroke="#00d4ff" stroke-width="2"/>
        <text x="60" y="45" text-anchor="middle" fill="#00d4ff" font-size="14" font-weight="600">/signin</text>
        
        <!-- Arrow 1 -->
        <path d="M 115 40 L 155 40" stroke="url(#flowGrad)" stroke-width="2" marker-end="url(#arrowhead)"/>
        
        <!-- Form box -->
        <rect x="160" y="20" width="100" height="40" rx="8" fill="rgba(123, 47, 247, 0.1)" stroke="#7b2ff7" stroke-width="2"/>
        <text x="210" y="45" text-anchor="middle" fill="#7b2ff7" font-size="14" font-weight="600">Form</text>
        
        <!-- Arrow 2 -->
        <path d="M 265 40 L 305 40" stroke="url(#flowGrad)" stroke-width="2" marker-end="url(#arrowhead)"/>
        
        <!-- API box -->
        <rect x="310" y="20" width="100" height="40" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" stroke-width="2"/>
        <text x="360" y="45" text-anchor="middle" fill="#10b981" font-size="14" font-weight="600">API</text>
        
        <!-- Arrow 3 -->
        <path d="M 415 40 L 455 40" stroke="url(#flowGrad)" stroke-width="2" marker-end="url(#arrowhead)"/>
        
        <!-- /dashboard box -->
        <rect x="460" y="20" width="130" height="40" rx="8" fill="rgba(251, 191, 36, 0.1)" stroke="#fbbf24" stroke-width="2"/>
        <text x="525" y="45" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="600">/dashboard</text>
        
        <!-- Arrow marker -->
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#7b2ff7"/>
          </marker>
        </defs>
      </svg>
    `;
  }

  private renderPerformanceChart(trend: number[]): string {
    const width = 300;
    const height = 100;
    const max = Math.max(...trend);
    const points = trend.map((v, i) => {
      const x = (i / (trend.length - 1)) * width;
      const y = height - (v / max) * (height - 20);
      return `${x},${y}`;
    }).join(' ');

    return `
      <svg class="performance-chart" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polyline points="${points}" fill="none" stroke="#00d4ff" stroke-width="3"/>
        <polyline points="0,${height} ${points} ${width},${height}" fill="url(#chartGrad)"/>
        ${trend.map((v, i) => {
          const x = (i / (trend.length - 1)) * width;
          const y = height - (v / max) * (height - 20);
          return `<circle cx="${x}" cy="${y}" r="4" fill="#00d4ff"/>`;
        }).join('')}
      </svg>
    `;
  }

  private generateMockMetadata(flow: DashboardFlow): FlowMetadata {
    return {
      filePath: `/tests/e2e/${flow.name.toLowerCase().replace(/\s/g, '-')}.spec.ts`,
      fileSize: 3800,
      testCases: 15,
      assertions: 42,
      linesOfCode: 127,
      components: ['LoginForm.tsx', 'AuthProvider.tsx', 'Button.tsx'],
      apiCalls: [
        { method: 'POST', endpoint: '/users/login', mocked: true, avgResponseTime: 1.2 },
        { method: 'GET', endpoint: '/users/me', mocked: true, avgResponseTime: 0.8 },
      ],
      formFields: [
        { name: 'Email', type: 'email', required: true, validation: 'email format, max 255 chars' },
        { name: 'Password', type: 'password', required: true, validation: 'min 8 chars' },
        { name: 'Remember Me', type: 'checkbox', required: false },
      ],
    };
  }

  private generateMockHistory(): ExecutionHistory {
    return {
      runs: [
        { id: '1', timestamp: new Date(), status: 'passed', runtime: 8.2, testsPassed: 15, testsFailed: 0 },
        { id: '2', timestamp: new Date(Date.now() - 86400000), status: 'passed', runtime: 8.0, testsPassed: 15, testsFailed: 0 },
        { id: '3', timestamp: new Date(Date.now() - 172800000), status: 'passed', runtime: 8.5, testsPassed: 15, testsFailed: 0 },
        { id: '4', timestamp: new Date(Date.now() - 259200000), status: 'flaky', runtime: 9.2, testsPassed: 14, testsFailed: 1 },
        { id: '5', timestamp: new Date(Date.now() - 345600000), status: 'passed', runtime: 7.8, testsPassed: 15, testsFailed: 0 },
        { id: '6', timestamp: new Date(Date.now() - 432000000), status: 'passed', runtime: 8.1, testsPassed: 15, testsFailed: 0 },
        { id: '7', timestamp: new Date(Date.now() - 518400000), status: 'passed', runtime: 8.3, testsPassed: 15, testsFailed: 0 },
        { id: '8', timestamp: new Date(Date.now() - 604800000), status: 'passed', runtime: 8.0, testsPassed: 15, testsFailed: 0 },
        { id: '9', timestamp: new Date(Date.now() - 691200000), status: 'passed', runtime: 8.4, testsPassed: 15, testsFailed: 0 },
        { id: '10', timestamp: new Date(Date.now() - 777600000), status: 'passed', runtime: 8.2, testsPassed: 15, testsFailed: 0 },
      ],
      successRate: 90,
      avgRuntime: 8.2,
      performanceTrend: [8.2, 8.7, 7.5, 8.8, 9.2, 8.1, 7.9, 8.3],
    };
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

  private getStyles(): string {
    return `
      body {
        margin: 0;
        padding: 20px;
        background: #0f0f23;
        color: rgba(255, 255, 255, 0.9);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        overflow-x: hidden;
      }

      .flow-detail-container {
        max-width: 1400px;
        margin: 0 auto;
      }

      .flow-detail-header {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 32px;
      }

      .back-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s;
      }

      .back-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.5);
        color: #00d4ff;
      }

      .flow-title-section {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .flow-icon {
        font-size: 32px;
      }

      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
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
        margin-bottom: 24px;
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
        animation: slideInUp 0.5s ease-out both;
      }

      @keyframes slideInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        margin: -24px -24px 20px -24px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(123, 47, 247, 0.08));
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px 20px 0 0;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .overview-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .overview-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 15px;
      }

      .flow-name-large {
        font-size: 18px;
        font-weight: 700;
      }

      .separator {
        color: rgba(255, 255, 255, 0.3);
      }

      .priority-label {
        color: #ef4444;
        font-weight: 600;
      }

      .status-label {
        font-weight: 600;
      }

      .overview-route {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
      }

      .route-text {
        font-family: 'Courier New', monospace;
        color: rgba(255, 255, 255, 0.8);
      }

      .overview-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s;
      }

      .action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.5);
        color: #00d4ff;
        transform: translateY(-2px);
      }

      .action-btn.primary {
        background: linear-gradient(135deg, #7b2ff7, #00d4ff);
        border-color: transparent;
        color: #ffffff;
      }

      .action-btn.primary:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 8px 24px rgba(123, 47, 247, 0.4);
      }

      .action-btn.danger {
        border-color: rgba(239, 68, 68, 0.3);
        color: #ef4444;
      }

      .action-btn.danger:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: #ef4444;
      }

      .two-column-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-bottom: 24px;
      }

      .history-content,
      .test-details-content,
      .composition-content,
      .suggestions-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .last-runs {
        text-align: center;
      }

      .runs-label {
        font-size: 12px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .runs-visual {
        display: flex;
        justify-content: center;
        gap: 8px;
        font-size: 24px;
        margin-bottom: 8px;
      }

      .run-dot {
        opacity: 0.8;
        transition: transform 0.3s;
      }

      .run-dot:hover {
        transform: scale(1.3);
        opacity: 1;
      }

      .flaky-note {
        font-size: 12px;
        color: #fbbf24;
        margin-top: 8px;
      }

      .success-rate {
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
      }

      .stat-label {
        font-size: 12px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
      }

      .progress-bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #00d4ff);
        border-radius: 8px;
        transition: width 1s ease-out;
      }

      .performance-trend {
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
      }

      .performance-chart {
        width: 100%;
        height: 100px;
        margin: 12px 0;
      }

      .trend-stat {
        text-align: center;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 600;
      }

      .detail-item {
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        font-size: 14px;
      }

      .detail-label {
        color: #00d4ff;
        font-weight: 600;
      }

      .detail-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .detail-stat {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .stat-icon {
        font-size: 18px;
      }

      .stat-value {
        font-size: 20px;
        font-weight: 700;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-right: 4px;
      }

      .stat-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .detail-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .detail-action-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        font-size: 13px;
        text-align: left;
        transition: all 0.3s;
      }

      .detail-action-btn:hover {
        background: rgba(0, 212, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.3);
        color: #00d4ff;
      }

      .subsection {
        padding: 16px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 12px;
        border-left: 3px solid rgba(0, 212, 255, 0.5);
      }

      .subsection-title {
        font-size: 13px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .route-diagram {
        padding: 20px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }

      .route-flow-svg {
        width: 100%;
        height: auto;
      }

      .components-list,
      .api-list,
      .form-fields-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .component-item,
      .api-item,
      .form-field-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 6px;
        font-size: 13px;
      }

      .component-name,
      .field-name {
        color: rgba(255, 255, 255, 0.9);
      }

      .component-coverage {
        color: #10b981;
        font-size: 12px;
        font-weight: 600;
      }

      .api-method {
        padding: 4px 8px;
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-radius: 4px;
        color: #fbbf24;
        font-size: 11px;
        font-weight: 700;
        margin-right: 8px;
      }

      .api-endpoint {
        flex: 1;
        font-family: 'Courier New', monospace;
        color: rgba(255, 255, 255, 0.8);
      }

      .api-status {
        color: #10b981;
        font-size: 12px;
      }

      .field-validation {
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
      }

      .suggestion-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.02);
        border-left: 3px solid rgba(251, 191, 36, 0.5);
        border-radius: 8px;
      }

      .suggestion-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .suggestion-text {
        flex: 1;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
      }

      /* SVG gradient definitions */
      svg defs linearGradient#grad stop:first-child {
        stop-color: #00d4ff;
      }
      svg defs linearGradient#grad stop:last-child {
        stop-color: #7b2ff7;
      }
    `;
  }
}
