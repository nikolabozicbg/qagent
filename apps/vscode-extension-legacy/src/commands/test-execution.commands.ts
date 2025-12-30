import * as vscode from 'vscode';
import * as path from 'path';
import { CoverageTreeProvider, CoverageItem } from '../coverageTreeProvider';
import { TestExecutionService, FrameworkExecutionConfig, getFrameworkExecutionConfig } from '../services/test-execution.service';

const testExecutionService = new TestExecutionService();

/**
 * Handle run tests command for test type node
 * Accepts either a CoverageItem (from TreeView) or a string testType (from WebView)
 */
export async function handleRunTests(
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
 * Handle run test file command
 */
export async function handleRunTestFile(
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
export async function handleWatchTestFile(
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
export async function handleDebugTestFile(
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
): FrameworkExecutionConfig | null {
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
