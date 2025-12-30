import * as vscode from 'vscode';
import { CoverageTreeProvider } from '../coverageTreeProvider';
import { ChatPanelProvider } from '../providers/chat-panel.provider';
import { StatusBarService } from '../services/statusBar.service';
import { BackendApiService } from '../services/backend-api.service';
import { EnhancedAnalysisApiService } from '../services/enhanced-analysis-api.service';

const backendApi = new BackendApiService();
const enhancedApi = new EnhancedAnalysisApiService();

/**
 * Handle workspace analysis command
 */
export async function handleAnalyzeWorkspace(
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
            
            // Detect project stacks (Frontend/Backend) using local detection
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

/**
 * Show setup wizard for testing framework configuration
 */
export async function showSetupWizard(
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
