import * as vscode from 'vscode';
import { DiscoveredFlow } from '../types';
import { log } from '../extension';

/**
 * OnboardingWizardPanel - Full-screen premium onboarding experience
 * 
 * Flow:
 * 1. Welcome (full screen, centered)
 * 2. Discovery Progress (live counters, animations)
 * 3. Results (Project Insights + Journey selection)
 * 4. Close panel → Dashboard in sidebar
 */
export class OnboardingWizardPanel {
  public static currentPanel: OnboardingWizardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  
  private step: 'welcome' | 'discovering' | 'results' = 'welcome';
  private discoveredJourneys: DiscoveredFlow[] = [];
  private selectedJourneyIds: Set<string> = new Set();
  
  private discoveryProgress = {
    components: 0,
    routes: 0,
    apis: 0,
    forms: 0,
    framework: null as string | null,
    elapsed: 0
  };

  public static show(context: vscode.ExtensionContext) {
    const column = vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (OnboardingWizardPanel.currentPanel) {
      OnboardingWizardPanel.currentPanel.panel.reveal(column);
      return OnboardingWizardPanel.currentPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'qagenaiOnboarding',
      '🚀 QAgent Setup',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    OnboardingWizardPanel.currentPanel = new OnboardingWizardPanel(panel, context);
    return OnboardingWizardPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, private readonly context: vscode.ExtensionContext) {
    this.panel = panel;

    // Set initial content
    this.update();

    // Listen for when the panel is disposed
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'startDiscovery':
            await this.startDiscovery();
            break;
          case 'toggleJourney':
            this.toggleJourneySelection(message.data);
            break;
          case 'addToDashboard':
            await this.addToDashboard();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  public async startDiscovery() {
    this.step = 'discovering';
    this.update();
    
    // Trigger the actual discovery command
    await vscode.commands.executeCommand('qagenai.liveSmartDiscovery');
  }

  public updateProgress(update: Partial<typeof this.discoveryProgress>) {
    this.discoveryProgress = { ...this.discoveryProgress, ...update };
    this.update();
  }

  public showResults(journeys: DiscoveredFlow[]) {
    this.discoveredJourneys = journeys;
    this.step = 'results';
    
    // Auto-select critical journeys
    this.selectedJourneyIds.clear();
    journeys
      .filter(j => this.getJourneyPriority(j) === 'critical')
      .forEach(j => this.selectedJourneyIds.add(j.id));
    
    this.update();
  }

  private toggleJourneySelection(journeyId: string) {
    if (this.selectedJourneyIds.has(journeyId)) {
      this.selectedJourneyIds.delete(journeyId);
    } else {
      this.selectedJourneyIds.add(journeyId);
    }
    this.update();
  }

  private async addToDashboard() {
    const selectedIds = Array.from(this.selectedJourneyIds);
    if (selectedIds.length === 0) {
      vscode.window.showWarningMessage('Please select at least one journey');
      return;
    }

    log(`[OnboardingWizard] Adding ${selectedIds.length} journeys to dashboard...`);

    // Add flows using dashboard service
    const { DashboardService } = await import('../services/dashboard.service');
    const dashboardService = new DashboardService(this.context);
    
    for (const journeyId of selectedIds) {
      const journey = this.discoveredJourneys.find(j => j.id === journeyId);
      if (!journey) continue;

      await dashboardService.addFlow({ 
        name: journey.name,
        journeyData: journey
      });
      
      log(`[OnboardingWizard] Added flow: ${journey.name}`);
    }
    
    vscode.window.showInformationMessage(
      `✅ Added ${selectedIds.length} journey${selectedIds.length !== 1 ? 's' : ''} to dashboard`
    );

    // Close the wizard panel
    this.panel.dispose();
    
    // Focus dashboard in sidebar and refresh
    await vscode.commands.executeCommand('qagenai.main.focus');
  }

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

  private update() {
    this.panel.webview.html = this.getHtmlContent();
  }

  private getHtmlContent(): string {
    switch (this.step) {
      case 'welcome':
        return this.renderWelcome();
      case 'discovering':
        return this.renderDiscovering();
      case 'results':
        return this.renderResults();
    }
  }

  private renderWelcome(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to QAgent</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="wizard-container">
    <div class="wizard-content welcome">
      <div class="icon-large">🚀</div>
      <h1 class="title-hero">Welcome to QAgent</h1>
      <p class="subtitle-hero">Premium AI-powered E2E test generation</p>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🧠</div>
          <h3>Smart Analysis</h3>
          <p>AI discovers user journeys automatically</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Lightning Fast</h3>
          <p>Full scan in 2-5 seconds</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>Cutting-Edge</h3>
          <p>Premium UX with real-time feedback</p>
        </div>
      </div>

      <button class="btn-hero" onclick="startDiscovery()">
        🔍 Start Smart Discovery
      </button>
      
      <div class="scan-info">
        <h4>What We'll Scan:</h4>
        <div class="scan-items">
          <span class="scan-item">📦 React Components</span>
          <span class="scan-item">🛣️ Application Routes</span>
          <span class="scan-item">🌐 API Endpoints</span>
          <span class="scan-item">📝 Forms & Inputs</span>
          <span class="scan-item">🔐 Auth Flows</span>
          <span class="scan-item">💳 Payment Flows</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function startDiscovery() {
      vscode.postMessage({ command: 'startDiscovery' });
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
  <title>Scanning...</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="wizard-container">
    <div class="wizard-content discovering">
      <div class="icon-pulse">🔍</div>
      <h1 class="title-hero">Analyzing Your Application</h1>
      ${framework ? `<div class="framework-badge">${frameworkIcon} ${framework} Detected</div>` : ''}
      
      <div class="progress-section">
        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-icon">📦</span>
            <span class="progress-label">React Components</span>
          </div>
          <div class="progress-number">${components}</div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${Math.min(100, components * 2)}%"></div>
          </div>
        </div>

        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-icon">🛣️</span>
            <span class="progress-label">Application Routes</span>
          </div>
          <div class="progress-number">${routes}</div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${Math.min(100, routes * 8)}%"></div>
          </div>
        </div>

        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-icon">🌐</span>
            <span class="progress-label">API Endpoints</span>
          </div>
          <div class="progress-number">${apis}</div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${Math.min(100, apis * 5)}%"></div>
          </div>
        </div>

        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-icon">📝</span>
            <span class="progress-label">Forms & Inputs</span>
          </div>
          <div class="progress-number">${forms}</div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${Math.min(100, forms * 10)}%"></div>
          </div>
        </div>
      </div>

      <div class="scan-status">🔎 Identifying user journeys...</div>
      <div class="elapsed-time">${(elapsed / 1000).toFixed(1)}s elapsed</div>
    </div>
  </div>
</body>
</html>`;
  }

  private renderResults(): string {
    const selectedCount = this.selectedJourneyIds.size;
    const totalCount = this.discoveredJourneys.length;
    const categories = this.categorizeJourneys();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discovery Results</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="wizard-container">
    <div class="wizard-content results">
      <div class="icon-success">✨</div>
      <h1 class="title-hero">Discovery Complete!</h1>
      <p class="subtitle-hero">Found ${totalCount} user journeys • ${selectedCount} selected</p>

      <div class="journeys-section">
        ${this.renderJourneyCategory('Critical Paths', '🔴', categories.critical)}
        ${this.renderJourneyCategory('High Value', '🟡', categories.high)}
        ${this.renderJourneyCategory('Standard', '⚙️', categories.standard)}
      </div>

      <button class="btn-hero" onclick="addToDashboard()" ${selectedCount === 0 ? 'disabled' : ''}>
        ➕ Add ${selectedCount} to Dashboard
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function toggleJourney(id) {
      vscode.postMessage({ command: 'toggleJourney', data: id });
    }
    function addToDashboard() {
      vscode.postMessage({ command: 'addToDashboard' });
    }
  </script>
</body>
</html>`;
  }

  private renderJourneyCategory(title: string, icon: string, journeys: DiscoveredFlow[]): string {
    if (journeys.length === 0) return '';

    return `
      <div class="journey-category">
        <div class="category-header">
          <span>${icon} ${title}</span>
          <span class="category-count">${journeys.length}</span>
        </div>
        ${journeys.map(j => this.renderJourneyItem(j)).join('')}
      </div>
    `;
  }

  private renderJourneyItem(journey: DiscoveredFlow): string {
    const isSelected = this.selectedJourneyIds.has(journey.id);
    return `
      <div class="journey-item ${isSelected ? 'selected' : ''}" onclick="toggleJourney('${journey.id}')">
        <input type="checkbox" ${isSelected ? 'checked' : ''} />
        <span class="journey-name">${journey.name}</span>
        <span class="journey-confidence">${journey.confidence || 0}%</span>
      </div>
    `;
  }

  private categorizeJourneys() {
    return {
      critical: this.discoveredJourneys.filter(j => this.getJourneyPriority(j) === 'critical'),
      high: this.discoveredJourneys.filter(j => this.getJourneyPriority(j) === 'high'),
      standard: this.discoveredJourneys.filter(j => this.getJourneyPriority(j) === 'standard'),
    };
  }

  private getFrameworkIcon(framework: string | null): string {
    if (!framework) return '';
    const icons: Record<string, string> = {
      'react': '⚛️',
      'vue': '🖖',
      'angular': '🅰️',
    };
    return icons[framework.toLowerCase()] || '📦';
  }

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
        overflow-x: hidden;
      }

      .wizard-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
      }

      .wizard-content {
        max-width: 800px;
        width: 100%;
        text-align: center;
      }

      /* Icons */
      .icon-large, .icon-success {
        font-size: 80px;
        margin-bottom: 24px;
        animation: fadeIn 0.5s;
      }

      .icon-pulse {
        font-size: 80px;
        margin-bottom: 24px;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Typography */
      .title-hero {
        font-size: 48px;
        font-weight: 700;
        margin-bottom: 16px;
        background: linear-gradient(135deg, var(--vscode-textLink-foreground), var(--vscode-textLink-activeForeground));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .subtitle-hero {
        font-size: 20px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 48px;
      }

      /* Features Grid */
      .features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        margin: 48px 0;
      }

      .feature-card {
        padding: 24px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 12px;
        transition: transform 0.2s;
      }

      .feature-card:hover {
        transform: translateY(-4px);
      }

      .feature-icon {
        font-size: 40px;
        margin-bottom: 16px;
      }

      .feature-card h3 {
        font-size: 18px;
        margin-bottom: 8px;
      }

      .feature-card p {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
      }

      /* Button */
      .btn-hero {
        font-size: 18px;
        padding: 20px 48px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
        margin: 32px 0;
      }

      .btn-hero:hover {
        background: var(--vscode-button-hoverBackground);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }

      .btn-hero:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Scan Info */
      .scan-info {
        margin-top: 48px;
        padding: 32px;
        background: var(--vscode-input-background);
        border-radius: 12px;
      }

      .scan-info h4 {
        font-size: 16px;
        margin-bottom: 20px;
      }

      .scan-items {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
      }

      .scan-item {
        padding: 8px 16px;
        background: var(--vscode-editor-background);
        border-radius: 20px;
        font-size: 13px;
      }

      /* Progress Section */
      .framework-badge {
        display: inline-block;
        padding: 8px 20px;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 20px;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 32px;
      }

      .progress-section {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin: 40px 0;
      }

      .progress-card {
        padding: 24px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 12px;
        text-align: left;
      }

      .progress-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .progress-icon {
        font-size: 24px;
      }

      .progress-label {
        font-size: 14px;
        font-weight: 500;
      }

      .progress-number {
        font-size: 36px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .progress-bar-container {
        height: 8px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        background: var(--vscode-progressBar-background);
        transition: width 0.3s;
        border-radius: 4px;
      }

      .scan-status {
        font-size: 16px;
        color: var(--vscode-textLink-foreground);
        margin-top: 32px;
        font-style: italic;
      }

      .elapsed-time {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        margin-top: 12px;
      }

      /* Journeys Section */
      .journeys-section {
        margin: 40px 0;
        text-align: left;
      }

      .journey-category {
        margin-bottom: 32px;
      }

      .category-header {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 2px solid var(--vscode-panel-border);
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .category-count {
        color: var(--vscode-descriptionForeground);
      }

      .journey-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: var(--vscode-input-background);
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 8px;
      }

      .journey-item:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .journey-item.selected {
        border-color: var(--vscode-textLink-foreground);
        background: var(--vscode-list-activeSelectionBackground);
      }

      .journey-name {
        flex: 1;
        font-size: 15px;
      }

      .journey-confidence {
        font-size: 13px;
        color: var(--vscode-descriptionForeground);
      }
    `;
  }

  public dispose() {
    OnboardingWizardPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
