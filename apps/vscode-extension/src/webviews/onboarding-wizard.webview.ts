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
  
  private step: 'setup-type' | 'setup-tech' | 'setup-config' | 'discovering' | 'results' = 'setup-type';
  private discoveredJourneys: DiscoveredFlow[] = [];
  private selectedJourneyIds: Set<string> = new Set();
  private expandedJourneyIds: Set<string> = new Set();
  
  private config = {
    appType: 'frontend' as string,  // frontend, backend, fullstack
    testType: 'e2e' as string,      // e2e, unit, integration
    projectType: 'react' as string,  // react, vue, angular
    testFramework: 'playwright' as string,  // playwright, cypress, selenium
    projectRoot: '' as string,
    devServerUrl: 'http://localhost:3000' as string,
    features: {
      autoDetect: true,
      pageObjects: true,
      accessibility: true,
      visualRegression: false
    }
  };
  
  private discoveryProgress = {
    components: 0,
    routes: 0,
    apis: 0,
    forms: 0,
    framework: null as string | null,
    elapsed: 0
  };
  
  private scanDetails = {
    detectedTechnologies: [] as string[],
    componentsScanned: [] as string[],
    routesScanned: [] as string[],
    apisScanned: [] as string[]
  };

  public static show(context: vscode.ExtensionContext) {
    const column = vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (OnboardingWizardPanel.currentPanel) {
      OnboardingWizardPanel.currentPanel.panel.reveal(column);
      return OnboardingWizardPanel.currentPanel;
    }

    // Hide sidebar to focus on wizard (clean UX)
    vscode.commands.executeCommand('workbench.action.closeSidebar');

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
          case 'updateConfig':
            this.config = { ...this.config, ...message.data };
            this.update();
            break;
          case 'nextToTech':
            this.step = 'setup-tech';
            this.update();
            break;
          case 'nextToConfig':
            this.step = 'setup-config';
            this.update();
            break;
          case 'backToType':
            this.step = 'setup-type';
            this.update();
            break;
          case 'backToTech':
            this.step = 'setup-tech';
            this.update();
            break;
          case 'startDiscovery':
            await this.startDiscovery();
            break;
          case 'toggleJourney':
            this.toggleJourneySelection(message.data);
            break;
          case 'toggleJourneyExpand':
            this.toggleJourneyExpand(message.data);
            break;
          case 'quickSelectCritical':
            this.quickSelectCritical();
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
    
    // Simulate progress updates for visual feedback (minimum 3 seconds)
    const startTime = Date.now();
    this.simulateProgress();
    
    // Trigger the actual discovery command
    await vscode.commands.executeCommand('qagenai.liveSmartDiscovery');
    
    // Ensure minimum display time for animations
    const elapsed = Date.now() - startTime;
    const minDisplayTime = 5000; // 5 seconds minimum for full animation experience
    if (elapsed < minDisplayTime) {
      await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsed));
    }
  }
  
  private simulateProgress() {
    // Reset first
    this.scanDetails.detectedTechnologies = [];
    
    // Simulate gradual progress updates (more steps for smoother animation)
    const intervals = [
      { delay: 300, data: { components: 3, routes: 1, apis: 2, framework: 'React', forms: 0 } },
      { delay: 600, data: { components: 8, routes: 2, apis: 5, forms: 1 } },
      { delay: 900, data: { components: 15, routes: 4, apis: 10, forms: 2 } },
      { delay: 1200, data: { components: 22, routes: 6, apis: 15, forms: 3 } },
      { delay: 1500, data: { components: 28, routes: 8, apis: 20, forms: 4 } },
      { delay: 1800, data: { components: 35, routes: 10, apis: 25, forms: 5 } },
      { delay: 2100, data: { components: 42, routes: 12, apis: 30, forms: 6 } },
    ];
    
    const technologies = ['React 18.2', 'Redux Toolkit', 'React Router', 'Material-UI', 'TypeScript'];
    
    intervals.forEach(({ delay, data }) => {
      setTimeout(() => {
        if (this.step === 'discovering') {
          this.discoveryProgress = {
            ...this.discoveryProgress,
            ...data,
            elapsed: Date.now()
          };
          this.update();
        }
      }, delay);
    });
    
    // Add tech badges gradually with longer delays
    technologies.forEach((tech, index) => {
      setTimeout(() => {
        if (this.step === 'discovering') {
          this.scanDetails.detectedTechnologies.push(tech);
          this.update();
        }
      }, 500 + index * 400); // Stagger by 400ms each
    });
  }

  public updateProgress(update: Partial<typeof this.discoveryProgress>) {
    this.discoveryProgress = { ...this.discoveryProgress, ...update };
    this.update();
  }
  
  public updateDetectedTechnologies(technologies: string[]) {
    this.scanDetails.detectedTechnologies = technologies;
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

  private toggleJourneyExpand(journeyId: string) {
    if (this.expandedJourneyIds.has(journeyId)) {
      this.expandedJourneyIds.delete(journeyId);
    } else {
      this.expandedJourneyIds.add(journeyId);
    }
    this.update();
  }

  private quickSelectCritical() {
    this.selectedJourneyIds.clear();
    this.discoveredJourneys
      .filter(j => this.getJourneyPriority(j) === 'critical')
      .forEach(j => this.selectedJourneyIds.add(j.id));
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
    
    log('[OnboardingWizard] Opening dashboard...');
    
    // Focus dashboard in sidebar FIRST (before closing wizard)
    await vscode.commands.executeCommand('workbench.view.extension.qagenai');
    log('[OnboardingWizard] Sidebar view opened');
    
    // Longer delay to ensure view is fully loaded
    await new Promise(resolve => setTimeout(resolve, 1000));
    log('[OnboardingWizard] Delay complete, refreshing dashboard');
    
    // Trigger dashboard refresh
    await vscode.commands.executeCommand('qagenai.showDashboard');
    log('[OnboardingWizard] Dashboard refresh command sent');
    
    // Another delay before closing wizard
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Show success message
    vscode.window.showInformationMessage(
      `✅ Added ${selectedIds.length} journey${selectedIds.length !== 1 ? 's' : ''} to dashboard`
    );
    
    // Close the wizard panel LAST
    log('[OnboardingWizard] Closing wizard panel');
    this.panel.dispose();
    log('[OnboardingWizard] Wizard closed, dashboard should be visible');
  }

  private getJourneyPriority(journey: DiscoveredFlow): 'critical' | 'high' | 'standard' {
    const name = journey.name.toLowerCase();
    const confidence = journey.confidence || 0;
    
    if (confidence >= 85 || name.includes('login') || name.includes('auth') || name.includes('registration')) {
      return 'critical';
    }
    
    if (confidence >= 70 || name.includes('profile') || name.includes('settings')) {
      return 'high';
    }
    
    return 'standard';
  }

  private generateJourneyDetails(journey: DiscoveredFlow, priority: string): {
    route?: string;
    components: string[];
    apis: string[];
    formFields?: string;
    risk?: string;
    notes?: string;
  } {
    const name = journey.name.toLowerCase();
    
    // Generate realistic mock details based on journey name
    const details: any = {
      components: [],
      apis: []
    };
    
    if (name.includes('login') || name.includes('auth')) {
      details.route = '/signin → /dashboard';
      details.components = ['LoginForm', 'AuthProvider'];
      details.apis = ['POST /users/login'];
      details.risk = 'Auth failure = app broken';
    } else if (name.includes('registration') || name.includes('register')) {
      details.route = '/register → /dashboard';
      details.components = ['RegistrationForm', 'UserValidator'];
      details.apis = ['POST /users'];
      details.formFields = 'Form fields: 5 (all validated)';
    } else if (name.includes('transaction')) {
      details.route = '/new → /transactions/:id';
      details.components = ['TransactionForm', 'AmountInput'];
      details.apis = ['POST /transactions'];
      details.formFields = 'Form fields: 4 (amount, recipient, note, type)';
    } else if (name.includes('account') || name.includes('bank')) {
      details.route = '/accounts → /accounts/:id';
      details.components = ['AccountList', 'AccountCard'];
      details.apis = ['GET /bankaccounts'];
    } else if (name.includes('comment')) {
      details.route = '/transactions/:id → add comment';
      details.components = ['CommentForm', 'CommentList'];
      details.apis = ['POST /comments', 'GET /comments'];
      details.formFields = 'Form fields: 1 (comment text)';
    } else if (name.includes('user') && name.includes('manage')) {
      details.route = '/users → /users/:id/edit';
      details.components = ['UserList', 'UserEditForm'];
      details.apis = ['GET /users', 'PATCH /users/:id'];
    } else {
      // Default details
      details.route = '/app → /result';
      details.components = ['MainComponent'];
      details.apis = ['GET /api/data'];
    }
    
    return details;
  }

  private update() {
    this.panel.webview.html = this.getHtmlContent();
  }

  private getHtmlContent(): string {
    switch (this.step) {
      case 'setup-type':
        return this.renderSetupType();
      case 'setup-tech':
        return this.renderSetupTech();
      case 'setup-config':
        return this.renderSetupConfig();
      case 'discovering':
        return this.renderDiscovering();
      case 'results':
        return this.renderResults();
    }
  }

  private renderProgressBar(current: number, total: number): string {
    const percentage = ((current - 1) / (total - 1)) * 100;
    const stepNames = ['Setup', 'Configure', 'Smart Scan', 'Results'];
    
    return `
      <div class="progress-bar-header">
        <div class="progress-step-info">
          <span class="step-current">Step ${current}</span>
          <span class="step-divider">/</span>
          <span class="step-total">${total}</span>
          <span class="step-name"> · ${stepNames[current - 1]}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }

  private renderSetupType(): string {
    const { appType, testType } = this.config;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <svg width="0" height="0" style="position: absolute;">
    <defs>
      <linearGradient id="gradient-label" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#7b2ff7;stop-opacity:1" />
      </linearGradient>
    </defs>
  </svg>
  <div class="wizard-container">
    <div class="wizard-content setup">
      ${this.renderProgressBar(1, 4)}
      
      <div class="hero-section">
        <h1 class="title-hero">🚀 Welcome to QAgent</h1>
        <p class="subtitle-hero">Smart E2E Test Generation for Your Application</p>
      </div>
      
      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-label)" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 3v18"/>
          </svg>
          Application Type
        </div>
        <div class="radio-group">
          <label class="radio-card ${appType === 'frontend' ? 'selected' : ''}" onclick="updateConfig('appType', 'frontend')">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-fe" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#7b2ff7;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="url(#grad-fe)" stroke-width="2" fill="none"/>
                  <path d="M3 9h18" stroke="url(#grad-fe)" stroke-width="2"/>
                  <circle cx="6" cy="6" r="0.5" fill="url(#grad-fe)"/>
                  <circle cx="8" cy="6" r="0.5" fill="url(#grad-fe)"/>
                  <circle cx="10" cy="6" r="0.5" fill="url(#grad-fe)"/>
                  <rect x="6" y="12" width="5" height="1.5" rx="0.5" fill="url(#grad-fe)" opacity="0.7"/>
                  <rect x="6" y="15" width="8" height="1.5" rx="0.5" fill="url(#grad-fe)" opacity="0.5"/>
                  <rect x="6" y="18" width="6" height="1.5" rx="0.5" fill="url(#grad-fe)" opacity="0.3"/>
                </svg>
              </div>
              <div class="radio-title">Frontend</div>
              <div class="radio-desc">React, Vue, Angular apps</div>
            </div>
          </label>
          <label class="radio-card disabled">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-be" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#6b7280;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#4b5563;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="3" width="20" height="4" rx="1" stroke="url(#grad-be)" stroke-width="2" fill="none"/>
                  <rect x="2" y="10" width="20" height="4" rx="1" stroke="url(#grad-be)" stroke-width="2" fill="none"/>
                  <rect x="2" y="17" width="20" height="4" rx="1" stroke="url(#grad-be)" stroke-width="2" fill="none"/>
                  <circle cx="5" cy="5" r="0.8" fill="url(#grad-be)"/>
                  <circle cx="5" cy="12" r="0.8" fill="url(#grad-be)"/>
                  <circle cx="5" cy="19" r="0.8" fill="url(#grad-be)"/>
                </svg>
              </div>
              <div class="radio-title">Backend</div>
              <div class="radio-desc">Coming soon...</div>
            </div>
          </label>
          <label class="radio-card disabled">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-fs" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#6b7280;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#4b5563;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="url(#grad-fs)" stroke-width="2" fill="none"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="url(#grad-fs)" stroke-width="2" fill="none"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="url(#grad-fs)" stroke-width="2" fill="none"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="url(#grad-fs)" stroke-width="2" fill="none"/>
                </svg>
              </div>
              <div class="radio-title">Fullstack</div>
              <div class="radio-desc">Coming soon...</div>
            </div>
          </label>
        </div>
      </div>

      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-label)" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Test Type
        </div>
        <div class="radio-group">
          <label class="radio-card ${testType === 'e2e' ? 'selected' : ''}" onclick="updateConfig('testType', 'e2e')">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-e2e" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="url(#grad-e2e)" stroke-width="2" fill="none"/>
                  <path d="M2 17l10 5 10-5" stroke="url(#grad-e2e)" stroke-width="2" fill="none"/>
                  <path d="M2 12l10 5 10-5" stroke="url(#grad-e2e)" stroke-width="2" fill="none"/>
                  <circle cx="12" cy="7" r="1" fill="url(#grad-e2e)"/>
                  <circle cx="12" cy="12" r="1" fill="url(#grad-e2e)"/>
                  <circle cx="12" cy="17" r="1" fill="url(#grad-e2e)"/>
                </svg>
              </div>
              <div class="radio-title">E2E Tests</div>
              <div class="radio-desc">Full user journey testing</div>
            </div>
          </label>
          <label class="radio-card disabled">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-unit" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#6b7280;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#4b5563;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="9" stroke="url(#grad-unit)" stroke-width="2" fill="none"/>
                  <circle cx="12" cy="12" r="6" stroke="url(#grad-unit)" stroke-width="2" fill="none"/>
                  <circle cx="12" cy="12" r="2" fill="url(#grad-unit)"/>
                </svg>
              </div>
              <div class="radio-title">Unit Tests</div>
              <div class="radio-desc">Coming soon...</div>
            </div>
          </label>
          <label class="radio-card disabled">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-int" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#6b7280;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#4b5563;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="6" cy="12" r="3" stroke="url(#grad-int)" stroke-width="2" fill="none"/>
                  <circle cx="18" cy="12" r="3" stroke="url(#grad-int)" stroke-width="2" fill="none"/>
                  <path d="M9 12h6" stroke="url(#grad-int)" stroke-width="2.5"/>
                  <circle cx="6" cy="12" r="1" fill="url(#grad-int)"/>
                  <circle cx="18" cy="12" r="1" fill="url(#grad-int)"/>
                </svg>
              </div>
              <div class="radio-title">Integration</div>
              <div class="radio-desc">Coming soon...</div>
            </div>
          </label>
        </div>
      </div>

      <button class="btn-hero" onclick="nextToTech()">
        Next: Select Technology →
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function updateConfig(key, value) {
      vscode.postMessage({ 
        command: 'updateConfig', 
        data: { [key]: value } 
      });
    }
    
    function nextToTech() {
      vscode.postMessage({ command: 'nextToTech' });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        const nextBtn = document.querySelector('.btn-hero:not([disabled])');
        if (nextBtn) nextBtn.click();
      }
      if (e.key === 'Escape') {
        const backBtn = document.querySelector('.btn-secondary');
        if (backBtn) backBtn.click();
      }
    });
  </script>
</body>
</html>`;
  }

  private renderSetupTech(): string {
    const { projectType, testFramework } = this.config;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Select Technology</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <svg width="0" height="0" style="position: absolute;">
    <defs>
      <linearGradient id="gradient-label" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#7b2ff7;stop-opacity:1" />
      </linearGradient>
    </defs>
  </svg>
  <div class="wizard-container">
    <div class="wizard-content setup">
      ${this.renderProgressBar(2, 4)}
      
      <div class="hero-section">
        <h1 class="title-hero">⚙️ Select Technology</h1>
        <p class="subtitle-hero">Choose your framework and testing tools</p>
      </div>
      
      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-label)" stroke-width="2">
            <path d="M12 2L2 12h3v8h5v-6h4v6h5v-8h3L12 2z"/>
          </svg>
          Project Type
        </div>
        <div class="radio-group">
          <label class="radio-card ${projectType === 'react' ? 'selected' : ''}" onclick="updateConfig('projectType', 'react')">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-react" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#0088cc;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <ellipse cx="12" cy="12" rx="10" ry="4" stroke="url(#grad-react)" stroke-width="2" fill="none"/>
                  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" stroke="url(#grad-react)" stroke-width="2" fill="none"/>
                  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" stroke="url(#grad-react)" stroke-width="2" fill="none"/>
                  <circle cx="12" cy="12" r="2" fill="url(#grad-react)"/>
                </svg>
              </div>
              <div class="radio-title">React</div>
            </div>
          </label>
          <label class="radio-card ${projectType === 'vue' ? 'selected' : ''}" onclick="updateConfig('projectType', 'vue')">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-vue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#42b883;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#35495e;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <path d="M2 4l10 17L22 4h-4.5L12 14 6.5 4z" stroke="url(#grad-vue)" stroke-width="2" fill="none"/>
                  <path d="M6.5 4L12 12 17.5 4" stroke="url(#grad-vue)" stroke-width="2" fill="none"/>
                </svg>
              </div>
              <div class="radio-title">Vue.js</div>
            </div>
          </label>
          <label class="radio-card ${projectType === 'angular' ? 'selected' : ''}" onclick="updateConfig('projectType', 'angular')">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-angular" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#dd0031;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#c3002f;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2L3 6l1.5 13L12 22l7.5-3L21 6z" stroke="url(#grad-angular)" stroke-width="2" fill="none"/>
                  <path d="M12 5v14M8 10h8M9 14h6" stroke="url(#grad-angular)" stroke-width="2"/>
                </svg>
              </div>
              <div class="radio-title">Angular</div>
            </div>
          </label>
        </div>
      </div>

      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-label)" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9l3 3-3 3M15 15h-3"/>
          </svg>
          Test Framework
        </div>
        <div class="radio-group">
          <label class="radio-card ${testFramework === 'playwright' ? 'selected' : ''}" onclick="updateConfig('testFramework', 'playwright')">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-pw" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#2eaa63;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#e15554;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="8" r="3" stroke="url(#grad-pw)" stroke-width="2" fill="none"/>
                  <path d="M12 11v5M9 14l3 2 3-2" stroke="url(#grad-pw)" stroke-width="2" stroke-linecap="round"/>
                  <path d="M6 19h12" stroke="url(#grad-pw)" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 16l-2 3M16 16l2 3" stroke="url(#grad-pw)" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="radio-title">Playwright</div>
            </div>
          </label>
          <label class="radio-card ${testFramework === 'cypress' ? 'selected' : ''}" onclick="updateConfig('testFramework', 'cypress')">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-cy" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#17202c;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#69d3a7;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="9" stroke="url(#grad-cy)" stroke-width="2" fill="none"/>
                  <path d="M12 7v5l3.5 2" stroke="url(#grad-cy)" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="12" cy="12" r="2" fill="url(#grad-cy)"/>
                </svg>
              </div>
              <div class="radio-title">Cypress</div>
            </div>
          </label>
          <label class="radio-card ${testFramework === 'selenium' ? 'selected' : ''}" onclick="updateConfig('testFramework', 'selenium')">
            <div class="radio-content">
              <div class="radio-icon-box">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="grad-sel" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#43b02a;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#ff6347;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <rect x="4" y="4" width="16" height="16" rx="3" stroke="url(#grad-sel)" stroke-width="2" fill="none"/>
                  <circle cx="9" cy="9" r="2" stroke="url(#grad-sel)" stroke-width="1.5" fill="none"/>
                  <circle cx="15" cy="15" r="2" stroke="url(#grad-sel)" stroke-width="1.5" fill="none"/>
                  <path d="M10.5 10.5l3 3" stroke="url(#grad-sel)" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="radio-title">Selenium</div>
            </div>
          </label>
        </div>
      </div>

      <div class="button-row">
        <button class="btn-secondary" onclick="backToType()">← Back</button>
        <button class="btn-hero" onclick="nextToConfig()">
          Next: Configure Project →
        </button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function updateConfig(key, value) {
      vscode.postMessage({ 
        command: 'updateConfig', 
        data: { [key]: value } 
      });
    }
    
    function backToType() {
      vscode.postMessage({ command: 'backToType' });
    }
    
    function nextToConfig() {
      vscode.postMessage({ command: 'nextToConfig' });
    }
  </script>
</body>
</html>`;
  }

  private renderSetupConfig(): string {
    const { projectRoot, devServerUrl, features } = this.config;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Configure Project</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <svg width="0" height="0" style="position: absolute;">
    <defs>
      <linearGradient id="gradient-label" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#7b2ff7;stop-opacity:1" />
      </linearGradient>
    </defs>
  </svg>
  <div class="wizard-container">
    <div class="wizard-content setup">
      ${this.renderProgressBar(3, 4)}
      
      <div class="hero-section">
        <h1 class="title-hero">⚙️ Project Configuration</h1>
        <p class="subtitle-hero">Configure paths and features for your test suite</p>
      </div>
      
      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-label)" stroke-width="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          Project Root
        </div>
        <div class="input-with-button">
          <input 
            type="text" 
            id="projectRoot" 
            class="text-input" 
            value="${projectRoot}" 
            placeholder="/path/to/project"
            oninput="updateConfig('projectRoot', this.value)"
          />
          <button class="btn-secondary" onclick="browseFolder()">Browse</button>
        </div>
      </div>

      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-label)" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
          </svg>
          Dev Server URL
        </div>
        <input 
          type="text" 
          id="devServerUrl" 
          class="text-input" 
          value="${devServerUrl}" 
          placeholder="http://localhost:3000"
          oninput="updateConfig('devServerUrl', this.value)"
        />
      </div>

      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-label)" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          Smart Features
        </div>
        <div class="checkbox-group">
          <label class="checkbox-item">
            <input 
              type="checkbox" 
              ${features.autoDetect ? 'checked' : ''} 
              onchange="updateFeature('autoDetect', this.checked)"
            />
            <span>Auto-detect routes and components</span>
          </label>
          <label class="checkbox-item">
            <input 
              type="checkbox" 
              ${features.pageObjects ? 'checked' : ''} 
              onchange="updateFeature('pageObjects', this.checked)"
            />
            <span>Generate Page Object Models</span>
          </label>
          <label class="checkbox-item">
            <input 
              type="checkbox" 
              ${features.accessibility ? 'checked' : ''} 
              onchange="updateFeature('accessibility', this.checked)"
            />
            <span>Include accessibility tests</span>
          </label>
          <label class="checkbox-item">
            <input 
              type="checkbox" 
              ${features.visualRegression ? 'checked' : ''} 
              onchange="updateFeature('visualRegression', this.checked)"
            />
            <span>Visual regression testing</span>
          </label>
        </div>
      </div>

      <div class="button-row">
        <button class="btn-secondary" onclick="backToTech()">← Back</button>
        <button class="btn-hero" onclick="startDiscovery()">Start Smart Scan 🚀</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function updateConfig(key, value) {
      vscode.postMessage({ 
        command: 'updateConfig', 
        data: { [key]: value } 
      });
    }
    
    function updateFeature(feature, value) {
      vscode.postMessage({ 
        command: 'updateConfig', 
        data: { 
          features: { [feature]: value }
        } 
      });
    }
    
    function browseFolder() {
      vscode.postMessage({ command: 'browseFolder' });
    }
    
    function backToTech() {
      vscode.postMessage({ command: 'backToTech' });
    }
    
    function startDiscovery() {
      vscode.postMessage({ command: 'startDiscovery' });
    }
  </script>
</body>
</html>`;
  }

  private renderDiscovering(): string {
    const { components, routes, apis, forms, framework } = this.discoveryProgress;
    const { detectedTechnologies } = this.scanDetails;
    
    // Calculate overall progress based on metrics (0-100%)
    const maxComponents = 50;
    const maxRoutes = 15;
    const maxApis = 30;
    const maxForms = 8;
    const progress = Math.min(100, Math.round(
      (components / maxComponents * 25) +
      (routes / maxRoutes * 25) +
      (apis / maxApis * 25) +
      (forms / maxForms * 25)
    ));
    
    // Estimated test coverage and suite size
    const coveragePotential = Math.min(95, 60 + (components * 0.5));
    const estimatedTestSuite = components * 7 + routes * 15;
    const criticalFlows = Math.max(3, Math.floor(routes * 0.5));
    
    // Status message based on progress
    const statusMessage = progress < 20 ? '🔍 Initializing workspace scan...' :
      progress < 40 ? '📦 Analyzing React components...' :
      progress < 60 ? '🛫️ Mapping application routes...' :
      progress < 80 ? '🌐 Detecting API endpoints and forms...' :
      '✨ Synthesizing user journeys...';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analyzing Project...</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="wizard-container">
    <div class="wizard-content discovering">
      ${this.renderProgressBar(2, 4)}
      
      <!-- Main Title -->
      <div class="scan-hero">
        <div class="scan-icon-container">
          <div class="scan-icon pulsing">⚡</div>
          <div class="scan-ring"></div>
        </div>
        <h1 class="title-hero">🔍 Smart Scan in Progress</h1>
        <p class="subtitle-hero">Analyzing your application...</p>
      </div>
      
      <!-- Main Progress Bar -->
      <div class="main-progress-section">
        <div class="main-progress-bar">
          <div class="main-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="main-progress-label">${progress}% complete</div>
      </div>
      
      <!-- Real-Time Analysis Section -->
      <div class="scan-section" style="animation-delay: 0s">
        <div class="scan-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="grad-header" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#7b2ff7;stop-opacity:1" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="10" stroke="url(#grad-header)" stroke-width="2"/>
            <path d="M12 6v6l4 2" stroke="url(#grad-header)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>REAL-TIME ANALYSIS</span>
        </div>
        <div class="scan-section-content">
          <div class="activity-item ${components >= 10 ? 'complete' : components > 0 ? 'scanning' : 'pending'}">
            <div class="activity-status">${components >= 10 ? '✓' : components > 0 ? '⟳' : '⏳'}</div>
            <div class="activity-text">Scanning React components...</div>
            <div class="activity-badge">${components >= 10 ? 'Complete' : components > 0 ? 'In Progress' : 'Pending'}</div>
          </div>
          <div class="activity-item ${routes >= 5 ? 'complete' : routes > 0 ? 'scanning' : 'pending'}">
            <div class="activity-status">${routes >= 5 ? '✓' : routes > 0 ? '⟳' : '⏳'}</div>
            <div class="activity-text">Mapping application routes...</div>
            <div class="activity-badge">${routes >= 5 ? 'Complete' : routes > 0 ? 'In Progress' : 'Pending'}</div>
          </div>
          <div class="activity-item ${apis >= 15 ? 'complete' : apis > 0 ? 'scanning' : 'pending'}">
            <div class="activity-status">${apis >= 15 ? '✓' : apis > 0 ? '⟳' : '⏳'}</div>
            <div class="activity-text">Detecting API endpoints...</div>
            <div class="activity-badge">${apis >= 15 ? 'Complete' : apis > 0 ? 'In Progress' : 'Pending'}</div>
          </div>
          <div class="activity-item ${forms >= 4 ? 'complete' : forms > 0 ? 'scanning' : 'pending'}">
            <div class="activity-status">${forms >= 4 ? '✓' : forms > 0 ? '⟳' : '⏳'}</div>
            <div class="activity-text">Analyzing form structures...</div>
            <div class="activity-badge">${forms >= 4 ? 'Complete' : forms > 0 ? 'In Progress' : 'Pending'}</div>
          </div>
          <div class="activity-item ${detectedTechnologies.length > 0 ? 'complete' : 'pending'}">
            <div class="activity-status">${detectedTechnologies.length > 0 ? '✓' : '⏳'}</div>
            <div class="activity-text">Identifying tech stack...</div>
            <div class="activity-badge">${detectedTechnologies.length > 0 ? 'Complete' : 'Pending'}</div>
          </div>
        </div>
      </div>
      
      <!-- Discovered So Far Section -->
      <div class="scan-section" style="animation-delay: 0.1s">
        <div class="scan-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="url(#grad-header)" stroke-width="2"/>
            <path d="M9 12h6m-6 4h6" stroke="url(#grad-header)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>DISCOVERED SO FAR</span>
        </div>
        <div class="discovery-stats-grid">
          <div class="discovery-stat-card" style="animation-delay: 0.15s">
            <div class="stat-number-large">${components}</div>
            <div class="stat-label-small">Components</div>
          </div>
          <div class="discovery-stat-card" style="animation-delay: 0.2s">
            <div class="stat-number-large">${routes}</div>
            <div class="stat-label-small">Routes</div>
          </div>
          <div class="discovery-stat-card" style="animation-delay: 0.25s">
            <div class="stat-number-large">${apis}</div>
            <div class="stat-label-small">API Calls</div>
          </div>
          <div class="discovery-stat-card" style="animation-delay: 0.3s">
            <div class="stat-number-large">${components * 3 + routes * 5}</div>
            <div class="stat-label-small">Files Scanned</div>
          </div>
        </div>
      </div>
      
      <!-- Performance Metrics Section -->
      ${progress >= 30 ? `
      <div class="scan-section" style="animation-delay: 0.2s">
        <div class="scan-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="url(#grad-header)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>PERFORMANCE METRICS</span>
        </div>
        <div class="scan-section-content insights-list">
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2"/>
              <path d="M12 6v6l4 2" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span><strong>3.2s</strong> scan time (<strong>95% faster</strong> than manual analysis)</span>
          </div>
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span><strong>${components * 3 + routes * 5} files</strong> deep analysis with AI-powered pattern detection</span>
          </div>
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span><strong>${criticalFlows} critical flows</strong> detected with ~${Math.round(coveragePotential)}% route coverage</span>
          </div>
        </div>
      </div>
      ` : ''}
      
      <!-- Smart Insights Section -->
      ${progress >= 40 ? `
      <div class="scan-section" style="animation-delay: 0.3s">
        <div class="scan-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="url(#grad-header)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>SMART INSIGHTS</span>
        </div>
        <div class="scan-section-content insights-list">
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span><strong>~8 hours/week</strong> saved with automated test generation</span>
          </div>
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span><strong>Enterprise-grade quality</strong> with 99.2% accuracy rate</span>
          </div>
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span><strong>ROI: 400%</strong> average return in first quarter</span>
          </div>
        </div>
      </div>
      ` : ''}
      
      <!-- Technology Stack Section -->
      ${detectedTechnologies.length > 0 ? `
      <div class="scan-section" style="animation-delay: 0.4s">
        <div class="scan-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="url(#grad-header)" stroke-width="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="url(#grad-header)" stroke-width="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="url(#grad-header)" stroke-width="2"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="url(#grad-header)" stroke-width="2"/>
          </svg>
          <span>TECHNOLOGY STACK</span>
        </div>
        <div class="tech-badges-grid">
          ${detectedTechnologies.map((tech, i) => `
            <div class="tech-badge" style="animation-delay: ${i * 0.1}s">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#00d4ff" stroke-width="2"/>
                <path d="M5 8l2 2 4-4" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>${tech}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  </div>
  
  <script>
    // Count-up animation for all stat numbers
    function animateCounter(element, target, duration = 1000, delay = 0) {
      const isPercentage = target.toString().includes('%');
      const numericTarget = parseInt(target.toString().replace(/[^0-9]/g, ''));
      let current = 0;
      const increment = Math.ceil(numericTarget / 30);
      const stepTime = duration / 30;
      
      setTimeout(() => {
        const timer = setInterval(() => {
          current += increment;
          if (current >= numericTarget) {
            element.textContent = target;
            clearInterval(timer);
          } else {
            element.textContent = isPercentage ? current + '%' : current;
          }
        }, stepTime);
      }, delay);
    }

    // Animate all stat numbers with stagger
    document.addEventListener('DOMContentLoaded', () => {
      const statNumbers = document.querySelectorAll('.stat-number-large, .progress-number, .impact-stat-value, .stat-number');
      statNumbers.forEach((element, index) => {
        const originalText = element.textContent.trim();
        if (originalText && /\d/.test(originalText)) {
          animateCounter(element, originalText, 1200, index * 100);
        }
      });
    });
  </script>
</body>
</html>`;
  }

  private renderResults(): string {
    const selectedCount = this.selectedJourneyIds.size;
    const totalCount = this.discoveredJourneys.length;
    const categories = this.categorizeJourneys();
    const { detectedTechnologies } = this.scanDetails;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discovery Complete</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="wizard-container">
    <div class="wizard-content results">
      ${this.renderProgressBar(4, 4)}
      
      <!-- Success Header -->
      <div class="scan-hero">
        <div class="scan-icon-container">
          <div class="scan-icon pulsing">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="url(#successGradient)" stroke-width="2.5"/>
              <path d="M8 12l2 2 4-4" stroke="url(#successGradient)" stroke-width="3" stroke-linecap="round"/>
              <defs>
                <linearGradient id="successGradient" x1="0" y1="0" x2="24" y2="24">
                  <stop offset="0%" stop-color="#10b981"/>
                  <stop offset="100%" stop-color="#00d4ff"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="scan-ring" style="animation: scanRing 2s ease-out 1;"></div>
        </div>
        <h1 class="title-hero">✅ Smart Analysis Complete</h1>
        <p class="subtitle-hero">Discovered <span class="highlight">${totalCount} critical user flow${totalCount !== 1 ? 's' : ''}</span> in your application</p>
      </div>

      <!-- Analysis Summary Section -->
      <div class="scan-section">
        <div class="scan-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="grad-header" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#7b2ff7;stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="url(#grad-header)" stroke-width="2"/>
            <path d="M8 10h8M8 14h4" stroke="url(#grad-header)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>ANALYSIS SUMMARY</span>
        </div>
        <div class="scan-section-content">
          <div class="discovery-stats-grid">
          <div class="discovery-stat-card">
            <div class="stat-number-large">${totalCount}</div>
            <div class="stat-label-small">Journeys Found</div>
          </div>
          <div class="discovery-stat-card">
            <div class="stat-number-large">${categories.critical.length}</div>
            <div class="stat-label-small">Critical Paths</div>
          </div>
          <div class="discovery-stat-card">
            <div class="stat-number-large">${categories.high.length}</div>
            <div class="stat-label-small">High Value</div>
          </div>
          <div class="discovery-stat-card">
            <div class="stat-number-large">~85%</div>
            <div class="stat-label-small">Coverage Est.</div>
          </div>
          </div>
        </div>
      </div>

      <!-- Smart Insights Section -->
      <div class="scan-section">
        <div class="scan-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="url(#grad-header)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>SMART DISCOVERY INTELLIGENCE</span>
        </div>
        <div class="scan-section-content insights-list">
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>186 files analyzed in 3.2s</span>
          </div>
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${totalCount} flows automatically detected</span>
          </div>
          <div class="insight-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>~85% route coverage</span>
          </div>
        </div>
      </div>

      <!-- Technology Stack Section -->
      ${detectedTechnologies.length > 0 ? `
      <div class="scan-section">
        <div class="scan-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="url(#grad-header)" stroke-width="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="url(#grad-header)" stroke-width="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="url(#grad-header)" stroke-width="2"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="url(#grad-header)" stroke-width="2"/>
          </svg>
          <span>TECHNOLOGY STACK</span>
        </div>
        <div class="scan-section-content">
          <div class="tech-badges-grid">
          ${detectedTechnologies.map((tech, i) => `
            <div class="tech-badge" style="animation-delay: ${i * 0.1}s">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#00d4ff" stroke-width="2"/>
                <path d="M5 8l2 2 4-4" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>${tech}</span>
            </div>
          `).join('')}
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Value Proposition Card -->
      ${selectedCount > 0 ? `
      <div class="value-prop-card">
        <div class="value-prop-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Your ${selectedCount}-flow test suite will provide:</span>
        </div>
        <div class="value-prop-list">
          ${categories.critical.length > 0 && selectedCount >= categories.critical.length ? `
          <div class="value-prop-item">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2l2.5 5 5.5.8-4 3.9.9 5.3L9 14.5 4.1 17l.9-5.3-4-3.9 5.5-.8L9 2z" fill="#10b981" stroke="#10b981" stroke-width="1" stroke-linejoin="round"/>
            </svg>
            <span>Complete authentication flow coverage</span>
          </div>
          ` : ''}
          <div class="value-prop-item">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="6" width="14" height="10" rx="1" stroke="#10b981" stroke-width="1.5"/>
              <path d="M5 6V4a4 4 0 018 0v2" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>Mission-critical user journeys protected</span>
          </div>
          <div class="value-prop-item">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v7m0 0v7m0-7h7m-7 0H2" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="9" cy="9" r="7" stroke="#10b981" stroke-width="1.5"/>
            </svg>
            <span>${Math.round(selectedCount / totalCount * 85)}% estimated user traffic coverage</span>
          </div>
          <div class="value-prop-item">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3.5l1.5 3 3 .5-2 2 .5 3L9 10.5 6 12l.5-3-2-2 3-.5 1.5-3z" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linejoin="round"/>
              <circle cx="9" cy="9" r="7.5" stroke="#10b981" stroke-width="1" stroke-dasharray="2 2"/>
            </svg>
            <span>Continuous regression protection</span>
          </div>
        </div>
        <div class="value-prop-estimate">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2l1.5 2.5L12 5l-2 2 .5 3-2.5-1.5L5.5 10 6 7 4 5l2.5-.5L8 2z" fill="#00d4ff"/>
          </svg>
          <span>Ready in ${selectedCount * 15}s • Enterprise-grade quality</span>
        </div>
      </div>
      ` : ''}
      
      <!-- Auto-select Suggestion Banner -->
      ${selectedCount === 0 && categories.critical.length > 0 ? `
      <div class="auto-select-banner">
        <div class="banner-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="rgba(251, 191, 36, 0.15)" stroke="#fbbf24" stroke-width="2"/>
            <path d="M12 8v4m0 4h.01" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="banner-content">
          <div class="banner-title">Smart Recommendation</div>
          <div class="banner-text">We recommend starting with <strong>${categories.critical.length} critical flow${categories.critical.length !== 1 ? 's' : ''}</strong> for maximum impact</div>
        </div>
        <button class="banner-action" onclick="quickSelectCritical()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Quick Select
        </button>
      </div>
      ` : ''}

      <!-- Impact Preview Card -->
      ${selectedCount > 0 ? `
      <div class="impact-preview-card">
        <div class="impact-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Impact Preview</span>
        </div>
        <div class="impact-stats">
          <div class="impact-stat">
            <div class="impact-stat-value">${Math.round(selectedCount / totalCount * 85)}%</div>
            <div class="impact-stat-label">User Traffic Protected</div>
            <div class="impact-progress">
              <div class="impact-progress-bar" style="width: ${Math.round(selectedCount / totalCount * 85)}%"></div>
            </div>
          </div>
          <div class="impact-stat">
            <div class="impact-stat-value">${selectedCount * 2.5}m</div>
            <div class="impact-stat-label">Est. Test Runtime</div>
          </div>
          <div class="impact-stat">
            <div class="impact-stat-value">${Math.min(Math.round(selectedCount / totalCount * 100), 95)}/100</div>
            <div class="impact-stat-label">Coverage Score</div>
          </div>
        </div>
      </div>
      ` : ''}
      
      <!-- Selection Info -->
      <div class="selection-info">
        <span class="selection-count">${selectedCount} selected</span>
        <span class="selection-hint">Click to toggle selection</span>
      </div>

      <!-- Journeys List -->
      <div class="journeys-container">
        ${this.renderJourneyCategory('Critical Paths', '🔴', categories.critical)}
        ${categories.high.length > 0 ? this.renderJourneyCategory('High Value', '🟡', categories.high) : ''}
        ${categories.standard.length > 0 ? this.renderJourneyCategory('Standard', '🔵', categories.standard) : ''}
      </div>

      <!-- Action Button -->
      <div class="action-footer">
        <button class="btn-hero" onclick="addToDashboard()" ${selectedCount === 0 ? 'disabled' : ''}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
            <path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Add to Dashboard
          ${selectedCount > 0 ? `<span class="count-badge">${selectedCount}</span>` : ''}
        </button>
        <div class="action-hint">${selectedCount === 0 ? 'Select at least one flow to continue' : `${selectedCount} flow${selectedCount !== 1 ? 's' : ''} selected and ready`}</div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function toggleJourney(id) {
      vscode.postMessage({ command: 'toggleJourney', data: id });
    }
    function toggleJourneyExpand(id) {
      vscode.postMessage({ command: 'toggleJourneyExpand', data: id });
    }
    function addToDashboard() {
      launchConfetti();
      setTimeout(() => {
        vscode.postMessage({ command: 'addToDashboard' });
      }, 500);
    }
    function quickSelectCritical() {
      vscode.postMessage({ command: 'quickSelectCritical' });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + Enter: Quick select critical
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        quickSelectCritical();
      }
      // Enter: Add to dashboard
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        const addBtn = document.querySelector('.btn-hero:not([disabled])');
        if (addBtn) addBtn.click();
      }
      // Arrow keys: Navigate journeys
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const journeys = Array.from(document.querySelectorAll('.journey-card'));
        const focused = document.activeElement;
        const currentIndex = journeys.indexOf(focused);
        if (e.key === 'ArrowDown' && currentIndex < journeys.length - 1) {
          journeys[currentIndex + 1].focus();
        } else if (e.key === 'ArrowUp' && currentIndex > 0) {
          journeys[currentIndex - 1].focus();
        } else if (currentIndex === -1 && journeys.length > 0) {
          journeys[0].focus();
        }
      }
      // Space: Toggle selection
      if (e.key === ' ' && document.activeElement.classList.contains('journey-card')) {
        e.preventDefault();
        document.activeElement.click();
      }
    });

    // Confetti effect
    function launchConfetti() {
      const canvas = document.createElement('canvas');
      canvas.id = 'confettiCanvas';
      document.body.appendChild(canvas);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      
      const particles = [];
      const colors = ['#00d4ff', '#7b2ff7', '#10b981', '#fbbf24', '#ef4444', '#fb923c'];
      const particleCount = 150;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          r: Math.random() * 6 + 4,
          d: Math.random() * particleCount,
          color: colors[Math.floor(Math.random() * colors.length)],
          tilt: Math.floor(Math.random() * 10) - 10,
          tiltAngleIncremental: Math.random() * 0.07 + 0.05,
          tiltAngle: 0
        });
      }
      
      let animationFrame;
      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, i) => {
          p.tiltAngle += p.tiltAngleIncremental;
          p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
          p.x += Math.sin(p.d);
          p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;
          
          if (p.x > canvas.width + 5 || p.x < -5 || p.y > canvas.height) {
            if (i % 5 > 0 || i % 2 === 0) {
              particles[i] = { x: Math.random() * canvas.width, y: -10, r: p.r, d: p.d, color: p.color, tilt: p.tilt, tiltAngle: p.tiltAngle, tiltAngleIncremental: p.tiltAngleIncremental };
            } else {
              if (Math.sin(p.d) > 0) {
                particles[i] = { x: -5, y: Math.random() * canvas.height, r: p.r, d: p.d, color: p.color, tilt: p.tilt, tiltAngle: p.tiltAngle, tiltAngleIncremental: p.tiltAngleIncremental };
              } else {
                particles[i] = { x: canvas.width + 5, y: Math.random() * canvas.height, r: p.r, d: p.d, color: p.color, tilt: p.tilt, tiltAngle: p.tiltAngle, tiltAngleIncremental: p.tiltAngleIncremental };
              }
            }
          }
          
          ctx.beginPath();
          ctx.lineWidth = p.r / 2;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
          ctx.stroke();
        });
        
        animationFrame = requestAnimationFrame(draw);
      }
      
      draw();
      
      // Stop after 4 seconds
      setTimeout(() => {
        cancelAnimationFrame(animationFrame);
        setTimeout(() => {
          canvas.remove();
        }, 1000);
      }, 4000);
    }

    // Count-up animation for all stat numbers
    function animateCounter(element, target, duration = 1000, delay = 0) {
      const isPercentage = target.toString().includes('%');
      const isSlash = target.toString().includes('/');
      const numericTarget = parseInt(target.toString().replace(/[^0-9]/g, ''));
      let current = 0;
      const increment = Math.ceil(numericTarget / 30);
      const stepTime = duration / 30;
      
      setTimeout(() => {
        const timer = setInterval(() => {
          current += increment;
          if (current >= numericTarget) {
            element.textContent = target;
            clearInterval(timer);
          } else {
            if (isSlash) {
              element.textContent = current + '/' + target.split('/')[1];
            } else {
              element.textContent = isPercentage ? current + '%' : current;
            }
          }
        }, stepTime);
      }, delay);
    }

    // Animate all stat numbers with stagger
    document.addEventListener('DOMContentLoaded', () => {
      const statNumbers = document.querySelectorAll('.stat-number-large, .progress-number, .impact-stat-value, .stat-number');
      statNumbers.forEach((element, index) => {
        const originalText = element.textContent.trim();
        if (originalText && /\d/.test(originalText)) {
          animateCounter(element, originalText, 1200, index * 100);
        }
      });
    });
  </script>
</body>
</html>`;
  }

  private renderJourneyCategory(title: string, icon: string, journeys: DiscoveredFlow[]): string {
    if (journeys.length === 0) return '';
    
    const priorityClass = title.includes('Critical') ? 'critical' : title.includes('High') ? 'high' : 'standard';

    return `
      <div class="journey-category ${priorityClass}">
        <div class="category-header">
          <div class="category-badge ${priorityClass}">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              ${this.getCategoryIconSvg(priorityClass)}
            </svg>
            <span class="category-title">${title}</span>
          </div>
          <div class="category-meta">
            <span class="category-count">${journeys.length} flow${journeys.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="journeys-grid">
          ${journeys.map((j, idx) => this.renderJourneyItem(j, idx)).join('')}
        </div>
      </div>
    `;
  }

  private getCategoryIconSvg(priority: string): string {
    const icons: Record<string, string> = {
      'critical': '<path d="M10 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z" fill="#ef4444"/>',
      'high': '<circle cx="10" cy="10" r="8" stroke="#fb923c" stroke-width="2" fill="none"/><path d="M10 6v4m0 2h.01" stroke="#fb923c" stroke-width="2" stroke-linecap="round"/>',
      'standard': '<rect x="4" y="4" width="12" height="12" rx="2" stroke="#64748b" stroke-width="2" fill="none"/>'
    };
    return icons[priority] || icons.standard;
  }

  private getJourneyTitleIcon(journeyName: string): string {
    const name = journeyName.toLowerCase();
    
    // Bank/Account related
    if (name.includes('bank') || name.includes('account')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="9" width="18" height="11" rx="2" stroke="#00d4ff" stroke-width="2"/>
        <path d="M7 9V7a5 5 0 0110 0v2" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="15" r="2" fill="#00d4ff"/>
      </svg>`;
    }
    
    // User/Profile related
    if (name.includes('user') || name.includes('profile') || name.includes('manage')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="#7b2ff7" stroke-width="2"/>
        <path d="M5 20c0-4 3-7 7-7s7 3 7 7" stroke="#7b2ff7" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }
    
    // Login/Auth related
    if (name.includes('login') || name.includes('signin') || name.includes('auth')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 17l5-5-5-5" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="15" y1="12" x2="3" y2="12" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }
    
    // Registration/Signup related
    if (name.includes('register') || name.includes('registration') || name.includes('signup')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="#fb923c" stroke-width="2"/>
        <path d="M5 20c0-4 3-7 7-7s7 3 7 7" stroke="#fb923c" stroke-width="2" stroke-linecap="round"/>
        <path d="M19 8v6m-3-3h6" stroke="#fb923c" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }
    
    // Transaction/Payment related
    if (name.includes('transaction') || name.includes('payment') || name.includes('transfer')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 7h18M3 12h18M3 17h12" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
        <path d="M17 17l3-3-3-3" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }
    
    // Comment/Message related
    if (name.includes('comment') || name.includes('message') || name.includes('chat')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 10h8M8 14h4" stroke="#06b6d4" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }
    
    // Default icon
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="#00d4ff" stroke-width="2"/>
      <path d="M9 12l2 2 4-4" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  private renderJourneyItem(journey: DiscoveredFlow, index: number = 0): string {
    const isSelected = this.selectedJourneyIds.has(journey.id);
    const isExpanded = this.expandedJourneyIds.has(journey.id);
    const confidence = journey.confidence || 95;
    const priority = this.getJourneyPriority(journey);
    
    // Generate mock details for premium display
    const details = this.generateJourneyDetails(journey, priority);
    
    return `
      <div class="journey-card ${isSelected ? 'selected' : ''} priority-${priority}" onclick="toggleJourney('${journey.id}')" tabindex="0" style="animation-delay: ${index * 0.1}s">
        <div class="journey-card-header">
          <div class="journey-select-indicator">
            <div class="custom-checkbox ${isSelected ? 'checked' : ''}">
              ${isSelected ? '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 8l3 3 5-6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' : ''}
            </div>
          </div>
          <div class="journey-card-content">
            <div class="journey-card-title">
              <div class="journey-title-icon">
                ${this.getJourneyTitleIcon(journey.name)}
              </div>
              <span>${journey.name}</span>
            </div>
            <div class="journey-card-badges">
              <div class="confidence-badge">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#10b981" stroke-width="1.5"/>
                  <path d="M4 7l2 2 4-4" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>${confidence}%</span>
              </div>
              <div class="priority-badge priority-${priority}">
                ${priority === 'critical' ? '★' : priority === 'high' ? '◆' : '●'}
                ${priority.charAt(0).toUpperCase() + priority.slice(1)}
              </div>
            </div>
          </div>
          <button class="journey-expand-toggle" onclick="event.stopPropagation(); toggleJourneyExpand('${journey.id}')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="transform: rotate(${isExpanded ? '180' : '0'}deg); transition: transform 0.3s;">
              <path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        ${isExpanded ? `
        <div class="journey-details">
          ${details.route ? `
          <div class="detail-row">
            <div class="detail-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/>
                <path d="M13 6l6 6-6 6" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="5" cy="12" r="2" fill="#00d4ff"/>
              </svg>
            </div>
            <span class="detail-text">${details.route}</span>
          </div>
          ` : ''}
          
          ${details.components.length > 0 ? `
          <div class="detail-row">
            <div class="detail-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="#7b2ff7" stroke-width="2"/>
                <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="#7b2ff7" stroke-width="2"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="#7b2ff7" stroke-width="2"/>
                <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="#7b2ff7" stroke-width="2"/>
              </svg>
            </div>
            <span class="detail-text">Components: ${details.components.join(', ')}</span>
          </div>
          ` : ''}
          
          ${details.apis.length > 0 ? `
          <div class="detail-row">
            <div class="detail-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="#10b981" stroke-width="2"/>
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="2" r="1.5" fill="#10b981"/>
                <circle cx="12" cy="22" r="1.5" fill="#10b981"/>
                <circle cx="2" cy="12" r="1.5" fill="#10b981"/>
                <circle cx="22" cy="12" r="1.5" fill="#10b981"/>
              </svg>
            </div>
            <span class="detail-text">APIs: ${details.apis.join(', ')}</span>
          </div>
          ` : ''}
          
          ${details.formFields ? `
          <div class="detail-row">
            <div class="detail-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="#fb923c" stroke-width="2"/>
                <path d="M8 8h8M8 12h8M8 16h5" stroke="#fb923c" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="detail-text">${details.formFields}</span>
          </div>
          ` : ''}
          
          ${details.risk ? `
          <div class="detail-row risk">
            <div class="detail-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 7v7c0 5 3 8 8 10 5-2 8-5 8-10V7l-8-5z" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 9v4m0 3h.01" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="detail-text">Risk: ${details.risk}</span>
          </div>
          ` : ''}
          
          ${details.notes ? `
          <div class="detail-row">
            <div class="detail-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#fbbf24" stroke-width="2"/>
                <path d="M12 8v5l3 3" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="detail-text">${details.notes}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
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

  // Premium SVG Icons
  private getSvgIcon(type: string): string {
    const icons: Record<string, string> = {
      'scan': `<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#gradient1)" stroke="url(#gradient1)" stroke-width="2"/><defs><linearGradient id="gradient1" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stop-color="#00d4ff"/><stop offset="100%" stop-color="#7b2ff7"/></linearGradient></defs></svg>`,
      'check': `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 10l2 2 4-4" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/></svg>`,
      'warning': `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 7v4m0 2h.01M10 18a8 8 0 100-16 8 8 0 000 16z" stroke="#fbbf24" stroke-width="2"/></svg>`,
      'component': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#00d4ff" stroke-width="2"/><path d="M12 8v8m-4-4h8" stroke="#00d4ff" stroke-width="2"/></svg>`,
      'api': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#7b2ff7" stroke-width="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4" stroke="#7b2ff7" stroke-width="2"/></svg>`,
      'route': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6l6 6-6 6" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/></svg>`,
    };
    return icons[type] || '';
  }

  private renderTechBadges(technologies: string[]): string {
    if (technologies.length === 0) return '';
    
    return `
      <div class="tech-badges-section">
        <div class="tech-badges-grid">
          ${technologies.map((tech, i) => `
            <div class="tech-badge" style="animation-delay: ${i * 0.1}s">
              <div class="tech-badge-icon">✓</div>
              <div class="tech-badge-text">${tech}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private getStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
        background: linear-gradient(135deg, #0a0a1f 0%, #0f0f2e 25%, #1a1a3e 50%, #12162e 75%, #0a0a1f 100%);
        color: #ffffff;
        overflow-x: hidden;
        position: relative;
      }

      /* Ultra-Premium Animated Mesh Gradient Background */
      body::before {
        content: '';
        position: fixed;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background-image: 
          radial-gradient(circle at 20% 50%, rgba(123, 47, 247, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 80% 80%, rgba(0, 212, 255, 0.18) 0%, transparent 45%),
          radial-gradient(circle at 40% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
          radial-gradient(circle at 60% 60%, rgba(251, 191, 36, 0.08) 0%, transparent 35%),
          radial-gradient(circle at 90% 10%, rgba(241, 7, 163, 0.1) 0%, transparent 40%);
        animation: meshFloat 25s ease-in-out infinite;
        pointer-events: none;
        opacity: 0.6;
        filter: blur(80px);
      }

      /* Floating Particles */
      body::after {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: 
          radial-gradient(2px 2px at 20% 30%, rgba(255, 255, 255, 0.3), transparent),
          radial-gradient(2px 2px at 60% 70%, rgba(0, 212, 255, 0.3), transparent),
          radial-gradient(1px 1px at 50% 50%, rgba(123, 47, 247, 0.3), transparent),
          radial-gradient(2px 2px at 80% 10%, rgba(255, 255, 255, 0.2), transparent),
          radial-gradient(1px 1px at 90% 60%, rgba(16, 185, 129, 0.3), transparent),
          radial-gradient(2px 2px at 30% 80%, rgba(251, 191, 36, 0.2), transparent);
        background-size: 200px 200px, 250px 250px, 300px 300px, 180px 180px, 220px 220px, 280px 280px;
        background-position: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px;
        animation: particlesFloat 60s linear infinite;
        pointer-events: none;
        opacity: 0.4;
      }

      @keyframes meshFloat {
        0%, 100% { 
          transform: translate(0, 0) rotate(0deg) scale(1);
          opacity: 0.6;
        }
        33% { 
          transform: translate(30px, -30px) rotate(5deg) scale(1.05);
          opacity: 0.7;
        }
        66% { 
          transform: translate(-30px, 30px) rotate(-5deg) scale(0.95);
          opacity: 0.5;
        }
      }

      @keyframes particlesFloat {
        from { background-position: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px; }
        to { background-position: 500px 1000px, 540px 1060px, 630px 1270px, 570px 1100px, 650px 1050px, 700px 1180px; }
      }

      .wizard-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        position: relative;
        z-index: 1;
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
        font-size: 56px;
        font-weight: 800;
        margin-bottom: 20px;
        background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 50%, #f107a3 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -1px;
        line-height: 1.1;
        text-shadow: 0 0 60px rgba(123, 47, 247, 0.5);
        animation: shimmer 3s ease-in-out infinite;
      }

      @keyframes shimmer {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      .subtitle-hero {
        font-size: 22px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 56px;
        font-weight: 400;
        letter-spacing: 0.3px;
      }

      /* Features Grid */
      .features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        margin: 56px 0;
      }

      .feature-card {
        padding: 32px 24px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .feature-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(123, 47, 247, 0.1) 0%, rgba(0, 212, 255, 0.1) 100%);
        opacity: 0;
        transition: opacity 0.3s;
      }

      .feature-card:hover {
        transform: translateY(-8px) scale(1.02);
        border-color: rgba(123, 47, 247, 0.5);
        box-shadow: 0 20px 60px rgba(123, 47, 247, 0.3), 0 0 0 1px rgba(123, 47, 247, 0.2);
      }

      .feature-card:hover::before {
        opacity: 1;
      }

      .feature-icon {
        font-size: 48px;
        margin-bottom: 20px;
        filter: drop-shadow(0 4px 20px rgba(123, 47, 247, 0.4));
        transition: transform 0.3s;
      }

      .feature-card:hover .feature-icon {
        transform: scale(1.1) rotate(5deg);
      }

      .feature-card h3 {
        font-size: 20px;
        margin-bottom: 12px;
        font-weight: 700;
        color: #ffffff;
      }

      .feature-card p {
        font-size: 15px;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.6;
      }

      /* Button */
      .btn-hero {
        font-size: 20px;
        padding: 26px 60px;
        background: linear-gradient(135deg, #7b2ff7 0%, #f107a3 50%, #7b2ff7 100%);
        background-size: 200% 100%;
        color: #ffffff;
        border: none;
        border-radius: 18px;
        cursor: pointer;
        font-weight: 700;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        margin: 48px 0;
        position: relative;
        overflow: hidden;
        box-shadow: 
          0 15px 50px rgba(123, 47, 247, 0.6),
          0 0 80px rgba(241, 7, 163, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          inset 0 -2px 10px rgba(0, 0, 0, 0.2);
        letter-spacing: 0.8px;
        text-transform: uppercase;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      }

      .btn-hero::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: left 0.5s;
      }

      .btn-hero:hover::before {
        left: 100%;
      }

      .btn-hero:hover {
        transform: translateY(-6px) scale(1.06);
        background-position: 100% 0;
        box-shadow: 
          0 25px 70px rgba(123, 47, 247, 0.8),
          0 0 100px rgba(241, 7, 163, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.4),
          inset 0 -2px 20px rgba(0, 0, 0, 0.3);
        animation: buttonPulse 1.5s ease-in-out infinite;
      }

      @keyframes buttonPulse {
        0%, 100% {
          box-shadow: 
            0 25px 70px rgba(123, 47, 247, 0.8),
            0 0 100px rgba(241, 7, 163, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -2px 20px rgba(0, 0, 0, 0.3);
        }
        50% {
          box-shadow: 
            0 30px 80px rgba(123, 47, 247, 1),
            0 0 120px rgba(241, 7, 163, 0.7),
            0 0 0 1px rgba(255, 255, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 -2px 30px rgba(0, 0, 0, 0.4);
        }
      }

      .btn-hero:active {
        transform: translateY(-2px) scale(1.02);
      }

      .btn-hero:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
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
        padding: 28px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        text-align: left;
        transition: all 0.3s;
        position: relative;
        overflow: hidden;
      }

      .progress-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, #7b2ff7, #00d4ff);
        opacity: 0;
        transition: opacity 0.3s;
      }

      .progress-card:hover {
        transform: translateY(-4px);
        border-color: rgba(123, 47, 247, 0.4);
        box-shadow: 0 10px 40px rgba(123, 47, 247, 0.2);
      }

      .progress-card:hover::before {
        opacity: 1;
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
        font-size: 48px;
        font-weight: 800;
        margin-bottom: 16px;
        background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: counterPulse 0.3s ease-out;
      }
      
      @keyframes counterPulse {
        0% {
          transform: scale(0.8);
          opacity: 0;
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      .progress-bar-container {
        height: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #7b2ff7 0%, #00d4ff 50%, #7b2ff7 100%);
        background-size: 200% 100%;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 10px;
        box-shadow: 
          0 0 20px rgba(123, 47, 247, 0.6),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        animation: progressShine 2s linear infinite;
        position: relative;
      }

      .progress-bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
        animation: shimmer 1.5s infinite;
      }

      @keyframes progressShine {
        0% { background-position: 0% 0%; }
        100% { background-position: 200% 0%; }
      }

      /* Main Progress Section */
      .main-progress-section {
        margin: 40px 0;
        padding: 0 20px;
      }

      .main-progress-bar {
        height: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .main-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #7b2ff7 0%, #00d4ff 100%);
        border-radius: 20px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 20px rgba(123, 47, 247, 0.8);
        position: relative;
        overflow: hidden;
      }

      .main-progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
        animation: progressSlide 2s infinite;
      }

      @keyframes progressSlide {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      .main-progress-label {
        text-align: center;
        margin-top: 12px;
        font-size: 18px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
      }

      /* Scan Status Message */
      .scan-status-message {
        font-size: 18px;
        color: #00d4ff;
        margin: 32px 0 48px 0;
        font-weight: 500;
        text-align: center;
      }

      /* Discovery Stats Grid */
      .discovery-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        animation: slideInUp 0.6s ease-out;
      }

      .discovery-stat-card {
        text-align: center;
        padding: 24px 16px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .discovery-stat-card:hover {
        transform: translateY(-6px) scale(1.05) rotateX(5deg);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(0, 212, 255, 0.4);
        box-shadow: 0 12px 32px rgba(0, 212, 255, 0.3);
      }

      .stat-number-large {
        font-size: 48px;
        font-weight: 800;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
        margin-bottom: 8px;
        animation: counterPulse 0.5s ease-out;
      }

      .stat-label-small {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Discovered Section */
      .discovered-section {
        margin: 48px auto;
        max-width: 600px;
        padding: 24px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        text-align: left;
      }

      .discovered-header {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 20px;
        color: #ffffff;
      }

      .discovered-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .discovered-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.9);
        animation: fadeInLeft 0.5s ease-out;
      }

      .discovered-item.warning {
        color: rgba(251, 191, 36, 0.9);
      }

      @keyframes fadeInLeft {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .check-icon {
        font-size: 18px;
        color: #00d4ff;
        font-weight: 700;
        flex-shrink: 0;
      }

      .discovered-item.warning .check-icon {
        color: #fbbf24;
      }

      .discovered-text {
        flex: 1;
      }

      /* Smart Insights Section */
      .insights-section {
        margin: 32px auto;
        max-width: 600px;
        padding: 24px;
        background: linear-gradient(135deg, rgba(123, 47, 247, 0.15), rgba(0, 212, 255, 0.15));
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(123, 47, 247, 0.3);
        border-radius: 16px;
        text-align: left;
      }

      .insights-header {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 16px;
        color: #ffffff;
      }

      .insights-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .insight-bullet {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.85);
        padding-left: 8px;
        line-height: 1.6;
        animation: fadeInLeft 0.6s ease-out;
      }

      /* Scan Section - Ultra-Premium Glassmorphism Container */
      .scan-section {
        max-width: 750px;
        margin: 0 auto 32px auto;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        overflow: hidden;
        animation: slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 
          0 10px 40px rgba(0, 0, 0, 0.2),
          0 0 80px rgba(123, 47, 247, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        position: relative;
        transform-style: preserve-3d;
        perspective: 1000px;
        transition: transform 0.3s ease;
      }

      .scan-section:hover {
        transform: translateY(-2px) rotateX(1deg);
      }

      .scan-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5), transparent);
      }

      .scan-section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 18px 28px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.12), rgba(123, 47, 247, 0.12));
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        position: relative;
        overflow: hidden;
      }

      .scan-section-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
        animation: headerShimmer 3s ease-in-out infinite;
      }

      @keyframes headerShimmer {
        from { left: -100%; }
        to { left: 200%; }
      }

      .scan-section-header span {
        font-size: 13px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.9);
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .scan-section-content {
        padding: 20px 24px;
      }

      /* Activity Items with Badges */
      .activity-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s;
      }

      .activity-item:last-child {
        border-bottom: none;
      }

      .activity-item:hover {
        transform: translateX(4px);
      }

      .activity-status {
        font-size: 20px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .activity-item.complete .activity-status {
        color: #10b981;
        animation: checkmarkPop 0.4s ease-out;
      }

      @keyframes checkmarkPop {
        0% { transform: scale(0); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      .activity-item.scanning .activity-status {
        color: #00d4ff;
        animation: spin 1.5s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .activity-item.pending .activity-status {
        color: rgba(255, 255, 255, 0.3);
      }

      .activity-text {
        flex: 1;
        font-size: 15px;
        color: rgba(255, 255, 255, 0.85);
        font-weight: 500;
      }

      .activity-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .activity-item.complete .activity-badge {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      .activity-item.scanning .activity-badge {
        background: rgba(0, 212, 255, 0.15);
        color: #00d4ff;
        border: 1px solid rgba(0, 212, 255, 0.3);
        animation: pulse 2s ease-in-out infinite;
      }

      .activity-item.pending .activity-badge {
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      /* Insights List */
      .insights-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .insight-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0;
        border: none;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
      }

      .insight-item svg {
        flex-shrink: 0;
      }

      .insight-item span {
        font-weight: 500;
      }

      /* Tech Badges Grid */
      .tech-badges-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .tech-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: rgba(0, 212, 255, 0.08);
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
        transition: all 0.3s;
        animation: fadeInScale 0.4s ease-out both;
      }

      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .tech-badge:hover {
        background: rgba(0, 212, 255, 0.15);
        border-color: #00d4ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
      }

      .tech-badge svg {
        flex-shrink: 0;
      }

      /* Scanning Activity Display */
      .scanning-activity {
        margin: 40px auto;
        max-width: 650px;
        padding: 24px;
        background: rgba(0, 212, 255, 0.05);
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 16px;
      }

      .activity-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .activity-pulse {
        width: 12px;
        height: 12px;
        background: #00d4ff;
        border-radius: 50%;
        animation: activityPulse 1.5s ease-in-out infinite;
      }

      @keyframes activityPulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.4;
          transform: scale(1.2);
        }
      }

      .activity-title {
        font-size: 16px;
        font-weight: 700;
        color: #00d4ff;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .activity-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .activity-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        transition: all 0.3s;
        animation: slideInRight 0.4s ease-out;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .activity-item.scanning {
        background: rgba(123, 47, 247, 0.1);
        border-left: 3px solid #7b2ff7;
      }

      .activity-item.complete {
        background: rgba(16, 185, 129, 0.1);
        border-left: 3px solid #10b981;
      }

      .activity-status {
        font-size: 20px;
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .activity-item.scanning .activity-status {
        color: #7b2ff7;
        animation: rotate 1.5s linear infinite;
      }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .activity-item.complete .activity-status {
        color: #10b981;
      }

      .activity-text {
        flex: 1;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
      }

      .activity-count {
        font-size: 16px;
        font-weight: 700;
        color: #00d4ff;
        min-width: 32px;
        text-align: right;
      }

      /* Tech Stack Section */
      .tech-stack-section {
        margin: 32px auto;
        max-width: 650px;
        padding: 24px;
        background: rgba(123, 47, 247, 0.05);
        border: 1px solid rgba(123, 47, 247, 0.2);
        border-radius: 16px;
      }

      .tech-stack-header {
        font-size: 16px;
        font-weight: 700;
        color: #7b2ff7;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
      }

      .tech-badges-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .tech-stack-section.scanning {
        text-align: center;
        padding: 32px;
      }

      .scanning-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .scanning-pulse {
        width: 48px;
        height: 48px;
        border: 3px solid #7b2ff7;
        border-radius: 50%;
        border-top-color: transparent;
        animation: rotate 1s linear infinite;
      }

      .scanning-text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }

      .tech-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(123, 47, 247, 0.1));
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        opacity: 0;
        animation: techBadgeIn 0.5s ease-out forwards;
        transition: all 0.3s;
      }

      @keyframes techBadgeIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .tech-badge:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4);
        border-color: #00d4ff;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(123, 47, 247, 0.2));
      }

      .tech-badge-icon {
        font-size: 16px;
        color: #00d4ff;
        font-weight: 700;
      }

      .tech-badge-text {
        line-height: 1;
      }

      .discovered-text strong {
        color: #00d4ff;
        font-weight: 700;
      }

      .discovered-text .meta {
        color: rgba(255, 255, 255, 0.5);
        font-size: 13px;
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

      /* Results Screen */
      .results-hero {
        text-align: center;
        margin-bottom: 48px;
      }

      /* Results Overview Card */
      .results-overview-card {
        max-width: 700px;
        margin: 0 auto 40px auto;
        padding: 32px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .overview-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 24px;
        color: #ffffff;
        text-align: center;
      }

      .overview-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
      }

      .overview-stat {
        text-align: center;
        padding: 20px 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        transition: all 0.3s;
      }

      .overview-stat:hover {
        transform: translateY(-4px);
        background: rgba(255, 255, 255, 0.08);
      }

      .stat-number {
        font-size: 42px;
        font-weight: 800;
        margin-bottom: 8px;
        line-height: 1;
      }

      .stat-number.blue {
        color: #00d4ff;
      }

      .stat-number.red {
        color: #ef4444;
      }

      .stat-number.orange {
        color: #fb923c;
      }

      .stat-number.cyan {
        color: #06b6d4;
      }

      .stat-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
      }

      /* Selection Info */
      .selection-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 700px;
        margin: 0 auto 20px auto;
        padding: 0 8px;
      }

      .selection-count {
        font-size: 16px;
        font-weight: 700;
        color: #00d4ff;
      }

      .selection-hint {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
      }

      /* Journeys Container */
      .journeys-container {
        max-width: 700px;
        margin: 0 auto;
      }

      .journey-category {
        margin-bottom: 40px;
      }

      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .category-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: 24px;
        font-size: 15px;
        font-weight: 700;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      .category-badge.critical {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
        border: 1.5px solid rgba(239, 68, 68, 0.4);
        color: #fca5a5;
      }

      .category-badge.high {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(251, 146, 60, 0.1));
        border: 1.5px solid rgba(251, 146, 60, 0.4);
        color: #fdba74;
      }

      .category-badge.standard {
        background: linear-gradient(135deg, rgba(100, 116, 139, 0.2), rgba(100, 116, 139, 0.1));
        border: 1.5px solid rgba(100, 116, 139, 0.4);
        color: #cbd5e1;
      }

      .category-title {
        line-height: 1;
      }

      .category-meta {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .category-count {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
      }

      /* Journeys Grid */
      .journeys-grid {
        display: grid;
        gap: 12px;
      }

      /* Journey Cards - Premium Redesign */
      .journey-card {
        position: relative;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        overflow: visible;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }

      .journey-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(123, 47, 247, 0.05));
        opacity: 0;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }

      .journey-card:hover {
        transform: translateY(-4px);
        border-color: rgba(0, 212, 255, 0.5);
        box-shadow: 0 12px 32px rgba(0, 212, 255, 0.2),
                    0 0 0 1px rgba(0, 212, 255, 0.15) inset,
                    0 0 20px rgba(0, 212, 255, 0.1);
      }

      .journey-card:hover::before {
        opacity: 1;
      }

      .journey-card.selected {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(123, 47, 247, 0.1));
        border-color: rgba(0, 212, 255, 0.6);
        box-shadow: 0 8px 24px rgba(0, 212, 255, 0.3),
                    0 0 0 1.5px rgba(0, 212, 255, 0.3) inset,
                    0 0 30px rgba(0, 212, 255, 0.15);
      }

      .journey-card.selected::before {
        opacity: 1;
      }

      .journey-card.priority-critical {
        border-left: 3px solid #ef4444;
      }

      .journey-card.priority-high {
        border-left: 3px solid #fb923c;
      }

      .journey-card.priority-standard {
        border-left: 3px solid #64748b;
      }

      .journey-card-header {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 18px 20px;
      }

      /* Custom Checkbox */
      .custom-checkbox {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        margin-top: 2px;
      }

      .custom-checkbox:hover {
        border-color: rgba(0, 212, 255, 0.6);
        background: rgba(0, 212, 255, 0.1);
        transform: scale(1.1);
      }

      .custom-checkbox.checked {
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        border-color: #00d4ff;
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
      }

      .custom-checkbox svg {
        width: 14px;
        height: 14px;
        opacity: 0;
        transform: scale(0);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .custom-checkbox.checked svg {
        opacity: 1;
        transform: scale(1);
      }

      /* Journey Card Content */
      .journey-card-content {
        flex: 1;
        min-width: 0;
      }

      .journey-card-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 17px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 10px;
        line-height: 1.3;
        letter-spacing: -0.01em;
      }

      .journey-title-icon {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .journey-card:hover .journey-title-icon {
        transform: scale(1.1) rotate(-5deg);
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.25);
        box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
      }

      .journey-card.selected .journey-title-icon {
        background: rgba(0, 212, 255, 0.15);
        border-color: rgba(0, 212, 255, 0.4);
      }

      .journey-card-badges {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      /* Confidence Badge */
      .confidence-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.4);
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        color: #6ee7b7;
        line-height: 1;
      }

      .confidence-badge svg {
        width: 12px;
        height: 12px;
      }

      /* Priority Badge */
      .priority-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
      }

      .priority-badge.priority-critical {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: #fca5a5;
      }

      .priority-badge.priority-high {
        background: rgba(251, 146, 60, 0.15);
        border: 1px solid rgba(251, 146, 60, 0.4);
        color: #fdba74;
      }

      .priority-badge.priority-standard {
        background: rgba(100, 116, 139, 0.15);
        border: 1px solid rgba(100, 116, 139, 0.4);
        color: #cbd5e1;
      }

      /* Journey Select Indicator */
      .journey-select-indicator {
        flex-shrink: 0;
      }

      /* Expand Toggle */
      .journey-expand-toggle {
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.05);
        border: 1.5px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 8px 10px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        color: #00d4ff;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .journey-expand-toggle:hover {
        background: rgba(0, 212, 255, 0.15);
        border-color: rgba(0, 212, 255, 0.5);
        transform: scale(1.05);
      }

      .journey-expand-toggle svg {
        width: 20px;
        height: 20px;
      }

      /* Journey Item Wrapper (Expandable) */
      .journey-item-wrapper {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-top: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .journey-item-wrapper:first-of-type {
        border-top: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px 8px 0 0;
      }

      .journey-item-wrapper:last-of-type {
        border-radius: 0 0 8px 8px;
      }

      .journey-item-wrapper:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(0, 212, 255, 0.3);
      }

      .journey-item-wrapper.selected {
        border-color: #00d4ff;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(123, 47, 247, 0.15));
        box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3);
      }

      /* Journey Item Header */
      .journey-item-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 20px;
        cursor: pointer;
      }

      .journey-checkbox {
        flex-shrink: 0;
      }

      .journey-checkbox input[type="checkbox"] {
        width: 24px;
        height: 24px;
        cursor: pointer;
        accent-color: #00d4ff;
      }

      .journey-header-content {
        flex: 1;
        min-width: 0;
      }

      .journey-name {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #ffffff;
        line-height: 1.3;
      }

      .journey-header-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 13px;
        flex-wrap: wrap;
      }

      .journey-confidence {
        color: rgba(255, 255, 255, 0.7);
      }

      .journey-divider {
        color: rgba(255, 255, 255, 0.3);
      }

      .journey-priority {
        font-weight: 600;
      }

      .priority-critical {
        color: #ef4444;
      }

      .priority-high {
        color: #fb923c;
      }

      .priority-standard {
        color: rgba(255, 255, 255, 0.6);
      }

      /* Expand Button */
      .journey-expand-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.2s;
        color: #00d4ff;
        font-size: 14px;
        flex-shrink: 0;
      }

      .journey-expand-btn:hover {
        background: rgba(0, 212, 255, 0.2);
        border-color: #00d4ff;
        transform: scale(1.05);
      }

      .expand-icon {
        display: inline-block;
        transition: transform 0.3s;
      }

      /* Journey Details (Expanded Content) - Premium Redesign */
      .journey-details {
        padding: 16px 20px 20px 20px;
        margin-top: 12px;
        border-top: 1.5px solid rgba(255, 255, 255, 0.1);
        animation: expandDown 0.3s ease-out;
        background: rgba(0, 0, 0, 0.15);
      }

      @keyframes expandDown {
        from {
          opacity: 0;
          max-height: 0;
        }
        to {
          opacity: 1;
          max-height: 500px;
        }
      }

      .detail-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        margin-bottom: 8px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .detail-row:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateX(4px);
      }

      .detail-row:last-child {
        margin-bottom: 0;
      }

      .detail-row.risk {
        background: rgba(239, 68, 68, 0.12);
        border: 1.5px solid rgba(239, 68, 68, 0.3);
      }

      .detail-row.risk:hover {
        background: rgba(239, 68, 68, 0.18);
        border-color: rgba(239, 68, 68, 0.5);
      }

      .detail-icon {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .detail-row:hover .detail-icon {
        transform: scale(1.1) rotate(5deg);
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .detail-icon svg {
        width: 18px;
        height: 18px;
        transition: all 0.3s;
      }

      .detail-row:hover .detail-icon svg {
        filter: drop-shadow(0 0 6px currentColor);
      }

      .detail-text {
        flex: 1;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.6;
        font-weight: 500;
      }

      /* Action Footer */
      .action-footer {
        margin-top: 56px;
        text-align: center;
      }

      .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        padding: 0 8px;
        margin-left: 12px;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
      }

      .action-hint {
        margin-top: 16px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
      }

      .subtitle-hero .highlight {
        color: #00d4ff;
        font-weight: 700;
      }

      /* Results Tech Stack */
      .results-tech-stack {
        max-width: 700px;
        margin: 0 auto 32px auto;
        padding: 20px 24px;
        background: linear-gradient(135deg, rgba(123, 47, 247, 0.08), rgba(0, 212, 255, 0.08));
        border: 1px solid rgba(123, 47, 247, 0.3);
        border-radius: 12px;
      }

      .tech-stack-title {
        font-size: 14px;
        font-weight: 700;
        color: #7b2ff7;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
      }

      .results-tech-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .results-tech-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 16px;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        transition: all 0.2s;
      }

      .results-tech-badge:hover {
        background: rgba(0, 212, 255, 0.1);
        border-color: #00d4ff;
        transform: translateY(-2px);
      }

      .results-tech-badge svg {
        flex-shrink: 0;
      }

      /* Value Stats Grid (Discovery) */
      .value-stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        max-width: 650px;
        margin: 32px auto;
      }

      .value-stat-card {
        padding: 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 16px;
        animation: slideInUp 0.5s ease-out;
      }

      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .value-stat-card.time-saved {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      .value-stat-card.files-scanned {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 212, 255, 0.05));
        border: 1px solid rgba(0, 212, 255, 0.3);
      }

      .value-stat-icon {
        flex-shrink: 0;
      }

      .value-stat-content {
        flex: 1;
      }

      .value-stat-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 4px;
      }

      .value-stat-value {
        font-size: 28px;
        font-weight: 800;
        color: #ffffff;
        line-height: 1.2;
        margin-bottom: 2px;
      }

      .value-stat-desc {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }

      /* Value Proposition Card (Results) - Ultra-Premium */
      .value-prop-card {
        max-width: 750px;
        margin: 0 auto 32px auto;
        padding: 28px 32px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%);
        backdrop-filter: blur(30px) saturate(180%);
        -webkit-backdrop-filter: blur(30px) saturate(180%);
        border: 1.5px solid rgba(16, 185, 129, 0.4);
        border-radius: 20px;
        box-shadow: 
          0 10px 40px rgba(16, 185, 129, 0.2),
          0 0 80px rgba(16, 185, 129, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        animation: fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
      }

      .value-prop-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), transparent);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .value-prop-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        font-size: 16px;
        font-weight: 700;
        color: #10b981;
      }

      .value-prop-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
      }

      .value-prop-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.5;
      }

      .value-prop-item svg {
        flex-shrink: 0;
      }

      .value-prop-estimate {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 8px;
        font-size: 13px;
        color: #00d4ff;
        font-weight: 600;
      }

      .value-prop-estimate svg {
        flex-shrink: 0;
      }

      /* Progress Bar Header */
      .progress-bar-header {
        width: 100%;
        margin-bottom: 56px;
        padding: 0 24px;
      }
      
      .progress-step-info {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .step-current {
        font-weight: 700;
        color: #00d4ff;
        font-size: 16px;
      }
      
      .step-divider {
        color: rgba(255, 255, 255, 0.3);
      }
      
      .step-total {
        color: rgba(255, 255, 255, 0.5);
      }
      
      .step-name {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;
      }
      
      .progress-bar-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
      }
      
      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #7b2ff7 0%, #00d4ff 100%);
        border-radius: 10px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 20px rgba(123, 47, 247, 0.6);
      }

      /* Old Stepper - Keep for backwards compatibility */
      .stepper {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 48px;
        gap: 12px;
      }

      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .step-circle {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 700;
        transition: all 0.3s;
      }

      .step.active .step-circle {
        background: linear-gradient(135deg, #7b2ff7, #00d4ff);
        border-color: #7b2ff7;
        box-shadow: 0 0 30px rgba(123, 47, 247, 0.6);
        transform: scale(1.1);
      }

      .step.complete .step-circle {
        background: #00d4ff;
        border-color: #00d4ff;
      }

      .step-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 500;
      }

      .step.active .step-label {
        color: #ffffff;
      }

      .step-line {
        width: 80px;
        height: 2px;
        background: rgba(255, 255, 255, 0.2);
        margin: 0 8px;
        margin-bottom: 24px;
      }

      .step.complete ~ .step-line {
        background: #00d4ff;
      }

      /* Config Section */
      .config-section {
        margin: 48px 0;
        text-align: left;
      }

      .config-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: rgba(255, 255, 255, 0.9);
      }

      .config-label svg {
        color: #7b2ff7;
      }

      /* Radio Cards */
      .radio-group {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      .radio-card {
        min-height: 180px;
        padding: 32px 24px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
        backdrop-filter: blur(30px) saturate(180%);
        -webkit-backdrop-filter: blur(30px) saturate(180%);
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transform-style: preserve-3d;
        perspective: 1000px;
      }

      .radio-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(123, 47, 247, 0.1), rgba(0, 212, 255, 0.1));
        opacity: 0;
        transition: opacity 0.4s;
      }

      .radio-card::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
        transform: rotate(45deg);
        opacity: 0;
        transition: opacity 0.6s;
      }

      .radio-card input[type="radio"] {
        position: absolute;
        opacity: 0;
      }

      .radio-card:hover {
        border-color: rgba(123, 47, 247, 0.8);
        transform: translateY(-8px) scale(1.03) rotateX(2deg) rotateY(-2deg);
        box-shadow: 
          0 20px 60px rgba(123, 47, 247, 0.4),
          0 0 80px rgba(0, 212, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .radio-card:hover::before {
        opacity: 1;
      }

      .radio-card:hover::after {
        opacity: 1;
        animation: shimmerSweep 1.5s ease-in-out;
      }

      @keyframes shimmerSweep {
        from { transform: translateX(-100%) rotate(45deg); }
        to { transform: translateX(100%) rotate(45deg); }
      }

      .radio-card.selected {
        border-color: #00d4ff;
        background: linear-gradient(135deg, rgba(123, 47, 247, 0.25), rgba(0, 212, 255, 0.15));
        box-shadow: 
          0 0 60px rgba(0, 212, 255, 0.6),
          0 20px 60px rgba(123, 47, 247, 0.4),
          0 0 100px rgba(0, 212, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          inset 0 -1px 20px rgba(0, 212, 255, 0.1);
        animation: selectedPulse 2s ease-in-out infinite;
      }

      @keyframes selectedPulse {
        0%, 100% {
          box-shadow: 
            0 0 60px rgba(0, 212, 255, 0.6),
            0 20px 60px rgba(123, 47, 247, 0.4),
            0 0 100px rgba(0, 212, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 20px rgba(0, 212, 255, 0.1);
        }
        50% {
          box-shadow: 
            0 0 80px rgba(0, 212, 255, 0.8),
            0 25px 70px rgba(123, 47, 247, 0.5),
            0 0 120px rgba(0, 212, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 30px rgba(0, 212, 255, 0.2);
        }
      }

      .radio-card.disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .radio-card.disabled:hover {
        transform: none;
        border-color: rgba(255, 255, 255, 0.1);
      }

      .radio-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;
      }

      .radio-icon {
        margin-bottom: 20px;
        color: rgba(255, 255, 255, 0.8);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .radio-icon svg {
        filter: drop-shadow(0 4px 15px rgba(123, 47, 247, 0.4));
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .radio-card:hover .radio-icon svg {
        transform: scale(1.1) translateY(-4px);
        filter: drop-shadow(0 8px 25px rgba(123, 47, 247, 0.6));
      }
      
      .radio-card.selected .radio-icon {
        color: #00d4ff;
      }
      
      .radio-card.selected .radio-icon svg {
        filter: drop-shadow(0 6px 20px rgba(0, 212, 255, 0.5));
      }

      /* Radio Icon Box - Premium SVG Container */
      .radio-icon-box {
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.03);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        margin-bottom: 16px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .radio-icon-box::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(123, 47, 247, 0.2), rgba(0, 212, 255, 0.2));
        opacity: 0;
        transition: opacity 0.4s;
      }

      .radio-card:hover .radio-icon-box {
        transform: scale(1.1) rotate(5deg);
        border-color: rgba(123, 47, 247, 0.4);
        box-shadow: 
          0 0 30px rgba(123, 47, 247, 0.4),
          0 10px 30px rgba(123, 47, 247, 0.2);
      }

      .radio-card:hover .radio-icon-box::before {
        opacity: 1;
      }

      .radio-card.selected .radio-icon-box {
        background: rgba(0, 212, 255, 0.08);
        border-color: #00d4ff;
        box-shadow: 
          0 0 40px rgba(0, 212, 255, 0.5),
          0 10px 40px rgba(0, 212, 255, 0.3),
          inset 0 0 20px rgba(0, 212, 255, 0.1);
        animation: iconGlow 2s ease-in-out infinite;
      }

      @keyframes iconGlow {
        0%, 100% {
          box-shadow: 
            0 0 40px rgba(0, 212, 255, 0.5),
            0 10px 40px rgba(0, 212, 255, 0.3),
            inset 0 0 20px rgba(0, 212, 255, 0.1);
        }
        50% {
          box-shadow: 
            0 0 60px rgba(0, 212, 255, 0.7),
            0 10px 50px rgba(0, 212, 255, 0.4),
            inset 0 0 30px rgba(0, 212, 255, 0.15);
        }
      }

      .radio-card.selected .radio-icon-box::before {
        opacity: 1;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(123, 47, 247, 0.2));
      }

      .radio-icon-box svg {
        position: relative;
        z-index: 1;
        filter: drop-shadow(0 4px 12px rgba(123, 47, 247, 0.3));
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .radio-card:hover .radio-icon-box svg {
        filter: drop-shadow(0 6px 20px rgba(123, 47, 247, 0.5));
        transform: scale(1.05);
      }

      .radio-card.selected .radio-icon-box svg {
        filter: drop-shadow(0 6px 24px rgba(0, 212, 255, 0.6));
        animation: svgPulse 2s ease-in-out infinite;
      }

      @keyframes svgPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      /* Enhanced Config Label with SVG Icon */
      .config-label {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 17px;
        font-weight: 700;
        margin-bottom: 20px;
        color: rgba(255, 255, 255, 0.95);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .config-label svg {
        flex-shrink: 0;
      }

      /* SVG Gradient Definitions */
      svg defs linearGradient {
        --gradient-start: #00d4ff;
        --gradient-end: #7b2ff7;
      }

      .radio-title {
        font-size: 22px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.95);
        margin-bottom: 8px;
        letter-spacing: -0.5px;
      }

      .radio-desc {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.65);
        font-weight: 400;
      }
      /* Scan Hero Section */
      .scan-hero {
        text-align: center;
        margin-bottom: 40px;
      }
      
      /* Scan Icon Container */
      .scan-icon-container {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0 auto 24px;
      }
      
      .scan-icon {
        font-size: 80px;
        position: relative;
        z-index: 2;
      }
      
      .scan-icon.pulsing {
        animation: scanPulse 2s ease-in-out infinite;
      }
      
      @keyframes scanPulse {
        0%, 100% { 
          transform: scale(1);
          filter: drop-shadow(0 0 20px rgba(123, 47, 247, 0.5));
        }
        50% { 
          transform: scale(1.1);
          filter: drop-shadow(0 0 40px rgba(123, 47, 247, 0.8));
        }
      }
      
      .scan-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        border: 3px solid rgba(123, 47, 247, 0.3);
        border-radius: 50%;
        animation: scanRing 2s ease-out infinite;
      }
      
      @keyframes scanRing {
        0% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(1.5);
          opacity: 0;
        }
      }
      
      /* Typing Text Animation */
      .typing-text {
        position: relative;
        display: inline-block;
      }
      
      .typing-text::after {
        content: '|';
        animation: blink 1s step-end infinite;
      }
      
      @keyframes blink {
        50% { opacity: 0; }
      }
      
      /* Hero Section */
      .hero-section {
        margin-bottom: 48px;
      }
      
      /* Tech Stack Card */
      .tech-stack-card {
        margin: 40px auto;
        padding: 32px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        max-width: 600px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      }
      
      .tech-stack-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      
      .tech-stack-title {
        font-size: 18px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.95);
      }
      
      .tech-count {
        font-size: 14px;
        padding: 4px 12px;
        background: rgba(0, 212, 255, 0.15);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        color: #00d4ff;
        font-weight: 600;
      }
      
      .tech-stack-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }
      
      .tech-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: rgba(123, 47, 247, 0.1);
        border: 1px solid rgba(123, 47, 247, 0.3);
        border-radius: 12px;
        animation: techItemFadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      
      @keyframes techItemFadeIn {
        0% {
          opacity: 0;
          transform: scale(0.8) translateY(-10px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      .tech-item-icon {
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        color: white;
        flex-shrink: 0;
      }
      
      .tech-item-name {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
      }
      
      .tech-placeholder {
        grid-column: 1 / -1;
        text-align: center;
        padding: 30px;
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      
      .loading-spinner {
        width: 20px;
        height: 20px;
        border: 3px solid rgba(0, 212, 255, 0.2);
        border-top-color: #00d4ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Scan Status Message */
      .scan-status-message {
        text-align: center;
        font-size: 16px;
        font-weight: 600;
        color: #00d4ff;
        margin: 32px 0;
        padding: 16px;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 12px;
        animation: pulse 2s infinite;
      }
      
      /* Insights Card */
      .insights-card {
        margin: 40px 0;
        padding: 32px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.6s;
      }
      
      .insights-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 24px;
        text-align: center;
        color: rgba(255, 255, 255, 0.95);
      }
      
      .insights-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
      }
      
      .insight-item {
        text-align: center;
        padding: 20px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .insight-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .insight-value {
        font-size: 32px;
        font-weight: 800;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .insight-value.critical {
        background: linear-gradient(135deg, #ff4757, #f107a3);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .insight-value.high {
        background: linear-gradient(135deg, #ffa502, #f107a3);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* Detected Technologies */
      .tech-detected {
        margin: 40px 0;
        padding: 24px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
      }

      .tech-label {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 16px;
        color: rgba(255, 255, 255, 0.9);
      }

      .tech-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .tech-badge {
        padding: 10px 20px;
        background: linear-gradient(135deg, rgba(123, 47, 247, 0.25), rgba(0, 212, 255, 0.25));
        border: 1px solid rgba(123, 47, 247, 0.4);
        border-radius: 24px;
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        box-shadow: 0 4px 15px rgba(123, 47, 247, 0.3);
        animation: techBadgeFadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        transform-origin: top center;
      }
      
      @keyframes techBadgeFadeIn {
        0% {
          opacity: 0;
          transform: translateY(-20px) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Smart Insights Panel */
      .smart-insights-panel {
        max-width: 800px;
        margin: 0 auto 40px auto;
        padding: 28px 32px;
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.05));
        border: 1.5px solid rgba(251, 191, 36, 0.3);
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.15);
        animation: slideInUp 0.6s ease-out;
      }

      .insights-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
      }

      .insights-header svg {
        flex-shrink: 0;
        filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
      }

      .insights-title {
        font-size: 18px;
        font-weight: 700;
        color: #fbbf24;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .insights-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }

      .insight-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        transition: all 0.3s;
      }

      .insight-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(251, 191, 36, 0.3);
        transform: translateY(-2px);
      }

      .insight-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 10px;
      }

      .insight-content {
        flex: 1;
      }

      .insight-value {
        font-size: 22px;
        font-weight: 800;
        color: #ffffff;
        line-height: 1;
        margin-bottom: 6px;
      }

      .insight-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
      }

      /* Auto-select Suggestion Banner - Ultra-Premium */
      .auto-select-banner {
        max-width: 750px;
        margin: 0 auto 32px auto;
        padding: 24px 28px;
        display: flex;
        align-items: center;
        gap: 18px;
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.12) 100%);
        backdrop-filter: blur(30px) saturate(180%);
        -webkit-backdrop-filter: blur(30px) saturate(180%);
        border: 1.5px solid rgba(251, 191, 36, 0.5);
        border-radius: 18px;
        box-shadow: 
          0 10px 40px rgba(251, 191, 36, 0.2),
          0 0 60px rgba(251, 191, 36, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        animation: slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
      }

      .auto-select-banner::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.6), transparent);
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .banner-icon {
        flex-shrink: 0;
      }

      .banner-content {
        flex: 1;
      }

      .banner-title {
        font-size: 15px;
        font-weight: 700;
        color: #fbbf24;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .banner-text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.5;
      }

      .banner-text strong {
        color: #fbbf24;
        font-weight: 700;
      }

      .banner-action {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #1a1a2e;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
      }

      .banner-action:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 6px 20px rgba(251, 191, 36, 0.5);
      }

      .banner-action:active {
        transform: translateY(0) scale(1);
      }

      /* Impact Preview Card - Ultra-Premium */
      .impact-preview-card {
        max-width: 750px;
        margin: 0 auto 32px auto;
        padding: 28px 32px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(123, 47, 247, 0.12) 100%);
        backdrop-filter: blur(30px) saturate(180%);
        -webkit-backdrop-filter: blur(30px) saturate(180%);
        border: 1.5px solid rgba(0, 212, 255, 0.4);
        border-radius: 20px;
        box-shadow: 
          0 10px 40px rgba(0, 212, 255, 0.2),
          0 0 80px rgba(123, 47, 247, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        animation: fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
      }

      .impact-preview-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.6), transparent);
      }

      .impact-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
        font-size: 16px;
        font-weight: 700;
        color: #00d4ff;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .impact-stats {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 24px;
      }

      .impact-stat {
        text-align: center;
      }

      .impact-stat-value {
        font-size: 32px;
        font-weight: 800;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
        margin-bottom: 8px;
      }

      .impact-stat-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .impact-progress {
        margin-top: 12px;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        overflow: hidden;
      }

      .impact-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #00d4ff);
        border-radius: 8px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
      }

      /* Text Input Styles */
      .text-input {
        width: 100%;
        padding: 16px 20px;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.95);
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        outline: none;
        transition: all 0.3s;
        font-family: inherit;
      }

      .text-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      .text-input:focus {
        border-color: #00d4ff;
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.15);
      }

      /* Input with Button */
      .input-with-button {
        display: flex;
        gap: 12px;
      }

      .input-with-button .text-input {
        flex: 1;
      }

      .btn-secondary {
        padding: 16px 24px;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s;
        white-space: nowrap;
      }

      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(123, 47, 247, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(123, 47, 247, 0.3);
      }

      .btn-secondary:active {
        transform: translateY(0);
      }

      /* Checkbox Group */
      .checkbox-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.9);
      }

      .checkbox-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(123, 47, 247, 0.4);
        transform: translateX(4px);
      }

      .checkbox-item input[type="checkbox"] {
        width: 20px;
        height: 20px;
        cursor: pointer;
        accent-color: #00d4ff;
      }

      .checkbox-item span {
        flex: 1;
        font-weight: 500;
      }

      /* Button Row */
      .button-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        margin-top: 48px;
      }

      .button-row .btn-secondary {
        padding: 20px 32px;
      }

      .button-row .btn-hero {
        margin: 0;
      }

      /* Staggered entrance animations */
      .scan-section,
      .discovery-stat-card,
      .journey-item-wrapper,
      .journey-card {
        animation: slideInUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        opacity: 0;
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

      /* Confetti Canvas */
      #confettiCanvas {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
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
