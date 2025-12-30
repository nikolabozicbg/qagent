import * as vscode from 'vscode';
import { CoverageTreeProvider } from './coverageTreeProvider';
import { CoverageWebviewProvider } from './webviews/coverage.webview';
import { ChatPanelProvider } from './providers/chat-panel.provider';
import { CoverageCodeLensProvider, TestCodeLensProvider } from './providers';
import { StatusBarService } from './services/statusBar.service';
import { TestQualityAnalyzerService } from './services/test-quality-analyzer.service';
import { AppLauncherService } from './services/app-launcher.service';
import { RouteCrawlerService } from './services/route-crawler.service';
import { UserFlowGeneratorService } from './services/user-flow-generator.service';
import { OpenAPIParserService } from './services/openapi-parser.service';
import { TestPreviewWebviewProvider } from './webviews/test-preview.webview';
import { FlowStateService } from './services/flow-state.service';

/**
 * Service Container for dependency injection
 * Centralizes all service instantiation and provides access to services
 */
export class ServiceContainer {
    // Core providers
    public readonly coverageProvider: CoverageTreeProvider;
    public readonly coverageWebviewProvider: CoverageWebviewProvider;
    public readonly chatProvider: ChatPanelProvider;
    public readonly codeLensProvider: CoverageCodeLensProvider;
    public readonly testCodeLensProvider: TestCodeLensProvider;
    
    // Services
    public readonly statusBarService: StatusBarService;
    public readonly testQualityAnalyzer: TestQualityAnalyzerService;
    
    // Dynamic Analysis services
    public readonly appLauncher: AppLauncherService;
    public readonly routeCrawler: RouteCrawlerService;
    public readonly flowGenerator: UserFlowGeneratorService;
    public readonly openApiParser: OpenAPIParserService;
    public readonly testPreviewProvider: TestPreviewWebviewProvider;
    public readonly flowStateService: FlowStateService;

    constructor(context: vscode.ExtensionContext) {
        // Initialize core providers
        this.coverageProvider = new CoverageTreeProvider();
        this.coverageWebviewProvider = new CoverageWebviewProvider(context.extensionUri);
        this.chatProvider = new ChatPanelProvider(context.extensionUri, this.coverageProvider);
        this.codeLensProvider = new CoverageCodeLensProvider();
        this.testCodeLensProvider = new TestCodeLensProvider();
        
        // Initialize services
        this.statusBarService = new StatusBarService();
        this.testQualityAnalyzer = new TestQualityAnalyzerService();
        
        // Initialize dynamic analysis services
        this.appLauncher = new AppLauncherService();
        this.routeCrawler = new RouteCrawlerService();
        this.flowGenerator = new UserFlowGeneratorService();
        this.openApiParser = new OpenAPIParserService();
        this.testPreviewProvider = new TestPreviewWebviewProvider(context.extensionUri);
        this.flowStateService = new FlowStateService(context);
        
        // Register disposables
        context.subscriptions.push(this.statusBarService);
    }

    /**
     * Wire up event handlers between services
     */
    public wireEvents() {
        // Connect coverage provider data to webview
        this.coverageProvider.onDidChangeData((stacks) => {
            this.coverageWebviewProvider.updateData(stacks);
        });
        
        // Subscribe to app status changes
        this.appLauncher.onStatusChange((status) => {
            this.coverageWebviewProvider.updateAppStatus(status);
        });
    }

    /**
     * Sync existing data to webview after initialization
     */
    public syncExistingData() {
        const stacks = this.coverageProvider.getStacks();
        if (stacks.length > 0) {
            this.coverageWebviewProvider.updateData(stacks);
        }
    }

    /**
     * Get dynamic analysis services bundle
     */
    public getDynamicAnalysisServices() {
        return {
            appLauncher: this.appLauncher,
            routeCrawler: this.routeCrawler,
            flowGenerator: this.flowGenerator,
            openApiParser: this.openApiParser,
            testPreviewProvider: this.testPreviewProvider,
            flowStateService: this.flowStateService,
            coverageWebviewProvider: this.coverageWebviewProvider
        };
    }
}
