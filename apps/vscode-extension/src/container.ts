import * as vscode from 'vscode';
import { OnboardingService } from './services/onboarding.service';
import { DashboardService } from './services/dashboard.service';
import { TestGenerationService } from './services/test-generation.service';
import { DashboardWebviewProvider } from './webviews/dashboard.webview';

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
  private _dashboardProvider?: DashboardWebviewProvider;

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

  get dashboardProvider(): DashboardWebviewProvider {
    if (!this._dashboardProvider) {
      this._dashboardProvider = new DashboardWebviewProvider(
        this.context,
        this.dashboardService,
        this.testGenerationService
      );
    }
    return this._dashboardProvider;
  }

  // ============================================
  // Provider Registration
  // ============================================

  private registerProviders(): void {
    // Register dashboard webview provider
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        DashboardWebviewProvider.viewType,
        this.dashboardProvider
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
    // Focus the QAgenAI sidebar view
    await vscode.commands.executeCommand('qagenai.dashboard.focus');
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    await this.context.globalState.update('qagenai.onboardingCompleted', true);
    await this.showDashboard();
  }
}
