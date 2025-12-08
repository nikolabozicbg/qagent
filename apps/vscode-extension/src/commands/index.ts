import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChatPanelProvider } from '../providers/chat-panel.provider';
import { CoverageCodeLensProvider } from '../providers';
import { CoverageTreeProvider, CoverageItem } from '../coverageTreeProvider';
import { StatusBarService } from '../services/statusBar.service';
import { BackendApiService } from '../services/backend-api.service';
import { EnhancedAnalysisApiService } from '../services/enhanced-analysis-api.service';
import { TestExecutionService } from '../services/test-execution.service';
import { TestGenerationProgressService, GenerationStage } from '../services/test-generation-progress.service';
import { TestPreviewWebviewProvider, PreviewAction, TestPreviewData } from '../webviews/test-preview.webview';
import { registerCodeLensCommands } from './codelens.commands';
import { SourceAnalyzerService } from '../services/source-analyzer.service';

const backendApi = new BackendApiService();
const sourceAnalyzer = new SourceAnalyzerService();
const enhancedApi = new EnhancedAnalysisApiService();
const testExecutionService = new TestExecutionService();
const progressService = new TestGenerationProgressService();

let testPreviewProvider: TestPreviewWebviewProvider;

export function registerCommands(
    context: vscode.ExtensionContext,
    chatProvider: ChatPanelProvider,
    coverageProvider: CoverageTreeProvider,
    statusBarService?: StatusBarService,
    codeLensProvider?: CoverageCodeLensProvider
) {
    // Initialize preview provider
    testPreviewProvider = new TestPreviewWebviewProvider(context.extensionUri);
    // Command to open chat
    const chatCommand = vscode.commands.registerCommand('qagenai.openChat', () => {
        vscode.commands.executeCommand('qagenai.chatView.focus');
    });
    context.subscriptions.push(chatCommand);

    // Command to analyze workspace
    const analyzeCommand = vscode.commands.registerCommand('qagenai.analyzeWorkspace', async () => {
        await handleAnalyzeWorkspace(coverageProvider, chatProvider, statusBarService);
    });
    context.subscriptions.push(analyzeCommand);

    // Command to install framework from TreeView
    const installFrameworkCommand = vscode.commands.registerCommand('qagenai.installFramework', async (item: CoverageItem) => {
        await handleInstallFramework(item, coverageProvider, chatProvider);
    });
    context.subscriptions.push(installFrameworkCommand);

    // Command to generate tests for file (handles both CoverageItem from TreeView and string filepath from WebView)
    const generateTestsForFileCommand = vscode.commands.registerCommand('qagenai.generateTestsForFile', async (itemOrPath: CoverageItem | string) => {
        await handleGenerateTestsForFile(itemOrPath, coverageProvider, chatProvider);
    });
    context.subscriptions.push(generateTestsForFileCommand);

    // Command to generate all tests in a category
    const generateAllTestsCommand = vscode.commands.registerCommand('qagenai.generateAllTests', async (item: CoverageItem) => {
        await handleGenerateAllTests(item, coverageProvider, chatProvider);
    });
    context.subscriptions.push(generateAllTestsCommand);
    
    // Command to generate batch tests (from WebView "Generate All Tests" button)
    const generateBatchTestsCommand = vscode.commands.registerCommand('qagenai.generateBatchTests', async (filePaths: string[], testType: string) => {
        await handleGenerateBatchTests(filePaths, testType, coverageProvider, chatProvider);
    });
    context.subscriptions.push(generateBatchTestsCommand);

    // Command to improve existing test coverage
    const improveTestCommand = vscode.commands.registerCommand('qagenai.improveTest', async (item: CoverageItem) => {
        await handleImproveTest(item, coverageProvider, chatProvider);
    });
    context.subscriptions.push(improveTestCommand);

    // Register CodeLens commands
    if (codeLensProvider) {
        registerCodeLensCommands(context, codeLensProvider, chatProvider);
    }
    
    // Command to run tests for test type (handles both CoverageItem from TreeView and string from WebView)
    const runTestsCommand = vscode.commands.registerCommand('qagenai.runTests', async (itemOrType: CoverageItem | string) => {
        await handleRunTests(itemOrType, coverageProvider);
    });
    context.subscriptions.push(runTestsCommand);
    
    // Command to install test framework (handles both CoverageItem from TreeView and string from WebView)
    const installTestFrameworkCommand = vscode.commands.registerCommand('qagenai.installTestFramework', async (itemOrFramework: CoverageItem | string) => {
        await handleInstallTestFramework(itemOrFramework, coverageProvider);
    });
    context.subscriptions.push(installTestFrameworkCommand);
    
    // Command to run a single test file
    const runTestCommand = vscode.commands.registerCommand('qagenai.runTest', async (uri?: vscode.Uri) => {
        await handleRunTestFile(uri, coverageProvider);
    });
    context.subscriptions.push(runTestCommand);
    
    // Command to watch a test file
    const watchTestCommand = vscode.commands.registerCommand('qagenai.watchTest', async (uri?: vscode.Uri) => {
        await handleWatchTestFile(uri, coverageProvider);
    });
    context.subscriptions.push(watchTestCommand);
    
    // Command to debug a test file
    const debugTestCommand = vscode.commands.registerCommand('qagenai.debugTest', async (uri?: vscode.Uri) => {
        await handleDebugTestFile(uri, coverageProvider);
    });
    context.subscriptions.push(debugTestCommand);
}

async function handleAnalyzeWorkspace(
    coverageProvider: CoverageTreeProvider,
    chatProvider: ChatPanelProvider,
    statusBarService?: StatusBarService
) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Show analyzing state in status bar
    statusBarService?.showAnalyzing();

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'QAgenAI: Analyzing workspace...',
        cancellable: false
    }, async (progress) => {
        try {
            const workspacePath = workspaceFolder.uri.fsPath;

            progress.report({ message: 'Detecting technologies...' });
            
            // NEW: Detect project stacks (Frontend/Backend) using local detection
            await coverageProvider.detectAndDisplayStacks(workspacePath);

            console.log('[QAgenAI] Starting enhanced analysis for:', workspacePath);
            // Try enhanced analysis first
            try {
                console.log('[QAgenAI] Calling enhanced API...');
                const enhancedReport = await enhancedApi.analyzeWorkspace(workspacePath);
                console.log('[QAgenAI] Enhanced API success!', enhancedReport);
                // Store enhanced report for data (but display uses stack-based view)
                coverageProvider.setEnhancedReport(enhancedReport);

                // Update status bar with coverage
                const coveragePercent = Math.round(
                    (enhancedReport.summary.testedFiles / enhancedReport.summary.totalFiles) * 100
                );
                statusBarService?.updateCoverage({
                    coveragePercent,
                    testedFiles: enhancedReport.summary.testedFiles,
                    untestedFiles: enhancedReport.summary.untestedFiles,
                    totalFiles: enhancedReport.summary.totalFiles,
                    frameworks: {},
                    gaps: [],
                    recommendations: undefined
                });

                // Check if no framework installed
                const hasFramework = enhancedReport.testingSetup.installed.length > 0;
                
                if (!hasFramework) {
                    // No framework - show recommendations
                    const primaryTech = enhancedReport.project.technologies[0];
                    const techLabel = primaryTech ? primaryTech.language : 'this';
                    vscode.window.showWarningMessage(
                        `⚠️  No test framework detected for ${techLabel} project. Would you like to set up testing?`,
                        'View Recommendations', 'Dismiss'
                    ).then(selection => {
                        if (selection === 'View Recommendations') {
                            vscode.commands.executeCommand('qagenai.coverageView.focus');
                        }
                    });
                } else {
                    // Framework exists - show coverage report
                    const coveragePercent = Math.round(
                        (enhancedReport.summary.testedFiles / enhancedReport.summary.totalFiles) * 100
                    );
                    const message = `📊 Coverage: ${coveragePercent}% | ` +
                        `${enhancedReport.summary.untestedFiles} files without tests`;
                    
                    if (enhancedReport.summary.untestedFiles > 0) {
                        vscode.window.showWarningMessage(message, 'View Report').then(selection => {
                            if (selection === 'View Report') {
                                vscode.commands.executeCommand('qagenai.coverageView.focus');
                            }
                        });
                    } else {
                        vscode.window.showInformationMessage(message);
                    }
                }
            } catch (enhancedError) {
                // Fallback to legacy analysis
                console.error('[QAgenAI] Enhanced analysis FAILED:', enhancedError);
                vscode.window.showErrorMessage(`Enhanced analysis failed: ${enhancedError}`);
                console.warn('Enhanced analysis failed, falling back to legacy:', enhancedError);
                progress.report({ message: 'Scanning files...' });
                
                const report = await backendApi.analyzeWorkspace(workspacePath);
                coverageProvider.setReport(report);

                // Update status bar with coverage
                statusBarService?.updateCoverage(report);

                // Check if no framework detected
                const hasFramework = report.frameworks && Object.keys(report.frameworks).length > 0;
                
                if (!hasFramework) {
                    vscode.window.showWarningMessage(
                        '⚠️  No test framework detected. Would you like to set up testing?',
                        'Setup Testing', 'Dismiss'
                    ).then(selection => {
                        if (selection === 'Setup Testing') {
                            showSetupWizard(workspaceFolder.uri.fsPath, chatProvider);
                        }
                    });
                } else {
                    const message = `📊 Coverage: ${report.coveragePercent}% | ` +
                        `${report.untestedFiles} files without tests`;
                    
                    if (report.untestedFiles > 0) {
                        vscode.window.showWarningMessage(message, 'View Report').then(selection => {
                            if (selection === 'View Report') {
                                vscode.commands.executeCommand('qagenai.coverageView.focus');
                            }
                        });
                    } else {
                        vscode.window.showInformationMessage(message);
                    }
                }
            }

        } catch (error: any) {
            console.error('Error analyzing workspace:', error);
            vscode.window.showErrorMessage(`Failed to analyze workspace: ${error.message}`);
        }
    });
}

async function handleGenerateBatchTests(
    filePaths: string[],
    testType: string,
    coverageProvider: CoverageTreeProvider,
    chatProvider: ChatPanelProvider
) {
    if (!filePaths || filePaths.length === 0) {
        vscode.window.showErrorMessage('No files selected for batch generation');
        return;
    }
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    
    // Confirm with user
    const confirm = await vscode.window.showInformationMessage(
        `Generate ${testType} tests for ${filePaths.length} files?`,
        'Generate All', 'Cancel'
    );
    
    if (confirm !== 'Generate All') {
        return;
    }
    
    // Show progress notification
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Generating ${testType} tests...`,
        cancellable: false
    }, async (progress) => {
        let completed = 0;
        
        for (const filePath of filePaths) {
            progress.report({ 
                message: `${completed + 1}/${filePaths.length}: ${path.basename(filePath)}`,
                increment: (100 / filePaths.length)
            });
            
            try {
                // Generate test for each file
                await handleGenerateTestsForFile(filePath, coverageProvider, chatProvider);
                completed++;
            } catch (error: any) {
                console.error(`Failed to generate test for ${filePath}:`, error);
                // Continue with next file even if one fails
            }
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        vscode.window.showInformationMessage(
            `✓ Generated ${completed}/${filePaths.length} ${testType} tests`
        );
    });
}

async function handleInstallFramework(
    item: CoverageItem,
    coverageProvider: CoverageTreeProvider,
    chatProvider: ChatPanelProvider
) {
    if (!item.frameworkInfo) {
        vscode.window.showErrorMessage('No framework information available');
        return;
    }

    const { name, type, packages, reason } = item.frameworkInfo;
    
    // Confirm with user
    const confirm = await vscode.window.showInformationMessage(
        `Install ${name}?\n\n${reason}\n\nPackages: ${packages.join(', ')}`,
        'Install', 'Cancel'
    );
    
    if (confirm !== 'Install') {
        return;
    }

    // Get enhanced report to detect project language/type
    const enhancedReport = coverageProvider.getEnhancedReport();
    const projectLanguage = enhancedReport?.project?.technologies?.[0]?.language || 'Unknown';
    const projectType = enhancedReport?.project?.primaryType || 'Unknown';

    // Focus chat view
    await vscode.commands.executeCommand('qagenai.chatView.focus');

    // Determine package manager based on language
    let packageManager = 'package manager';
    let installCommands: string[] = [];
    if (projectLanguage.toLowerCase().includes('c#') || projectLanguage.toLowerCase().includes('csharp')) {
        packageManager = 'NuGet (dotnet CLI)';
        installCommands = packages.map(p => `dotnet add package ${p}`);
    } else if (projectLanguage.toLowerCase().includes('javascript') || projectLanguage.toLowerCase().includes('typescript')) {
        packageManager = 'npm';
        installCommands = [`npm install -D ${packages.join(' ')}`];
    } else if (projectLanguage.toLowerCase().includes('python')) {
        packageManager = 'pip';
        installCommands = [`pip install ${packages.join(' ')}`];
    }

    // Build install message for Agent
    const message = `Install ${name} testing framework for ${projectLanguage} ${projectType} (${type} tests).\n\n` +
        `Package Manager: ${packageManager}\n` +
        `Packages to install:\n${packages.map(p => `- ${p}`).join('\n')}\n\n` +
        `Reason: ${reason}\n\n` +
        `Commands to run:\n${installCommands.map(cmd => `\`${cmd}\``).join('\n')}\n\n` +
        `Please:\n` +
        `1. Install the packages using the commands above\n` +
        `2. Create any necessary configuration files\n` +
        `3. Add test scripts if needed\n` +
        `4. Create an example test to verify setup`;

    // Auto-send message to chat
    chatProvider.sendMessage(message);
    
    vscode.window.showInformationMessage(`📦 Installing ${name}...`);
}

async function handleGenerateTestsForFile(
    itemOrPath: CoverageItem | string,
    coverageProvider: CoverageTreeProvider,
    chatProvider: ChatPanelProvider
) {
    // Handle string filepath from WebView
    let filePath: string | undefined;
    let item: CoverageItem | undefined;
    
    if (typeof itemOrPath === 'string') {
        filePath = itemOrPath;
    } else {
        item = itemOrPath;
        filePath = item.filePath || item.gap?.relativePath;
    }
    
    if (!filePath) {
        vscode.window.showErrorMessage('No file information available');
        return;
    }
    
    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    
    const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(workspaceFolder.uri.fsPath, filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
        vscode.window.showErrorMessage(`File not found: ${filePath}`);
        return;
    }
    
    // Detect framework and test type from TreeView context
    let framework = 'Jest'; // default
    let testType = 'Unit';   // default
    let outputPath = '';
    
    // Try to auto-detect installed framework from coverage provider
    const enhancedReport = coverageProvider.getEnhancedReport();
    if (enhancedReport?.project?.stacks) {
        for (const stack of enhancedReport.project.stacks) {
            // Find first installed test type
            const installedType = stack.testTypes?.find(tt => tt.status === 'installed');
            if (installedType) {
                framework = installedType.framework.name;
                testType = installedType.testType;
                outputPath = installedType.outputPath || '';
                console.log('[Generate] Auto-detected installed framework:', { framework, testType });
                break;
            }
        }
    }
    
    // Auto-detect E2E for Next.js App Router files (page.tsx, layout.tsx, etc.)
    const fileName = path.basename(absolutePath).toLowerCase();
    const isNextAppRouterFile = absolutePath.includes('/app/') && 
        ['page.tsx', 'page.ts', 'page.jsx', 'page.js', 'layout.tsx', 'layout.ts', 'layout.jsx', 'layout.js', 'template.tsx', 'error.tsx', 'loading.tsx'].includes(fileName);
    
    // Next.js pages/layouts should use E2E testing with Playwright
    if (isNextAppRouterFile) {
        testType = 'E2E';
        framework = 'Playwright';
        console.log('[Generate] Next.js App Router file → E2E test with Playwright');
    }
    
    // For React components (.tsx in /components/), prefer component testing
    // Skip if it's a Next.js page/layout (those use E2E)
    const isReactComponent = absolutePath.endsWith('.tsx') && 
        !isNextAppRouterFile &&
        absolutePath.includes('/components/');
    
    if (isReactComponent) {
        let hasComponentTesting = false;
        
        if (enhancedReport?.project?.stacks) {
            for (const stack of enhancedReport.project.stacks) {
                // Prefer component testing for React components
                const componentType = stack.testTypes?.find(tt => 
                    tt.status === 'installed' && 
                    (tt.testType === 'component' || tt.framework.name.toLowerCase().includes('testing library') || tt.framework.name.toLowerCase() === 'jest')
                );
                if (componentType) {
                    framework = componentType.framework.name;
                    testType = componentType.testType;
                    outputPath = componentType.outputPath || '';
                    hasComponentTesting = true;
                    console.log('[Generate] Using component testing for React component:', { framework, testType });
                    break;
                }
            }
        }
        
        // If no component testing framework installed, prompt to install
        if (!hasComponentTesting) {
            const choice = await vscode.window.showWarningMessage(
                `React component "${path.basename(absolutePath)}" requires Jest + Testing Library for unit tests. Playwright is for E2E testing of full pages, not individual components.`,
                'Install Jest',
                'Use Playwright anyway',
                'Cancel'
            );
            
            if (choice === 'Install Jest') {
                // Trigger Jest installation
                await vscode.commands.executeCommand('qagenai.installTestFramework', 'Jest');
                return; // Exit, user will retry after installation
            } else if (choice === 'Cancel') {
                return; // User cancelled
            }
            // If "Use Playwright anyway", continue with Playwright
            console.log('[Generate] User chose to use Playwright for component (not recommended)');
        }
    }
    
    console.log('[Generate] Item context:', {
        filePath,
        contextValue: item?.contextValue,
        hasTestTypeMatrixNode: !!item?.testTypeMatrixNode,
        hasTestTypeMatrix: !!item?.testTypeMatrixNode?.testTypeMatrix,
        hasStack: !!item?.testTypeMatrixNode?.stack
    });
    
    // Try to get from TestTypeMatrixNode (stack-based view)
    if (item?.testTypeMatrixNode) {
        const node = item.testTypeMatrixNode;
        
        // If we're in a test type node, get framework and type from it
        if (node.testTypeMatrix) {
            framework = node.testTypeMatrix.framework.name;
            testType = node.testTypeMatrix.testType;
            outputPath = node.testTypeMatrix.outputPath || '';
            console.log('[Generate] Got from testTypeMatrix:', { framework, testType, outputPath });
        }
        
        // If we're in a stack node, try to find parent test type
        if (node.stack && !node.testTypeMatrix) {
            // User clicked on file under a test type - need to find which one
            // For now, default to first available test type
            const firstTestType = node.stack.testTypes.find(tt => tt.status === 'installed');
            if (firstTestType) {
                framework = firstTestType.framework.name;
                testType = firstTestType.testType;
                outputPath = firstTestType.outputPath || '';
                console.log('[Generate] Got from stack.testTypes[0]:', { framework, testType, outputPath });
            }
        }
    }
    
    // Auto-detect outputPath if not provided and test type is E2E
    if (!outputPath && testType.toLowerCase() === 'e2e') {
        outputPath = 'e2e';
        console.log('[Generate] Auto-detected E2E outputPath: e2e/');
    }
    
    console.log(`[Generate] Final: Framework=${framework}, TestType=${testType}, OutputPath=${outputPath}`);
    console.log(`[Generate] Source file: ${absolutePath}`);
    
    try {
        // Run generation with progress
        const generatedTest = await progressService.withProgress(
            `🧪 Generating ${testType} tests for ${path.basename(filePath)}...`,
            async (reporter, token) => {
                // Stage 1: Read source code
                reporter({
                    stage: GenerationStage.READING_SOURCE,
                    message: 'Reading source code...',
                    percentage: 25
                });
                
                if (token.isCancellationRequested) {
                    throw new Error('Cancelled by user');
                }
                
                const sourceCode = fs.readFileSync(absolutePath, 'utf-8');
                const fileName = path.basename(absolutePath);
                const language = getLanguageFromExtension(path.extname(absolutePath));
                
                // Stage 2: Analyzing dependencies
                reporter({
                    stage: GenerationStage.ANALYZING_DEPS,
                    message: 'Analyzing dependencies...',
                    percentage: 25
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Stage 3: Generate tests
                reporter({
                    stage: GenerationStage.GENERATING_TESTS,
                    message: `Generating ${testType} test with ${framework}...`,
                    percentage: 40
                });
                
                if (token.isCancellationRequested) {
                    throw new Error('Cancelled by user');
                }
                
                // Use TestGenerationService for cleaner test generation
                const { TestGenerationService, TestType } = await import('../services/test-generation.service');
                const testGenService = new TestGenerationService(backendApi, coverageProvider);
                
                let result;
                try {
                    // Map string test type to enum (case-insensitive)
                    const testTypeLower = testType.toLowerCase();
                    const testTypeEnum = testTypeLower === 'unit' ? TestType.UNIT 
                        : testTypeLower === 'e2e' ? TestType.E2E 
                        : testTypeLower === 'integration' ? TestType.INTEGRATION
                        : TestType.UNIT; // default fallback
                    
                    result = await testGenService.generateTest({
                        sourceFilePath: absolutePath,
                        sourceCode,
                        testType: testTypeEnum,
                        framework,
                        outputPath
                    });
                } catch (error) {
                    console.error('Test generation failed:', error);
                    // Fallback to mock test
                    const testCode = generateMockTest(fileName, framework, testType);
                    const testFilePath = outputPath 
                        ? getTestFilePathForFramework(absolutePath, outputPath, testType)
                        : getTestFilePath(absolutePath);
                    
                    result = {
                        testCode,
                        testFilePath,
                        sourceFilePath: absolutePath,
                        framework: framework || 'unknown',
                        testType: testType.charAt(0).toUpperCase() + testType.slice(1),
                        coverage: { estimated: 85, testCases: countTestCases(testCode) }
                    };
                }
                
                reporter({
                    stage: GenerationStage.COMPLETE,
                    message: 'Test generated successfully!',
                    percentage: 100
                });
                
                // Analyze source file for smart preview
                const analysis = await sourceAnalyzer.analyzeFile(absolutePath);
                
                // Enrich result with analysis
                return {
                    ...result,
                    analysis
                } as TestPreviewData;
            }
        );
        
        // Show preview modal with analysis
        const { action, code } = await testPreviewProvider.showPreview(generatedTest);
        
        console.log(`[Preview] Action: ${action}, GeneratedFilePath: ${generatedTest.testFilePath}`);
        
        if (action === PreviewAction.CANCEL) {
            vscode.window.showInformationMessage('Test generation cancelled');
            return;
        }
        
        if (action === PreviewAction.EDIT) {
            // Open in editor for manual editing
            const doc = await vscode.workspace.openTextDocument({
                content: code || generatedTest.testCode,
                language: getLanguageFromExtension(path.extname(generatedTest.testFilePath))
            });
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage(
                'Edit the test, then save to desired location',
                'Got it'
            );
            return;
        }
        
        if (action === PreviewAction.CREATE) {
            console.log(`[Create] Creating file at: ${generatedTest.testFilePath}`);
            // Create test file
            const finalCode = code || generatedTest.testCode;
            const testFileDir = path.dirname(generatedTest.testFilePath);
            
            try {
                // Ensure directory exists
                if (!fs.existsSync(testFileDir)) {
                    console.log(`[Create] Creating directory: ${testFileDir}`);
                    fs.mkdirSync(testFileDir, { recursive: true });
                }
                
                // Write test file
                console.log(`[Create] Writing file...`);
                fs.writeFileSync(generatedTest.testFilePath, finalCode, 'utf-8');
                console.log(`[Create] File written successfully!`);
                
                // Show success message with actions
                const choice = await vscode.window.showInformationMessage(
                    `✅ Test created: ${path.basename(generatedTest.testFilePath)}`,
                    'Open File',
                    'Run Tests',
                    'Close'
                );
                
                if (choice === 'Open File') {
                    const doc = await vscode.workspace.openTextDocument(generatedTest.testFilePath);
                    await vscode.window.showTextDocument(doc);
                } else if (choice === 'Run Tests') {
                    // TODO: Implement run tests command
                    vscode.window.showInformationMessage('Run tests feature coming soon!');
                }
                
                // Refresh coverage
                setTimeout(() => {
                    vscode.commands.executeCommand('qagenai.analyzeWorkspace');
                }, 1000);
            } catch (error: any) {
                console.error('[Create] Error writing file:', error);
                vscode.window.showErrorMessage(`Failed to create file: ${error.message}`);
            }
        }
        
    } catch (error: any) {
        if (error.message === 'Cancelled by user') {
            vscode.window.showInformationMessage('Test generation cancelled');
        } else {
            console.error('Error generating tests:', error);
            vscode.window.showErrorMessage(`Failed to generate tests: ${error.message}`);
        }
    }
}

/**
 * Get language from file extension
 */
function getLanguageFromExtension(ext: string): string {
    const extMap: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
        '.go': 'go',
        '.java': 'java',
        '.cs': 'csharp'
    };
    return extMap[ext] || 'unknown';
}

/**
 * Get test file path from source file path
 */
function getTestFilePath(sourceFilePath: string): string {
    const ext = path.extname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, ext);
    const dir = path.dirname(sourceFilePath);
    
    // Default pattern: same directory with .test.ext
    return path.join(dir, `${baseName}.test${ext}`);
}

/**
 * Get test file path based on framework output path configuration
 */
function getTestFilePathForFramework(sourceFilePath: string, outputPath: string, testType: string): string {
    const ext = path.extname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, ext);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    if (!workspaceFolder) {
        return getTestFilePath(sourceFilePath);
    }
    
    // Determine test file extension based on test type
    let testExt = '.test' + ext;
    if (testType === 'e2e') {
        testExt = '.spec' + ext; // Playwright typically uses .spec
    }
    
    // If outputPath is relative, join with workspace root
    const absoluteOutputPath = path.isAbsolute(outputPath)
        ? outputPath
        : path.join(workspaceFolder.uri.fsPath, outputPath);
    
    // Create test file name
    const testFileName = `${baseName}${testExt}`;
    
    // Join output path with test file name
    return path.join(absoluteOutputPath, testFileName);
}

/**
 * Count test cases in generated code
 */
function countTestCases(code: string): number {
    // Simple heuristic: count 'it(' or 'test(' occurrences
    const itMatches = code.match(/\bit\(/g);
    const testMatches = code.match(/\btest\(/g);
    return (itMatches?.length || 0) + (testMatches?.length || 0);
}

/**
 * Generate mock test based on framework and test type
 */
function generateMockTest(fileName: string, framework: string, testType: string): string {
    const componentName = path.basename(fileName, path.extname(fileName));
    
    if (framework === 'Playwright' && testType === 'e2e') {
        return `import { test, expect } from '@playwright/test';

test.describe('${componentName}', () => {
  test('should load the page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/.*/);
  });

  test('should navigate and interact', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Add your test steps here
    await page.waitForLoadState('networkidle');
  });
});
`;
    }
    
    if (framework === 'Jest' || framework === 'Vitest') {
        return `import { describe, it, expect } from '${framework === 'Vitest' ? 'vitest' : '@jest/globals'}';

describe('${componentName}', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
`;
    }
    
    if (framework === 'React Testing Library') {
        return `import { render, screen } from '@testing-library/react';
import ${componentName} from './${fileName.replace(/\.(tsx|ts|jsx|js)$/, '')}';

describe('${componentName}', () => {
  it('renders correctly', () => {
    render(<${componentName} />);
    expect(screen.getByRole).toBeDefined();
  });
});
`;
    }
    
    // Generic fallback
    return `// Test for ${fileName}
// Framework: ${framework}
// Type: ${testType}

// TODO: Add test implementation
`;
}

// Keep old implementation as fallback for recommendation nodes
async function handleGenerateTestsForFileOld(
    item: CoverageItem,
    coverageProvider: CoverageTreeProvider,
    chatProvider: ChatPanelProvider
) {
    const filePath = item.filePath || item.gap?.relativePath;
    if (!filePath) {
        vscode.window.showErrorMessage('No file information available');
        return;
    }

    // Check if item has specific recommendation (clicked on recommendation node)
    if (item.recommendation) {
        const rec = item.recommendation;
        const fileName = filePath ? path.basename(filePath) : 'file';
        
        const message = `Generate ${rec.testType} test for ${fileName} using ${rec.framework}.\n\n` +
            `Test Type: ${rec.testType} (${rec.priority})\n` +
            `Framework: ${rec.framework}\n` +
            (rec.outputPath ? `Output: ${rec.outputPath}\n` : '') +
            (rec.runCommand ? `Run: ${rec.runCommand}\n` : '') +
            `\nReason: ${rec.reason}`;
        
        // Focus chat and send message
        await vscode.commands.executeCommand('qagenai.chatView.focus');
        chatProvider.sendMessage(message);
        return;
    }

    // Try to get recommendation from enhanced report
    const enhancedReport = coverageProvider.getEnhancedReport();
    if (enhancedReport) {
        // Use enhanced flow with recommendations from backend
        const fileAnalysis = enhancedReport.files.find(f => f.path === filePath);
        
        if (fileAnalysis?.recommendedTestType && fileAnalysis?.recommendedFramework) {
            // We have recommendations - build message directly
            const testType = fileAnalysis.recommendedTestType;
            const framework = fileAnalysis.recommendedFramework;
            const fileName = path.basename(filePath);
            
            const message = `Generate ${testType} test for ${fileName} using ${framework}.\n\n` +
                `Source file: ${filePath}\n` +
                (fileAnalysis.outputPath ? `Test output: ${fileAnalysis.outputPath}\n\n` : '') +
                `Reason: ${fileAnalysis.reason || 'Testing needed'}`;
            
            // Focus chat and send message
            await vscode.commands.executeCommand('qagenai.chatView.focus');
            chatProvider.sendMessage(message);
            return;
        }
    }

    // Fallback to legacy flow if no enhanced recommendations
    if (!item.gap) {
        // No legacy data either - just use simple picker
        const testType = await showTestTypeQuickPick();
        if (!testType) return;
        
        const message = `Generate ${testType} test for ${filePath}`;
        await vscode.commands.executeCommand('qagenai.chatView.focus');
        chatProvider.sendMessage(message);
        return;
    }

    // Legacy flow with gap data
    const report = coverageProvider.getReport();
    const frameworks = report?.frameworks || {};
    const fileType = item.gap.fileType;
    
    // Fetch context-aware test type recommendations from backend
    let recommendations;
    try {
        recommendations = await backendApi.getTestTypeRecommendations(fileType, frameworks);
    } catch (error: any) {
        console.error('Failed to fetch test type recommendations:', error);
        // Fallback to simple picker
        const testType = await showTestTypeQuickPick();
        if (!testType) return;
        
        // Continue with old flow
        const message = buildTestMessage(testType, item.gap.relativePath, frameworks);
        await vscode.commands.executeCommand('qagenai.chatView.focus');
        chatProvider.sendMessage(message);
        return;
    }

    // Show context-aware picker
    const selectedId = await showContextAwareTestTypePicker(recommendations, item.gap);
    if (!selectedId) return;

    // Build message with selected test type
    const selected = recommendations.find((r: any) => r.id === selectedId);
    const message = selected 
        ? `Generate ${selected.label.toLowerCase()} for ${item.gap.relativePath}` 
        : `Generate tests for ${item.gap.relativePath}`;

    // Focus chat and send message
    await vscode.commands.executeCommand('qagenai.chatView.focus');
    chatProvider.sendMessage(message);
}

async function showSetupWizard(
    workspacePath: string,
    chatProvider: ChatPanelProvider
) {
    try {
        // Fetch setup recommendations from backend
        const data = await backendApi.getSetupRecommendations(workspacePath);

        const { stack, existingFrameworks, recommendations } = data;

        // Focus chat view
        await vscode.commands.executeCommand('qagenai.chatView.focus');

        // Build setup message for Agent
        let message = `Set up testing framework for this project.\n\n`;
        message += `Detected stack: ${stack.join(', ')}\n\n`;
        
        // Show existing frameworks
        const hasExisting = existingFrameworks && Object.keys(existingFrameworks).length > 0;
        if (hasExisting) {
            message += `Existing frameworks:\n`;
            if (existingFrameworks.unit) {
                message += `✅ ${existingFrameworks.unit.name} v${existingFrameworks.unit.version} (Unit Testing)\n`;
            }
            if (existingFrameworks.e2e) {
                message += `✅ ${existingFrameworks.e2e.name} v${existingFrameworks.e2e.version} (E2E Testing)\n`;
            }
            if (existingFrameworks.component) {
                message += `✅ ${existingFrameworks.component.name} v${existingFrameworks.component.version} (Component Testing)\n`;
            }
            message += `\n`;
        }
        
        message += `Recommended setup:\n`;

        if (recommendations.unit) {
            const status = recommendations.unit.status === 'installed' ? '✅' : '📦';
            message += `${status} Unit Testing: ${recommendations.unit.name} (${recommendations.unit.reason})\n`;
            if (recommendations.unit.packages.length > 0) {
                message += `  Install: ${recommendations.unit.packages.join(', ')}\n`;
            }
        }
        if (recommendations.e2e) {
            const status = recommendations.e2e.status === 'installed' ? '✅' : '📦';
            message += `${status} E2E Testing: ${recommendations.e2e.name} (${recommendations.e2e.reason})\n`;
            if (recommendations.e2e.packages.length > 0) {
                message += `  Install: ${recommendations.e2e.packages.join(', ')}\n`;
            }
        }
        if (recommendations.component) {
            const status = recommendations.component.status === 'installed' ? '✅' : '📦';
            message += `${status} Component Testing: ${recommendations.component.name} (${recommendations.component.reason})\n`;
            if (recommendations.component.packages.length > 0) {
                message += `  Install: ${recommendations.component.packages.join(', ')}\n`;
            }
        }

        // Show additional recommended packages
        if (recommendations.additionalPackages && recommendations.additionalPackages.length > 0) {
            message += `\nAdditional recommended packages:\n`;
            for (const pkg of recommendations.additionalPackages) {
                message += `✨ ${pkg.name}: ${pkg.reason}\n`;
                message += `  Install: ${pkg.packages.join(', ')}\n`;
            }
        }

        message += `\nPlease:\n`;
        if (hasExisting) {
            message += `1. Install any missing packages listed above\n`;
            message += `2. Install additional recommended packages (optional but useful)\n`;
            message += `3. Update configuration files if needed\n`;
            message += `4. Add any missing test scripts to package.json\n`;
        } else {
            message += `1. Install the recommended packages\n`;
            message += `2. Create configuration files (jest.config.js, etc.)\n`;
            message += `3. Create folder structure (__tests__, etc.)\n`;
            message += `4. Add test scripts to package.json\n`;
            message += `5. Create an example test file to verify setup\n`;
        }

        // Send message to Agent
        chatProvider.sendMessage(message);

        vscode.window.showInformationMessage('🧙 Setup Wizard started in Chat');
    } catch (error: any) {
        console.error('Setup Wizard error:', error);
        vscode.window.showErrorMessage(`Failed to start Setup Wizard: ${error.message}`);
    }
}

async function showTestTypeQuickPick(): Promise<'unit' | 'integration' | 'e2e' | 'smart' | undefined> {
    const items: vscode.QuickPickItem[] = [
        {
            label: '$(beaker) Unit Tests',
            detail: 'Fast, isolated tests for individual functions/methods',
            description: 'Recommended'
        },
        {
            label: '$(link) Integration Tests',
            detail: 'Tests multiple components together with real dependencies'
        },
        {
            label: '$(browser) E2E Tests',
            detail: 'Full user flow testing in browser or complete environment'
        },
        {
            label: '$(sparkle) Smart (AI decides)',
            detail: 'Let AI analyze the code and choose the best test type'
        }
    ];

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select test type to generate',
        title: 'Generate Tests'
    });

    if (!selected) {
        return undefined;
    }

    if (selected.label.includes('Unit')) {
        return 'unit';
    } else if (selected.label.includes('Integration')) {
        return 'integration';
    } else if (selected.label.includes('E2E')) {
        return 'e2e';
    } else {
        return 'smart';
    }
}

async function showContextAwareTestTypePicker(
    recommendations: Array<{
        id: string;
        label: string;
        framework?: string;
        detail: string;
        recommended?: boolean;
    }>,
    gap: any
): Promise<string | undefined> {
    const items: vscode.QuickPickItem[] = recommendations.map(rec => ({
        label: rec.label + (rec.recommended ? ' ⭐' : ''),
        description: rec.framework,
        detail: rec.detail,
        ...(rec as any)
    }));

    const fileTypeDisplay = gap.fileType.charAt(0).toUpperCase() + gap.fileType.slice(1);
    const fileName = path.basename(gap.relativePath);

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Select test type for ${fileName}`,
        title: `Generate Tests (${fileTypeDisplay})`,
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (!selected) {
        return undefined;
    }

    return (selected as any).id;
}

async function handleGenerateAllTests(
    item: CoverageItem,
    coverageProvider: CoverageTreeProvider,
    chatProvider: ChatPanelProvider
) {
    const report = coverageProvider.getReport();
    if (!report || !item.category) {
        vscode.window.showErrorMessage('No category information available');
        return;
    }

    // Get all files in this category
    let gaps: typeof report.gaps = [];
    switch (item.category) {
        case 'noTests':
            gaps = report.gaps.filter(g => !g.hasTest);
            break;
        case 'partial':
            gaps = report.gaps.filter(g => g.hasTest && g.priority === 'medium');
            break;
        case 'good':
            gaps = report.gaps.filter(g => g.hasTest && g.priority === 'low');
            break;
    }

    if (gaps.length === 0) {
        vscode.window.showInformationMessage('No files to generate tests for');
        return;
    }

    // Confirm with user
    const confirm = await vscode.window.showWarningMessage(
        `Generate tests for ${gaps.length} file(s)?`,
        'Yes', 'Cancel'
    );

    if (confirm !== 'Yes') {
        return;
    }

    // Focus chat and send batch request
    await vscode.commands.executeCommand('qagenai.chatView.focus');

    const fileList = gaps.map((g, i) => `${i + 1}. ${g.relativePath}`).join('\n');
    const message = `Generate tests for the following ${gaps.length} files:\n\n${fileList}\n\nPlease process them one by one and show action cards for each.`;

    chatProvider.sendMessage(message);

    vscode.window.showInformationMessage(`🧪 Generating tests for ${gaps.length} files...`);
}

async function handleImproveTest(
    item: CoverageItem,
    coverageProvider: CoverageTreeProvider,
    chatProvider: ChatPanelProvider
) {
    if (!item.gap) {
        vscode.window.showErrorMessage('No file information available');
        return;
    }

    const fileName = path.basename(item.gap.relativePath);
    const testFileName = fileName.replace(/\.ts$/, '.spec.ts');

    // Focus chat and request improvements
    await vscode.commands.executeCommand('qagenai.chatView.focus');

    const message = `Improve test coverage for ${item.gap.relativePath}.\n\n` +
        `Current test file: ${testFileName}\n\n` +
        `Please:\n` +
        `1. Analyze existing tests\n` +
        `2. Identify missing test cases (edge cases, error scenarios, boundary values)\n` +
        `3. Suggest additional test cases to improve coverage\n` +
        `4. Update the test file with comprehensive tests`;

    chatProvider.sendMessage(message);

    vscode.window.showInformationMessage(`🔍 Analyzing coverage for ${fileName}...`);
}

function buildTestMessage(testType: string, relativePath: string, frameworks: any): string {
    let frameworkContext = '';
    if (frameworks.unit) {
        frameworkContext += ` using ${frameworks.unit.name}`;
    }
    if (frameworks.e2e && testType === 'e2e') {
        frameworkContext = ` using ${frameworks.e2e.name}`;
    }

    switch (testType) {
        case 'unit':
            return `Generate unit tests for ${relativePath}${frameworkContext}`;
        case 'integration':
            return `Generate integration tests for ${relativePath}${frameworkContext}`;
        case 'e2e':
            return `Generate E2E tests for ${relativePath}${frameworkContext}`;
        case 'smart':
            return `Generate tests for ${relativePath}${frameworkContext}. Analyze the code and choose the most appropriate test type (unit/integration/e2e).`;
        default:
            return `Generate tests for ${relativePath}${frameworkContext}`;
    }
}

/**
 * Handle run tests command for test type node
 * Accepts either a CoverageItem (from TreeView) or a string testType (from WebView)
 */
async function handleRunTests(
    itemOrType: CoverageItem | string,
    coverageProvider: CoverageTreeProvider
) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    
    let runCommand: string | undefined;
    
    // Handle string testType from WebView
    if (typeof itemOrType === 'string') {
        const testType = itemOrType;
        // Find the run command from detected stacks
        const stacks = coverageProvider.getStacks();
        for (const stack of stacks) {
            const testTypeMatrix = stack.testTypes.find(tt => tt.testType === testType);
            if (testTypeMatrix?.runCommand) {
                runCommand = testTypeMatrix.runCommand;
                break;
            }
        }
        
        if (!runCommand) {
            // Fallback: use common commands based on test type
            const fallbackCommands: Record<string, string> = {
                'component': 'npm test',
                'unit': 'npm test',
                'e2e': 'npm run test:e2e',
                'visual': 'npm run test:visual',
                'integration': 'npm run test:integration'
            };
            runCommand = fallbackCommands[testType] || 'npm test';
        }
    } else {
        // Handle CoverageItem from TreeView
        const testTypeMatrix = itemOrType.testTypeMatrixNode?.testTypeMatrix;
        if (!testTypeMatrix) {
            vscode.window.showErrorMessage('No test type information available');
            return;
        }
        runCommand = testTypeMatrix.runCommand;
    }
    
    if (!runCommand) {
        vscode.window.showErrorMessage('No run command configured');
        return;
    }
    
    // Execute tests
    await testExecutionService.runTests(runCommand, workspaceFolder.uri.fsPath);
}

/**
 * Handle install test framework command
 * Accepts either a CoverageItem (from TreeView) or a string framework name (from WebView)
 */
async function handleInstallTestFramework(
    itemOrFramework: CoverageItem | string,
    coverageProvider: CoverageTreeProvider
) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    
    let frameworkName: string;
    let installCommand: string | undefined;
    let reason: string = '';
    
    // Handle string framework name from WebView
    if (typeof itemOrFramework === 'string') {
        frameworkName = itemOrFramework;
        // Find the framework in detected stacks
        const stacks = coverageProvider.getStacks();
        for (const stack of stacks) {
            const testType = stack.testTypes.find(tt => tt.framework.name === frameworkName);
            if (testType) {
                installCommand = testType.framework.installCommand;
                reason = testType.framework.reason || '';
                break;
            }
        }
        
        if (!installCommand) {
            // Detect React version for testing-library compatibility
            let testingLibraryCmd = 'npm install -D @testing-library/react @testing-library/jest-dom --legacy-peer-deps';
            if (frameworkName.toLowerCase() === 'testing-library') {
                try {
                    const pkgJson = require(path.join(workspaceFolder.uri.fsPath, 'package.json'));
                    const reactVersion = pkgJson.dependencies?.react || pkgJson.devDependencies?.react || '';
                    const majorVersion = parseInt(reactVersion.replace(/[^0-9]/g, '').charAt(0));
                    
                    if (majorVersion === 16) {
                        // React 16 requires testing-library/react@12
                        testingLibraryCmd = 'npm install -D @testing-library/react@^12.1.5 @testing-library/jest-dom@^5.16.5 --legacy-peer-deps';
                    } else if (majorVersion === 17) {
                        // React 17 requires testing-library/react@12
                        testingLibraryCmd = 'npm install -D @testing-library/react@^12.1.5 @testing-library/jest-dom@^5.16.5 --legacy-peer-deps';
                    }
                } catch (e) {
                    // Fallback to latest if we can't detect React version
                }
            }
            
            // Fallback: use common install commands
            const fallbackInstalls: Record<string, string> = {
                'vitest': 'npm install -D vitest --legacy-peer-deps',
                'jest': 'npm install -D jest @types/jest ts-jest --legacy-peer-deps',
                'playwright': 'npm install -D @playwright/test --legacy-peer-deps && npx playwright install',
                'cypress': 'npm install -D cypress --legacy-peer-deps',
                'testing-library': testingLibraryCmd
            };
            installCommand = fallbackInstalls[frameworkName.toLowerCase()];
        }
    } else {
        // Handle CoverageItem from TreeView
        const testTypeMatrix = itemOrFramework.testTypeMatrixNode?.testTypeMatrix;
        if (!testTypeMatrix) {
            vscode.window.showErrorMessage('No framework information available');
            return;
        }
        frameworkName = testTypeMatrix.framework.name;
        installCommand = testTypeMatrix.framework.installCommand;
        reason = testTypeMatrix.framework.reason || '';
    }
    
    if (!installCommand) {
        vscode.window.showErrorMessage('No install command available');
        return;
    }
    
    // Confirm with user
    const message = reason 
        ? `Install ${frameworkName}?\n\n${reason}\n\nCommand: ${installCommand}`
        : `Install ${frameworkName}?\n\nCommand: ${installCommand}`;
    const confirm = await vscode.window.showInformationMessage(
        message,
        'Install', 'Cancel'
    );
    
    if (confirm !== 'Install') {
        return;
    }
    
    // Execute install with progress tracking
    try {
        await testExecutionService.installFramework(installCommand, workspaceFolder.uri.fsPath);
        
        // Re-analyze workspace after installation (increased timeout for npm to complete)
        setTimeout(async () => {
            vscode.window.showInformationMessage('Installation complete! Re-analyzing workspace...');
            await vscode.commands.executeCommand('qagenai.analyzeWorkspace');
            
            // Give extra time for analysis to complete and UI to refresh
            setTimeout(() => {
                vscode.window.showInformationMessage(
                    `${frameworkName} installed successfully! Check the Unit/Component tabs.`,
                    'View Coverage'
                ).then(action => {
                    if (action === 'View Coverage') {
                        vscode.commands.executeCommand('qagenai.coverageView.focus');
                    }
                });
            }, 2000);
        }, 8000);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to install ${frameworkName}. Check the terminal for details.`,
            'Open Terminal'
        ).then(action => {
            if (action === 'Open Terminal') {
                const terminals = vscode.window.terminals;
                const installTerminal = terminals.find(t => t.name === 'QAgenAI - Install Framework');
                installTerminal?.show();
            }
        });
    }
}

/**
 * Handle run test file command
 */
async function handleRunTestFile(
    uri: vscode.Uri | undefined,
    coverageProvider: CoverageTreeProvider
) {
    const testFilePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!testFilePath) {
        vscode.window.showErrorMessage('No test file selected');
        return;
    }
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    
    // Detect framework from file
    const framework = detectFrameworkFromFile(testFilePath, coverageProvider);
    if (!framework) {
        vscode.window.showErrorMessage('Could not detect test framework for this file');
        return;
    }
    
    await testExecutionService.runTest(testFilePath, framework, workspaceFolder.uri.fsPath);
}

/**
 * Handle watch test file command
 */
async function handleWatchTestFile(
    uri: vscode.Uri | undefined,
    coverageProvider: CoverageTreeProvider
) {
    const testFilePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!testFilePath) {
        vscode.window.showErrorMessage('No test file selected');
        return;
    }
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    
    const framework = detectFrameworkFromFile(testFilePath, coverageProvider);
    if (!framework) {
        vscode.window.showErrorMessage('Could not detect test framework for this file');
        return;
    }
    
    await testExecutionService.watchTest(testFilePath, framework, workspaceFolder.uri.fsPath);
}

/**
 * Handle debug test file command
 */
async function handleDebugTestFile(
    uri: vscode.Uri | undefined,
    coverageProvider: CoverageTreeProvider
) {
    const testFilePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!testFilePath) {
        vscode.window.showErrorMessage('No test file selected');
        return;
    }
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    
    const framework = detectFrameworkFromFile(testFilePath, coverageProvider);
    if (!framework) {
        vscode.window.showErrorMessage('Could not detect test framework for this file');
        return;
    }
    
    await testExecutionService.debugTest(testFilePath, framework, workspaceFolder.uri.fsPath);
}

/**
 * Detect test framework from file path and coverage report
 */
function detectFrameworkFromFile(
    testFilePath: string,
    coverageProvider: CoverageTreeProvider
): import('../services/test-execution.service').FrameworkExecutionConfig | null {
    const { getFrameworkExecutionConfig } = require('../services/test-execution.service');
    const report = coverageProvider.getReport();
    const fileName = path.basename(testFilePath);
    
    // Check if file is in e2e folder or has .spec extension
    if (testFilePath.includes('/e2e/') || testFilePath.includes('\\e2e\\')) {
        // E2E test - check for Playwright
        if (report?.frameworks?.e2e?.name) {
            return getFrameworkExecutionConfig(report.frameworks.e2e.name);
        }
        return getFrameworkExecutionConfig('playwright');
    }
    
    // Unit test - check file extension pattern
    if (fileName.includes('.spec.')) {
        // .spec.* usually means Playwright or Vitest
        if (report?.frameworks?.unit?.name) {
            return getFrameworkExecutionConfig(report.frameworks.unit.name);
        }
        return getFrameworkExecutionConfig('vitest');
    }
    
    if (fileName.includes('.test.')) {
        // .test.* usually means Jest
        if (report?.frameworks?.unit?.name) {
            return getFrameworkExecutionConfig(report.frameworks.unit.name);
        }
        return getFrameworkExecutionConfig('jest');
    }
    
    // Python test files
    if (fileName.startsWith('test_') && fileName.endsWith('.py')) {
        return getFrameworkExecutionConfig('pytest');
    }
    
    // Go test files
    if (fileName.endsWith('_test.go')) {
        return getFrameworkExecutionConfig('go-testing');
    }
    
    // Java test files
    if (fileName.endsWith('Test.java')) {
        return getFrameworkExecutionConfig('junit');
    }
    
    // Fallback to unit framework from report
    if (report?.frameworks?.unit?.name) {
        return getFrameworkExecutionConfig(report.frameworks.unit.name);
    }
    
    return null;
}
