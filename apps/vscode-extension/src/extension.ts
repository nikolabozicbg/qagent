import * as vscode from 'vscode';
import { ServiceContainer } from './container';

let container: ServiceContainer;
let outputChannel: vscode.OutputChannel;

// Global logger
export function log(message: string, ...args: unknown[]) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const formatted = `[${timestamp}] ${message}`;
  console.log(formatted, ...args);
  outputChannel?.appendLine(args.length > 0 ? `${formatted} ${JSON.stringify(args)}` : formatted);
}

export async function activate(context: vscode.ExtensionContext) {
  // Create output channel for debugging
  outputChannel = vscode.window.createOutputChannel('QAgenAI');
  outputChannel.show(true);
  
  log('QAgenAI extension activating...');

  // Initialize service container
  container = new ServiceContainer(context);

  // Check if onboarding is completed
  const onboardingCompleted = context.globalState.get<boolean>('qagenai.onboardingCompleted', false);

  if (!onboardingCompleted) {
    // Show onboarding wizard on first run
    await container.showOnboarding();
  } else {
    // Show dashboard for returning users
    await container.showDashboard();
  }

  // Register commands
  registerCommands(context);

  console.log('QAgenAI extension activated!');
}

function registerCommands(context: vscode.ExtensionContext) {
  // Show Dashboard command
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.showDashboard', async () => {
      await container.showDashboard();
    })
  );

  // Focus Dashboard view (used after onboarding)
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.dashboard.focus', () => {
      container.dashboardProvider.focus();
    })
  );

  // Start Onboarding command (for re-running setup)
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.startOnboarding', async () => {
      await container.showOnboarding();
    })
  );

  // Reset onboarding (for testing)
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.resetOnboarding', async () => {
      await context.globalState.update('qagenai.onboardingCompleted', false);
      await context.globalState.update('qagenai.onboardingState', undefined);
      vscode.window.showInformationMessage('Onboarding reset. Reload window to see wizard.');
    })
  );

  // Reset all flows to draft status
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.resetFlowsToDraft', async () => {
      // Flows are stored in workspaceState under 'qagenai.dashboardFlows'
      const flows = context.workspaceState.get<Array<{ id: string; status: string }>>('qagenai.dashboardFlows');
      if (flows && flows.length > 0) {
        const resetFlows = flows.map(flow => ({ ...flow, status: 'draft' }));
        await context.workspaceState.update('qagenai.dashboardFlows', resetFlows);
        await container.dashboardProvider.refresh();
        vscode.window.showInformationMessage(`✅ Reset ${flows.length} flows to draft. Refresh dashboard to see changes.`);
      } else {
        // Maybe flows are still in onboarding state, not yet migrated
        vscode.window.showWarningMessage('No flows found. Try clicking refresh in dashboard first.');
      }
    })
  );

  // Nuclear option: clear all QAgenAI data
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.clearAllData', async () => {
      await context.workspaceState.update('qagenai.dashboardFlows', undefined);
      await context.globalState.update('qagenai.onboardingState', undefined);
      await context.globalState.update('qagenai.onboardingCompleted', false);
      await container.dashboardProvider.refresh();
      vscode.window.showInformationMessage('🗑️ All QAgenAI data cleared. Reload window to start fresh.');
    })
  );

  // ✨ LIVE SMART DISCOVERY (Real-time WebSocket)
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.liveSmartDiscovery', async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
      }

      log('Starting live smart discovery...');
      
      try {
        // Show discovery progress view
        const progressProvider = container.discoveryProgressProvider;
        await progressProvider.startDiscovery();
        progressProvider.show();
        
        // Import discovery service
        const { DiscoveryLiveService } = await import('./services/websocket');
        
        // Import backend API service
        const { BackendAPIService } = await import('./services/backend-api.service');
        const backendAPI = new BackendAPIService();
        
        // Check backend availability
        const isAvailable = await backendAPI.isAvailable();
        if (!isAvailable) {
          vscode.window.showErrorMessage('Backend is not running. Please start the backend service.');
          return;
        }
        
        const discoveryService = new DiscoveryLiveService();
        
        // Start WebSocket connection first
        log('Connecting to WebSocket...');
        
        // Start live discovery with real-time updates
        // This will connect WebSocket and trigger the HTTP endpoint
        const discoveryPromise = discoveryService.startDiscovery({
          workspacePath: workspaceRoot,
          title: '🧠 Smart Discovery in Progress',
          timeout: 120000 // 2 minutes
        });
        
        // Trigger actual discovery via HTTP endpoint (after 1 sec for WebSocket to connect)
        setTimeout(async () => {
          log('Triggering discovery via HTTP endpoint...');
          try {
            await backendAPI.discoverJourneysHolistic(workspaceRoot);
          } catch (error) {
            log('Discovery endpoint error:', error);
          }
        }, 1000);
        
        const result = await discoveryPromise;
        
        if (result.success && result.summary) {
          const { totalJourneys, estimatedCoverage, analysisTime } = result.summary;
          
          vscode.window.showInformationMessage(
            `✅ Discovery complete! Found ${totalJourneys} journeys (${Math.round(estimatedCoverage)}% coverage) in ${Math.round(analysisTime / 1000)}s`
          );
          
          log(`Discovery completed: ${totalJourneys} journeys, ${estimatedCoverage}% coverage`);
          
          // Get discovered journeys and show results screen
          const journeys = await backendAPI.discoverJourneysHolistic(workspaceRoot);
          
          if (journeys.length > 0) {
            // Convert E2EJourney to DiscoveredFlow format
            const discoveredFlows = journeys.map((j, idx) => ({
              id: String(idx + 1),
              name: j.name,
              description: j.description || '',
              confidence: j.priority === 1 ? 95 : j.priority === 2 ? 80 : 65,
              routes: j.steps.map(s => s.target).filter(Boolean),
              components: (j.components || []).map(c => c.name),
              selected: j.priority === 1
            }));
            
            // Show discovery results webview
            await container.showDiscoveryResults(discoveredFlows, {
              name: vscode.workspace.name || 'Project',
              framework: 'React', // TODO: detect from project
              componentsFound: result.summary?.totalComponents || 0,
              routesFound: result.summary?.totalRoutes || 0
            });
          }
          
          // Refresh dashboard with new data
          await container.dashboardProvider.refresh();
        }
      } catch (error) {
        log('Live discovery failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Discovery failed: ${errorMessage}`);
      }
    })
  );

  // ✨ SMART E2E JOURNEY GENERATION
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.generateSmartE2E', async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
      }

      log('Starting smart E2E journey generation...');
      
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '🧠 Analyzing application...',
        cancellable: false
      }, async (progress) => {
        try {
          progress.report({ message: 'Discovering components and interactions' });
          
          // Import services
          const { BackendAPIService } = await import('./services/backend-api.service');
          const { JourneyTestGeneratorService } = await import('./services/journey-test-generator.service');
          
          const backendAPI = new BackendAPIService();
          const testGenerator = new JourneyTestGeneratorService();
          
          // Check backend availability
          const isAvailable = await backendAPI.isAvailable();
          if (!isAvailable) {
            vscode.window.showErrorMessage('Backend is not running. Please start the backend service.');
            return;
          }
          
          // Discover journeys via holistic analysis
          progress.report({ message: 'Synthesizing E2E journeys' });
          const journeys = await backendAPI.discoverJourneysHolistic(workspaceRoot);
          
          if (journeys.length === 0) {
            vscode.window.showWarningMessage('No E2E journeys discovered.');
            return;
          }
          log(`Discovered ${journeys.length} E2E journeys`);
          
          // Show user-friendly journey picker with enriched data
          const items = journeys.map(j => {
            const priorityIcon = j.priority === 1 ? '🔴' : j.priority === 2 ? '🟡' : '🟢';
            const statusIcon = j.status === 'enriched' ? '✅' : '🔍';
            
            // Build description with enriched data
            let desc = `${priorityIcon} Priority ${j.priority}`;
            if (j.enrichedData) {
              const data = j.enrichedData;
              desc += ` | 🧪 ${data.estimatedTestCases} tests (~${data.estimatedCodeLines} lines)`;
            }
            
            // Build detail with field/API info
            let detail = j.description;
            if (j.enrichedData && j.enrichedData.components.length > 0) {
              const comp = j.enrichedData.components[0];
              detail += `\n📝 ${comp.fields?.length || 0} fields | ✅ ${comp.validations?.length || 0} validations | 🌐 ${comp.apis?.length || 0} APIs`;
            }
            
            return {
              label: `${statusIcon} ${j.name}`,
              description: desc,
              detail,
              picked: j.priority === 1, // Auto-select critical journeys
              journey: j
            };
          });
          
          const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            title: `🎯 Select Journeys to Generate`,
            placeHolder: `${journeys.length} journeys discovered - critical journeys pre-selected`
          });
          
          if (!selected || selected.length === 0) {
            vscode.window.showInformationMessage('No journeys selected.');
            return;
          }
          
          // Generate tests using backend API (not local generator)
          progress.report({ message: `Generating ${selected.length} test files` });
          const selectedJourneys = selected.map(s => s.journey);
          
          const generatedPaths: string[] = [];
          for (const journey of selectedJourneys) {
            try {
              // Call backend API to generate test
              const testResult = await backendAPI.generateTestForJourney(journey, workspaceRoot);
              
              // DEBUG: Log first validation test name
              const validationLines = testResult.testCode.split('\n').filter(l => l.includes("test('Validation"));
              log(`DEBUG: First validation test from backend: ${validationLines[0]?.trim().substring(0, 100)}`);
              
              if (testResult.success) {
                // Save test file
                const fs = await import('fs');
                const path = await import('path');
                const testDir = path.join(workspaceRoot, 'tests');
                if (!fs.existsSync(testDir)) {
                  fs.mkdirSync(testDir, { recursive: true });
                }
                const testPath = path.join(testDir, testResult.fileName);
                fs.writeFileSync(testPath, testResult.testCode, 'utf-8');
                generatedPaths.push(testPath);
                log(`Generated test: ${testResult.fileName} (${testResult.stats?.testCases} tests)`);
              }
            } catch (error) {
              log(`Failed to generate test for ${journey.name}:`, error);
            }
          }
          
          log(`Generated ${generatedPaths.length} test files`);
          
          // Show summary
          const summary = testGenerator.generateTestSummary(selectedJourneys);
          const choice = await vscode.window.showInformationMessage(
            `✅ ${summary}\n\nTests saved to: tests/e2e/`,
            'Open Tests Folder',
            'Done'
          );
          
          if (choice === 'Open Tests Folder') {
            const path = await import('path');
            const testsFolder = vscode.Uri.file(path.join(workspaceRoot, 'tests', 'e2e'));
            await vscode.commands.executeCommand('revealFileInOS', testsFolder);
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          log('Smart E2E generation failed:', error);
          vscode.window.showErrorMessage(`Smart E2E generation failed: ${errorMessage}`);
        }
      });
    })
  );

  // 💣 NUCLEAR RESET: Delete EVERYTHING (framework, config, tests, state)
  context.subscriptions.push(
    vscode.commands.registerCommand('qagenai.nuclearReset', async () => {
      const choice = await vscode.window.showWarningMessage(
        '💣 NUCLEAR RESET: This will DELETE:\n\n' +
        '- All extension state\n' +
        '- Playwright configuration (playwright.config.ts)\n' +
        '- Playwright dependencies from package.json\n' +
        '- All generated test files (tests/ folder)\n\n' +
        'This action CANNOT be undone!',
        { modal: true },
        'YES, DELETE EVERYTHING',
        'Cancel'
      );

      if (choice !== 'YES, DELETE EVERYTHING') {
        vscode.window.showInformationMessage('Nuclear reset cancelled.');
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
      }

      log('Starting nuclear reset...');
      
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        let deletedItems: string[] = [];
        
        // 1. Delete Playwright config
        const playwrightConfig = path.join(workspaceRoot, 'playwright.config.ts');
        if (fs.existsSync(playwrightConfig)) {
          fs.unlinkSync(playwrightConfig);
          deletedItems.push('playwright.config.ts');
          log('Deleted playwright.config.ts');
        }
        
        // 2. Delete tests folder
        const testsFolder = path.join(workspaceRoot, 'tests');
        if (fs.existsSync(testsFolder)) {
          fs.rmSync(testsFolder, { recursive: true, force: true });
          deletedItems.push('tests/ folder');
          log('Deleted tests/ folder');
        }
        
        // 3. Remove Playwright from package.json
        const packageJsonPath = path.join(workspaceRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          let modified = false;
          
          if (packageJson.devDependencies?.['@playwright/test']) {
            delete packageJson.devDependencies['@playwright/test'];
            deletedItems.push('Playwright from devDependencies');
            modified = true;
          }
          
          if (packageJson.dependencies?.['@playwright/test']) {
            delete packageJson.dependencies['@playwright/test'];
            modified = true;
          }
          
          if (modified) {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            log('Removed Playwright from package.json');
          }
        }
        
        // 4. Clear all extension state
        await context.workspaceState.update('qagenai.dashboardFlows', undefined);
        await context.globalState.update('qagenai.onboardingState', undefined);
        await context.globalState.update('qagenai.onboardingCompleted', false);
        deletedItems.push('All extension state');
        log('Cleared extension state');
        
        await container.dashboardProvider.refresh();
        
        vscode.window.showInformationMessage(
          `💣 Nuclear reset complete!\n\nDeleted:\n${deletedItems.map(i => '  • ' + i).join('\n')}\n\nReload window for fresh start.`,
          'Reload Window'
        ).then(choice => {
          if (choice === 'Reload Window') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('Nuclear reset error:', error);
        vscode.window.showErrorMessage(`Nuclear reset failed: ${errorMessage}`);
      }
    })
  );
}

export function deactivate() {
  console.log('QAgenAI extension deactivated');
}
