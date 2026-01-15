import * as vscode from 'vscode';
import { OnboardingService } from './services/onboarding.service';
import { DashboardService } from './services/dashboard.service';
import { TestGenerationService } from './services/test-generation.service';
import { PanelManager } from './services/panel-manager.service';
import { CompactSidebarWebview } from './webviews/compact-sidebar.webview';
import { DiscoveredFlow } from './types';

/**
 * ServiceContainer - Clean dependency injection container
 * 
 * Manages all services and provides access to them throughout the extension.
 * Services are lazily initialized when first accessed.
 */
export class ServiceContainer {
  private _onboardingService?: OnboardingService;
  private _dashboardService?: DashboardService;
  private _testGenerationService?: TestGenerationService;
  private _panelManager?: PanelManager;
  private _sidebarProvider?: CompactSidebarWebview;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.registerProviders();
  }

  // ============================================
  // Services (lazy initialization)
  // ============================================

  get onboardingService(): OnboardingService {
    if (!this._onboardingService) {
      this._onboardingService = new OnboardingService(this.context);
    }
    return this._onboardingService;
  }

  get dashboardService(): DashboardService {
    if (!this._dashboardService) {
      this._dashboardService = new DashboardService(this.context);
    }
    return this._dashboardService;
  }

  get testGenerationService(): TestGenerationService {
    if (!this._testGenerationService) {
      this._testGenerationService = new TestGenerationService(this.context);
    }
    return this._testGenerationService;
  }

  get panelManager(): PanelManager {
    if (!this._panelManager) {
      this._panelManager = new PanelManager(this.context, this.dashboardService);
    }
    return this._panelManager;
  }

  get sidebarProvider(): CompactSidebarWebview {
    if (!this._sidebarProvider) {
      this._sidebarProvider = new CompactSidebarWebview(
        this.context,
        this.dashboardService
      );
    }
    return this._sidebarProvider;
  }

  // ============================================
  // Provider Registration
  // ============================================

  private registerProviders(): void {
    // Register compact sidebar webview provider
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        CompactSidebarWebview.viewType,
        this.sidebarProvider
      )
    );
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Show onboarding wizard
   */
  async showOnboarding(): Promise<void> {
    await this.onboardingService.startOnboarding();
  }

  /**
   * Show sidebar (focus sidebar view)
   */
  async showSidebar(): Promise<void> {
    // Refresh sidebar
    await this.sidebarProvider.refresh();
    
    // Focus the sidebar
    await vscode.commands.executeCommand('workbench.view.extension.qagenai');
  }

  /**
   * Show main dashboard in central editor
   */
  async showDashboard(): Promise<void> {
    // Open dashboard in central editor via PanelManager
    this.panelManager.openDashboard();
    
    // Also show sidebar for quick access
    await this.showSidebar();
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    await this.context.globalState.update('qagenai.onboardingCompleted', true);
    await this.showDashboard();
  }

  /**
   * Get dashboard service (for commands)
   */
  get dashboardServicePublic(): DashboardService {
    return this.dashboardService;
  }

  /**
   * Get test generation service (for commands)
   */
  get testGenerationServicePublic(): TestGenerationService {
    return this.testGenerationService;
  }

  /**
   * Show discovery results screen
   */
  async showDiscoveryResults(journeys: DiscoveredFlow[], projectInfo?: any): Promise<void> {
    // TODO: Implement discovery results in central editor panel
    // For now, just refresh sidebar
    await this.sidebarProvider.refresh();
  }

  /**
   * Refresh all views (sidebar + panels)
   * Call this after any data change (add/update/delete flow, test run, etc.)
   */
  async refreshAll(): Promise<void> {
    // Refresh sidebar
    await this.sidebarProvider.refresh();
    
    // Refresh all open panels
    await this.panelManager.refreshAll();
  }
}
