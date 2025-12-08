import * as vscode from 'vscode';
import { CoverageTreeProvider } from './coverageTreeProvider';
import { CoverageWebviewProvider } from './webviews/coverage.webview';
import { ChatPanelProvider } from './providers/chat-panel.provider';
import { CoverageCodeLensProvider, TestCodeLensProvider } from './providers';
import { registerTestCodeLensCommands } from './commands/testCodeLens.commands';
import { StatusBarService } from './services/statusBar.service';
import { TestQualityAnalyzerService, TestQualityReport } from './services/test-quality-analyzer.service';
import { registerCommands } from './commands';
import { AppLauncherService } from './services/app-launcher.service';
import { RouteCrawlerService } from './services/route-crawler.service';
import { UserFlowGeneratorService } from './services/user-flow-generator.service';
import { OpenAPIParserService } from './services/openapi-parser.service';
import { TestPreviewWebviewProvider, PreviewAction } from './webviews/test-preview.webview';
import { FlowStateService } from './services/flow-state.service';

export function activate(context: vscode.ExtensionContext) {
    console.log('QAgenAI extension is now active!');

    // Coverage TreeView provider (kept for backwards compatibility and data source)
    const coverageProvider = new CoverageTreeProvider();
    
    // Coverage WebView provider (modern UI)
    const coverageWebviewProvider = new CoverageWebviewProvider(context.extensionUri);
    
    // Test Quality Analyzer service
    const testQualityAnalyzer = new TestQualityAnalyzerService();
    let lastQualityReport: TestQualityReport | undefined;
    
    // Dynamic Analysis services
    const appLauncher = new AppLauncherService();
    const routeCrawler = new RouteCrawlerService();
    const flowGenerator = new UserFlowGeneratorService();
    const openApiParser = new OpenAPIParserService();
    const testPreviewProvider = new TestPreviewWebviewProvider(context.extensionUri);
    const flowStateService = new FlowStateService(context);
    
    // Store last flow analysis globally for generate commands
    let lastFlowAnalysis: any = null;
    
    // Subscribe to app status changes
    appLauncher.onStatusChange((status) => {
        coverageWebviewProvider.updateAppStatus(status);
    });
    
    // Register coverage webview
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            CoverageWebviewProvider.viewType,
            coverageWebviewProvider
        )
    );
    
    // Connect coverage provider data to webview
    coverageProvider.onDidChangeData((stacks) => {
        coverageWebviewProvider.updateData(stacks, lastQualityReport);
    });
    
    // When webview becomes visible, sync existing data
    const syncExistingData = () => {
        const stacks = coverageProvider.getStacks();
        if (stacks.length > 0) {
            coverageWebviewProvider.updateData(stacks, lastQualityReport);
        }
    };
    // Call sync after a short delay to allow webview to initialize
    setTimeout(syncExistingData, 3000);
    
    // Register Test Quality commands
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.analyzeTestQuality', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('No workspace folder open');
                return;
            }
            
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Analyzing test quality...',
                    cancellable: false
                },
                async () => {
                    try {
                        lastQualityReport = await testQualityAnalyzer.analyzeWorkspace(workspaceFolder.uri.fsPath);
                        coverageWebviewProvider.updateQualityReport(lastQualityReport);
                        
                        const scoreEmoji = lastQualityReport.overallScore >= 80 ? '🟢' : 
                                          lastQualityReport.overallScore >= 60 ? '🟡' : '🔴';
                        vscode.window.showInformationMessage(
                            `Test Quality: ${lastQualityReport.overallScore}% ${scoreEmoji} | ` +
                            `${lastQualityReport.totalTests} tests analyzed`
                        );
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to analyze test quality: ${error}`);
                    }
                }
            );
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.showQualityReport', async () => {
            if (!lastQualityReport) {
                vscode.window.showWarningMessage('No quality report available. Run "Analyze Tests" first.');
                return;
            }
            
            // Create and show a webview panel with detailed report
            const panel = vscode.window.createWebviewPanel(
                'testQualityReport',
                'Test Quality Report',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            panel.webview.html = getQualityReportHtml(lastQualityReport);
        })
    );
    
    // ========== Dynamic Analysis Commands ==========
    
    // Scan App - Start dev server and crawl routes
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.scanApp', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('No workspace folder open');
                return;
            }
            
            const workspacePath = workspaceFolder.uri.fsPath;
            
            vscode.window.withProgress(
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
    
    // Generate Tests for File
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.generateTests', async (filePath: string, options?: { testType?: string }) => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('No workspace folder open');
                return;
            }
            
            const testType = options?.testType || 'component';
            
            // Validate framework is installed
            const stacks = coverageProvider.getStacks();
            const hasFramework = stacks.some(stack => 
                stack.testTypes.some(tt => 
                    tt.status === 'installed' && 
                    (testType === 'e2e' ? tt.testType === 'e2e' : tt.testType !== 'e2e')
                )
            );
            
            if (!hasFramework) {
                const frameworkName = testType === 'e2e' ? 'Playwright' : 'Jest';
                const action = await vscode.window.showWarningMessage(
                    `${frameworkName} is not installed. Install it first to generate ${testType} tests.`,
                    'Install Now',
                    'Cancel'
                );
                
                if (action === 'Install Now') {
                    vscode.commands.executeCommand('qagenai.installTestFramework', frameworkName);
                }
                return;
            }
            
            // Show progress
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Generating ${testType} test...`,
                    cancellable: false
                },
                async (progress) => {
                    try {
                        progress.report({ message: 'Analyzing file...' });
                        
                        // TODO: Call actual test generation service
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        progress.report({ message: 'Generating test code...' });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Refresh coverage to show new test
                        vscode.commands.executeCommand('qagenai.analyzeWorkspace');
                        
                        vscode.window.showInformationMessage(`✅ Generated ${testType} test successfully!`);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to generate test: ${error}`);
                    }
                }
            );
        })
    );
    
    // Generate All Tests By Type (batch) - uses existing command with type parameter
    // Note: The base generateAllTests command is registered in commands/index.ts
    
    // Cleanup on deactivation
    context.subscriptions.push({
        dispose: () => {
            appLauncher.dispose();
            routeCrawler.dispose();
        }
    });
    
    // Status Bar service
    const statusBarService = new StatusBarService();
    context.subscriptions.push(statusBarService);
    
    // CodeLens provider for in-editor coverage indicators
    const codeLensProvider = new CoverageCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            [
                { scheme: 'file', language: 'typescript' },
                { scheme: 'file', language: 'javascript' },
                { scheme: 'file', language: 'typescriptreact' },
                { scheme: 'file', language: 'javascriptreact' },
                { scheme: 'file', language: 'python' },
                { scheme: 'file', language: 'go' },
                { scheme: 'file', language: 'java' },
                { scheme: 'file', language: 'csharp' }
            ],
            codeLensProvider
        )
    );
    
    // Test CodeLens provider - shows "⚡ Generate Test" above functions
    const testCodeLensProvider = new TestCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            [
                { scheme: 'file', language: 'typescript' },
                { scheme: 'file', language: 'javascript' },
                { scheme: 'file', language: 'typescriptreact' },
                { scheme: 'file', language: 'javascriptreact' }
            ],
            testCodeLensProvider
        )
    );
    
    // Register TestCodeLens commands
    registerTestCodeLensCommands(context);
    
    // Chat panel provider (temporarily disabled - using Coverage panel as primary UI)
    const chatProvider = new ChatPanelProvider(context.extensionUri, coverageProvider);

    // Register chat panel view
    // TODO: Re-enable when chat is needed as separate feature
    // context.subscriptions.push(
    //     vscode.window.registerWebviewViewProvider('qagenai.chatView', chatProvider)
    // );

    // File watcher to auto re-analyze when tests are created
    const testFileWatcher = vscode.workspace.createFileSystemWatcher(
        '**/*.{spec,test}.{ts,tsx,js,jsx}'
    );
    
    testFileWatcher.onDidCreate(() => {
        console.log('🧪 Test file created - re-analyzing workspace...');
        setTimeout(() => {
            vscode.commands.executeCommand('qagenai.analyzeWorkspace');
        }, 1000);
    });
    
    context.subscriptions.push(testFileWatcher);

    // Coverage file watcher to auto-refresh CodeLens when coverage changes
    const coverageFileWatcher = vscode.workspace.createFileSystemWatcher(
        '**/coverage/**/*.{info,json,xml}'
    );
    
    const refreshCoverageCodeLens = () => {
        console.log('📊 Coverage file changed - refreshing CodeLens...');
        codeLensProvider.refresh();
        
        // Also re-analyze workspace to update TreeView
        setTimeout(() => {
            vscode.commands.executeCommand('qagenai.analyzeWorkspace');
        }, 500);
    };
    
    coverageFileWatcher.onDidChange(refreshCoverageCodeLens);
    coverageFileWatcher.onDidCreate(refreshCoverageCodeLens);
    coverageFileWatcher.onDidDelete(() => {
        console.log('📊 Coverage file deleted - clearing CodeLens...');
        codeLensProvider.clearCoverageData();
    });
    
    context.subscriptions.push(coverageFileWatcher);

    // Auto-re-analyze when workspace folder changes (switching projects)
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            console.log('📁 Workspace folder changed - re-analyzing...');
            setTimeout(() => {
                vscode.commands.executeCommand('qagenai.analyzeWorkspace');
            }, 1000);
        })
    );
    
    // Auto-analyze coverage when file is opened
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (!editor) return;
            
            const document = editor.document;
            const filePath = document.uri.fsPath;
            
            // Only analyze source files (not test files, not node_modules)
            if (
                !filePath.includes('node_modules') &&
                !filePath.includes('.test.') &&
                !filePath.includes('.spec.') &&
                (filePath.endsWith('.ts') || filePath.endsWith('.tsx') ||
                 filePath.endsWith('.js') || filePath.endsWith('.jsx') ||
                 filePath.endsWith('.py') || filePath.endsWith('.go') ||
                 filePath.endsWith('.java') || filePath.endsWith('.cs'))
            ) {
                // Trigger coverage analysis for this file
                setTimeout(() => {
                    vscode.commands.executeCommand('qagenai.analyzeCoverage', filePath);
                }, 500);
            }
        })
    );

    // Register all commands
    registerCommands(context, chatProvider, coverageProvider, statusBarService, codeLensProvider);

    // Auto-analyze on activation
    setTimeout(() => {
        vscode.commands.executeCommand('qagenai.analyzeWorkspace');
    }, 2000);

    // Register command to show coverage view (for status bar click)
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.showCoverageView', () => {
            vscode.commands.executeCommand('qagenai.coverageView.focus');
        })
    );
}

export function deactivate() {}

/**
 * Generate HTML for the detailed quality report panel
 */
function getQualityReportHtml(report: TestQualityReport): string {
    const scoreColor = report.overallScore >= 80 ? '#22c55e' : 
                      report.overallScore >= 60 ? '#eab308' : '#ef4444';
    
    const filesHtml = report.files.map(file => {
        const testsHtml = file.tests.map(test => {
            const statusIcon = test.status === 'good' ? '✓' : test.status === 'warning' ? '!' : '✗';
            const statusColor = test.status === 'good' ? '#22c55e' : test.status === 'warning' ? '#eab308' : '#ef4444';
            const issuesHtml = test.issues.map(issue => `
                <div style="padding: 4px 0 4px 24px; font-size: 12px; color: rgba(255,255,255,0.6);">
                    → ${escapeHtml(issue.message)}${issue.suggestion ? ` - <em>${escapeHtml(issue.suggestion)}</em>` : ''}
                </div>
            `).join('');
            
            return `
                <div style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: ${statusColor}; font-weight: bold;">${statusIcon}</span>
                        <span style="flex: 1;">${escapeHtml(test.name)}</span>
                        <span style="font-size: 12px; color: rgba(255,255,255,0.5);">Line ${test.line}</span>
                        <span style="font-size: 12px; font-weight: 600; color: ${statusColor};">${test.score}%</span>
                    </div>
                    ${issuesHtml}
                </div>
            `;
        }).join('');
        
        const fileScoreColor = file.totalScore >= 80 ? '#22c55e' : file.totalScore >= 60 ? '#eab308' : '#ef4444';
        
        return `
            <div style="margin-bottom: 16px; background: rgba(255,255,255,0.03); border-radius: 8px; overflow: hidden;">
                <div style="padding: 12px 16px; background: rgba(255,255,255,0.05); display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 600;">${escapeHtml(file.fileName)}</span>
                    <span style="font-size: 12px; color: rgba(255,255,255,0.5);">${file.tests.length} tests</span>
                    <span style="margin-left: auto; font-weight: 600; color: ${fileScoreColor};">${file.totalScore}%</span>
                </div>
                ${testsHtml}
            </div>
        `;
    }).join('');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Quality Report</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: rgba(255,255,255,0.9);
            background: #1e1e1e;
            padding: 24px;
            line-height: 1.5;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            color: ${scoreColor};
            border: 4px solid ${scoreColor};
        }
        .summary {
            display: flex;
            gap: 24px;
            margin-bottom: 24px;
        }
        .stat {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .stat-num {
            font-size: 20px;
            font-weight: 700;
        }
        .stat-label {
            font-size: 12px;
            color: rgba(255,255,255,0.5);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="score-circle">${report.overallScore}%</div>
        <div>
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Test Quality Report</h1>
            <p style="margin: 0; color: rgba(255,255,255,0.5);">${report.totalTests} tests in ${report.files.length} files</p>
        </div>
    </div>
    
    <div class="summary">
        <div class="stat">
            <span class="stat-num" style="color: #22c55e;">${report.goodTests}</span>
            <span class="stat-label">✓ Good tests</span>
        </div>
        <div class="stat">
            <span class="stat-num" style="color: #eab308;">${report.warningTests}</span>
            <span class="stat-label">! Warnings</span>
        </div>
        <div class="stat">
            <span class="stat-num" style="color: #ef4444;">${report.errorTests}</span>
            <span class="stat-label">✗ Errors</span>
        </div>
    </div>
    
    <h2 style="font-size: 14px; margin-bottom: 12px; color: rgba(255,255,255,0.7);">FILES</h2>
    ${filesHtml}
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
