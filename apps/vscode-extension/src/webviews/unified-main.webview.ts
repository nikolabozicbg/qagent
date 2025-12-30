import * as vscode from 'vscode';
import { DashboardService } from '../services/dashboard.service';
import { TestGenerationService } from '../services/test-generation.service';
import { PlaywrightService } from '../services/playwright.service';
import { TestHealthService } from '../services/test-health.service';
import { DashboardData, DashboardFlow } from '../types/dashboard.types';
import { DiscoveredFlow } from '../types';
import { log } from '../extension';

/**
 * AppState - Single state machine for entire UX
 */
type AppState =
  | 'welcome'      // First time or no data
  | 'discovering'  // Live progress
  | 'results'      // Journey selection
  | 'dashboard'    // Main view with tests
  | 'running';     // Test execution

interface DiscoveryProgress {
  components: number;
  routes: number;
  apis: number;
  forms: number;
  journeys: number;
  framework: string | null;
  confidence: number;
  elapsed: number;
}

interface TechStack {
  framework: string;           // React, Vue, Angular
  version?: string;            // 18.2.0
  stateManagement?: string;    // Redux, Zustand, Context
  routing?: string;            // React Router, Next.js Router
  uiLibrary?: string;          // MUI, Ant Design, Chakra
  testing?: string;            // Jest, Vitest, Cypress
}

interface ProjectInsights {
  techStack: TechStack;
  healthScore: number;         // 0-100
  testCoverage: number;        // Current %
  coverageGap: number;         // Gap to reach 80%
  complexity: 'low' | 'medium' | 'high';
  criticalPaths: number;       // High-priority journeys
  recommendations: string[];   // Smart suggestions
}

/**
 * UnifiedMainViewProvider - ONE view to rule them all
 * 
 * Replaces:
 * - DashboardWebviewProvider
 * - DiscoveryResultsWebviewProvider
 * - DiscoveryProgressWebviewProvider
 * 
 * Features:
 * - State machine: welcome → discovering → results → dashboard
 * - No scrolling, no confusion
 * - Big buttons, clear actions
 * - All data in one place
 */
export class UnifiedMainViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'qagenai.main';

  private view?: vscode.WebviewView;
  private state: AppState = 'welcome';
  
  // Data for each state
  private dashboardData?: DashboardData;
  private discoveredJourneys: DiscoveredFlow[] = [];
  private selectedJourneyIds: Set<string> = new Set();
  private discoveryProgress: DiscoveryProgress = {
    components: 0,
    routes: 0,
    apis: 0,
    forms: 0,
    journeys: 0,
    framework: null,
    confidence: 0,
    elapsed: 0
  };
  private projectInsights?: ProjectInsights;

  private playwrightService: PlaywrightService;
  private testHealthService: TestHealthService;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly dashboardService: DashboardService,
    private readonly testGenerationService: TestGenerationService
  ) {
    this.playwrightService = new PlaywrightService();
    this.testHealthService = new TestHealthService();
    
    // Determine initial state
    this.initializeState();
  }

  private async initializeState(): Promise<void> {
    // Check if user has data
    const data = await this.dashboardService.getDashboardData();
    const hasFlows = data?.flows?.items && data.flows.items.length > 0;
    
    if (hasFlows) {
      this.state = 'dashboard';
      this.dashboardData = data;
    } else {
      this.state = 'welcome';
    }
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

    await this.render();

    webviewView.webview.onDidReceiveMessage(
      async (message) => await this.handleMessage(message),
      undefined,
      this.context.subscriptions
    );
  }

  // ===============================
  // PUBLIC API
  // ===============================

  /**
   * Start discovery from anywhere
   */
  public async startDiscovery(): Promise<void> {
    this.state = 'discovering';
    this.discoveryProgress = {
      components: 0,
      routes: 0,
      apis: 0,
      forms: 0,
      journeys: 0,
      framework: null,
      confidence: 0,
      elapsed: 0
    };
    await this.render();
    this.view?.show(true);
  }

  /**
   * Update discovery progress in real-time
   */
  public async updateDiscoveryProgress(update: Partial<DiscoveryProgress>): Promise<void> {
    this.discoveryProgress = { ...this.discoveryProgress, ...update };
    await this.render();
  }

  /**
   * Show results after discovery completes
   */
  public async showResults(journeys: DiscoveredFlow[], insights?: ProjectInsights): Promise<void> {
    this.discoveredJourneys = journeys;
    
    // Auto-generate insights if not provided
    this.projectInsights = insights || this.generateMockInsights(journeys);
    
    this.state = 'results';
    
    // Auto-select critical journeys
    this.selectedJourneyIds.clear();
    journeys
      .filter(j => this.getJourneyPriority(j) === 'critical')
      .forEach(j => this.selectedJourneyIds.add(j.id));
    
    await this.render();
  }

  /**
   * Refresh dashboard
   */
  public async refresh(): Promise<void> {
    log('[UnifiedMainView] Refreshing - reinitializing state');
    
    // Always reinitialize state to check for new flows
    await this.initializeState();
    
    // If we now have flows, load dashboard data
    if (this.state === 'dashboard') {
      log('[UnifiedMainView] Loading dashboard data');
      this.dashboardData = await this.dashboardService.getDashboardData();
    } else {
      log('[UnifiedMainView] No flows found, staying in welcome state');
    }
    
    // Always render
    await this.render();
    log('[UnifiedMainView] Refresh complete, state:', this.state);
  }

  // ===============================
  // MESSAGE HANDLERS
  // ===============================

  private async handleMessage(message: { command: string; data?: any }): Promise<void> {
    log('[UnifiedView] Received message:', message.command);
    
    switch (message.command) {
      // Discovery
      case 'startDiscovery':
        await this.startDiscovery();
        await vscode.commands.executeCommand('qagenai.liveSmartDiscovery');
        break;

      // Results
      case 'toggleJourney':
        this.toggleJourneySelection(message.data as string);
        break;
      case 'addToDashboard':
        await this.addJourneysToDashboard();
        break;

      // Dashboard
      case 'generateFlowTest':
        await this.generateFlowTest(message.data as string);
        break;
      case 'runFlowTest':
        await this.runFlowTest(message.data as string);
        break;
      case 'deleteFlow':
        await this.deleteFlow(message.data as string);
        break;
      case 'discoverMore':
        await this.startDiscovery();
        await vscode.commands.executeCommand('qagenai.liveSmartDiscovery');
        break;
      
      // General
      case 'refresh':
        await this.refresh();
        break;
    }
  }

  // ===============================
  // ACTIONS
  // ===============================

  private toggleJourneySelection(journeyId: string): void {
    if (this.selectedJourneyIds.has(journeyId)) {
      this.selectedJourneyIds.delete(journeyId);
    } else {
      this.selectedJourneyIds.add(journeyId);
    }
    this.render();
  }

  private async addJourneysToDashboard(): Promise<void> {
    const selectedIds = Array.from(this.selectedJourneyIds);
    if (selectedIds.length === 0) {
      vscode.window.showWarningMessage('Please select at least one journey');
      return;
    }

    log(`[UnifiedView] Adding ${selectedIds.length} journeys to dashboard...`);

    // Add journeys to dashboard (as draft flows)
    for (const journeyId of selectedIds) {
      const journey = this.discoveredJourneys.find(j => j.id === journeyId);
      if (!journey) continue;

      const addedFlow = await this.dashboardService.addFlow({ 
        name: journey.name,
        journeyData: journey
      });
      
      log(`[UnifiedView] Added flow:`, addedFlow.name, addedFlow.id);
    }

    // Show success message
    vscode.window.showInformationMessage(
      `✅ Added ${selectedIds.length} journey${selectedIds.length !== 1 ? 's' : ''} to dashboard`
    );

    // Transition to dashboard
    await this.transitionToDashboard();
  }

  private async generateFlowTest(flowId: string): Promise<void> {
    const flow = this.dashboardData?.flows.items.find(f => f.id === flowId);
    if (!flow) return;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Generating test: ${flow.name}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 30, message: 'Calling AI...' });
        
        const result = await this.testGenerationService.generateE2ETest(flow);
        
        if (!result.success || !result.code) {
          vscode.window.showErrorMessage(`Generation failed: ${result.error || 'Unknown error'}`);
          return;
        }
        
        progress.report({ increment: 50, message: 'Opening editor...' });
        
        await this.testGenerationService.showGeneratedTest(result.code, result.filename || `${flow.name}.spec.ts`);
        await this.dashboardService.updateFlow(flowId, { status: 'generated' });
        await this.refresh();
        
        progress.report({ increment: 20, message: 'Done!' });
      }
    );
  }

  private async runFlowTest(flowId: string): Promise<void> {
    const flow = this.dashboardData?.flows.items.find(f => f.id === flowId);
    if (!flow) return;

    const testFile = await this.playwrightService.findTestFile(flow.name);
    
    if (!testFile) {
      vscode.window.showWarningMessage(`Test file not found for: ${flow.name}. Generate it first.`);
      return;
    }

    await this.playwrightService.runTest(testFile, { headed: true });
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

  private async transitionToDashboard(): Promise<void> {
    log('[UnifiedView] Transitioning to dashboard...');
    this.state = 'dashboard';
    this.dashboardData = await this.dashboardService.getDashboardData();
    log('[UnifiedView] Dashboard data loaded:', {
      flowCount: this.dashboardData?.flows?.items?.length || 0,
      flowNames: this.dashboardData?.flows?.items?.map(f => f.name) || []
    });
    await this.render();
    log('[UnifiedView] Dashboard rendered');
  }

  // ===============================
  // HELPERS
  // ===============================

  private getJourneyPriority(journey: DiscoveredFlow): 'critical' | 'high' | 'standard' {
    const confidence = journey.confidence || 0;
    const name = journey.name.toLowerCase();
    
    if (confidence >= 85 || name.includes('auth') || name.includes('login') || name.includes('payment')) {
      return 'critical';
    }
    
    if (confidence >= 70 || name.includes('register') || name.includes('profile') || name.includes('checkout')) {
      return 'high';
    }
    
    return 'standard';
  }

  private categorizeJourneys(): {
    critical: DiscoveredFlow[];
    high: DiscoveredFlow[];
    standard: DiscoveredFlow[];
  } {
    return {
      critical: this.discoveredJourneys.filter(j => this.getJourneyPriority(j) === 'critical'),
      high: this.discoveredJourneys.filter(j => this.getJourneyPriority(j) === 'high'),
      standard: this.discoveredJourneys.filter(j => this.getJourneyPriority(j) === 'standard'),
    };
  }

  // ===============================
  // RENDERING
  // ===============================

  private async render(): Promise<void> {
    if (!this.view) return;
    this.view.webview.html = this.getHtmlContent();
  }

  private getHtmlContent(): string {
    switch (this.state) {
      case 'welcome':
        return this.renderWelcome();
      case 'discovering':
        return this.renderDiscovering();
      case 'results':
        return this.renderResults();
      case 'dashboard':
        return this.renderDashboard();
      default:
        return this.renderWelcome();
    }
  }

  // ===============================
  // STATE RENDERERS
  // ===============================

  private renderWelcome(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgent</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="state-container welcome">
    <div class="welcome-icon">🚀</div>
    <h1>Welcome to QAgent</h1>
    <p class="subtitle">AI-powered E2E test generation for React apps</p>
    
    <div class="action-zone">
      <button class="btn-huge primary" onclick="send('startDiscovery')">
        🔍 Start Smart Discovery
      </button>
      <p class="hint">Analyzes your app in ~2-5 seconds</p>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <span class="info-icon">📦</span>
        <span>Components</span>
      </div>
      <div class="info-item">
        <span class="info-icon">🛣️</span>
        <span>Routes</span>
      </div>
      <div class="info-item">
        <span class="info-icon">🔐</span>
        <span>User Flows</span>
      </div>
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

  private renderDiscovering(): string {
    const { components, routes, apis, forms, framework, elapsed } = this.discoveryProgress;
    const frameworkIcon = this.getFrameworkIcon(framework);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgent - Discovering</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="state-container discovering">
    <div class="discovery-icon">🔍</div>
    <h1>Analyzing Your App...</h1>
    ${framework ? `<div class="framework-badge">${frameworkIcon} ${framework} Detected</div>` : ''}
    
    <div class="progress-grid">
      <div class="progress-item">
        <div class="progress-label">📦 Components</div>
        <div class="progress-count">${components}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(100, components * 2)}%"></div>
        </div>
      </div>
      
      <div class="progress-item">
        <div class="progress-label">🛣️ Routes</div>
        <div class="progress-count">${routes}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(100, routes * 8)}%"></div>
        </div>
      </div>
      
      <div class="progress-item">
        <div class="progress-label">🌐 API Calls</div>
        <div class="progress-count">${apis}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(100, apis * 5)}%"></div>
        </div>
      </div>
      
      <div class="progress-item">
        <div class="progress-label">📝 Forms</div>
        <div class="progress-count">${forms}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(100, forms * 10)}%"></div>
        </div>
      </div>
    </div>

    <div class="scanning-status">🔎 Scanning for user flows...</div>
    <div class="elapsed">${(elapsed / 1000).toFixed(1)}s elapsed</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>`;
  }

  private renderResults(): string {
    const categories = this.categorizeJourneys();
    const selectedCount = this.selectedJourneyIds.size;
    const totalCount = this.discoveredJourneys.length;
    const insights = this.projectInsights;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgent - Results</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="state-container results">
    <div class="results-header">
      <h1>✨ Found ${totalCount} Journeys</h1>
      <p class="subtitle">${selectedCount} selected • ${categories.critical.length} critical paths</p>
    </div>

    ${insights ? this.renderProjectInsights(insights) : ''}

    ${this.renderJourneyCategory('Critical', '🔴', categories.critical)}
    ${this.renderJourneyCategory('High Value', '🟡', categories.high)}
    ${this.renderJourneyCategory('Standard', '⚙️', categories.standard)}

    <div class="action-zone">
      <button class="btn-huge primary" onclick="send('addToDashboard')" ${selectedCount === 0 ? 'disabled' : ''}>
        ➕ Add ${selectedCount} to Dashboard
      </button>
      <p class="hint">Generate tests from dashboard</p>
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

  private renderProjectInsights(insights: ProjectInsights): string {
    const { techStack, healthScore, testCoverage, coverageGap, complexity, recommendations } = insights;
    const healthColor = healthScore >= 80 ? '#4caf50' : healthScore >= 60 ? '#ff9800' : '#f44336';
    const complexityColor = complexity === 'low' ? '#4caf50' : complexity === 'medium' ? '#ff9800' : '#f44336';
    
    return `
      <div class="insights-card">
        <div class="insights-header">
          <span class="insights-title">🎯 Project Insights</span>
        </div>
        
        <div class="insights-grid">
          <div class="insight-item">
            <div class="insight-icon">${this.getFrameworkIcon(techStack.framework)}</div>
            <div class="insight-content">
              <div class="insight-label">Tech Stack</div>
              <div class="insight-value">${techStack.framework}${techStack.version ? ` ${techStack.version}` : ''}</div>
              ${techStack.stateManagement ? `<div class="insight-detail">${techStack.stateManagement}</div>` : ''}
            </div>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">💯</div>
            <div class="insight-content">
              <div class="insight-label">Health Score</div>
              <div class="insight-value" style="color: ${healthColor}">${healthScore}/100</div>
            </div>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">🎯</div>
            <div class="insight-content">
              <div class="insight-label">Test Coverage</div>
              <div class="insight-value">${testCoverage}%</div>
              ${coverageGap > 0 ? `<div class="insight-detail">+${coverageGap}% to reach 80%</div>` : ''}
            </div>
          </div>
          
          <div class="insight-item">
            <div class="insight-icon">⚡</div>
            <div class="insight-content">
              <div class="insight-label">Complexity</div>
              <div class="insight-value" style="color: ${complexityColor}">${complexity.toUpperCase()}</div>
            </div>
          </div>
        </div>
        
        ${recommendations.length > 0 ? `
          <div class="recommendations">
            <div class="recommendations-title">💡 Smart Recommendations</div>
            ${recommendations.map(r => `<div class="recommendation-item">• ${r}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderJourneyCategory(title: string, icon: string, journeys: DiscoveredFlow[]): string {
    if (journeys.length === 0) return '';

    return `
      <div class="journey-category">
        <div class="category-header">
          <span class="category-icon">${icon}</span>
          <span class="category-title">${title}</span>
          <span class="category-count">${journeys.length}</span>
        </div>
        <div class="journey-list">
          ${journeys.map(j => this.renderJourneyItem(j)).join('')}
        </div>
      </div>
    `;
  }

  private renderJourneyItem(journey: DiscoveredFlow): string {
    const isSelected = this.selectedJourneyIds.has(journey.id);
    const confidence = journey.confidence || 0;

    return `
      <div class="journey-item ${isSelected ? 'selected' : ''}" onclick="send('toggleJourney', '${journey.id}')">
        <input type="checkbox" ${isSelected ? 'checked' : ''} />
        <div class="journey-info">
          <div class="journey-name">${journey.name}</div>
          <div class="journey-confidence">${confidence}% confidence</div>
        </div>
      </div>
    `;
  }

  private renderDashboard(): string {
    const flows = this.dashboardData?.flows?.items || [];
    const healthScore = this.calculateHealthScore(flows);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgent</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="state-container dashboard">
    <div class="dashboard-header">
      <div class="health-badge">
        <div class="health-score">${healthScore}</div>
        <div class="health-label">Health Score</div>
      </div>
    </div>

    <div class="flows-section">
      <div class="section-header">
        <h2>📚 Flows (${flows.length})</h2>
      </div>
      
      <div class="flows-list">
        ${flows.length === 0 ? '<p class="empty-state">No flows yet. Discover your app to get started!</p>' : ''}
        ${flows.map(f => this.renderFlowItem(f)).join('')}
      </div>
    </div>

    <div class="action-zone">
      <button class="btn primary" onclick="send('discoverMore')">
        🔍 Discover More Flows
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

  private renderFlowItem(flow: DashboardFlow): string {
    const statusIcon = flow.status === 'generated' ? '✅' : '📝';
    const hasTest = flow.status === 'generated';

    return `
      <div class="flow-item">
        <div class="flow-info">
          <span class="flow-icon">${statusIcon}</span>
          <span class="flow-name">${flow.name}</span>
        </div>
        <div class="flow-actions">
          ${hasTest 
            ? `<button class="btn-small" onclick="send('runFlowTest', '${flow.id}')">▶️ Run</button>`
            : `<button class="btn-small" onclick="send('generateFlowTest', '${flow.id}')">✨ Generate</button>`
          }
        </div>
      </div>
    `;
  }

  private calculateHealthScore(flows: DashboardFlow[]): number {
    if (flows.length === 0) return 0;
    
    const generatedCount = flows.filter(f => f.status === 'generated' || f.status === 'passing').length;
    const passingCount = flows.filter(f => f.status === 'passing').length;
    
    const generationScore = (generatedCount / flows.length) * 50;
    const passScore = flows.length > 0 ? (passingCount / flows.length) * 50 : 0;
    
    return Math.round(generationScore + passScore);
  }

  private getFrameworkIcon(framework: string | null): string {
    if (!framework) return '';
    
    const icons: Record<string, string> = {
      'react': '⚛️',
      'vue': '🖖',
      'angular': '🅰️',
      'next': '▲',
      'nuxt': '💚',
      'svelte': '🔥'
    };
    
    return icons[framework.toLowerCase()] || '📦';
  }

  /**
   * Generate mock project insights from discovered data
   */
  private generateMockInsights(journeys: DiscoveredFlow[]): ProjectInsights {
    const criticalCount = journeys.filter(j => this.getJourneyPriority(j) === 'critical').length;
    const totalCount = journeys.length;
    
    // Calculate health score based on journeys found
    const healthScore = Math.min(95, 60 + (totalCount * 5));
    
    // Mock test coverage (would come from backend)
    const testCoverage = 0;
    const coverageGap = 80 - testCoverage;
    
    // Determine complexity based on journey count
    const complexity = totalCount <= 5 ? 'low' : totalCount <= 10 ? 'medium' : 'high';
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (criticalCount > 0) {
      recommendations.push(`Start with ${criticalCount} critical path${criticalCount > 1 ? 's' : ''} (auth, payments)`);
    }
    if (testCoverage < 80) {
      recommendations.push(`Add ${Math.ceil(coverageGap / 10)} more tests to reach 80% coverage`);
    }
    recommendations.push('Focus on happy path scenarios first');
    
    return {
      techStack: {
        framework: this.discoveryProgress.framework || 'React',
        version: '18.2.0',
        stateManagement: 'Redux',
        routing: 'React Router',
      },
      healthScore,
      testCoverage,
      coverageGap: Math.max(0, coverageGap),
      complexity,
      criticalPaths: criticalCount,
      recommendations
    };
  }

  // ===============================
  // STYLES
  // ===============================

  private getStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        padding: 16px;
        overflow-x: hidden;
      }

      .state-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 100%;
      }

      /* Welcome State */
      .welcome {
        text-align: center;
        padding: 20px 0;
      }

      .welcome-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }

      h1 {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .subtitle {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 24px;
      }

      .action-zone {
        margin: 24px 0;
        text-align: center;
      }

      .btn-huge {
        font-size: 16px;
        padding: 16px 32px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
        max-width: 320px;
        transition: all 0.2s;
      }

      .btn-huge.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .btn-huge.primary:hover {
        background: var(--vscode-button-hoverBackground);
        transform: translateY(-2px);
      }

      .btn-huge:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn {
        font-size: 14px;
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
      }

      .btn.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .btn.primary:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .btn-small {
        font-size: 12px;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .btn-small:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }

      .hint {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-top: 8px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 24px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 12px;
        background: var(--vscode-input-background);
        border-radius: 6px;
        font-size: 12px;
      }

      .info-icon {
        font-size: 24px;
      }

      /* Discovering State */
      .discovering {
        text-align: center;
      }

      .discovery-icon {
        font-size: 48px;
        margin-bottom: 16px;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      .framework-badge {
        display: inline-block;
        padding: 6px 12px;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 20px;
      }

      .progress-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 24px 0;
      }

      .progress-item {
        text-align: left;
      }

      .progress-label {
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 6px;
      }

      .progress-count {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .progress-bar {
        height: 6px;
        background: var(--vscode-input-background);
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: var(--vscode-progressBar-background);
        transition: width 0.3s;
        border-radius: 3px;
      }

      .scanning-status {
        font-size: 13px;
        color: var(--vscode-descriptionForeground);
        margin-top: 12px;
        font-style: italic;
      }

      .elapsed {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-top: 8px;
      }

      /* Results State */
      .results-header {
        text-align: center;
        margin-bottom: 20px;
      }

      /* Project Insights Card */
      .insights-card {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
      }

      .insights-header {
        margin-bottom: 16px;
      }

      .insights-title {
        font-size: 15px;
        font-weight: 600;
      }

      .insights-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }

      .insight-item {
        display: flex;
        gap: 10px;
        padding: 10px;
        background: var(--vscode-editor-background);
        border-radius: 6px;
      }

      .insight-icon {
        font-size: 20px;
        line-height: 1;
      }

      .insight-content {
        flex: 1;
      }

      .insight-label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .insight-value {
        font-size: 15px;
        font-weight: 600;
      }

      .insight-detail {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-top: 2px;
      }

      .recommendations {
        padding: 12px;
        background: var(--vscode-editor-background);
        border-radius: 6px;
        border-left: 3px solid var(--vscode-progressBar-background);
      }

      .recommendations-title {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .recommendation-item {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
        line-height: 1.5;
      }

      .journey-category {
        margin-bottom: 20px;
      }

      .category-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .category-icon {
        font-size: 16px;
      }

      .category-title {
        font-size: 14px;
        font-weight: 600;
      }

      .category-count {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-left: auto;
      }

      .journey-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .journey-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: var(--vscode-input-background);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .journey-item:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .journey-item.selected {
        background: var(--vscode-list-activeSelectionBackground);
      }

      .journey-info {
        flex: 1;
      }

      .journey-name {
        font-size: 13px;
        font-weight: 500;
      }

      .journey-confidence {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      /* Dashboard State */
      .dashboard-header {
        text-align: center;
        margin-bottom: 20px;
      }

      .health-badge {
        display: inline-block;
        padding: 12px 24px;
        background: var(--vscode-badge-background);
        border-radius: 12px;
      }

      .health-score {
        font-size: 32px;
        font-weight: 700;
        color: var(--vscode-badge-foreground);
      }

      .health-label {
        font-size: 11px;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
        margin-top: 4px;
      }

      .flows-section {
        margin: 20px 0;
      }

      .section-header {
        margin-bottom: 12px;
      }

      .section-header h2 {
        font-size: 16px;
        font-weight: 600;
      }

      .flows-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .flow-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: var(--vscode-input-background);
        border-radius: 6px;
      }

      .flow-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .flow-icon {
        font-size: 16px;
      }

      .flow-name {
        font-size: 13px;
        font-weight: 500;
      }

      .flow-actions {
        display: flex;
        gap: 6px;
      }

      .empty-state {
        text-align: center;
        padding: 40px 20px;
        font-size: 13px;
        color: var(--vscode-descriptionForeground);
      }
    `;
  }
}
