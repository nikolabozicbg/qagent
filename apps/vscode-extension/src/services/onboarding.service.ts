import * as vscode from 'vscode';
import {
  OnboardingState,
  OnboardingStep,
  DetectedStack,
  E2EConfig,
  DiscoveredFlow,
} from '../types';
import { ProjectDetectionService } from './project-detection.service';
import { FlowDiscoveryService } from './flow-discovery.service';
import { PlaywrightService } from './playwright.service';
import { log } from '../extension';

/**
 * OnboardingService - Manages the first-run wizard experience
 * 
 * Handles:
 * - 5-step wizard navigation
 * - Framework detection
 * - E2E/API configuration
 * - Flow/Endpoint discovery
 */
export class OnboardingService {
  private static readonly STATE_KEY = 'qagenai.onboardingState';
  private panel?: vscode.WebviewPanel;
  private state: OnboardingState;
  private projectDetection: ProjectDetectionService;
  private flowDiscovery: FlowDiscoveryService;
  private playwrightService: PlaywrightService;
  
  // Flags to prevent duplicate operations
  private isDiscoveringFlows = false;
  private isDetectingFrameworks = false;
  
  // Playwright status cache
  private playwrightStatus: { installed: boolean; hasConfig: boolean; testDir: string; baseURL: string } | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.state = this.getInitialState();
    this.projectDetection = new ProjectDetectionService();
    this.flowDiscovery = new FlowDiscoveryService();
    this.playwrightService = new PlaywrightService();
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Start or resume the onboarding wizard
   */
  async startOnboarding(forceReset = false): Promise<void> {
    // Load saved state if exists
    const savedState = this.context.globalState.get<OnboardingState>(OnboardingService.STATE_KEY);
    if (savedState && !savedState.completed && !forceReset) {
      this.state = savedState;
    } else {
      // Reset to initial state (fresh start)
      this.state = this.getInitialState();
      // Also clear dashboard flows so they get re-synced
      await this.context.workspaceState.update('qagenai.dashboardFlows', undefined);
    }

    // Create and show webview panel
    this.panel = vscode.window.createWebviewPanel(
      'qagenai.onboarding',
      'QAgenAI Setup',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    // Set initial content
    this.panel.webview.html = this.getWebviewContent();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => await this.handleMessage(message),
      undefined,
      this.context.subscriptions
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  /**
   * Navigate to next step
   */
  async nextStep(): Promise<void> {
    const steps: OnboardingStep[] = [
      'welcome',
      'framework-detection',
      'e2e-setup',
      'flow-discovery',
      'ready',
    ];

    const currentIndex = steps.indexOf(this.state.currentStep);
    if (currentIndex < steps.length - 1) {
      this.state.currentStep = steps[currentIndex + 1];
      await this.saveState();
      this.updateWebview();
    }
  }

  /**
   * Navigate to previous step
   */
  async prevStep(): Promise<void> {
    const steps: OnboardingStep[] = [
      'welcome',
      'framework-detection',
      'e2e-setup',
      'flow-discovery',
      'ready',
    ];

    const currentIndex = steps.indexOf(this.state.currentStep);
    if (currentIndex > 0) {
      this.state.currentStep = steps[currentIndex - 1];
      await this.saveState();
      this.updateWebview();
    }
  }

  /**
   * Complete onboarding and show dashboard
   */
  async completeOnboarding(): Promise<void> {
    this.state.completed = true;
    await this.saveState();
    await this.context.globalState.update('qagenai.onboardingCompleted', true);
    
    // CRITICAL: Migrate discovered flows to dashboard workspace state
    if (this.state.discoveredFlows.length > 0) {
      log('Migrating', this.state.discoveredFlows.length, 'flows to dashboard');
      
      // Convert DiscoveredFlow to DashboardFlow (add status field)
      const dashboardFlows = this.state.discoveredFlows.map(flow => ({
        ...flow,
        status: 'draft', // All new flows start as draft
      }));
      
      await this.context.workspaceState.update('qagenai.dashboardFlows', dashboardFlows);
      log('Flows migrated successfully');
    } else {
      log('No flows to migrate');
    }
    
    // Close wizard panel
    this.panel?.dispose();

    // Show success message
    const flowCount = this.state.discoveredFlows.length;
    vscode.window.showInformationMessage(
      `QAgenAI setup complete! Discovered ${flowCount} flows. Opening dashboard...`
    );

    // Focus dashboard
    await vscode.commands.executeCommand('qagenai.dashboard.focus');
  }

  // ============================================
  // Step Handlers
  // ============================================

  /**
   * Detect frameworks in workspace
   */
  async detectFrameworks(): Promise<DetectedStack> {
    // Skip if already detecting or already have results
    if (this.isDetectingFrameworks) {
      return this.state.detectedStack;
    }
    
    const hasResults = this.state.detectedStack.frontend || this.state.detectedStack.backend;
    if (hasResults) {
      return this.state.detectedStack;
    }
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return this.getEmptyStack();
    }

    this.isDetectingFrameworks = true;
    
    try {
      // Use real detection service
      const stack = await this.projectDetection.detectStack(workspaceFolder.uri.fsPath);
      this.state.detectedStack = stack;
      await this.saveState();
      return stack;
    } finally {
      this.isDetectingFrameworks = false;
    }
  }

  /**
   * Save E2E configuration
   */
  async saveE2EConfig(config: E2EConfig): Promise<void> {
    this.state.e2eConfig = config;
    await this.saveState();
  }

  /**
   * Discover user flows in codebase using HOLISTIC ANALYSIS
   */
  async discoverFlows(): Promise<DiscoveredFlow[]> {
    log('discoverFlows called (HOLISTIC), existing:', this.state.discoveredFlows.length);
    
    // Skip if already discovering or already have results
    if (this.isDiscoveringFlows) {
      log('Already discovering, returning cached');
      return this.state.discoveredFlows;
    }
    
    if (this.state.discoveredFlows.length > 0) {
      log('Already have flows, returning cached');
      return this.state.discoveredFlows;
    }
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      log('No workspace folder');
      return [];
    }

    this.isDiscoveringFlows = true;
    
    try {
      log('Starting HOLISTIC journey discovery for:', workspaceFolder.uri.fsPath);
      
      // Import BackendAPIService dynamically
      const { BackendAPIService } = await import('./backend-api.service');
      const backendAPI = new BackendAPIService();
      
      // Check backend availability
      const isAvailable = await backendAPI.isAvailable();
      if (!isAvailable) {
        log('Backend not available, falling back to rule-based discovery');
        const flows = await this.flowDiscovery.discoverFlows(workspaceFolder.uri.fsPath);
        this.state.discoveredFlows = flows;
        await this.saveState();
        return flows;
      }
      
      // Use holistic analysis to get smart journeys
      const journeys = await backendAPI.discoverJourneysHolistic(workspaceFolder.uri.fsPath);
      log('Holistic analysis returned:', journeys.length, 'journeys');
      
      // Enrich EACH journey with full context (selectors, validations, APIs, state)
      log('Enriching journeys with holistic context...');
      const enrichedJourneys = [];
      
      for (const journey of journeys) {
        try {
          // Call backend to get enriched context for this journey
          const response = await fetch(`${backendAPI['baseUrl']}/analyze/journey-context`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              journey,
              workspacePath: workspaceFolder.uri.fsPath
            }),
            signal: AbortSignal.timeout(30000)
          });
          
          if (response.ok) {
            const result = await response.json() as { success: boolean; context?: any };
            if (result.success && result.context) {
              enrichedJourneys.push(result.context);
              log(`✅ Enriched journey: ${journey.name}`);
            } else {
              log(`⚠️  Failed to enrich: ${journey.name}`);
              enrichedJourneys.push({ journey }); // Fallback to basic journey
            }
          } else {
            enrichedJourneys.push({ journey }); // Fallback
          }
        } catch (error) {
          log(`❌ Error enriching ${journey.name}:`, error);
          enrichedJourneys.push({ journey }); // Fallback
        }
      }
      
      log('Enriched', enrichedJourneys.length, 'journeys with full context');
      
      // Convert enriched journeys to DiscoveredFlow format
      const flows: DiscoveredFlow[] = enrichedJourneys.map((enrichedContext, index) => {
        const journey = enrichedContext.journey;
        return {
          id: String(index + 1),
          name: journey.name,
          description: journey.description,
          confidence: journey.priority,
          routes: this.extractRoutesFromJourney(journey),
          components: this.extractComponentsFromJourney(journey),
          selected: journey.priority >= 85,
          // Store ENRICHED context (has componentsAnalysis with selectors!)
          journeyData: enrichedContext
        };
      });
      
      log('Converted to', flows.length, 'flows for dashboard');
      this.state.discoveredFlows = flows;
      await this.saveState();
      log('State saved with', this.state.discoveredFlows.length, 'flows');
      return flows;
    } catch (error) {
      log('Holistic discovery failed, falling back:', error);
      // Fallback to old discovery
      const flows = await this.flowDiscovery.discoverFlows(workspaceFolder.uri.fsPath);
      this.state.discoveredFlows = flows;
      await this.saveState();
      return flows;
    } finally {
      this.isDiscoveringFlows = false;
    }
  }
  
  /**
   * Extract routes from journey steps
   */
  private extractRoutesFromJourney(journey: any): string[] {
    const routes = new Set<string>();
    for (const step of journey.steps || []) {
      if (step.action === 'navigate' && step.target.startsWith('/')) {
        routes.add(step.target);
      }
    }
    return Array.from(routes);
  }
  
  /**
   * Extract component names from journey steps
   */
  private extractComponentsFromJourney(journey: any): string[] {
    const components = new Set<string>();
    for (const step of journey.steps || []) {
      if (step.component && step.component !== 'User') {
        // Extract just the filename from path like src/components/Login.js
        const filename = step.component.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '');
        if (filename) {
          components.add(filename);
        }
      }
    }
    return Array.from(components);
  }

  // ============================================
  // Private Methods
  // ============================================

  private async handleMessage(message: { command: string; data?: unknown }): Promise<void> {
    switch (message.command) {
      case 'next':
        await this.nextStep();
        break;
      case 'prev':
        await this.prevStep();
        break;
      case 'complete':
        await this.completeOnboarding();
        break;
      case 'detectFrameworks':
        await this.detectFrameworks();
        this.updateWebview();
        break;
      case 'saveE2EConfig':
        await this.saveE2EConfig(message.data as E2EConfig);
        break;
      case 'discoverFlows':
        await this.discoverFlows();
        this.updateWebview();
        break;
      case 'rescanFlows':
        // Force re-discovery - clear all caches
        this.state.discoveredFlows = [];
        await this.context.workspaceState.update('qagenai.dashboardFlows', undefined);
        await this.saveState();
        await this.discoverFlows();
        this.updateWebview();
        break;
      case 'skip':
        await this.completeOnboarding();
        break;
      case 'installPlaywright':
        await this.playwrightService.install();
        break;
      case 'refreshPlaywright':
        // Clear cache and refresh status
        this.playwrightService.clearCache();
        await this.checkPlaywrightStatus();
        this.updateWebview();
        break;
      case 'checkPlaywright':
        // Check Playwright status for E2E setup step
        await this.checkPlaywrightStatus();
        this.updateWebview();
        break;
    }
  }

  /**
   * Check Playwright installation status
   */
  private async checkPlaywrightStatus(): Promise<void> {
    this.playwrightStatus = await this.playwrightService.getStatus();
    log('Playwright status:', this.playwrightStatus);
  }

  private postMessage(message: { command: string; data?: unknown }): void {
    this.panel?.webview.postMessage(message);
  }

  private updateWebview(): void {
    if (this.panel) {
      this.panel.webview.html = this.getWebviewContent();
    }
  }

  private async saveState(): Promise<void> {
    log('Saving onboarding state:', {
      step: this.state.currentStep,
      completed: this.state.completed,
      flowCount: this.state.discoveredFlows.length,
    });
    await this.context.globalState.update(OnboardingService.STATE_KEY, this.state);
  }

  private getInitialState(): OnboardingState {
    return {
      currentStep: 'welcome',
      completed: false,
      detectedStack: this.getEmptyStack(),
      e2eConfig: {
        baseUrl: '',
        auth: { type: 'none' },
        importedSources: [],
      },
      discoveredFlows: [],
      scanResults: null,
    };
  }

  private getEmptyStack(): DetectedStack {
    return {
      isMonorepo: false,
    };
  }

  private getWebviewContent(): string {
    const step = this.state.currentStep;
    const stack = this.state.detectedStack;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgenAI Setup</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1e1e1e;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { max-width: 600px; padding: 48px; text-align: center; }
    .logo { font-size: 48px; margin-bottom: 24px; }
    h1 {
      font-size: 28px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #a855f7, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h2 { font-size: 20px; margin-bottom: 8px; color: #fff; }
    p { color: rgba(255,255,255,0.7); margin-bottom: 24px; line-height: 1.6; }
    .step-indicator { display: flex; justify-content: center; gap: 8px; margin-bottom: 32px; }
    .step-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.2); }
    .step-dot.active { background: #a855f7; }
    .step-dot.done { background: #22c55e; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 14px 28px; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .btn-primary { background: linear-gradient(135deg, #a855f7, #9333ea); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(168,85,247,0.4); }
    .btn-secondary { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); margin-left: 12px; }
    .btn-secondary:hover { background: rgba(255,255,255,0.15); }
    .btn-ghost { background: transparent; color: rgba(255,255,255,0.6); }
    .card {
      text-align: left; margin: 24px 0; padding: 20px;
      background: rgba(255,255,255,0.05); border-radius: 12px;
    }
    .stack-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .stack-item:last-child { border-bottom: none; }
    .stack-label { color: rgba(255,255,255,0.6); font-size: 13px; }
    .stack-value { color: #fff; font-weight: 500; display: flex; align-items: center; gap: 8px; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-green { background: rgba(34,197,94,0.2); color: #22c55e; }
    .badge-yellow { background: rgba(234,179,8,0.2); color: #eab308; }
    .badge-red { background: rgba(239,68,68,0.2); color: #ef4444; }
    .features { text-align: left; margin: 24px 0; padding: 24px; background: rgba(255,255,255,0.05); border-radius: 12px; }
    .feature { display: flex; align-items: center; gap: 12px; padding: 12px 0; color: rgba(255,255,255,0.8); }
    .feature-icon { color: #22c55e; }
    .actions { margin-top: 32px; display: flex; justify-content: center; gap: 12px; }
    .loading { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-size: 14px; margin-bottom: 16px; }
    .input:focus { outline: none; border-color: #a855f7; }
    .input::placeholder { color: rgba(255,255,255,0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="step-indicator">
      ${this.renderStepDots()}
    </div>
    
    <div id="step-content">
      ${this.renderStepContent()}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function send(command, data) {
      vscode.postMessage({ command, data });
    }
    
    function next() { send('next'); }
    function prev() { send('prev'); }
    function skip() { send('skip'); }
    function complete() { send('complete'); }
    function detectFrameworks() { send('detectFrameworks'); }
    function discoverFlows() { send('discoverFlows'); }
    function installPlaywright() { send('installPlaywright'); }
    function refreshPlaywright() { send('refreshPlaywright'); }
    function checkPlaywright() { send('checkPlaywright'); }
    
    // Auto-trigger detection on steps
    ${step === 'framework-detection' ? 'detectFrameworks();' : ''}
    ${step === 'flow-discovery' ? 'discoverFlows();' : ''}
    ${step === 'e2e-setup' && !this.playwrightStatus ? 'checkPlaywright();' : ''}
    
    // No need to handle messages - extension will update HTML directly
  </script>
</body>
</html>`;
  }

  private renderStepDots(): string {
    const steps: OnboardingStep[] = ['welcome', 'framework-detection', 'e2e-setup', 'flow-discovery', 'ready'];
    const currentIndex = steps.indexOf(this.state.currentStep);
    
    return steps.map((step, i) => {
      let className = 'step-dot';
      if (i < currentIndex) className += ' done';
      if (step === this.state.currentStep) className += ' active';
      return `<div class="${className}"></div>`;
    }).join('');
  }

  private renderStepContent(): string {
    switch (this.state.currentStep) {
      case 'welcome':
        return this.renderWelcome();
      case 'framework-detection':
        return this.renderFrameworkDetection();
      case 'e2e-setup':
        return this.renderE2ESetup();
      case 'flow-discovery':
        return this.renderFlowDiscovery();
      case 'ready':
        return this.renderReady();
      default:
        return this.renderWelcome();
    }
  }

  private renderWelcome(): string {
    return `
      <div class="logo">⚡</div>
      <h1>Welcome to QAgenAI</h1>
      <p>Flow-first test generation for QA engineers.<br>Let's set up your workspace in less than 5 minutes.</p>
      
      <div class="features">
        <div class="feature"><span class="feature-icon">✓</span><span>Describe flows in plain English</span></div>
        <div class="feature"><span class="feature-icon">✓</span><span>AI generates Playwright tests</span></div>
        <div class="feature"><span class="feature-icon">✓</span><span>Self-healing selectors</span></div>
        <div class="feature"><span class="feature-icon">✓</span><span>One-click CI export</span></div>
      </div>
      
      <div class="actions">
        <button class="btn btn-primary" onclick="next()">🚀 Start QA Setup</button>
        <button class="btn btn-ghost" onclick="skip()">Skip for now</button>
      </div>
    `;
  }

  private renderFrameworkDetection(): string {
    const stack = this.state.detectedStack;
    const hasResults = stack.frontend || stack.backend || stack.e2e || stack.unit;
    const isBackendOnly = stack.projectType === 'backend';
    
    if (!hasResults) {
      return `
        <div class="logo">🔍</div>
        <h1>Detecting Your Stack</h1>
        <p>Analyzing your project structure...</p>
        <div class="loading">
          <div class="spinner"></div>
          <span style="color: rgba(255,255,255,0.6)">Scanning package.json and config files...</span>
        </div>
      `;
    }
    
    // E2E testing row - different for backend projects
    const testingRow = isBackendOnly 
      ? (stack.unit ? `
          <div class="stack-item">
            <span class="stack-label">API Testing</span>
            <span class="stack-value">${stack.unit.framework} + Supertest <span class="badge badge-green">Ready</span></span>
          </div>
        ` : `
          <div class="stack-item">
            <span class="stack-label">API Testing</span>
            <span class="stack-value">Jest + Supertest <span class="badge badge-yellow">Recommended</span></span>
          </div>
        `)
      : (stack.e2e ? `
          <div class="stack-item">
            <span class="stack-label">E2E Testing</span>
            <span class="stack-value">
              ${stack.e2e.framework}
              <span class="badge ${stack.e2e.installed ? 'badge-green' : 'badge-yellow'}">
                ${stack.e2e.installed ? 'Installed' : 'Not installed'}
              </span>
            </span>
          </div>
        ` : `
          <div class="stack-item">
            <span class="stack-label">E2E Testing</span>
            <span class="stack-value">None detected <span class="badge badge-yellow">Will setup Playwright</span></span>
          </div>
        `);
    
    return `
      <div class="logo">🎯</div>
      <h1>Detected Stack</h1>
      <p>We found the following technologies in your project:</p>
      
      <div class="card">
        ${stack.frontend ? `
          <div class="stack-item">
            <span class="stack-label">Frontend</span>
            <span class="stack-value">${stack.frontend.framework} ${stack.frontend.version || ''} ${stack.frontend.buildTool ? `· ${stack.frontend.buildTool}` : ''}</span>
          </div>
        ` : ''}
        ${stack.backend ? `
          <div class="stack-item">
            <span class="stack-label">Backend</span>
            <span class="stack-value">${stack.backend.framework} ${stack.backend.version || ''} ${stack.backend.orm ? `· ${stack.backend.orm}` : ''}</span>
          </div>
        ` : ''}
        ${testingRow}
        ${stack.unit && !isBackendOnly ? `
          <div class="stack-item">
            <span class="stack-label">Unit Testing</span>
            <span class="stack-value">${stack.unit.framework} <span class="badge badge-green">Installed</span></span>
          </div>
        ` : ''}
        <div class="stack-item">
          <span class="stack-label">Project Type</span>
          <span class="stack-value">${isBackendOnly ? 'Backend API' : (stack.projectType === 'fullstack' ? 'Fullstack' : 'Frontend App')}</span>
        </div>
      </div>
      
      <div class="actions">
        <button class="btn btn-secondary" onclick="prev()">← Back</button>
        <button class="btn btn-primary" onclick="next()">Continue →</button>
      </div>
    `;
  }

  private renderE2ESetup(): string {
    const isBackendOnly = this.state.detectedStack.projectType === 'backend';
    
    if (isBackendOnly) {
      // Backend projects: API Testing configuration
      return `
        <div class="logo">🔌</div>
        <h1>API Testing Configuration</h1>
        <p>Configure your API testing environment:</p>
        
        <div class="card">
          <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.6); font-size: 13px;">API Base URL</label>
          <input class="input" type="text" placeholder="http://localhost:3000/api" id="baseUrl" value="${this.state.e2eConfig.baseUrl || 'http://localhost:3000'}" />
          
          <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.6); font-size: 13px;">Default Authentication</label>
          <select class="input" id="authType" style="background: rgba(255,255,255,0.1);">
            <option value="none" ${this.state.e2eConfig.auth.type === 'none' ? 'selected' : ''}>No authentication</option>
            <option value="bearer" ${this.state.e2eConfig.auth.type === 'bearer' ? 'selected' : ''}>Bearer token (JWT)</option>
          </select>
        </div>
        
        <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 8px;">
          Tests will use Jest + Supertest for API integration testing.
        </p>
        
        <div class="actions">
          <button class="btn btn-secondary" onclick="prev()">← Back</button>
          <button class="btn btn-primary" onclick="next()">Continue →</button>
        </div>
      `;
    }
    
    // Frontend/Fullstack: E2E Configuration with Playwright
    const pwStatus = this.playwrightStatus;
    
    // If we don't have status yet, show loading and trigger check
    if (!pwStatus) {
      return `
        <div class="logo">🎭</div>
        <h1>E2E Testing Setup</h1>
        <p>Checking Playwright installation...</p>
        <div class="loading">
          <div class="spinner"></div>
          <span style="color: rgba(255,255,255,0.6)">Detecting testing framework...</span>
        </div>
        <script>checkPlaywright();</script>
      `;
    }
    
    // Playwright IS installed
    if (pwStatus.installed) {
      return `
        <div class="logo">🎭</div>
        <h1>E2E Testing Setup</h1>
        <p>Playwright is ready for E2E testing!</p>
        
        <div class="card">
          <div class="stack-item">
            <span class="stack-label">Playwright</span>
            <span class="stack-value"><span class="badge badge-green">✓ Installed</span></span>
          </div>
          <div class="stack-item">
            <span class="stack-label">Test Directory</span>
            <span class="stack-value" style="font-family: monospace; font-size: 13px;">${pwStatus.testDir}/</span>
          </div>
          <div class="stack-item">
            <span class="stack-label">Base URL</span>
            <span class="stack-value" style="font-family: monospace; font-size: 13px;">${pwStatus.baseURL}</span>
          </div>
        </div>
        
        <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 8px;">
          Generated tests will be saved to <strong>${pwStatus.testDir}/</strong>
        </p>
        
        <div class="actions">
          <button class="btn btn-secondary" onclick="prev()">← Back</button>
          <button class="btn btn-primary" onclick="next()">Continue →</button>
        </div>
      `;
    }
    
    // Playwright NOT installed - show install button
    return `
      <div class="logo">🎭</div>
      <h1>E2E Testing Setup</h1>
      <p>Playwright is required for E2E test generation.</p>
      
      <div class="card">
        <div class="stack-item">
          <span class="stack-label">Playwright</span>
          <span class="stack-value"><span class="badge badge-yellow">Not installed</span></span>
        </div>
      </div>
      
      <div style="margin: 24px 0;">
        <button class="btn btn-primary" onclick="installPlaywright()" style="width: 100%;">
          🔧 Install Playwright
        </button>
      </div>
      
      <p style="font-size: 12px; color: rgba(255,255,255,0.4);">
        This will open a terminal and run <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">npm init playwright@latest</code>.
        Follow the prompts, then click Refresh.
      </p>
      
      <div class="actions" style="margin-top: 16px;">
        <button class="btn btn-secondary" onclick="refreshPlaywright()">🔄 Refresh</button>
        <button class="btn btn-ghost" onclick="next()">Skip for now →</button>
      </div>
    `;
  }

  private renderFlowDiscovery(): string {
    const flows = this.state.discoveredFlows;
    const isBackendOnly = this.state.detectedStack.projectType === 'backend';
    
    // Different loading message for backend
    if (flows.length === 0) {
      return `
        <div class="logo">${isBackendOnly ? '🔌' : '🧠'}</div>
        <h1>${isBackendOnly ? 'Discovering Endpoints' : 'Discovering Flows'}</h1>
        <p>AI is analyzing your codebase for ${isBackendOnly ? 'API endpoints' : 'user flows'}...</p>
        <div class="loading">
          <div class="spinner"></div>
          <span style="color: rgba(255,255,255,0.6)">${isBackendOnly ? 'Scanning controllers and routes...' : 'Analyzing routes, components, and user journeys...'}</span>
        </div>
      `;
    }
    
    // Different display for backend endpoints
    if (isBackendOnly) {
      return `
        <div class="logo">🔌</div>
        <h1>Discovered Endpoints</h1>
        <p>We found ${flows.length} API endpoints that need testing:</p>
        
        <div class="card">
          ${flows.map(f => `
            <div class="stack-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
              <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <span class="stack-value">${f.name}</span>
                ${f.routes && f.routes.length > 0 ? `
                  <span style="font-size: 11px; color: #22c55e; font-family: monospace;">${f.routes[0]}</span>
                ` : ''}
              </div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${f.description}</div>
            </div>
          `).join('')}
        </div>
        
        <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 8px;">
          These endpoints will appear in your dashboard for API test generation.
        </p>
        
        <div class="actions">
          <button class="btn btn-secondary" onclick="prev()">← Back</button>
          <button class="btn btn-primary" onclick="next()">Continue →</button>
        </div>
      `;
    }
    
    // Frontend: User flows
    return `
      <div class="logo">🧠</div>
      <h1>Discovered Flows</h1>
      <p>We found ${flows.length} user flows that need E2E testing:</p>
      
      <div class="card">
        ${flows.map(f => `
          <div class="stack-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
              <span class="stack-value">${f.name}</span>
              ${f.routes && f.routes.length > 0 ? `
                <span style="font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace;">${f.routes[0]}</span>
              ` : ''}
            </div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${f.description}</div>
          </div>
        `).join('')}
      </div>
      
      <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 8px;">
        These flows will appear in your dashboard for test generation.
      </p>
      
      <div class="actions">
        <button class="btn btn-secondary" onclick="prev()">← Back</button>
        <button class="btn btn-primary" onclick="next()">Continue →</button>
      </div>
    `;
  }

  private renderReady(): string {
    const isBackendOnly = this.state.detectedStack.projectType === 'backend';
    
    return `
      <div class="logo">🎉</div>
      <h1>You're All Set!</h1>
      <p>QAgenAI is ready to help you generate ${isBackendOnly ? 'API' : ''} tests for your ${isBackendOnly ? 'backend' : 'application'}.</p>
      
      <div class="features">
        <div class="feature"><span class="feature-icon">✓</span><span>Stack detected and configured</span></div>
        <div class="feature"><span class="feature-icon">✓</span><span>${isBackendOnly ? 'API testing' : 'E2E environment'} ready</span></div>
        <div class="feature"><span class="feature-icon">✓</span><span>Codebase scanned</span></div>
        <div class="feature"><span class="feature-icon">✓</span><span>${this.state.discoveredFlows.length} ${isBackendOnly ? 'endpoints' : 'flows'} discovered</span></div>
      </div>
      
      <div class="actions">
        <button class="btn btn-primary" onclick="complete()">🚀 Open Dashboard</button>
      </div>
    `;
  }
}
