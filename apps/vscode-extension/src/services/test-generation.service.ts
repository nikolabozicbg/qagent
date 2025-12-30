import * as vscode from 'vscode';
import { DashboardFlow } from '../types/dashboard.types';
import { PlaywrightService } from './playwright.service';
import { log } from '../extension';

/**
 * TestGenerationService - Generates E2E tests from flows
 * 
 * Calls backend AI to generate Playwright tests, then displays
 * the result in VS Code for the user to review and save.
 */
export class TestGenerationService {
  private baseUrl: string;
  private playwrightService: PlaywrightService;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.baseUrl = vscode.workspace.getConfiguration('qagenai').get('backendUrl') || 'http://localhost:3001';
    this.playwrightService = new PlaywrightService();
  }

  /**
   * Generate E2E test for a flow
   * Uses holistic journey data if available, otherwise falls back to AI generation
   */
  async generateE2ETest(flow: DashboardFlow): Promise<{
    success: boolean;
    code?: string;
    filename?: string;
    error?: string;
  }> {
    // DEBUG: Log complete flow object
    log('===== TEST GENERATION DEBUG =====');
    log('Flow object keys:', Object.keys(flow));
    log('Flow ID:', flow.id);
    log('Flow name:', flow.name);
    log('Has journeyData:', !!flow.journeyData);
    log('journeyData type:', typeof flow.journeyData);
    if (flow.journeyData) {
      log('journeyData keys:', Object.keys(flow.journeyData));
      log('journeyData.journey:', flow.journeyData.journey?.name);
      log('journeyData.componentsAnalysis:', flow.journeyData.componentsAnalysis?.length);
    } else {
      log('journeyData is NULL/UNDEFINED!');
    }
    log('=================================');
    
    // Check if flow has journey data from holistic analysis
    const journeyData = flow.journeyData; // Public property
    
    if (journeyData) {
      log('Using HOLISTIC journey data for test generation:', journeyData.journey?.name);
      
      // journeyData is ALREADY enriched context with componentsAnalysis!
      // No need to call backend again
      return this.generateTestFromEnrichedContext(journeyData, flow);
    }
    
    // Fallback to AI-based generation
    log('No journey data, using AI generation');
    
    // Get config
    const config = this.getE2EConfig();
    
    // Try to read component source code for better selector generation
    const componentCode = await this.readComponentCode(flow);
    console.log('[QAgenAI] Component code length:', componentCode?.length || 0);
    
    try {
      const response = await fetch(`${this.baseUrl}/generate/e2e`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: {
            name: flow.name,
            description: flow.description,
            routes: flow.routes,
            components: flow.components,
          },
          config: {
            baseUrl: config.baseUrl,
            selectorPolicy: config.selectorPolicy,
            framework: 'playwright',
          },
          componentCode, // Send actual component code for better selectors
        }),
        signal: AbortSignal.timeout(120000), // 2 min timeout for AI
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Backend error: ${error}` };
      }

      const result = await response.json() as { 
        code: string; 
        filename: string;
        _meta?: { mode: string };
      };

      return {
        success: true,
        code: result.code,
        filename: result.filename,
      };
    } catch (error) {
      // If backend not available, use fallback template
      if ((error as Error).message.includes('fetch')) {
        return this.generateFallbackTest(flow, config);
      }
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Generate test from enriched context using BACKEND API
   * This ensures consistent test generation with proper validation test names
   */
  private async generateTestFromEnrichedContext(
    enrichedContext: any,
    flow: DashboardFlow
  ): Promise<{
    success: boolean;
    code?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      log('Generating test from enriched context via BACKEND API...');
      log('Journey:', enrichedContext.journey?.name);
      log('Components:', enrichedContext.componentsAnalysis?.length || 0);
      
      // If no components, flow was discovery-only - re-enrich it now!
      if (!enrichedContext.componentsAnalysis || enrichedContext.componentsAnalysis.length === 0) {
        log('⚠️ No components found - flow needs enrichment!');
        log('Re-enriching flow via backend...');
        
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
          throw new Error('No workspace folder open');
        }
        
        // Build journey object for enrichment
        let journeyForEnrichment;
        if (typeof enrichedContext.journey === 'string') {
          journeyForEnrichment = {
            name: enrichedContext.journey,
            description: flow.description || '',
            priority: flow.confidence || 100,
            tags: [],
            steps: [],
            components: flow.components || [],
            routes: flow.routes || []
          };
        } else {
          journeyForEnrichment = enrichedContext.journey;
        }
        
        // Call journey-context endpoint to enrich this specific journey
        const enrichResponse = await fetch(`${this.baseUrl}/analyze/journey-context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            journey: journeyForEnrichment,
            workspacePath: workspaceRoot 
          }),
          signal: AbortSignal.timeout(60000)
        });
        
        if (!enrichResponse.ok) {
          throw new Error(`Enrichment failed: ${enrichResponse.status}`);
        }
        
        const enrichResult = await enrichResponse.json() as any;
        if (enrichResult.success && enrichResult.context) {
          log('✅ Flow enriched successfully!');
          log('Enriched components:', enrichResult.context.componentsAnalysis?.length || 0);
          
          // Update enrichedContext with new data
          enrichedContext = {
            journey: enrichedContext.journey,
            componentsAnalysis: enrichResult.context.componentsAnalysis || [],
            testDataSuggestions: enrichResult.context.testDataSuggestions || {},
            edgeCases: enrichResult.context.edgeCases || []
          };
        } else {
          log('❌ Enrichment failed, proceeding with empty data');
        }
      }
      
      // Call backend API to generate test (same endpoint as command palette)
      // Backend expects full journey object with enrichedData
      
      // enrichedContext already has EVERYTHING needed:
      // { journey: {...}, componentsAnalysis: [...], testDataSuggestions: {...}, edgeCases: [...] }
      
      // Build journey with proper enrichedData format for backend
      let journeyObject;
      if (typeof enrichedContext.journey === 'string') {
        // Journey was serialized - reconstruct from flow
        journeyObject = {
          name: enrichedContext.journey,
          description: flow.description || '',
          priority: flow.confidence || 100,
          tags: [],
          steps: [],
          components: flow.components || [],
          routes: flow.routes || []
        };
        log('Reconstructed journey from string');
      } else {
        // Journey is already an object
        journeyObject = enrichedContext.journey;
      }
      
      // Backend needs enrichedData in format: { components: [...], testDataSuggestions, edgeCases }
      // where components are already in the format from /discover-and-enrich
      const journeyWithEnrichedData = {
        ...journeyObject,
        enrichedData: {
          components: enrichedContext.componentsAnalysis,
          testDataSuggestions: enrichedContext.testDataSuggestions,
          edgeCases: enrichedContext.edgeCases
        }
      };
      
      log('DEBUG: Journey name:', journeyWithEnrichedData.name);
      log('DEBUG: Journey has enrichedData:', !!journeyWithEnrichedData.enrichedData);
      log('DEBUG: Components count:', journeyWithEnrichedData.enrichedData?.components?.length || 0);
      if (journeyWithEnrichedData.enrichedData?.components?.[0]) {
        log('DEBUG: First component type:', typeof journeyWithEnrichedData.enrichedData.components[0]);
        log('DEBUG: First component keys:', Object.keys(journeyWithEnrichedData.enrichedData.components[0]).join(', '));
      }
      log('DEBUG: Sending journey to backend:', JSON.stringify(journeyWithEnrichedData, null, 2).substring(0, 1000));
      
      const response = await fetch(`${this.baseUrl}/analyze/generate-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          journey: journeyWithEnrichedData,
          workspacePath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath 
        }),
        signal: AbortSignal.timeout(120000), // 2 min timeout
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} ${errorText}`);
      }
      
      const rawResult = await response.json() as any;
      log('DEBUG: Raw backend response:', JSON.stringify(rawResult).substring(0, 300));
      
      // Backend returns { testCode, fileName, stats } not { code, filename }
      const result = {
        code: rawResult.testCode || rawResult.code,
        filename: rawResult.fileName || rawResult.filename
      };
      
      log('Backend generated test successfully');
      log('Result code length:', result.code?.length || 0);
      log('Result filename:', result.filename);
      log('First 200 chars of code:', result.code?.substring(0, 200));
      
      return {
        success: true,
        code: result.code,
        filename: result.filename
      };
    } catch (error) {
      log('Backend test generation failed:', error);
      
      // Fallback to local generator only if backend is down
      log('Using fallback local generator');
      const { JourneyTestGeneratorService } = await import('./journey-test-generator.service');
      const generator = new JourneyTestGeneratorService();
      
      const code = generator.buildTestCode(enrichedContext.journey || {});
      const filename = generator.getTestFileName(enrichedContext.journey?.name || 'test');
      
      return {
        success: true,
        code,
        filename
      };
    }
  }
  
  /**
   * DEPRECATED: Old method that re-fetches from backend
   * Keeping for backwards compatibility but not used anymore
   */
  private async generateTestFromJourney_OLD(journey: any): Promise<{
    success: boolean;
    code?: string;
    filename?: string;
    error?: string;
  }> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return { success: false, error: 'No workspace folder open' };
    }
    
    try {
      log('Fetching holistic journey context from backend...');
      
      // Call backend for deep component analysis
      const response = await fetch(`${this.baseUrl}/analyze/journey-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journey,
          workspacePath: workspaceRoot
        }),
        signal: AbortSignal.timeout(60000) // 1 min timeout
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const result = await response.json() as { success: boolean; context?: any; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Journey analysis failed');
      }
      
      if (!result.context) {
        throw new Error('No context returned from backend');
      }
      
      log('Received enriched context:', {
        components: result.context.componentsAnalysis.length,
        edgeCases: result.context.edgeCases.length
      });
      
      // Use enhanced test generator with enriched context
      const { EnhancedTestGeneratorService } = await import('./enhanced-test-generator.service');
      const generator = new EnhancedTestGeneratorService();
      
      const code = await generator.generateTest(result.context);
      const filename = generator.getTestFileName(journey.name);
      
      return {
        success: true,
        code,
        filename
      };
    } catch (error) {
      log('Holistic generation failed, falling back to basic generator:', error);
      
      // Fallback to basic journey generator
      const { JourneyTestGeneratorService } = await import('./journey-test-generator.service');
      const generator = new JourneyTestGeneratorService();
      
      const code = generator.buildTestCode(journey);
      const filename = generator.getTestFileName(journey.name);
      
      return {
        success: true,
        code,
        filename
      };
    }
  }

  /**
   * Show generated test in VS Code editor
   * Auto-saves to detected test directory using PlaywrightService
   */
  async showGeneratedTest(code: string, filename: string): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    log('Workspace root:', workspaceRoot);
    
    if (workspaceRoot) {
      try {
        // Use PlaywrightService to get the test directory
        const targetDir = await this.playwrightService.getTestDirectory();
        log('Test directory from PlaywrightService:', targetDir);
        
        if (targetDir) {
          const filePath = vscode.Uri.file(`${targetDir}/${filename}`);
          await vscode.workspace.fs.writeFile(filePath, Buffer.from(code, 'utf-8'));
          
          // Open the saved file
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.Beside,
          });
          
          vscode.window.showInformationMessage(`✅ Test saved: ${filePath.fsPath}`);
          return;
        }
      } catch (error) {
        log('Auto-save failed:', error);
      }
    }
    
    // Fallback: Show Save As dialog immediately with suggested path
    const defaultUri = workspaceRoot 
      ? vscode.Uri.file(`${workspaceRoot}/playwright-tests/${filename}`)
      : vscode.Uri.file(filename);
    
    const uri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { 'TypeScript': ['ts'] },
      title: 'Save Generated Test',
    });
    
    if (uri) {
      // Ensure directory exists
      const dirPath = vscode.Uri.file(uri.fsPath.substring(0, uri.fsPath.lastIndexOf('/')));
      try {
        await vscode.workspace.fs.stat(dirPath);
      } catch {
        await vscode.workspace.fs.createDirectory(dirPath);
      }
      
      await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside,
      });
      vscode.window.showInformationMessage(`✅ Test saved: ${uri.fsPath}`);
    } else {
      // User cancelled - open as untitled
      const doc = await vscode.workspace.openTextDocument({
        content: code,
        language: 'typescript',
      });
      await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside,
      });
    }
  }

  // detectTestDirectory is now handled by PlaywrightService

  /**
   * Save test file to workspace
   */
  async saveTestFile(code: string, suggestedFilename: string): Promise<string | null> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return null;
    }

    // Let user choose save location
    const defaultUri = vscode.Uri.file(`${workspaceRoot}/e2e/${suggestedFilename}`);
    
    const uri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        'TypeScript': ['ts'],
        'JavaScript': ['js'],
      },
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
      vscode.window.showInformationMessage(`Test saved: ${uri.fsPath}`);
      
      // Open the saved file
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
      
      return uri.fsPath;
    }

    return null;
  }

  /**
   * Generate fallback test when backend is not available
   */
  private generateFallbackTest(
    flow: DashboardFlow,
    config: { baseUrl: string; selectorPolicy: string }
  ): { success: boolean; code: string; filename: string } {
    const slugName = this.toSlug(flow.name);
    const filename = `${slugName}.spec.ts`;
    
    const route = flow.routes?.[0] || '/';
    const selectors = this.generateSelectors(flow, config.selectorPolicy);
    
    const code = `import { test, expect } from '@playwright/test';

/**
 * E2E Test: ${flow.name}
 * ${flow.description || 'Generated by QAgenAI'}
 * 
 * Route: ${route}
 */
test.describe('${flow.name}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${config.baseUrl}${route}');
  });

  test('should load page successfully', async ({ page }) => {
    // Verify page loaded
    await expect(page).toHaveURL(/.*${route.replace(/\//g, '\\/')}$/);
  });

  test('should display main content', async ({ page }) => {
    // TODO: Add assertions for main page elements
    // Example with ${config.selectorPolicy} selectors:
${selectors}
  });

  test('should handle user interaction', async ({ page }) => {
    // TODO: Add interaction tests
    // - Form submissions
    // - Button clicks  
    // - Navigation
  });
});
`;

    return { success: true, code, filename };
  }

  private generateSelectors(flow: DashboardFlow, policy: string): string {
    switch (policy) {
      case 'testid':
        return `    // await expect(page.getByTestId('main-heading')).toBeVisible();
    // await page.getByTestId('submit-button').click();`;
      case 'role':
        return `    // await expect(page.getByRole('heading', { name: '${flow.name}' })).toBeVisible();
    // await page.getByRole('button', { name: 'Submit' }).click();`;
      default:
        return `    // await expect(page.locator('h1')).toBeVisible();
    // await page.locator('button[type="submit"]').click();`;
    }
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private getE2EConfig(): { baseUrl: string; selectorPolicy: string } {
    const config = vscode.workspace.getConfiguration('qagenai');
    return {
      baseUrl: config.get('e2e.baseUrl') || 'http://localhost:3000',
      selectorPolicy: config.get('e2e.selectorPolicy') || 'testid',
    };
  }

  /**
   * Read the component code for the flow
   * Uses flow.filePath if available (from AI discovery), otherwise searches
   */
  private async readComponentCode(flow: DashboardFlow): Promise<string | undefined> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return undefined;

    let combinedCode = '';

    // 1. If flow has filePath from discovery, use it directly
    if (flow.filePath) {
      const fullPath = flow.filePath.startsWith('/') 
        ? flow.filePath 
        : `${workspaceRoot}/${flow.filePath}`;
      
      try {
        const uri = vscode.Uri.file(fullPath);
        const content = await vscode.workspace.fs.readFile(uri);
        const code = Buffer.from(content).toString('utf-8');
        
        if (code.length > 0) {
          combinedCode = `// File: ${flow.filePath}\n${code}`;
          console.log('[QAgenAI] Using flow.filePath:', flow.filePath);
          return combinedCode;
        }
      } catch (e) {
        console.log('[QAgenAI] Could not read flow.filePath:', flow.filePath, e);
      }
    }

    // 2. Fallback: search by route
    const route = flow.routes?.[0];
    if (!route) return undefined;

    const routePath = route
      .replace(/^\//, '')
      .replace(/:[a-zA-Z]+\/?/g, '')
      .replace(/\/+/g, '/')
      .replace(/^\//,'');

    // Try common locations
    // Capitalize first letter for container/component names
    const componentName = routePath.split('/').pop();
    const capitalizedName = componentName ? componentName.charAt(0).toUpperCase() + componentName.slice(1) : '';
    
    const possiblePaths = [
      // Next.js App Router
      `${workspaceRoot}/src/app/[language]/${routePath}/page.tsx`,
      `${workspaceRoot}/src/app/[locale]/${routePath}/page.tsx`,
      `${workspaceRoot}/src/app/${routePath}/page.tsx`,
      `${workspaceRoot}/app/[language]/${routePath}/page.tsx`,
      `${workspaceRoot}/app/${routePath}/page.tsx`,
      // Next.js Pages Router
      `${workspaceRoot}/src/pages/${routePath}.tsx`,
      `${workspaceRoot}/src/pages/${routePath}/index.tsx`,
      // React Router - containers pattern
      `${workspaceRoot}/app/containers/${capitalizedName}Page/index.js`,
      `${workspaceRoot}/app/containers/${capitalizedName}Page/${routePath}Form.js`,
      `${workspaceRoot}/app/containers/${capitalizedName}Page/Loadable.js`,
      `${workspaceRoot}/src/containers/${capitalizedName}Page/index.tsx`,
      `${workspaceRoot}/src/containers/${capitalizedName}Page/index.jsx`,
      // Components
      `${workspaceRoot}/src/components/${capitalizedName}/index.tsx`,
      `${workspaceRoot}/app/components/${capitalizedName}/index.js`,
    ];

    for (const filePath of possiblePaths) {
      try {
        const uri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(uri);
        const code = Buffer.from(content).toString('utf-8');
        
        if (code.length > 0) {
          combinedCode = `// File: ${filePath.replace(workspaceRoot, '')}\n${code}`;
          console.log('[QAgenAI] Found component via fallback:', filePath.replace(workspaceRoot, ''));
          return combinedCode;
        }
      } catch {
        // File doesn't exist, continue
      }
    }

    // 3. Last resort: workspace search
    if (!combinedCode && routePath) {
      try {
        const lastSegment = routePath.split('/').pop() || '';
        if (lastSegment) {
          const pattern = new vscode.RelativePattern(
            workspaceRoot,
            `src/app/**/${lastSegment}/page.tsx`
          );
          const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
          
          if (files.length > 0) {
            const content = await vscode.workspace.fs.readFile(files[0]);
            const code = Buffer.from(content).toString('utf-8');
            combinedCode = `// File: ${files[0].fsPath.replace(workspaceRoot, '')}\n${code}`;
            console.log('[QAgenAI] Found via search:', files[0].fsPath.replace(workspaceRoot, ''));
          }
        }
      } catch (e) {
        console.log('[QAgenAI] Search failed:', e);
      }
    }

    return combinedCode || undefined;
  }
}
