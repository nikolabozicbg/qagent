import * as vscode from 'vscode';
import { DashboardService } from '../services/dashboard.service';
import { TestGenerationService } from '../services/test-generation.service';
import { log } from '../extension';

/**
 * Populate test data for demo/testing
 * This command simulates test runs to populate the dashboard with real-looking data
 */
export async function populateTestData(context: vscode.ExtensionContext): Promise<void> {
  log('[TestDataPopulate] Starting...');
  
  const dashboardService = new DashboardService(context);
  const testGenService = new TestGenerationService(context);
  
  // Get flows
  const flows = await dashboardService.getFlows();
  
  if (flows.length === 0) {
    vscode.window.showWarningMessage('No flows found. Run discovery first.');
    return;
  }
  
  log(`[TestDataPopulate] Found ${flows.length} flows`);
  
  // Progress indicator
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Simulating test runs...',
      cancellable: false,
    },
    async (progress) => {
      const total = flows.length * 3; // 3 runs per flow
      let completed = 0;
      
      // Simulate 3 test runs for each flow
      for (const flow of flows) {
        for (let i = 0; i < 3; i++) {
          const shouldPass = Math.random() > 0.2; // 80% pass rate
          
          progress.report({
            increment: (1 / total) * 100,
            message: `Running "${flow.name}" (${i + 1}/3)`,
          });
          
          await testGenService.simulateTestExecution(flow, shouldPass);
          completed++;
          
          // Small delay for realism
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      log(`[TestDataPopulate] Completed ${completed} test runs`);
    }
  );
  
  // Calculate final health
  const healthScore = dashboardService.calculateHealthScore();
  const testing = await dashboardService.getDashboardData().then(d => d.testing);
  
  vscode.window.showInformationMessage(
    `✅ Test data populated! Health: ${healthScore}%, Tests: ${testing.passingTests}/${testing.totalTests} passing`
  );
}
