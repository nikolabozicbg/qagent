import * as vscode from 'vscode';
import { CoverageWebviewProvider } from '../webviews/coverage.webview';
import { AppLauncherService } from '../services/app-launcher.service';
import { RouteCrawlerService } from '../services/route-crawler.service';
import { UserFlowGeneratorService } from '../services/user-flow-generator.service';
import { OpenAPIParserService } from '../services/openapi-parser.service';
import { TestPreviewWebviewProvider, PreviewAction } from '../webviews/test-preview.webview';
import { FlowStateService } from '../services/flow-state.service';

// Store last flow analysis globally for generate commands
let lastFlowAnalysis: any = null;

export interface DynamicAnalysisServices {
    appLauncher: AppLauncherService;
    routeCrawler: RouteCrawlerService;
    flowGenerator: UserFlowGeneratorService;
    openApiParser: OpenAPIParserService;
    testPreviewProvider: TestPreviewWebviewProvider;
    flowStateService: FlowStateService;
    coverageWebviewProvider: CoverageWebviewProvider;
}

/**
 * Register all dynamic analysis commands
 */
export function registerDynamicAnalysisCommands(
    context: vscode.ExtensionContext,
    services: DynamicAnalysisServices
) {
    const {
        appLauncher,
        routeCrawler,
        flowGenerator,
        openApiParser,
        testPreviewProvider,
        flowStateService,
        coverageWebviewProvider
    } = services;

    // Subscribe to app status changes
    appLauncher.onStatusChange((status) => {
        coverageWebviewProvider.updateAppStatus(status);
    });

    // Scan App - Start dev server and crawl routes
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.scanApp', async () => {
            await handleScanApp(services);
        })
    );
    
    // Stop App
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.stopApp', async () => {
            await appLauncher.stop();
            vscode.window.showInformationMessage('Dev server stopped');
        })
    );
    
    // Generate Flow Test
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.generateFlowTest', async (flowId: string) => {
            await handleGenerateFlowTest(flowId, services);
        })
    );
    
    // Generate API Test
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.generateApiTest', async (endpointId: string) => {
            // TODO: Implement API test generation
            vscode.window.showInformationMessage(`Generating test for endpoint: ${endpointId}`);
        })
    );
    
    // Generate All API Tests
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.generateAllApiTests', async () => {
            // TODO: Implement batch API test generation
            vscode.window.showInformationMessage('Generating all API tests...');
        })
    );

    // Cleanup on deactivation
    context.subscriptions.push({
        dispose: () => {
            appLauncher.dispose();
            routeCrawler.dispose();
        }
    });
}

/**
 * Handle scan app command
 */
async function handleScanApp(services: DynamicAnalysisServices) {
    const {
        appLauncher,
        routeCrawler,
        flowGenerator,
        openApiParser,
        flowStateService,
        coverageWebviewProvider
    } = services;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }
    
    const workspacePath = workspaceFolder.uri.fsPath;
    
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Scanning Application...',
            cancellable: true
        },
        async (progress, token) => {
            try {
                // Step 1: Detect dev server config
                progress.report({ message: 'Detecting framework...' });
                const config = await appLauncher.detectConfig(workspacePath);
                
                if (!config) {
                    vscode.window.showWarningMessage('Could not detect dev server. Make sure package.json has a "dev" script.');
                    return;
                }
                
                // Check if server is already running
                const alreadyRunning = await appLauncher.isServerRunning();
                
                if (!alreadyRunning) {
                    // Step 2: Start dev server
                    progress.report({ message: `Starting ${config.framework} server...` });
                    const started = await appLauncher.start(workspacePath);
                    
                    if (!started) {
                        vscode.window.showErrorMessage('Failed to start dev server');
                        return;
                    }
                }
                
                if (token.isCancellationRequested) {
                    await appLauncher.stop();
                    return;
                }
                
                // Step 3: Crawl routes
                progress.report({ message: 'Discovering routes...' });
                const crawlResult = await routeCrawler.crawl(config.url, {
                    maxDepth: 3,
                    maxRoutes: 30,
                    captureScreenshots: false // Disable for speed
                });
                
                // Step 4: Generate user flows
                progress.report({ message: 'Analyzing user flows...' });
                const flowAnalysis = flowGenerator.generateFlows(crawlResult);
                lastFlowAnalysis = flowAnalysis; // Store for later use
                
                // Load flow states and pass to webview
                const flowStates = await flowStateService.getAllFlowStates();
                
                // Update webview
                coverageWebviewProvider.updateFlowAnalysis(flowAnalysis, crawlResult, flowStates);
                
                // Show summary
                vscode.window.showInformationMessage(
                    `🔍 Discovered ${crawlResult.routes.length} routes, ${flowAnalysis.flows.length} user flows, ${crawlResult.totalElements} elements`
                );
                
                // Also check for OpenAPI spec
                const specPath = await openApiParser.findSpecFile(workspacePath);
                if (specPath) {
                    const apiSpec = await openApiParser.parseSpec(specPath, workspacePath);
                    if (apiSpec) {
                        coverageWebviewProvider.updateApiSpec(apiSpec);
                    }
                }
                
            } catch (error) {
                vscode.window.showErrorMessage(`Scan failed: ${error}`);
                await appLauncher.stop();
            }
        }
    );
}

/**
 * Handle generate flow test command
 */
async function handleGenerateFlowTest(flowId: string, services: DynamicAnalysisServices) {
    const {
        appLauncher,
        flowGenerator,
        testPreviewProvider,
        flowStateService,
        coverageWebviewProvider
    } = services;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }
    
    if (!lastFlowAnalysis) {
        vscode.window.showWarningMessage('No flow analysis available. Run "Scan App" first.');
        return;
    }
    
    // Find flow by ID
    const flow = lastFlowAnalysis.flows.find((f: any) => f.id === flowId);
    if (!flow) {
        vscode.window.showErrorMessage(`Flow not found: ${flowId}`);
        return;
    }
    
    const config = await appLauncher.detectConfig(workspaceFolder.uri.fsPath);
    if (!config) {
        vscode.window.showErrorMessage('Could not detect project configuration');
        return;
    }
    
    // Generate test code
    const testCode = flowGenerator.generateTestCode(flow, config.url);
    const testFilePath = `e2e/${flowId}.spec.ts`;
    
    // Show unified preview with flow data
    const result = await testPreviewProvider.showPreview({
        testCode,
        testFilePath,
        sourceFilePath: flow.routes[0] || '/',
        framework: 'Playwright',
        testType: 'E2E Flow',
        flowData: {
            flowId: flow.id,
            flowName: flow.name,
            flowType: flow.type,
            icon: flow.icon,
            routes: flow.routes,
            steps: flow.steps.map((s: any) => ({ ...s, selected: true })),
            relatedFiles: flow.relatedFiles.map((f: any) => ({ ...f, selected: !f.tested })),
            priority: flow.priority,
            coverage: {
                testedFiles: flow.testedFiles,
                totalFiles: flow.totalFiles
            }
        }
    });
    
    // Handle user action
    if (result.action === PreviewAction.CREATE && result.code) {
        const testFileUri = vscode.Uri.file(`${workspaceFolder.uri.fsPath}/${testFilePath}`);
        await vscode.workspace.fs.writeFile(testFileUri, Buffer.from(result.code, 'utf8'));
        await vscode.window.showTextDocument(testFileUri);
        
        // Save flow state
        await flowStateService.updateFlowState(flowId, {
            status: 'generated',
            testFilePath: testFilePath,
            generatedAt: Date.now()
        });
        
        // Refresh webview with updated states
        const flowStates = await flowStateService.getAllFlowStates();
        coverageWebviewProvider.updateFlowAnalysis(lastFlowAnalysis, null, flowStates);
        
        // Also refresh coverage data to update Overview tab
        vscode.commands.executeCommand('qagenai.analyzeWorkspace');
        
        vscode.window.showInformationMessage(`✅ Created test file: ${testFilePath}`);
        
        // Show celebration for first flow test
        const allStates = await flowStateService.getAllStates();
        const generatedCount = allStates.filter(s => s.status !== 'untested').length;
        if (generatedCount === 1) {
            vscode.window.showInformationMessage('🎉 Great start! Your first E2E test is ready.');
        }
    }
}

/**
 * Get the last flow analysis (for external access)
 */
export function getLastFlowAnalysis() {
    return lastFlowAnalysis;
}

/**
 * Set the last flow analysis (for external access)
 */
export function setLastFlowAnalysis(analysis: any) {
    lastFlowAnalysis = analysis;
}
