import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    console.log('QAgenAI extension is now active!');

    let disposable = vscode.commands.registerCommand('qagenai.generateTests', async (uri: vscode.Uri) => {
        try {
            // Get the file path
            const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
            
            if (!filePath) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }

            // Read file content
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const fileName = path.basename(filePath);
            const fileExtension = path.extname(filePath);

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'QAgenAI: Generating tests...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Analyzing code...' });

                // Get configuration
                const config = vscode.workspace.getConfiguration('qagenai');
                const apiUrl = config.get<string>('apiUrl') || 'http://localhost:3001';

                progress.report({ increment: 30, message: 'Calling AI...' });

                // Call backend API
                const response = await axios.post(`${apiUrl}/generate/tests`, {
                    code: fileContent,
                    fileName: fileName,
                    language: detectLanguage(fileExtension)
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 seconds
                });

                progress.report({ increment: 60, message: 'Creating test file...' });

                const generatedTests = response.data.tests;

                // Determine test file name
                const testFileName = getTestFileName(fileName, fileExtension);
                const testFilePath = path.join(path.dirname(filePath), testFileName);

                // Write test file
                fs.writeFileSync(testFilePath, generatedTests, 'utf-8');

                progress.report({ increment: 100, message: 'Done!' });

                // Open the test file
                const doc = await vscode.workspace.openTextDocument(testFilePath);
                await vscode.window.showTextDocument(doc);

                vscode.window.showInformationMessage(`✅ Tests generated: ${testFileName}`);
            });

        } catch (error: any) {
            console.error('Error generating tests:', error);
            vscode.window.showErrorMessage(`Failed to generate tests: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

function detectLanguage(extension: string): string {
    const languageMap: { [key: string]: string } = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
        '.go': 'go',
        '.java': 'java',
        '.rb': 'ruby',
        '.php': 'php'
    };
    return languageMap[extension] || 'unknown';
}

function getTestFileName(fileName: string, extension: string): string {
    const nameWithoutExt = path.basename(fileName, extension);
    
    // Language-specific test file naming
    if (extension === '.py') {
        return `test_${nameWithoutExt}.py`;
    } else if (extension === '.go') {
        return `${nameWithoutExt}_test.go`;
    } else if (extension === '.rb') {
        return `${nameWithoutExt}_spec.rb`;
    } else {
        // JavaScript/TypeScript
        return `${nameWithoutExt}.test${extension}`;
    }
}
