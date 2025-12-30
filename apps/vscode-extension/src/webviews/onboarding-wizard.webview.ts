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
  
  private step: 'setup' | 'discovering' | 'results' = 'setup';
  private discoveredJourneys: DiscoveredFlow[] = [];
  private selectedJourneyIds: Set<string> = new Set();
  
  private config = {
    projectType: 'frontend' as 'frontend' | 'backend' | 'fullstack',
    framework: 'auto' as string,
    testType: 'e2e' as 'e2e' | 'unit' | 'integration'
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
      case 'setup':
        return this.renderSetup();
      case 'discovering':
        return this.renderDiscovering();
      case 'results':
        return this.renderResults();
    }
  }

  private renderProgressBar(current: number, total: number): string {
    const percentage = ((current - 1) / (total - 1)) * 100;
    const stepNames = ['Configure', 'Smart Scan', 'Results'];
    
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

  private renderSetup(): string {
    const { projectType, testType } = this.config;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="wizard-container">
    <div class="wizard-content setup">
      ${this.renderProgressBar(1, 3)}
      
      <div class="hero-section">
        <h1 class="title-hero">Configure Your Application</h1>
        <p class="subtitle-hero">Select your project type and testing approach to begin the smart scan</p>
      </div>
      
      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2C5.589 2 2 5.589 2 10s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8zm0 14c-3.309 0-6-2.691-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"/>
            <path d="M10 6c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1s1-.448 1-1V7c0-.552-.448-1-1-1z"/>
          </svg>
          Project Type
        </div>
        <div class="radio-group">
          <label class="radio-card ${projectType === 'frontend' ? 'selected' : ''}" onclick="updateConfig('projectType', 'frontend')">
            <input type="radio" name="projectType" value="frontend" ${projectType === 'frontend' ? 'checked' : ''}>
            <div class="radio-content">
              <div class="radio-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 9h6M9 13h6M9 17h4"/>
                </svg>
              </div>
              <div class="radio-title">Frontend</div>
              <div class="radio-desc">React, Vue, Angular apps</div>
            </div>
          </label>
          <label class="radio-card ${projectType === 'backend' ? 'selected' : ''}" onclick="updateConfig('projectType', 'backend')">
            <input type="radio" name="projectType" value="backend" ${projectType === 'backend' ? 'checked' : ''}>
            <div class="radio-content">
              <div class="radio-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="5" rx="1"/>
                  <rect x="2" y="10" width="20" height="5" rx="1"/>
                  <rect x="2" y="17" width="20" height="5" rx="1"/>
                  <circle cx="6" cy="5.5" r="0.5" fill="currentColor"/>
                  <circle cx="6" cy="12.5" r="0.5" fill="currentColor"/>
                  <circle cx="6" cy="19.5" r="0.5" fill="currentColor"/>
                </svg>
              </div>
              <div class="radio-title">Backend</div>
              <div class="radio-desc">APIs & Services</div>
            </div>
          </label>
          <label class="radio-card ${projectType === 'fullstack' ? 'selected' : ''}" onclick="updateConfig('projectType', 'fullstack')">
            <input type="radio" name="projectType" value="fullstack" ${projectType === 'fullstack' ? 'checked' : ''}>
            <div class="radio-content">
              <div class="radio-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <div class="radio-title">Fullstack</div>
              <div class="radio-desc">Complete application</div>
            </div>
          </label>
        </div>
      </div>

      <div class="config-section">
        <div class="config-label">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M16 4H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 10H4V6h12v8z"/>
          </svg>
          Test Type
        </div>
        <div class="radio-group">
          <label class="radio-card ${testType === 'e2e' ? 'selected' : ''}" onclick="updateConfig('testType', 'e2e')">
            <input type="radio" name="testType" value="e2e" ${testType === 'e2e' ? 'checked' : ''}>
            <div class="radio-content">
              <div class="radio-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="radio-title">E2E Tests</div>
              <div class="radio-desc">Full user journey testing</div>
            </div>
          </label>
          <label class="radio-card disabled">
            <input type="radio" name="testType" value="unit" disabled>
            <div class="radio-content">
              <div class="radio-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div class="radio-title">Unit Tests</div>
              <div class="radio-desc">Coming soon...</div>
            </div>
          </label>
          <label class="radio-card disabled">
            <input type="radio" name="testType" value="integration" disabled>
            <div class="radio-content">
              <div class="radio-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="12" r="3"/>
                  <path d="M9 12h6"/>
                </svg>
              </div>
              <div class="radio-title">Integration</div>
              <div class="radio-desc">Coming soon...</div>
            </div>
          </label>
        </div>
      </div>

      <button class="btn-hero" onclick="startDiscovery()">
        🚀 Start Smart Scan
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
      ${this.renderProgressBar(2, 3)}
      
      <!-- Main Title -->
      <div class="scan-hero">
        <div class="scan-icon-container">
          <div class="scan-icon pulsing">⚡</div>
          <div class="scan-ring"></div>
        </div>
        <h1 class="title-hero">QAgent is analyzing your project...</h1>
        <p class="subtitle-hero">🔍 Scanning workspace...</p>
      </div>
      
      <!-- Progress Bar with Percentage -->
      <div class="main-progress-section">
        <div class="main-progress-bar">
          <div class="main-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="main-progress-label">${progress}% complete</div>
      </div>
      
      <!-- Status Message -->
      <div class="scan-status-message">
        ${statusMessage}
      </div>
      
      <!-- Discovered So Far Section -->
      <div class="discovered-section">
        <div class="discovered-header">📊 Discovered so far:</div>
        <div class="discovered-list">
          ${framework ? `
          <div class="discovered-item">
            <span class="check-icon">✓</span>
            <span class="discovered-text">${framework}${detectedTechnologies.length > 1 ? ' + ' + detectedTechnologies.slice(1, 3).join(' + ') : ''}</span>
          </div>
          ` : ''}
          ${components > 0 ? `
          <div class="discovered-item">
            <span class="check-icon">✓</span>
            <span class="discovered-text">${components} components, ${routes} routes</span>
          </div>
          ` : ''}
          ${apis > 0 ? `
          <div class="discovered-item">
            <span class="check-icon">✓</span>
            <span class="discovered-text">${apis} API endpoints</span>
          </div>
          ` : ''}
          ${forms > 0 ? `
          <div class="discovered-item">
            <span class="check-icon">✓</span>
            <span class="discovered-text">${forms} forms (${Math.max(0, forms - 2)} with validation)</span>
          </div>
          ` : ''}
          <div class="discovered-item warning">
            <span class="check-icon">⚠</span>
            <span class="discovered-text">No tests found</span>
          </div>
        </div>
      </div>
      
      <!-- Smart Insights Section -->
      ${components > 5 ? `
      <div class="insights-section">
        <div class="insights-header">🎯 Smart insights:</div>
        <div class="insights-list">
          <div class="insight-bullet">• Critical user flows detected: ${criticalFlows}</div>
          <div class="insight-bullet">• Test coverage potential: ~${Math.round(coveragePotential)}%</div>
          <div class="insight-bullet">• Estimated test suite: ~${estimatedTestSuite} lines</div>
        </div>
      </div>
      ` : ''}
    </div>
  </div>
  
  <script>
    // Animate counters
    const counters = document.querySelectorAll('.progress-number');
    counters.forEach((counter, index) => {
      const target = parseInt(counter.textContent);
      let current = 0;
      const increment = Math.ceil(target / 20);
      const duration = 1000;
      const stepTime = duration / 20;
      
      setTimeout(() => {
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            counter.textContent = target;
            clearInterval(timer);
          } else {
            counter.textContent = current;
          }
        }, stepTime);
      }, index * 150); // Stagger animation
    });
  </script>
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
      ${this.renderProgressBar(3, 3)}
      
      <div class="icon-success">✨</div>
      <h1 class="title-hero">Discovery Complete!</h1>
      <p class="subtitle-hero">Found ${totalCount} user journeys • ${selectedCount} selected</p>

      <div class="insights-card">
        <div class="insights-title">📈 Project Overview</div>
        <div class="insights-grid">
          <div class="insight-item">
            <div class="insight-label">Journeys Found</div>
            <div class="insight-value">${totalCount}</div>
          </div>
          <div class="insight-item">
            <div class="insight-label">Critical Paths</div>
            <div class="insight-value critical">${categories.critical.length}</div>
          </div>
          <div class="insight-item">
            <div class="insight-label">High Value</div>
            <div class="insight-value high">${categories.high.length}</div>
          </div>
          <div class="insight-item">
            <div class="insight-label">Coverage Est.</div>
            <div class="insight-value">~85%</div>
          </div>
        </div>
      </div>

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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
        background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
        color: #ffffff;
        overflow-x: hidden;
        position: relative;
      }

      /* Animated background particles */
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: 
          radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(55, 178, 255, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(180, 58, 252, 0.1) 0%, transparent 50%);
        animation: float 20s ease-in-out infinite;
        pointer-events: none;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-20px) scale(1.05); }
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
        padding: 24px 56px;
        background: linear-gradient(135deg, #7b2ff7 0%, #f107a3 100%);
        color: #ffffff;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        font-weight: 700;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        margin: 48px 0;
        position: relative;
        overflow: hidden;
        box-shadow: 
          0 10px 40px rgba(123, 47, 247, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        letter-spacing: 0.5px;
        text-transform: uppercase;
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
        transform: translateY(-4px) scale(1.05);
        box-shadow: 
          0 20px 60px rgba(123, 47, 247, 0.7),
          0 0 0 1px rgba(255, 255, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
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
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .radio-card input[type="radio"] {
        position: absolute;
        opacity: 0;
      }

      .radio-card:hover {
        border-color: rgba(123, 47, 247, 0.6);
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 15px 40px rgba(123, 47, 247, 0.3);
      }

      .radio-card.selected {
        border-color: #00d4ff;
        background: linear-gradient(135deg, rgba(123, 47, 247, 0.15), rgba(0, 212, 255, 0.1));
        box-shadow: 
          0 0 40px rgba(0, 212, 255, 0.4),
          0 10px 40px rgba(123, 47, 247, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
