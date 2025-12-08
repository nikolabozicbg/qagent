import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Register TestCodeLens commands
 */
export function registerTestCodeLensCommands(context: vscode.ExtensionContext): void {
  // Generate test for function
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'qagenai.generateTestForFunction',
      handleGenerateTestForFunction
    )
  );

  // Run tests for function
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'qagenai.runFunctionTests',
      handleRunFunctionTests
    )
  );

  // Show function tests
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'qagenai.showFunctionTests',
      handleShowFunctionTests
    )
  );

  // Show no test warning
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'qagenai.showNoTestWarning',
      handleShowNoTestWarning
    )
  );
}

/**
 * Generate test for a function
 */
async function handleGenerateTestForFunction(
  filePath: string,
  functionName: string,
  lineNumber: number
): Promise<void> {
  // Read function source
  const document = await vscode.workspace.openTextDocument(filePath);
  
  // Extract function code (simplified - get ~30 lines from function start)
  const startLine = lineNumber;
  const endLine = Math.min(startLine + 30, document.lineCount - 1);
  const functionCode = document.getText(
    new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length)
  );

  // Trigger test generation command with the function info
  await vscode.commands.executeCommand('qagenai.generateTestsForFile', filePath, {
    functionName,
    functionCode,
    lineNumber
  });
}

/**
 * Run tests for a function
 */
async function handleRunFunctionTests(
  functionName: string,
  testFilePath: string,
  sourceFilePath: string
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  // Detect test framework
  const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json');
  let testCommand = '';

  try {
    const packageJson = require(packageJsonPath);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps['vitest']) {
      testCommand = `npx vitest run ${testFilePath} -t "${functionName}"`;
    } else if (deps['jest']) {
      testCommand = `npx jest ${testFilePath} -t "${functionName}"`;
    } else if (deps['@playwright/test']) {
      testCommand = `npx playwright test ${testFilePath} -g "${functionName}"`;
    } else {
      testCommand = `npm test -- --grep "${functionName}"`;
    }
  } catch {
    testCommand = `npm test -- --grep "${functionName}"`;
  }

  const terminal = vscode.window.createTerminal(`Test: ${functionName}`);
  terminal.show();
  terminal.sendText(testCommand);
}

/**
 * Show tests for a function - navigate to test file
 */
async function handleShowFunctionTests(
  functionName: string,
  testFilePath?: string
): Promise<void> {
  if (!testFilePath) {
    vscode.window.showWarningMessage(`No test file found for ${functionName}`);
    return;
  }

  const document = await vscode.workspace.openTextDocument(testFilePath);
  const editor = await vscode.window.showTextDocument(document);

  // Find the test for this function
  const text = document.getText();
  const patterns = [
    new RegExp(`(describe|it|test)\\s*\\(['"\`].*${functionName}.*['"\`]`, 'gi'),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const position = document.positionAt(match.index);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter
      );
      return;
    }
  }
}

/**
 * Show warning about missing tests
 */
async function handleShowNoTestWarning(functionName: string): Promise<void> {
  const selection = await vscode.window.showWarningMessage(
    `Function "${functionName}" has no tests.`,
    'Generate Test',
    'Dismiss'
  );

  if (selection === 'Generate Test') {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      // Find the function line
      const document = editor.document;
      const text = document.getText();
      const funcRegex = new RegExp(`(function\\s+${functionName}|const\\s+${functionName}\\s*=|${functionName}\\s*\\()`, 'g');
      const match = funcRegex.exec(text);
      
      if (match) {
        const line = document.positionAt(match.index).line;
        await vscode.commands.executeCommand(
          'qagenai.generateTestForFunction',
          document.fileName,
          functionName,
          line
        );
      }
    }
  }
}
