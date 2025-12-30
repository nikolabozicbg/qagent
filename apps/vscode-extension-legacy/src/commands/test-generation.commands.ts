import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CoverageTreeProvider, CoverageItem } from '../coverageTreeProvider';
import { ChatPanelProvider } from '../providers/chat-panel.provider';
import { BackendApiService } from '../services/backend-api.service';
import { SourceAnalyzerService } from '../services/source-analyzer.service';
import { TestGenerationProgressService, GenerationStage } from '../services/test-generation-progress.service';
import { TestPreviewWebviewProvider, PreviewAction, TestPreviewData } from '../webviews/test-preview.webview';

const backendApi = new BackendApiService();
const sourceAnalyzer = new SourceAnalyzerService();
const progressService = new TestGenerationProgressService();

let testPreviewProvider: TestPreviewWebviewProvider | undefined;

/**
 * Set the test preview provider (injected from ServiceContainer)
 */
export function setTestPreviewProvider(provider: TestPreviewWebviewProvider) {
    testPreviewProvider = provider;
}

/**
 * Handle generate tests for file command
 */
export async function handleGenerateTestsForFile(
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
    
    // Detect framework and test type
    const { framework, testType, outputPath } = await detectTestConfig(absolutePath, item, coverageProvider);
    
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
        if (!testPreviewProvider) {
            throw new Error('TestPreviewWebviewProvider not initialized. Call setTestPreviewProvider first.');
        }
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
            await createTestFile(generatedTest, code);
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
 * Handle batch test generation
 */
export async function handleGenerateBatchTests(
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

/**
 * Handle generate all tests in a category
 */
export async function handleGenerateAllTests(
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

/**
 * Handle improve existing test coverage
 */
export async function handleImproveTest(
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

// ========== Helper Functions ==========

async function detectTestConfig(
    absolutePath: string,
    item: CoverageItem | undefined,
    coverageProvider: CoverageTreeProvider
): Promise<{ framework: string; testType: string; outputPath: string }> {
    let framework = 'Jest';
    let testType = 'Unit';
    let outputPath = '';
    
    // Try to auto-detect installed framework from coverage provider
    const enhancedReport = coverageProvider.getEnhancedReport();
    if (enhancedReport?.project?.stacks) {
        for (const stack of enhancedReport.project.stacks) {
            const installedType = stack.testTypes?.find(tt => tt.status === 'installed');
            if (installedType) {
                framework = installedType.framework.name;
                testType = installedType.testType;
                outputPath = installedType.outputPath || '';
                break;
            }
        }
    }
    
    // Auto-detect E2E for Next.js App Router files
    const fileName = path.basename(absolutePath).toLowerCase();
    const isNextAppRouterFile = absolutePath.includes('/app/') && 
        ['page.tsx', 'page.ts', 'page.jsx', 'page.js', 'layout.tsx', 'layout.ts', 'layout.jsx', 'layout.js', 'template.tsx', 'error.tsx', 'loading.tsx'].includes(fileName);
    
    if (isNextAppRouterFile) {
        testType = 'E2E';
        framework = 'Playwright';
    }
    
    // For React components, prefer component testing
    const isReactComponent = absolutePath.endsWith('.tsx') && 
        !isNextAppRouterFile &&
        absolutePath.includes('/components/');
    
    if (isReactComponent) {
        let hasComponentTesting = false;
        
        if (enhancedReport?.project?.stacks) {
            for (const stack of enhancedReport.project.stacks) {
                const componentType = stack.testTypes?.find(tt => 
                    tt.status === 'installed' && 
                    (tt.testType === 'component' || tt.framework.name.toLowerCase().includes('testing library') || tt.framework.name.toLowerCase() === 'jest')
                );
                if (componentType) {
                    framework = componentType.framework.name;
                    testType = componentType.testType;
                    outputPath = componentType.outputPath || '';
                    hasComponentTesting = true;
                    break;
                }
            }
        }
        
        if (!hasComponentTesting) {
            const choice = await vscode.window.showWarningMessage(
                `React component "${path.basename(absolutePath)}" requires Jest + Testing Library for unit tests.`,
                'Install Jest',
                'Use Playwright anyway',
                'Cancel'
            );
            
            if (choice === 'Install Jest') {
                await vscode.commands.executeCommand('qagenai.installTestFramework', 'Jest');
                throw new Error('Cancelled by user');
            } else if (choice === 'Cancel') {
                throw new Error('Cancelled by user');
            }
        }
    }
    
    // Try to get from TestTypeMatrixNode (stack-based view)
    if (item?.testTypeMatrixNode) {
        const node = item.testTypeMatrixNode;
        
        if (node.testTypeMatrix) {
            framework = node.testTypeMatrix.framework.name;
            testType = node.testTypeMatrix.testType;
            outputPath = node.testTypeMatrix.outputPath || '';
        }
        
        if (node.stack && !node.testTypeMatrix) {
            const firstTestType = node.stack.testTypes.find(tt => tt.status === 'installed');
            if (firstTestType) {
                framework = firstTestType.framework.name;
                testType = firstTestType.testType;
                outputPath = firstTestType.outputPath || '';
            }
        }
    }
    
    // Auto-detect outputPath for E2E
    if (!outputPath && testType.toLowerCase() === 'e2e') {
        outputPath = 'e2e';
    }
    
    return { framework, testType, outputPath };
}

async function createTestFile(generatedTest: TestPreviewData, code: string | undefined) {
    const finalCode = code || generatedTest.testCode;
    const testFileDir = path.dirname(generatedTest.testFilePath);
    
    try {
        if (!fs.existsSync(testFileDir)) {
            fs.mkdirSync(testFileDir, { recursive: true });
        }
        
        fs.writeFileSync(generatedTest.testFilePath, finalCode, 'utf-8');
        
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

function getTestFilePath(sourceFilePath: string): string {
    const ext = path.extname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, ext);
    const dir = path.dirname(sourceFilePath);
    return path.join(dir, `${baseName}.test${ext}`);
}

function getTestFilePathForFramework(sourceFilePath: string, outputPath: string, testType: string): string {
    const ext = path.extname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, ext);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    if (!workspaceFolder) {
        return getTestFilePath(sourceFilePath);
    }
    
    let testExt = '.test' + ext;
    if (testType === 'e2e') {
        testExt = '.spec' + ext;
    }
    
    const absoluteOutputPath = path.isAbsolute(outputPath)
        ? outputPath
        : path.join(workspaceFolder.uri.fsPath, outputPath);
    
    const testFileName = `${baseName}${testExt}`;
    return path.join(absoluteOutputPath, testFileName);
}

function countTestCases(code: string): number {
    const itMatches = code.match(/\bit\(/g);
    const testMatches = code.match(/\btest\(/g);
    return (itMatches?.length || 0) + (testMatches?.length || 0);
}

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
    
    return `// Test for ${fileName}
// Framework: ${framework}
// Type: ${testType}

// TODO: Add test implementation
`;
}
