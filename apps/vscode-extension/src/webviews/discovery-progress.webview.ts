import * as vscode from 'vscode';

/**
 * DiscoveryProgressWebviewProvider - Live discovery progress visualization
 * 
 * Features:
 * - Full-screen progress view (not toast)
 * - Real-time counters (components, routes, APIs)
 * - Framework detection visualization
 * - Confidence scores as they're calculated
 * - Smooth transition to results
 * 
 * First-time experience:
 * - Welcome message with explanation
 * - "What we're looking for" education
 * - Visual feedback for each discovery phase
 */
export class DiscoveryProgressWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'qagenai.discoveryProgress';

  private view?: vscode.WebviewView;
  private isFirstTime: boolean = true;
  private discoveryState: DiscoveryState = {
    phase: 'idle',
    components: 0,
    routes: 0,
    apis: 0,
    forms: 0,
    journeys: 0,
    framework: null,
    confidence: 0,
    elapsed: 0
  };

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {
    this.isFirstTime = !context.globalState.get('qagenai.discoveryCompleted', false);
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

    this.render();

    webviewView.webview.onDidReceiveMessage(
      async (message) => await this.handleMessage(message),
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Start discovery with welcome screen for first-timers
   */
  public async startDiscovery(): Promise<void> {
    if (this.isFirstTime) {
      this.discoveryState.phase = 'welcome';
    } else {
      this.discoveryState.phase = 'scanning';
    }
    this.render();
  }

  /**
   * Update discovery progress
   */
  public updateProgress(update: Partial<DiscoveryState>): void {
    this.discoveryState = { ...this.discoveryState, ...update };
    this.render();
  }

  /**
   * Complete discovery
   */
  public async completeDiscovery(summary: any): Promise<void> {
    this.discoveryState.phase = 'complete';
    this.discoveryState = { ...this.discoveryState, ...summary };
    await this.context.globalState.update('qagenai.discoveryCompleted', true);
    this.isFirstTime = false;
    this.render();
    
    // Auto-transition to results after 2 seconds
    setTimeout(() => {
      this.discoveryState.phase = 'idle';
      this.render();
    }, 2000);
  }

  /**
   * Show the view
   */
  public show(): void {
    this.view?.show(true);
  }

  private render(): void {
    if (this.view) {
      this.view.webview.html = this.getHtmlContent();
    }
  }

  private async handleMessage(message: { command: string; data?: any }): Promise<void> {
    switch (message.command) {
      case 'startDiscovery':
        this.discoveryState.phase = 'scanning';
        this.render();
        // Trigger actual discovery
        await vscode.commands.executeCommand('qagenai.liveSmartDiscovery');
        break;
      case 'skipWelcome':
        await this.context.globalState.update('qagenai.skipWelcome', true);
        this.discoveryState.phase = 'scanning';
        this.render();
        break;
    }
  }

  private getHtmlContent(): string {
    const { phase } = this.discoveryState;

    switch (phase) {
      case 'welcome':
        return this.renderWelcomeScreen();
      case 'scanning':
        return this.renderScanningScreen();
      case 'analyzing':
        return this.renderAnalyzingScreen();
      case 'complete':
        return this.renderCompleteScreen();
      default:
        return this.renderIdleScreen();
    }
  }

  private renderWelcomeScreen(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to QAgent</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="welcome-container">
    <div class="welcome-icon">🚀</div>
    <h1>Welcome to QAgent!</h1>
    <p class="welcome-subtitle">Let's discover your application's user journeys</p>
    
    <div class="info-grid">
      <div class="info-card">
        <div class="info-icon">🔍</div>
        <h3>Smart Analysis</h3>
        <p>We'll scan your codebase to find components, routes, and user flows</p>
      </div>
      <div class="info-card">
        <div class="info-icon">🎯</div>
        <h3>AI-Powered</h3>
        <p>Critical journeys are automatically detected and prioritized</p>
      </div>
      <div class="info-card">
        <div class="info-icon">⚡</div>
        <h3>Fast Discovery</h3>
        <p>Takes ~2-5 seconds for most projects</p>
      </div>
    </div>

    <div class="what-we-find">
      <h3>What We're Looking For:</h3>
      <div class="find-list">
        <div class="find-item">📦 <span>React/Vue/Angular components</span></div>
        <div class="find-item">🛣️ <span>Application routes</span></div>
        <div class="find-item">🌐 <span>API endpoints</span></div>
        <div class="find-item">📝 <span>Form submissions</span></div>
        <div class="find-item">🔐 <span>Authentication flows</span></div>
      </div>
    </div>

    <button class="action-btn primary" onclick="send('startDiscovery')">
      🚀 Start Discovery
    </button>
    <button class="action-btn secondary" onclick="send('skipWelcome')">
      Don't show this again
    </button>
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

  private renderScanningScreen(): string {
    const { components, routes, apis, forms, framework, elapsed } = this.discoveryState;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discovering...</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="progress-container">
    <div class="progress-header">
      <div class="pulse-icon">🔍</div>
      <h2>Analyzing Your Project...</h2>
      <div class="elapsed">${elapsed}ms elapsed</div>
    </div>

    ${framework ? `
      <div class="framework-detected">
        <div class="framework-badge">${this.getFrameworkIcon(framework)} ${framework}</div>
        <div class="framework-label">Framework Detected</div>
      </div>
    ` : ''}

    <div class="counters-grid">
      <div class="counter-card ${components > 0 ? 'active' : ''}">
        <div class="counter-value">${components}</div>
        <div class="counter-label">Components</div>
        <div class="counter-bar">
          <div class="counter-bar-fill" style="width: ${Math.min(100, components * 2)}%"></div>
        </div>
      </div>

      <div class="counter-card ${routes > 0 ? 'active' : ''}">
        <div class="counter-value">${routes}</div>
        <div class="counter-label">Routes</div>
        <div class="counter-bar">
          <div class="counter-bar-fill" style="width: ${Math.min(100, routes * 8)}%"></div>
        </div>
      </div>

      <div class="counter-card ${apis > 0 ? 'active' : ''}">
        <div class="counter-value">${apis}</div>
        <div class="counter-label">API Endpoints</div>
        <div class="counter-bar">
          <div class="counter-bar-fill" style="width: ${Math.min(100, apis * 4)}%"></div>
        </div>
      </div>

      <div class="counter-card ${forms > 0 ? 'active' : ''}">
        <div class="counter-value">${forms}</div>
        <div class="counter-label">Forms</div>
        <div class="counter-bar">
          <div class="counter-bar-fill" style="width: ${Math.min(100, forms * 12)}%"></div>
        </div>
      </div>
    </div>

    <div class="scanning-status">
      <div class="status-item">🔍 Scanning workspace...</div>
      <div class="status-item">📊 Analyzing patterns...</div>
      <div class="status-item">🎯 Identifying journeys...</div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>`;
  }

  private renderAnalyzingScreen(): string {
    const { journeys, confidence } = this.discoveryState;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analyzing...</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="progress-container">
    <div class="progress-header">
      <div class="pulse-icon">🧠</div>
      <h2>AI Analysis in Progress...</h2>
    </div>

    <div class="analyzing-content">
      <div class="journey-preview">
        <div class="journey-count">${journeys}</div>
        <div class="journey-label">Journeys Discovered</div>
      </div>

      <div class="confidence-meter">
        <div class="confidence-label">Average Confidence</div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${confidence}%">
            <span>${confidence}%</span>
          </div>
        </div>
      </div>

      <div class="analyzing-steps">
        <div class="step active">✅ Component detection</div>
        <div class="step active">✅ Route mapping</div>
        <div class="step active">✅ API integration</div>
        <div class="step">⏳ Journey synthesis...</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private renderCompleteScreen(): string {
    const { components, routes, apis, journeys, elapsed, framework } = this.discoveryState;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete!</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="complete-container">
    <div class="complete-icon">✨</div>
    <h1>Discovery Complete!</h1>
    
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${journeys}</div>
        <div class="summary-label">Journeys Found</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${components}</div>
        <div class="summary-label">Components</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${routes}</div>
        <div class="summary-label">Routes</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${Math.round(elapsed / 1000)}s</div>
        <div class="summary-label">Analysis Time</div>
      </div>
    </div>

    ${framework ? `
      <div class="framework-summary">
        ${this.getFrameworkIcon(framework)} Detected ${framework} project
      </div>
    ` : ''}

    <div class="complete-message">
      Opening results screen...
    </div>
  </div>
</body>
</html>`;
  }

  private renderIdleScreen(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discovery</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="idle-container">
    <div class="idle-icon">🔍</div>
    <h2>Ready to Discover</h2>
    <p>Click "Live Smart Discovery" to start</p>
  </div>
</body>
</html>`;
  }

  private getFrameworkIcon(framework: string): string {
    const icons: Record<string, string> = {
      'React': '⚛️',
      'Vue': '🖖',
      'Angular': '🅰️',
      'Next.js': '▲',
      'Nuxt': '💚',
      'Svelte': '🔥'
    };
    return icons[framework] || '📦';
  }

  private getStyles(): string {
    return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      padding: 24px;
      font-size: 13px;
      overflow-y: auto;
    }

    /* Welcome Screen */
    .welcome-container {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
    }
    .welcome-icon {
      font-size: 64px;
      margin-bottom: 16px;
      animation: bounce 2s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .welcome-subtitle {
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 32px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .info-card {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .info-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    .info-card h3 {
      font-size: 14px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .info-card p {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
    }
    .what-we-find {
      background: var(--vscode-input-background);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
      text-align: left;
    }
    .what-we-find h3 {
      font-size: 14px;
      margin-bottom: 16px;
      font-weight: 600;
    }
    .find-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .find-item {
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .action-btn {
      width: 100%;
      padding: 14px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 12px;
      transition: all 0.15s;
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
      background: transparent;
      color: var(--vscode-textLink-foreground);
      border: 1px solid var(--vscode-panel-border);
    }

    /* Progress Screen */
    .progress-container {
      max-width: 600px;
      margin: 0 auto;
    }
    .progress-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .pulse-icon {
      font-size: 48px;
      margin-bottom: 16px;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .elapsed {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      font-family: monospace;
    }
    .framework-detected {
      text-align: center;
      margin-bottom: 24px;
      padding: 16px;
      background: var(--vscode-input-background);
      border-radius: 8px;
      border: 2px solid var(--vscode-focusBorder);
    }
    .framework-badge {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .framework-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .counters-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .counter-card {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      transition: all 0.3s;
      opacity: 0.4;
    }
    .counter-card.active {
      opacity: 1;
      border-color: var(--vscode-focusBorder);
      transform: scale(1.02);
    }
    .counter-value {
      font-size: 36px;
      font-weight: 700;
      color: var(--vscode-textLink-foreground);
      margin-bottom: 4px;
    }
    .counter-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
    .counter-bar {
      height: 4px;
      background: var(--vscode-editor-background);
      border-radius: 2px;
      overflow: hidden;
    }
    .counter-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--vscode-button-background), var(--vscode-textLink-foreground));
      transition: width 0.3s ease;
    }
    .scanning-status {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: var(--vscode-input-background);
      border-radius: 8px;
    }
    .status-item {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      animation: fadeIn 0.5s;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    /* Complete Screen */
    .complete-container {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
    }
    .complete-icon {
      font-size: 64px;
      margin-bottom: 16px;
      animation: zoomIn 0.5s;
    }
    @keyframes zoomIn {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 32px 0;
    }
    .summary-card {
      background: var(--vscode-input-background);
      border-radius: 8px;
      padding: 16px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--vscode-textLink-foreground);
      margin-bottom: 4px;
    }
    .summary-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .framework-summary {
      font-size: 14px;
      padding: 12px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .complete-message {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }

    /* Idle Screen */
    .idle-container {
      text-align: center;
      padding: 60px 20px;
    }
    .idle-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    .idle-container h2 {
      margin-bottom: 8px;
    }
    .idle-container p {
      color: var(--vscode-descriptionForeground);
    }
    `;
  }
}

interface DiscoveryState {
  phase: 'idle' | 'welcome' | 'scanning' | 'analyzing' | 'complete';
  components: number;
  routes: number;
  apis: number;
  forms: number;
  journeys: number;
  framework: string | null;
  confidence: number;
  elapsed: number;
}
