import * as vscode from 'vscode';
import { ChatPanelProvider } from '../providers/chat-panel.provider';
import { CoverageCodeLensProvider } from '../providers';
import { CoverageTreeProvider, CoverageItem } from '../coverageTreeProvider';
import { StatusBarService } from '../services/statusBar.service';

// Import refactored command modules
import { handleAnalyzeWorkspace } from './workspace.commands';
import { 
    handleGenerateTestsForFile, 
    handleGenerateBatchTests, 
    handleGenerateAllTests, 
    handleImproveTest,
    setTestPreviewProvider
} from './test-generation.commands';
import { handleInstallFramework, handleInstallTestFramework } from './framework.commands';
import { handleRunTests, handleRunTestFile, handleWatchTestFile, handleDebugTestFile } from './test-execution.commands';
import { TestPreviewWebviewProvider } from '../webviews/test-preview.webview';

/**
 * Register all extension commands
 */
export function registerCommands(
    context: vscode.ExtensionContext,
    chatProvider: ChatPanelProvider,
    coverageProvider: CoverageTreeProvider,
    statusBarService?: StatusBarService,
    codeLensProvider?: CoverageCodeLensProvider,
    testPreviewProvider?: TestPreviewWebviewProvider
) {
    // Set test preview provider (injected from ServiceContainer)
    if (testPreviewProvider) {
        setTestPreviewProvider(testPreviewProvider);
    }

    // Command to open chat
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.openChat', () => {
            vscode.commands.executeCommand('qagenai.chatView.focus');
        })
    );

    // Command to analyze workspace
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.analyzeWorkspace', async () => {
            await handleAnalyzeWorkspace(coverageProvider, chatProvider, statusBarService);
        })
    );

    // Command to install framework from TreeView
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.installFramework', async (item: CoverageItem) => {
            await handleInstallFramework(item, coverageProvider, chatProvider);
        })
    );

    // Command to generate tests for file (from TreeView)
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.generateTestsForFile', async (itemOrPath: CoverageItem | string) => {
            await handleGenerateTestsForFile(itemOrPath, coverageProvider, chatProvider);
        })
    );
    
    // Command to generate tests (from context menu - uses active file)
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.generateTests', async (uri?: vscode.Uri) => {
            const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
            if (!filePath) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }
            await handleGenerateTestsForFile(filePath, coverageProvider, chatProvider);
        })
    );

    // Command to generate all tests in a category
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.generateAllTests', async (item: CoverageItem) => {
            await handleGenerateAllTests(item, coverageProvider, chatProvider);
        })
    );
    
    // Command to generate batch tests
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.generateBatchTests', async (filePaths: string[], testType: string) => {
            await handleGenerateBatchTests(filePaths, testType, coverageProvider, chatProvider);
        })
    );

    // Command to improve existing test coverage
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.improveTest', async (item: CoverageItem) => {
            await handleImproveTest(item, coverageProvider, chatProvider);
        })
    );

    
    // Command to run tests for test type
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.runTests', async (itemOrType: CoverageItem | string) => {
            await handleRunTests(itemOrType, coverageProvider);
        })
    );
    
    // Command to install test framework
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.installTestFramework', async (itemOrFramework: CoverageItem | string) => {
            await handleInstallTestFramework(itemOrFramework, coverageProvider);
        })
    );
    
    // Command to run a single test file
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.runTest', async (uri?: vscode.Uri) => {
            await handleRunTestFile(uri, coverageProvider);
        })
    );
    
    // Command to watch a test file
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.watchTest', async (uri?: vscode.Uri) => {
            await handleWatchTestFile(uri, coverageProvider);
        })
    );
    
    // Command to debug a test file
    context.subscriptions.push(
        vscode.commands.registerCommand('qagenai.debugTest', async (uri?: vscode.Uri) => {
            await handleDebugTestFile(uri, coverageProvider);
        })
    );
}

// Re-export for backwards compatibility
export { handleAnalyzeWorkspace } from './workspace.commands';
export { handleGenerateTestsForFile, handleGenerateBatchTests, handleGenerateAllTests } from './test-generation.commands';
export { handleInstallFramework, handleInstallTestFramework } from './framework.commands';
export { handleRunTests, handleRunTestFile, handleWatchTestFile, handleDebugTestFile } from './test-execution.commands';
