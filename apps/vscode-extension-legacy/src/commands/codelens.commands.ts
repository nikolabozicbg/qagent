import * as vscode from 'vscode';
import * as path from 'path';
import { CoverageCodeLensProvider } from '../providers';
import { ChatPanelProvider } from '../providers/chat-panel.provider';
import { CoverageParserService } from '../services/coverage-parser.service';

/**
 * Register all CodeLens-related commands
 */
export function registerCodeLensCommands(
  context: vscode.ExtensionContext,
  codeLensProvider: CoverageCodeLensProvider,
  chatProvider?: ChatPanelProvider
): void {
  // 1. Analyze coverage for a file
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.analyzeCoverage', async (filePath: string) => {
      await handleAnalyzeCoverage(filePath, codeLensProvider);
    })
  );

  // 2. Show coverage details for a class
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.showCoverageDetails', async (filePath: string, className: string) => {
      await handleShowCoverageDetails(filePath, className);
    })
  );

  // 3. Run tests for a file
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.runTestsForFile', async (testFilePath: string) => {
      await handleRunTestsForFile(testFilePath);
    })
  );

  // 4. Open coverage report
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.openCoverageReport', async (filePath: string) => {
      await handleOpenCoverageReport(filePath);
    })
  );

  // 5. Show method tests
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.showMethodTests', async (methodName: string, testFilePath?: string) => {
      await handleShowMethodTests(methodName, testFilePath);
    })
  );

  // 6. Run method tests
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.runMethodTests', async (methodName: string, testFilePath?: string) => {
      await handleRunMethodTests(methodName, testFilePath);
    })
  );

  // 7. Navigate to test
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.navigateToTest', async (testFilePath?: string, methodName?: string) => {
      await handleNavigateToTest(testFilePath, methodName);
    })
  );

  // 8. Show method coverage
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.showMethodCoverage', async (methodName: string) => {
      await handleShowMethodCoverage(methodName);
    })
  );

  // 9. Improve method tests
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.improveMethodTests', async (methodName: string, testFilePath?: string) => {
      await handleImproveMethodTests(methodName, testFilePath, chatProvider);
    })
  );

  // 10. Show method info
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.showMethodInfo', async (methodName: string) => {
      await handleShowMethodInfo(methodName);
    })
  );

  // 11. Generate test for method
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.generateTestForMethod', async (methodName: string) => {
      await handleGenerateTestForMethod(methodName, chatProvider);
    })
  );
}

/**
 * Handler: Analyze coverage for a file
 */
async function handleAnalyzeCoverage(
  filePath: string,
  codeLensProvider: CoverageCodeLensProvider
): Promise<void> {
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Analyzing coverage for ${path.basename(filePath)}...`,
    cancellable: false
  }, async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    // Parse real coverage data
    const coverageParser = new CoverageParserService();
    const workspacePath = workspaceFolder.uri.fsPath;
    
    try {
      const fileCoverage = await coverageParser.getFileCoverage(workspacePath, filePath);
      
      if (fileCoverage) {
        // Convert function coverage to method coverage for CodeLens
        const methods = fileCoverage.functionDetails.map(func => ({
          methodName: func.name,
          lineNumber: func.lineNumber,
          coverageStatus: func.isCovered ? 'tested' as const : 'untested' as const,
          testCount: func.hits,
          testFilePath: undefined // TODO: Detect test file path
        }));

        // Determine if file has test
        const hasTest = fileCoverage.functions.covered > 0;

        codeLensProvider.updateCoverageData(filePath, {
          filePath,
          overallCoverage: fileCoverage.lines.percentage,
          methods,
          hasTest,
          testFilePath: undefined // TODO: Detect test file path
        });
        
        vscode.window.showInformationMessage(
          `Coverage: ${fileCoverage.lines.percentage}% (${fileCoverage.functions.covered}/${fileCoverage.functions.total} functions)`
        );
      } else {
        // Skip warning for config files
        const fileName = path.basename(filePath).toLowerCase();
        const isConfigFile = fileName.includes('config') || fileName.startsWith('.');
        
        if (!isConfigFile) {
            // No coverage data found - show message
            vscode.window.showWarningMessage(
              `No coverage data found for ${path.basename(filePath)}. Run tests with coverage first.`,
              'Run Tests'
            ).then(selection => {
              if (selection === 'Run Tests') {
                // TODO: Trigger test execution with coverage
                const terminal = vscode.window.createTerminal('Run Tests');
                terminal.show();
                terminal.sendText('npm test -- --coverage');
              }
            });
        }
      }
    } catch (error) {
      console.error('Error analyzing coverage:', error);
      vscode.window.showErrorMessage(`Failed to analyze coverage: ${error}`);
    }
  });
}

/**
 * Handler: Show coverage details for a class
 */
async function handleShowCoverageDetails(
  filePath: string,
  className: string
): Promise<void> {
  // Open coverage view and focus on this file
  await vscode.commands.executeCommand('qagenai.coverageView.focus');
  vscode.window.showInformationMessage(`Coverage details for ${className} (60%)`);
}

/**
 * Handler: Run tests for a file
 */
async function handleRunTestsForFile(testFilePath: string): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  // Determine test command based on framework
  // TODO: Detect framework and use appropriate command
  const testCommand = `npm test -- ${path.basename(testFilePath, path.extname(testFilePath))}`;

  const terminal = vscode.window.createTerminal('QAgenAI: Run Tests');
  terminal.show();
  terminal.sendText(testCommand);
}

/**
 * Handler: Open coverage report
 */
async function handleOpenCoverageReport(filePath: string): Promise<void> {
  // TODO: Open HTML coverage report if available
  // For MVP, just open coverage view
  await vscode.commands.executeCommand('qagenai.coverageView.focus');
  vscode.window.showInformationMessage('Coverage report for ' + path.basename(filePath));
}

/**
 * Handler: Show method tests
 */
async function handleShowMethodTests(
  methodName: string,
  testFilePath?: string
): Promise<void> {
  if (testFilePath) {
    // Open test file and search for method tests
    const doc = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(doc);
    
    // Find test for this method
    const text = doc.getText();
    const testRegex = new RegExp(`(describe|it|test)\\(['\"].*${methodName}.*['\"]`, 'gi');
    const match = testRegex.exec(text);
    
    if (match) {
      const position = doc.positionAt(match.index);
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
      }
    }
  } else {
    vscode.window.showInformationMessage(`Tests for ${methodName}`);
  }
}

/**
 * Handler: Run method tests
 */
async function handleRunMethodTests(
  methodName: string,
  testFilePath?: string
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  if (!testFilePath) {
    vscode.window.showWarningMessage(`No test file found for ${methodName}`);
    return;
  }

  // Run specific test for this method
  // TODO: Detect framework and use appropriate grep/filter
  const testCommand = `npm test -- ${path.basename(testFilePath, path.extname(testFilePath))} -t "${methodName}"`;

  const terminal = vscode.window.createTerminal(`QAgenAI: Test ${methodName}`);
  terminal.show();
  terminal.sendText(testCommand);
}

/**
 * Handler: Navigate to test
 */
async function handleNavigateToTest(
  testFilePath?: string,
  methodName?: string
): Promise<void> {
  if (!testFilePath) {
    vscode.window.showWarningMessage('No test file available');
    return;
  }

  const doc = await vscode.workspace.openTextDocument(testFilePath);
  await vscode.window.showTextDocument(doc);

  if (methodName) {
    // Search for method test
    const text = doc.getText();
    const testRegex = new RegExp(`(describe|it|test)\\(['\"].*${methodName}.*['\"]`, 'gi');
    const match = testRegex.exec(text);
    
    if (match) {
      const position = doc.positionAt(match.index);
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
      }
    }
  }
}

/**
 * Handler: Show method coverage
 */
async function handleShowMethodCoverage(methodName: string): Promise<void> {
  // TODO: Show detailed coverage breakdown for method
  vscode.window.showInformationMessage(
    `${methodName} coverage: 33% (1/3 edge cases covered)`,
    'View Details'
  );
}

/**
 * Handler: Improve method tests
 */
async function handleImproveMethodTests(
  methodName: string,
  testFilePath?: string,
  chatProvider?: ChatPanelProvider
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  // Open chat with improvement prompt
  if (chatProvider) {
    await vscode.commands.executeCommand('qagenai.chatView.focus');
    const message = `Improve test coverage for method \`${methodName}\`. Current coverage is partial - please add tests for missing edge cases.`;
    // TODO: Send message to chat
    vscode.window.showInformationMessage(`Opening chat to improve tests for ${methodName}...`);
  } else {
    vscode.window.showInformationMessage(
      `Generate additional test cases for ${methodName}`,
      'Open Chat'
    ).then(selection => {
      if (selection === 'Open Chat') {
        vscode.commands.executeCommand('qagenai.chatView.focus');
      }
    });
  }
}

/**
 * Handler: Show method info
 */
async function handleShowMethodInfo(methodName: string): Promise<void> {
  vscode.window.showWarningMessage(
    `⚠️  Method \`${methodName}\` has no tests`,
    'Generate Test', 'Dismiss'
  ).then(selection => {
    if (selection === 'Generate Test') {
      vscode.commands.executeCommand('qagenai.generateTestForMethod', methodName);
    }
  });
}

/**
 * Handler: Generate test for method
 */
async function handleGenerateTestForMethod(
  methodName: string,
  chatProvider?: ChatPanelProvider
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  // Open chat with generation prompt
  if (chatProvider) {
    await vscode.commands.executeCommand('qagenai.chatView.focus');
    const fileName = path.basename(editor.document.fileName);
    const message = `Generate comprehensive tests for the \`${methodName}\` method in ${fileName}. Include happy path, edge cases, and error scenarios.`;
    // TODO: Send message to chat
    vscode.window.showInformationMessage(`Generating tests for ${methodName}...`);
  } else {
    vscode.window.showInformationMessage(
      `Generate tests for ${methodName}`,
      'Open Chat'
    ).then(selection => {
      if (selection === 'Open Chat') {
        vscode.commands.executeCommand('qagenai.chatView.focus');
      }
    });
  }
}
