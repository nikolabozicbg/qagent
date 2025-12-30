import * as vscode from 'vscode';
import { ServiceContainer } from './container';
import { CoverageWebviewProvider } from './webviews/coverage.webview';
import { TestQualityReport } from './services/test-quality-analyzer.service';
import { registerTestCodeLensCommands } from './commands/testCodeLens.commands';
import { registerCodeLensCommands } from './commands/codelens.commands';
import { registerCommands } from './commands';
import { registerDynamicAnalysisCommands } from './commands/dynamic-analysis.commands';
import { getQualityReportHtml } from './templates/quality-report.template';

let lastQualityReport: TestQualityReport | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('QAgenAI extension is now active!');

    // Initialize service container
    const container = new ServiceContainer(context);
    
    // Wire up event handlers
    container.wireEvents();
    
    // Register coverage webview
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            CoverageWebviewProvider.viewType,
            container.coverageWebviewProvider
        )
    );
    
    // Sync existing data after a delay
    setTimeout(() => container.syncExistingData(), 3000);
    
    // Register Test Quality commands
    registerTestQualityCommands(context, container);
    
    // Register Dynamic Analysis commands
    registerDynamicAnalysisCommands(context, container.getDynamicAnalysisServices());
    
    // Register CodeLens providers
    registerCodeLensProviders(context, container);
    
    // Register TestCodeLens commands
    registerTestCodeLensCommands(context);
    
    // Register CodeLens commands (analyzeCoverage, showCoverageDetails, etc.)
    registerCodeLensCommands(context, container.codeLensProvider, container.chatProvider);
    
    // Register file watchers
    registerFileWatchers(context, container);
    
    // Register all other commands
    registerCommands(
        context, 
        container.chatProvider, 
        container.coverageProvider, 
        container.statusBarService, 
        container.codeLensProvider,
        container.testPreviewProvider
    );

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
 * Register test quality analysis commands
 */
function registerTestQualityCommands(context: vscode.ExtensionContext, container: ServiceContainer) {
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.analyzeTestQuality', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('No workspace folder open');
                return;
            }
            
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Analyzing test quality...',
                    cancellable: false
                },
                async () => {
                    try {
                        lastQualityReport = await container.testQualityAnalyzer.analyzeWorkspace(workspaceFolder.uri.fsPath);
                        container.coverageWebviewProvider.updateQualityReport(lastQualityReport);
                        
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
            
            const panel = vscode.window.createWebviewPanel(
                'testQualityReport',
                'Test Quality Report',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            panel.webview.html = getQualityReportHtml(lastQualityReport);
        })
    );
}

/**
 * Register CodeLens providers
 */
function registerCodeLensProviders(context: vscode.ExtensionContext, container: ServiceContainer) {
    const supportedLanguages = [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascriptreact' },
        { scheme: 'file', language: 'python' },
        { scheme: 'file', language: 'go' },
        { scheme: 'file', language: 'java' },
        { scheme: 'file', language: 'csharp' }
    ];

    // Coverage CodeLens
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            supportedLanguages,
            container.codeLensProvider
        )
    );
    
    // Test CodeLens (JS/TS only)
    const jsLanguages = supportedLanguages.filter(l => 
        ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(l.language)
    );
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            jsLanguages,
            container.testCodeLensProvider
        )
    );
}

/**
 * Register file watchers for auto-refresh
 */
function registerFileWatchers(context: vscode.ExtensionContext, container: ServiceContainer) {
    // Test file watcher
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

    // Coverage file watcher
    const coverageFileWatcher = vscode.workspace.createFileSystemWatcher(
        '**/coverage/**/*.{info,json,xml}'
    );
    
    const refreshCoverageCodeLens = () => {
        console.log('📊 Coverage file changed - refreshing CodeLens...');
        container.codeLensProvider.refresh();
        setTimeout(() => {
            vscode.commands.executeCommand('qagenai.analyzeWorkspace');
        }, 500);
    };
    
    coverageFileWatcher.onDidChange(refreshCoverageCodeLens);
    coverageFileWatcher.onDidCreate(refreshCoverageCodeLens);
    coverageFileWatcher.onDidDelete(() => {
        console.log('📊 Coverage file deleted - clearing CodeLens...');
        container.codeLensProvider.clearCoverageData();
    });
    
    context.subscriptions.push(coverageFileWatcher);

    // Workspace folder change watcher
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            console.log('📁 Workspace folder changed - re-analyzing...');
            setTimeout(() => {
                vscode.commands.executeCommand('qagenai.analyzeWorkspace');
            }, 1000);
        })
    );
    
    // Active editor change watcher
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (!editor) return;
            
            const filePath = editor.document.uri.fsPath;
            
            // Only analyze source files
            if (
                !filePath.includes('node_modules') &&
                !filePath.includes('.test.') &&
                !filePath.includes('.spec.') &&
                (filePath.endsWith('.ts') || filePath.endsWith('.tsx') ||
                 filePath.endsWith('.js') || filePath.endsWith('.jsx') ||
                 filePath.endsWith('.py') || filePath.endsWith('.go') ||
                 filePath.endsWith('.java') || filePath.endsWith('.cs'))
            ) {
                setTimeout(() => {
                    vscode.commands.executeCommand('qagenai.analyzeCoverage', filePath);
                }, 500);
            }
        })
    );
}
