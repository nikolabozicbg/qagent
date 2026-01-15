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
    if (!this.dashboardData) {
      return this.renderEmptyDashboard();
    }

    const flows = this.dashboardData.flows?.items || [];
    if (flows.length === 0) {
      return this.renderEmptyDashboard();
    }

    // Use premium dashboard
    return this.renderPremiumDashboard();
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

  private isFlowCritical(flowName: string): boolean {
    const name = flowName.toLowerCase();
    return name.includes('login') || name.includes('auth') || name.includes('payment') || 
           name.includes('checkout') || name.includes('registration');
  }

  private isFlowHighValue(flowName: string): boolean {
    const name = flowName.toLowerCase();
    return name.includes('profile') || name.includes('settings') || name.includes('account') ||
           name.includes('transaction') || name.includes('user');
  }

  private generateDashboardInsights(flows: DashboardFlow[]): any {
    const criticalCount = flows.filter(f => this.isFlowCritical(f.name)).length;
    const generatedCount = flows.filter(f => f.status === 'generated' || f.status === 'passing').length;
    
    return {
      totalFlows: flows.length,
      criticalPaths: criticalCount,
      testCoverage: flows.length > 0 ? Math.round((generatedCount / flows.length) * 100) : 0,
      recommendations: [
        criticalCount > 0 ? `Focus on ${criticalCount} critical paths` : 'Start by discovering critical paths',
        'Generate tests for high-value flows',
        'Run tests regularly to maintain coverage'
      ]
    };
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
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .btn-large {
        flex: 1;
        min-width: 150px;
        font-size: 14px;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      }

      .btn-large.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .btn-large.primary:hover {
        background: var(--vscode-button-hoverBackground);
        transform: translateY(-2px);
      }

      .btn-large.secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .btn-large.secondary:hover {
        background: var(--vscode-button-secondaryHoverBackground);
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
      .dashboard-title {
        margin-bottom: 24px;
      }

      .dashboard-title h1 {
        font-size: 24px;
        font-weight: 600;
        margin: 0;
      }

      /* Health Score Section */
      .health-score-section {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 20px;
        text-align: center;
      }

      .health-score-main {
        margin-bottom: 16px;
      }

      .health-score-large {
        font-size: 64px;
        font-weight: 700;
        background: linear-gradient(135deg, #10b981, #059669);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
      }

      .health-score-label {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--vscode-descriptionForeground);
        font-weight: 600;
        margin-top: 8px;
      }

      .health-progress {
        height: 8px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        overflow: hidden;
      }

      .health-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #059669);
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 20px;
      }

      .stats-card {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 12px;
        padding: 20px;
      }

      .stats-header {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .stats-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }

      .stat-label {
        color: var(--vscode-descriptionForeground);
      }

      .stat-value {
        font-weight: 600;
      }

      .stat-value.success {
        color: #10b981;
      }

      .stat-value.error {
        color: #ef4444;
      }

      .stat-value.muted {
        color: var(--vscode-descriptionForeground);
      }

      /* Attention Section */
      .attention-section {
        margin-bottom: 20px;
      }

      .attention-header {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #f59e0b;
        margin-bottom: 12px;
      }

      .attention-card {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .attention-item {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .attention-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .attention-content {
        flex: 1;
      }

      .attention-title {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .attention-desc {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      /* Suggestions Section */
      .suggestions-section {
        margin-bottom: 20px;
      }

      .suggestions-header {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #3b82f6;
        margin-bottom: 12px;
      }

      .suggestions-card {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .suggestion-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 13px;
        line-height: 1.5;
      }

      .suggestion-icon {
        color: #3b82f6;
        font-weight: 700;
        flex-shrink: 0;
      }

      .suggestion-text {
        color: var(--vscode-foreground);
      }

      /* Dashboard Cards Layout */
      .dashboard-cards {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 16px;
        margin-bottom: 24px;
      }

      .dashboard-card {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 12px;
        padding: 24px;
        transition: all 0.2s;
      }

      .dashboard-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      /* Health Card */
      .health-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      .health-score-large {
        font-size: 72px;
        font-weight: 700;
        background: linear-gradient(135deg, #10b981, #059669);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
        margin-bottom: 8px;
      }

      .health-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--vscode-descriptionForeground);
        font-weight: 600;
        margin-bottom: 8px;
      }

      .health-description {
        font-size: 13px;
        color: var(--vscode-descriptionForeground);
      }

      /* Insights Card */
      .insights-card {
        display: flex;
        flex-direction: column;
      }

      .card-header {
        margin-bottom: 16px;
      }

      .card-header h3 {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      }

      .insights-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }

      .insight-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px;
        background: var(--vscode-editor-background);
        border-radius: 8px;
        text-align: center;
        transition: all 0.2s;
      }

      .insight-item:hover {
        transform: translateY(-2px);
        background: var(--vscode-list-hoverBackground);
      }

      .insight-item.critical {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .insight-item.high-value {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.05));
        border: 1px solid rgba(251, 146, 60, 0.3);
      }

      .insight-item.coverage {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .insight-icon {
        font-size: 24px;
        line-height: 1;
      }

      .insight-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .insight-value {
        font-size: 24px;
        font-weight: 700;
        line-height: 1;
      }

      .insight-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--vscode-descriptionForeground);
      }

      /* Old styles (kept for compatibility) */
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

      /* Premium Dashboard Styles - Screen 4 */
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

      .premium-section .section-header {
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

      .premium-section .insight-item {
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

      .premium-section .insight-icon {
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

      .premium-section .flows-list {
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

      .flow-card .flow-icon {
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

  // =============================================================================
  // PREMIUM DASHBOARD RENDERING (Screen 4)
  // =============================================================================

  private renderPremiumDashboard(): string {
    const data = this.dashboardData;
    if (!data) return this.renderEmptyDashboard();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgent Dashboard</title>
  <style>${this.getStyles()}</style>
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
        if (originalText && /\\d/.test(originalText)) {
          animateCounter(el, originalText, 1200);
        }
      });
    });
  </script>
</body>
</html>`;
  }

  private renderProjectHealth(): string {
    const testing = this.dashboardData?.testing;
    const flows = this.dashboardData?.flows;
    const score = Math.round(((testing?.passingTests || 0) / Math.max(testing?.totalTests || 1, 1)) * 100);
    const flowsActive = `${flows?.passing || 0}/${flows?.total || 0}`;
    const totalRuntime = '2m 34s';

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
    const flows = this.dashboardData?.flows?.items || [];
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
          ${flows.length === 0 ? this.renderEmptyFlowsSection() : flows.map((flow, idx) => this.renderPremiumFlowCard(flow, idx)).join('')}
        </div>
      </div>
    `;
  }

  private renderPremiumFlowCard(flow: DashboardFlow, index: number): string {
    const statusConfig: Record<string, { badge: string; color: string; percentage: string }> = {
      'passing': { badge: '✅ PASSING', color: '#10b981', percentage: '95%' },
      'needs-update': { badge: '⚠️ NEEDS UPDATE', color: '#fbbf24', percentage: '' },
      'generating': { badge: '🔄 GENERATING', color: '#00d4ff', percentage: '60%' },
      'failing': { badge: '❌ FAILING', color: '#ef4444', percentage: '' },
      'draft': { badge: '📝 DRAFT', color: '#6b7280', percentage: '' },
      'generated': { badge: '✅ GENERATED', color: '#10b981', percentage: '' },
      'flaky': { badge: '⚠️ FLAKY', color: '#fbbf24', percentage: '' },
    };

    const status = statusConfig[flow.status] || statusConfig['draft'];
    const lastRun = flow.lastRun ? this.formatTimeAgo(new Date(flow.lastRun)) : 'Never';
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
          <button class="flow-action-btn" onclick="event.stopPropagation(); send('runFlowTest', '${flow.id}')" title="Run">
            ▶️
          </button>
          <button class="flow-action-btn" onclick="event.stopPropagation(); send('generateFlowTest', '${flow.id}')" title="Generate Test">
            ✨
          </button>
          <button class="flow-action-btn" onclick="event.stopPropagation(); send('selectFlow', '${flow.id}')" title="View Details">
            👁️
          </button>
          <button class="flow-action-btn" onclick="event.stopPropagation(); send('deleteFlow', '${flow.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  private renderEmptyFlowsSection(): string {
    return `
      <div class="empty-flows">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <div class="empty-text">No flows discovered yet</div>
        <button class="btn-hero-small" onclick="send('startDiscovery')">🔍 Run Discovery</button>
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
    }
    .empty { text-align: center; }
    .empty button {
      margin-top: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #7b2ff7, #00d4ff);
      border: none;
      border-radius: 12px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="empty">
    <div>No flows found. Start by discovering your app.</div>
    <button onclick="vscode.postMessage({command: 'startDiscovery'})">🔍 Run Discovery</button>
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
}
