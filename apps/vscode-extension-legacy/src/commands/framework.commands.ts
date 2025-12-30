import * as vscode from 'vscode';
import * as path from 'path';
import { CoverageTreeProvider, CoverageItem } from '../coverageTreeProvider';
import { ChatPanelProvider } from '../providers/chat-panel.provider';
import { TestExecutionService } from '../services/test-execution.service';

const testExecutionService = new TestExecutionService();

/**
 * Handle install framework from TreeView recommendation
 */
export async function handleInstallFramework(
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

/**
 * Handle install test framework command
 * Accepts either a CoverageItem (from TreeView) or a string framework name (from WebView)
 */
export async function handleInstallTestFramework(
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
