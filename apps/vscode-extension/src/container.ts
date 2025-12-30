import * as vscode from 'vscode';
import { OnboardingService } from './services/onboarding.service';
import { DashboardService } from './services/dashboard.service';
import { TestGenerationService } from './services/test-generation.service';
import { DashboardWebviewProvider } from './webviews/dashboard.webview';
import { DiscoveryResultsWebviewProvider } from './webviews/discovery-results.webview';
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
  private _dashboardProvider?: DashboardWebviewProvider;
  private _discoveryResultsProvider?: DiscoveryResultsWebviewProvider;

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

  get discoveryResultsProvider(): DiscoveryResultsWebviewProvider {
    if (!this._discoveryResultsProvider) {
      this._discoveryResultsProvider = new DiscoveryResultsWebviewProvider(
        this.context,
        async (journeyIds: string[]) => {
          // Handle test generation from discovery results
          vscode.window.showInformationMessage(`Generating tests for ${journeyIds.length} journeys...`);
          // TODO: Implement test generation
        }
      );
    }
    return this._discoveryResultsProvider;
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
    
    // Register discovery results webview provider
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        DiscoveryResultsWebviewProvider.viewType,
        this.discoveryResultsProvider
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

  /**
   * Show discovery results screen
   */
  async showDiscoveryResults(journeys: DiscoveredFlow[], projectInfo?: any): Promise<void> {
    this.discoveryResultsProvider.updateJourneys(journeys, projectInfo);
    this.discoveryResultsProvider.show();
  }
}
