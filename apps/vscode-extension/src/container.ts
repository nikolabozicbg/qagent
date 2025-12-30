import * as vscode from 'vscode';
import { OnboardingService } from './services/onboarding.service';
import { DashboardService } from './services/dashboard.service';
import { TestGenerationService } from './services/test-generation.service';
import { UnifiedMainViewProvider } from './webviews/unified-main.webview';
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
  private _mainViewProvider?: UnifiedMainViewProvider;

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

  get mainViewProvider(): UnifiedMainViewProvider {
    if (!this._mainViewProvider) {
      this._mainViewProvider = new UnifiedMainViewProvider(
        this.context,
        this.dashboardService,
        this.testGenerationService
      );
    }
    return this._mainViewProvider;
  }

  // ============================================
  // Provider Registration
  // ============================================

  private registerProviders(): void {
    // Register unified main webview provider
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        UnifiedMainViewProvider.viewType,
        this.mainViewProvider
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
   * Show main dashboard
   */
  async showDashboard(): Promise<void> {
    // Force refresh first
    await this.mainViewProvider.refresh();
    
    // Focus the unified main view
    await vscode.commands.executeCommand('workbench.view.extension.qagenai');
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    await this.context.globalState.update('qagenai.onboardingCompleted', true);
    await this.showDashboard();
  }

  /**
   * Show discovery results screen
   */
  async showDiscoveryResults(journeys: DiscoveredFlow[], projectInfo?: any): Promise<void> {
    await this.mainViewProvider.showResults(journeys);
  }
}
