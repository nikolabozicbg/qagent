import { Body, Controller, Post } from '@nestjs/common';
import { CodebaseAnalyzerService, AnalysisReport } from './codebase-analyzer.service';
import { FrameworkDetectorService, DetectedFrameworks } from './framework-detector.service';
import { LanguageDetectorService } from '../language-providers/language-detector.service';
import { ProviderRegistryService } from '../language-providers/provider-registry.service';
import { FrameworkRecommenderService } from './framework-recommender.service';
import { ProjectTypeDetectorService } from './project-type-detector.service';
import { EnhancedAnalysisService, EnhancedAnalysisResponse } from './enhanced-analysis.service';
import { FlowDiscoveryService, FlowDiscoveryResult } from './flow-discovery.service';
import { SeedDataParserService } from './seed-data-parser.service';
import { AuthSetupService } from './auth-setup.service';
import { ValidationDiscoveryService } from './validation-discovery.service';
import { HolisticFlowTracerService } from '../../analysis/holistic-flow-tracer.service';

@Controller('analyze')
export class AnalysisController {
  constructor(
    private readonly analyzerService: CodebaseAnalyzerService,
    private readonly frameworkDetector: FrameworkDetectorService,
    private readonly languageDetector: LanguageDetectorService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly frameworkRecommender: FrameworkRecommenderService,
    private readonly projectTypeDetector: ProjectTypeDetectorService,
    private readonly enhancedAnalysisService: EnhancedAnalysisService,
    private readonly flowDiscoveryService: FlowDiscoveryService,
    private readonly seedDataParser: SeedDataParserService,
    private readonly authSetup: AuthSetupService,
    private readonly validationDiscovery: ValidationDiscoveryService,
    private readonly holisticFlowTracer: HolisticFlowTracerService
  ) {}

  @Post('workspace')
  async analyzeWorkspace(
    @Body() body: { workspacePath: string }
  ): Promise<AnalysisReport> {
    console.log(`📊 API: Analyzing workspace: ${body.workspacePath}`);
    
    const result = await this.analyzerService.analyzeWorkspace(body.workspacePath);
    
    console.log(`   ✅ Analysis complete: ${result.coveragePercent}% coverage`);
    
    return result;
  }

  /**
   * NEW: Enhanced analysis with complete Testing Ecosystem view
   */
  @Post('enhanced')
  async analyzeWorkspaceEnhanced(
    @Body() body: { workspacePath: string }
  ): Promise<EnhancedAnalysisResponse> {
    console.log(`🚀 API: Enhanced Analysis: ${body.workspacePath}`);
    
    const result = await this.enhancedAnalysisService.analyzeWorkspace(body.workspacePath);
    
    console.log(`   ✅ Enhanced Analysis complete: ${result.summary.overallCoverage}% coverage`);
    console.log(`   📊 Technologies: ${result.project.technologies.map(t => t.displayName).join(', ')}`);
    console.log(`   🛠️  Installed: ${result.testingSetup.installed.length} frameworks`);
    console.log(`   💡 Recommended: ${result.testingSetup.recommended.length} frameworks`);
    
    return result;
  }

  @Post('test-type-recommendations')
  async getTestTypeRecommendations(
    @Body() body: { fileType: string; frameworks: DetectedFrameworks }
  ) {
    console.log(`🎯 API: Getting test type recommendations for ${body.fileType}`);
    
    const recommendations = this.frameworkDetector.getTestTypeRecommendations(
      body.fileType,
      body.frameworks
    );
    
    return { recommendations };
  }

  @Post('setup-recommendations')
  async getSetupRecommendations(
    @Body() body: { workspacePath: string }
  ) {
    console.log(`🧙 API: Getting setup recommendations for ${body.workspacePath}`);
    
    const packageJsonPath = `${body.workspacePath}/package.json`;
    
    // Detect stack
    const stack = this.frameworkDetector.detectStack(packageJsonPath);
    console.log(`   Detected stack: ${stack.join(', ')}`);
    
    // Detect existing frameworks
    const existingFrameworks = await this.frameworkDetector.detectFrameworks(body.workspacePath);
    console.log(`   Existing frameworks:`, existingFrameworks);
    
    // Generate recommendations (considering what already exists)
    const recommendations = this.frameworkDetector.generateSetupRecommendations(stack, existingFrameworks);
    
    return {
      stack,
      existingFrameworks,
      recommendations
    };
  }

  @Post('setup/recommendations')
  async getMultiLanguageSetupRecommendations(
    @Body() body: { workspacePath: string }
  ) {
    console.log(`🚀 API: Getting multi-language setup recommendations for ${body.workspacePath}`);
    
    try {
      // 1. Detect languages
      const languages = await this.languageDetector.detectLanguages(body.workspacePath);
      console.log(`   Detected languages: ${languages.join(', ')}`);
      
      if (languages.length === 0) {
        return {
          error: 'No supported languages detected',
          recommendations: []
        };
      }
      
      // 2. Get providers for detected languages
      const providers = this.providerRegistry.getProviders(languages);
      
      // 3. For each provider, check frameworks and generate recommendations
      const recommendations = [];
      
      for (const provider of providers) {
        const language = provider.getMetadata().language;
        
        // Detect project type
        const projectType = await this.projectTypeDetector.detectProjectType(
          body.workspacePath,
          language
        );
        
        console.log(`   ${language}: Project type = ${projectType}`);
        
        // Check for installed frameworks
        const frameworks = await provider.detectFrameworks(body.workspacePath);
        console.log(`   ${language}: Found ${frameworks.length} frameworks`);
        
        if (frameworks.length === 0) {
          // No frameworks found - recommend!
          const rec = this.frameworkRecommender.getRecommendation(language, projectType);
          
          if (rec) {
            recommendations.push({
              language,
              projectType,
              hasFrameworks: false,
              recommendation: rec
            });
          }
        } else {
          // Frameworks already installed - show them
          recommendations.push({
            language,
            projectType,
            hasFrameworks: true,
            installedFrameworks: frameworks
          });
        }
      }
      
      console.log(`   ✅ Generated ${recommendations.length} recommendations`);
      
      return {
        workspacePath: body.workspacePath,
        languages,
        recommendations
      };
      
    } catch (error) {
      console.error('   ❌ Error generating recommendations:', error);
      return {
        error: error.message,
        recommendations: []
      };
    }
  }

  /**
   * AI-powered flow discovery (LEGACY - single page flows)
   */
  @Post('flows/discover')
  async discoverFlows(
    @Body() body: { workspacePath: string }
  ): Promise<FlowDiscoveryResult> {
    console.log(`🧠 API: AI Flow Discovery: ${body.workspacePath}`);
    
    const result = await this.flowDiscoveryService.discoverFlows(body.workspacePath);
    
    console.log(`   ✅ Discovered ${result.flows.length} flows in ${result.analysisTime}ms`);
    console.log(`   🤖 AI Provider: ${result.aiProvider}`);
    
    return result;
  }
  
  /**
   * SMART JOURNEY DISCOVERY (Multi-step E2E flows)
   * Uses graph analysis + DSA for intelligent journey discovery
   */
  @Post('journeys/discover')
  async discoverJourneys(
    @Body() body: { workspacePath: string }
  ): Promise<any> {
    console.log(`🧠 API: Smart Journey Discovery: ${body.workspacePath}`);
    
    const result = await this.flowDiscoveryService.discoverJourneysAdvanced(body.workspacePath);
    
    if (result.success) {
      console.log(`   ✅ Discovered ${result.journeys.length} journeys in ${result.analysisTime}ms`);
      console.log(`   📊 Graph: ${result.metadata.nodeCount} nodes, ${result.metadata.edgeCount} edges`);
      console.log(`   🔄 Cycles: ${result.metadata.cycleCount} detected`);
    } else {
      console.log(`   ❌ Journey discovery failed: ${result.error}`);
    }
    
    return result;
  }
  
  /**
   * DISCOVER & AUTO-ENRICH (Complete solution)
   * Discovers journeys + automatically enriches critical ones with full context
   */
  @Post('journeys/discover-and-enrich')
  async discoverAndEnrichJourneys(
    @Body() body: { workspacePath: string; enrichAll?: boolean }
  ): Promise<any> {
    console.log(`🚀 API: Discover & Auto-Enrich: ${body.workspacePath}`);
    const startTime = Date.now();
    
    try {
      // Step 1: Discover all journeys
      console.log('📊 Step 1: Discovering journeys...');
      const discoveryResult = await this.flowDiscoveryService.discoverJourneysAdvanced(body.workspacePath);
      
      if (!discoveryResult.success) {
        return {
          success: false,
          error: discoveryResult.error,
          analysisTime: Date.now() - startTime
        };
      }
      
      const journeys = discoveryResult.journeys;
      console.log(`   ✅ Discovered ${journeys.length} journeys`);
      
      // Step 2: Auto-enrich critical journeys (priority=1 or enrichAll=true)
      console.log('\n⚡ Step 2: Auto-enriching critical journeys...');
      const enrichedJourneys = [];
      const toEnrich = body.enrichAll 
        ? journeys 
        : journeys.filter(j => j.priority === 1 || j.tags?.includes('critical'));
      
      console.log(`   Enriching ${toEnrich.length} of ${journeys.length} journeys`);
      
      for (const journey of toEnrich) {
        try {
          console.log(`   🔍 Enriching: ${journey.name}`);
          const enrichedContext = await this.holisticFlowTracer.traceJourney(
            journey,
            body.workspacePath
          );
          
          enrichedJourneys.push({
            ...journey,
            status: 'enriched',
            enrichedData: {
              components: enrichedContext.componentsAnalysis.map(comp => ({
                component: comp.component,
                name: comp.component,
                path: comp.component,
                sourceCode: '',
                elements: comp.elements.map(el => ({
                  selector: el.bestSelector,
                  type: el.elementType,
                  allSelectors: el.allSelectors
                })),
                validations: comp.validations,
                apiCalls: comp.apiCalls,
                stateVariables: comp.stateVariables
              })),
              testDataSuggestions: enrichedContext.testDataSuggestions,
              edgeCases: enrichedContext.edgeCases,
              estimatedTestCases: this.estimateTestCases(enrichedContext),
              estimatedCodeLines: this.estimateCodeLines(enrichedContext)
            }
          });
          
          console.log(`      ✅ Components: ${enrichedContext.componentsAnalysis.length}, Edge cases: ${enrichedContext.edgeCases.length}`);
        } catch (error) {
          console.error(`      ❌ Failed to enrich ${journey.name}:`, error.message);
          enrichedJourneys.push({
            ...journey,
            status: 'discovery-only',
            enrichmentError: error.message
          });
        }
      }
      
      // Step 3: Combine enriched + non-enriched journeys
      const nonEnrichedJourneys = journeys
        .filter(j => !toEnrich.find(e => e.name === j.name))
        .map(j => ({ ...j, status: 'discovery-only' }));
      
      const allJourneys = [...enrichedJourneys, ...nonEnrichedJourneys];
      
      const totalTime = Date.now() - startTime;
      console.log(`\n✅ Complete! ${enrichedJourneys.length} enriched, ${nonEnrichedJourneys.length} discovery-only`);
      console.log(`⏱️  Total time: ${totalTime}ms`);
      
      return {
        success: true,
        analysisTime: totalTime,
        totalJourneys: allJourneys.length,
        enrichedJourneys: enrichedJourneys.length,
        journeys: allJourneys,
        metadata: discoveryResult.metadata
      };
      
    } catch (error) {
      console.error('❌ Discover & enrich failed:', error);
      return {
        success: false,
        error: error.message,
        analysisTime: Date.now() - startTime
      };
    }
  }
  
  private estimateTestCases(enrichedContext: any): number {
    let count = 1; // Happy path
    
    // Validation tests
    for (const comp of enrichedContext.componentsAnalysis) {
      count += comp.validations.length;
    }
    
    // Error scenarios (2-3 per API call)
    for (const comp of enrichedContext.componentsAnalysis) {
      count += comp.apiCalls.length * 2;
    }
    
    // Edge cases
    count += enrichedContext.edgeCases.length;
    
    return count;
  }
  
  private estimateCodeLines(enrichedContext: any): number {
    const testCases = this.estimateTestCases(enrichedContext);
    return 20 + (testCases * 15); // Base + ~15 lines per test case
  }
  
  /**
   * HOLISTIC ANALYSIS - analyzes EVERYTHING (not just pages)
   */
  @Post('holistic')
  async analyzeHolistically(
    @Body() body: { workspacePath: string }
  ): Promise<any> {
    console.log(`🌐 API: Holistic Analysis: ${body.workspacePath}`);
    
    const { HolisticAnalysisService } = await import('./holistic-analysis.service');
    const { JourneySynthesisService } = await import('./journey-synthesis.service');
    
    const holisticService = new HolisticAnalysisService();
    const journeyService = new JourneySynthesisService();
    
    const model = await holisticService.analyzeApplication(body.workspacePath);
    const journeys = journeyService.synthesizeJourneys(model);
    
    console.log(`   ✅ Complete application model built`);
    console.log(`   🎯 Generated ${journeys.length} E2E journeys`);
    
    return {
      success: true,
      model: {
        totalComponents: model.components.length,
        componentsByType: {
          pages: model.components.filter(c => c.type === 'page').length,
          layouts: model.components.filter(c => c.type === 'layout').length,
          forms: model.components.filter(c => c.type === 'form').length,
          modals: model.components.filter(c => c.type === 'modal').length,
          other: model.components.filter(c => c.type === 'component').length
        },
        totalInteractions: model.interactions.length,
        interactionsByType: {
          clicks: model.interactions.filter(i => i.type === 'click').length,
          navigations: model.interactions.filter(i => i.type === 'navigation').length,
          submits: model.interactions.filter(i => i.type === 'submit').length
        },
        totalApiCalls: model.apiCalls.length,
        uniqueRoutes: [...new Set(model.routes)].sort(),
        totalStateOperations: model.stateOperations.length
      },
      sampleInteractions: model.interactions.slice(0, 10),
      sampleApiCalls: model.apiCalls.slice(0, 10),
      journeys: journeys.map(j => ({
        name: j.name,
        description: j.description,
        priority: j.priority,
        tags: j.tags,
        stepCount: j.steps.length,
        estimatedDuration: j.estimatedDuration,
        steps: j.steps
      }))
    };
  }
  
  /**
   * HOLISTIC JOURNEY CONTEXT - Deep analysis for test generation
   * Traces journey through components and extracts selectors, validations, APIs, state
   */
  @Post('journey-context')
  async getJourneyContext(
    @Body() body: { journey: any; workspacePath: string }
  ): Promise<any> {
    console.log(`🔍 API: Journey Context Analysis: ${body.journey.name}`);
    
    try {
      const enrichedContext = await this.holisticFlowTracer.traceJourney(
        body.journey,
        body.workspacePath
      );
      
      console.log(`   ✅ Analyzed ${enrichedContext.componentsAnalysis.length} components`);
      console.log(`   📊 Found ${enrichedContext.edgeCases.length} edge cases`);
      console.log(`   🎯 Generated test data suggestions`);
      
      return {
        success: true,
        context: enrichedContext
      };
    } catch (error) {
      console.error('   ❌ Journey context analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * GENERATE COMPLETE TEST SUITE
   * Generates Playwright test with happy path + validations + errors + edge cases
   */
  @Post('generate-test')
  async generateTest(
    @Body() body: { journey: any; workspacePath: string }
  ): Promise<any> {
    console.log(`🧪 API: Generate Complete Test Suite: ${body.journey.name}`);
    
    try {
      // Step 1: Enrich journey if not already enriched
      let enrichedJourney = body.journey;
      
      if (!body.journey.enrichedData) {
        console.log('  🔍 Journey not enriched, enriching now...');
        const enrichedContext = await this.holisticFlowTracer.traceJourney(
          body.journey,
          body.workspacePath
        );
        
        enrichedJourney = {
          ...body.journey,
          workspacePath: body.workspacePath, // Pass workspacePath for seed data
          enrichedData: {
            components: enrichedContext.componentsAnalysis,
            testDataSuggestions: enrichedContext.testDataSuggestions,
            edgeCases: enrichedContext.edgeCases
          }
        };
      } else {
        // Journey has enrichedData - normalize format
        // Extension sends transformed format (fields, apis) but we need original format (elements, apiCalls)
        console.log('  ✅ Journey already enriched, normalizing format...');
        console.log('  📊 Original components count:', body.journey.enrichedData.components?.length || 0);
        if (body.journey.enrichedData.components?.[0]) {
          console.log('  📊 First component keys:', Object.keys(body.journey.enrichedData.components[0]).join(', '));
        }
        
        enrichedJourney = {
          ...body.journey,
          workspacePath: body.workspacePath, // Pass workspacePath for seed data
          enrichedData: {
            components: body.journey.enrichedData.components.map((comp: any) => {
              // Normalize to consistent format with 'elements' and 'apiCalls'
              // Support both formats: (fields/apis) and (elements/apiCalls)
              return {
                component: comp.component || comp.name || comp.path,
                path: comp.path || comp.name,
                name: comp.name || comp.path,
                sourceCode: comp.sourceCode || '',
                elements: comp.elements || comp.fields || [],
                validations: comp.validations || [],
                apiCalls: comp.apiCalls || comp.apis || [],
                stateVariables: comp.stateVariables || comp.state || []
              };
            }),
            testDataSuggestions: body.journey.enrichedData.testDataSuggestions || {},
            edgeCases: body.journey.enrichedData.edgeCases || []
          }
        };
      }
      
      // Step 2: Generate test scenarios
      const testCode = await this.generateTestCode(enrichedJourney);
      const fileName = this.getTestFileName(enrichedJourney.name);
      
      console.log(`  ✅ Generated test: ${fileName}`);
      console.log(`  📊 Lines of code: ${testCode.split('\n').length}`);
      
      return {
        success: true,
        testCode,
        fileName,
        stats: {
          linesOfCode: testCode.split('\n').length,
          testCases: this.countTestCases(testCode)
        }
      };
      
    } catch (error) {
      console.error('  ❌ Test generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate complete Playwright test code
   */
  private async generateTestCode(enrichedJourney: any): Promise<string> {
    const lines: string[] = [];
    
    // Imports
    lines.push(`import { test, expect, Page } from '@playwright/test';`);
    lines.push('');
    
    // Helper function for self-healing selectors
    lines.push(`// Self-healing selector helper with fallback strategies`);
    lines.push(`async function smartFill(page: Page, fieldName: string, value: string) {`);
    lines.push(`  const strategies = [`);
    lines.push(`    () => page.locator(\`[name="\${fieldName}"]\`),`);
    lines.push(`    () => page.locator(\`[data-test*="\${fieldName}" i]\`), // Wildcard match for prefixed data-test`);
    lines.push(`    () => page.locator(\`#\${fieldName}\`),`);
    lines.push(`    () => page.locator(\`[data-test="\${fieldName}"]\`),`);
    lines.push(`    () => page.locator(\`[data-testid="\${fieldName}"]\`),`);
    lines.push(`    () => page.locator(\`[data-testid*="\${fieldName}" i]\`), // Wildcard match for prefixed data-testid`);
    lines.push(`    () => page.locator(\`[placeholder*="\${fieldName}" i]\`),`);
    lines.push(`    () => page.locator(\`label:has-text("\${fieldName}") >> .. >> input\`),`);
    lines.push(`    () => page.locator(\`label:has-text("\${fieldName}") >> .. >> textarea\`),`);
    lines.push(`  ];`);
    lines.push(``);
    lines.push(`  for (const strategy of strategies) {`);
    lines.push(`    try {`);
    lines.push(`      const locator = strategy();`);
    lines.push(`      if (await locator.count() > 0) {`);
    lines.push(`        await locator.first().fill(value);`);
    lines.push(`        return;`);
    lines.push(`      }`);
    lines.push(`    } catch (e) {`);
    lines.push(`      // Try next strategy`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  throw new Error(\`Field not found: \${fieldName}\`);`);
    lines.push(`}`);
    lines.push('');
    
    // Test describe
    lines.push(`test.describe('${enrichedJourney.name}', () => {`);
    lines.push('');
    
    // Auth setup (if route is protected)
    const projectRoot = (enrichedJourney as any).workspacePath || (enrichedJourney as any).projectRoot;
    const route = enrichedJourney.route || '/';
    const authSetup = this.authSetup.getAuthSetup(route, enrichedJourney, projectRoot);
    
    if (authSetup.required) {
      lines.push(...authSetup.setupCode);
    }
    
    // 1. Happy path (pass workspacePath for seed data)
    lines.push(...this.generateHappyPathTest(enrichedJourney, projectRoot));
    lines.push('');
    
    // 2. Validation tests
    if (enrichedJourney.enrichedData?.components) {
      const validationLines = await this.generateValidationTestsCode(enrichedJourney);
      lines.push(...validationLines);
      lines.push('');
    }
    
    // 3. Error scenarios
    if (enrichedJourney.enrichedData?.components) {
      lines.push(...this.generateErrorTestsCode(enrichedJourney));
      lines.push('');
    }
    
    // 4. Edge cases
    if (enrichedJourney.enrichedData?.edgeCases) {
      lines.push(...this.generateEdgeCaseTestsCode(enrichedJourney));
      lines.push('');
    }
    
    lines.push(`});`);
    
    return lines.join('\n');
  }
  
  private generateHappyPathTest(journey: any, projectRoot?: string): string[] {
    const lines: string[] = [];
    
    lines.push(`  test('should successfully complete ${journey.name.toLowerCase()}', async ({ page }) => {`);
    
    // Get primary component
    const comp = journey.enrichedData?.components?.[0];
    
    if (!comp) {
      // No component data - generate basic navigation test from steps
      const route = journey.steps?.[0]?.target || '/';
      lines.push(`    await page.goto('${route}');`);
      lines.push(`    await expect(page).toHaveURL(/${route.replace(/\//g, '\\/')}/);`);
      lines.push(`  });`);
      return lines;
    }
    
    // Navigate to correct route - use journey.route if available, else infer
    const route = journey.route || this.inferRoute(comp.path || comp.name);
    lines.push(`    await page.goto('${route}');`);
    lines.push(`    await page.waitForLoadState('networkidle'); // Wait for page to fully load`);
    lines.push('');
    
    // Extract ALL input fields using smart pattern matching
    const inputElements = comp.elements?.filter((el: any) => 
      this.isInputElement(el.type)
    ) || [];
    
    // Deduplicate by FIELD NAME (not selector) to avoid duplicates like [name="x"] and getByPlaceholder
    // Extract field name from selector and deduplicate
    const fieldMap = new Map<string, any>();
    for (const el of inputElements) {
      const selector = el.selector || '';
      // Extract field name from selector (handle both escaped and unescaped quotes)
      const nameMatch = selector.match(/\[name=\\?["']([^"']+)\\?["']\]/) || selector.match(/name=\\?"([^"]+)\\?"/);
      const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9]*)/);
      const placeholderMatch = selector.match(/placeholder=\\?"([^"]+)\\?"/);
      
      let fieldName = nameMatch?.[1] || idMatch?.[1] || placeholderMatch?.[1] || selector;
      
      // Normalize field name: lowercase, remove spaces/dashes for deduplication
      // "Bank Name" → "bankname", "bankName" → "bankname"
      const normalizedFieldName = fieldName.toLowerCase().replace(/[\s-_]/g, '');
      
      // Keep only FIRST occurrence (prefer [name="..."] over others)
      if (!fieldMap.has(normalizedFieldName)) {
        fieldMap.set(normalizedFieldName, el);
      } else {
        // If current one has [name=...], prefer it over existing
        if (selector.includes('[name=') && !fieldMap.get(normalizedFieldName).selector.includes('[name=')) {
          fieldMap.set(normalizedFieldName, el);
        }
      }
    }
    const uniqueInputs = Array.from(fieldMap.values());
    
    console.log(`  DEBUG: ${journey.name} - Found ${inputElements.length} input elements, deduped to ${uniqueInputs.length}`);
    
    // Filter to only fillable inputs (exclude hidden, disabled, etc)
    const fillableInputs = uniqueInputs.filter((el: any) => {
      const sel = el.selector || '';
      return !sel.includes('form') && 
             !sel.includes('Form') &&
             !sel.includes('remember') && // Skip checkbox
             !sel.includes('Wrapper');
    });
    
    console.log(`  DEBUG: ${journey.name} - After filtering: ${fillableInputs.length} fillable inputs`);
    if (fillableInputs.length > 0) {
      console.log(`  DEBUG: First input: type=${fillableInputs[0].type}, selector=${fillableInputs[0].selector}`);
    }
    
    if (fillableInputs.length > 0) {
      lines.push(`    // Fill form fields using self-healing selectors`);
      for (const field of fillableInputs) {
        const selector = (field as any).selector || '';
        
        // Extract field name for smart test data
        const nameMatch = selector.match(/\[name=\\?["']([^"']+)\\?["']\]/) || selector.match(/name=\\?"([^"]+)\\?"/); 
        const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9]*)/);
        const fieldName = nameMatch?.[1] || idMatch?.[1] || '';
        
        // Determine if this is login/registration form
        const route = this.inferRoute(comp.path || comp.name);
        const isLoginForm = route.includes('signin') || route.includes('login');
        const isRegisterForm = route.includes('signup') || route.includes('register');
        
        const value = this.getTestValue(selector, fieldName, { 
          isLoginForm, 
          isRegisterForm,
          projectRoot 
        });
        
        // For critical fields (username/password/email), use direct [name] selector for reliability
        const isCriticalField = ['username', 'password', 'email', 'firstName', 'lastName', 'confirmPassword'].includes(fieldName.toLowerCase());
        
        if (isCriticalField && fieldName) {
          lines.push(`    await page.locator('[name="${fieldName}"]').fill('${value}'); // Direct selector for reliability`);
          lines.push(`    await page.waitForTimeout(200);`);
        } else if (fieldName) {
          lines.push(`    await smartFill(page, '${fieldName}', '${value}');`);
          lines.push(`    await page.waitForTimeout(200); // Allow field to update`);
        } else {
          // Fallback to direct selector if no field name
          lines.push(`    await page.fill('${selector}', '${value}');`);
          lines.push(`    await page.waitForTimeout(200);`);
        }
      }
      lines.push('');
    }
    
    // Submit (only if we have inputs to fill or APIs to call)
    if (fillableInputs.length > 0 || comp.apiCalls?.length > 0) {
      lines.push(`    // Submit form`);
      lines.push(`    await page.waitForTimeout(300); // Allow form validation to complete`);
      lines.push(`    const submitButton = page.locator('button[type="submit"]');`);
      lines.push(`    await submitButton.waitFor({ state: 'visible', timeout: 5000 });`);
      lines.push(`    await submitButton.click();`);
      lines.push('');
    }
    
    // Wait for navigation or API response
    if (comp.apiCalls && comp.apiCalls.length > 0) {
      // Find the main action API (usually last one, or the one that's POST/PUT)
      const mainApi = comp.apiCalls.find((a: any) => 
        (a.method === 'POST' || a.method === 'PUT') && 
        !a.endpoint.includes('set/form') // Exclude Redux actions
      ) || comp.apiCalls[comp.apiCalls.length - 1];
      
      if (mainApi) {
        lines.push(`    // Wait for successful response`);
        lines.push(`    const response = await page.waitForResponse(`);
        lines.push(`      resp => resp.url().includes('${mainApi.endpoint}') && resp.request().method() === '${mainApi.method}'`);
        lines.push(`    );`);
        
        // Assert response status
        const expectedStatus = mainApi.method === 'POST' ? '201' : '200';
        lines.push(`    expect(response.status()).toBe(${expectedStatus});`);
        lines.push('');
        
        this.addNavigationChecks(lines, route);
      }
    } else if (fillableInputs.length > 0) {
      // No API detected but have inputs - add SMART generic assertions
      lines.push(`    // Wait for any API response (form submission)`);
      lines.push(`    const response = await page.waitForResponse(`);
      lines.push(`      resp => resp.request().method() === 'POST' && resp.status() < 400,`);
      lines.push(`      { timeout: 10000 }`);
      lines.push(`    ).catch(() => null);`);
      lines.push('');
      lines.push(`    if (response) {`);
      lines.push(`      // API call detected - verify success`);
      lines.push(`      expect(response.status()).toBeGreaterThanOrEqual(200);`);
      lines.push(`      expect(response.status()).toBeLessThan(400);`);
      lines.push(`    }`);
      lines.push('');
      
      this.addNavigationChecks(lines, route);
    }
    
    lines.push(`  });`);
    return lines;
  }
  
  private async generateValidationTestsCode(journey: any): Promise<string[]> {
    const lines: string[] = [];
    lines.push(`  // ============================================`);
    lines.push(`  // VALIDATION TESTS (Runtime Discovery)`);
    lines.push(`  // ============================================`);
    lines.push('');
    
    const comp = journey.enrichedData?.components?.[0];
    if (!comp) return lines;
    
    // Try runtime validation discovery if route is available
    const route = journey.route || this.inferRoute(comp.path || comp.name);
    const projectRoot = (journey as any).workspacePath || (journey as any).projectRoot;
    
    let validationErrors = [];
    try {
      // Discover real validation errors from running app
      const fields = comp.elements?.filter((el: any) => this.isInputElement(el.type)) || [];
      validationErrors = await this.validationDiscovery.discoverValidationErrors(route, fields);
      
      if (validationErrors.length > 0) {
        console.log(`  ✅ Discovered ${validationErrors.length} validation errors for ${route}`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Runtime validation discovery failed: ${error.message}`);
    }
    
    // Use runtime errors if available, fallback to static validations
    const hasRuntimeErrors = validationErrors.length > 0;
    const hasStaticValidations = comp.validations && comp.validations.length > 0;
    
    if (!hasRuntimeErrors && !hasStaticValidations) {
      console.log(`  ⚠️  No validation data available for ${route}`);
      return lines;
    }
    
    // Get all fillable inputs for this component
    const allInputs = comp.elements?.filter((el: any) => 
      this.isInputElement(el.type)
    ) || [];
    
    // Deduplicate by selector
    const uniqueInputs = Array.from(
      new Map(allInputs.map((el: any) => [el.selector, el])).values()
    );
    
    // Generate tests from RUNTIME discovered errors (preferred)
    if (hasRuntimeErrors) {
      const processedFields = new Set<string>();
      
      for (const error of validationErrors) {
        // Skip duplicates
        if (processedFields.has(error.field)) continue;
        processedFields.add(error.field);
        
        const testName = `should show validation error: ${error.errorMessage}`;
        lines.push(`  test('${testName}', async ({ page }) => {`);
        lines.push(`    await page.goto('${route}');`);
        lines.push('');
        
        // Fill other fields with valid data
        const otherFields = uniqueInputs.filter((el: any) => {
          const sel = (el as any).selector || '';
          const fieldName = this.extractFieldName(sel);
          return fieldName !== error.field &&
                 !sel.includes('form') &&
                 !sel.includes('Form') &&
                 !sel.includes('remember');
        });
        
        if (otherFields.length > 0) {
          lines.push(`    // Fill other fields with valid data`);
          for (const field of otherFields) {
            const selector = (field as any).selector || '';
            const fieldName = this.extractFieldName(selector);
            const value = this.getTestValue(selector, fieldName, { projectRoot });
            lines.push(`    await smartFill(page, '${fieldName}', '${value}');`);
          }
          lines.push('');
        }
        
        // Trigger the validation error
        if (error.trigger === 'empty') {
          lines.push(`    // Leave ${error.field} empty`);
          lines.push(`    // Field is already empty by default`);
        } else {
          lines.push(`    // Enter invalid ${error.field}`);
          const invalidValue = this.getInvalidValueForTrigger(error.trigger, error.field);
          lines.push(`    await smartFill(page, '${error.field}', '${invalidValue}');`);
        }
        
        lines.push(`    await page.click('button[type="submit"]');`);
        lines.push('');
        lines.push(`    // Expect exact validation error`);
        lines.push(`    await expect(page.locator('text=/${this.escapeRegex(error.errorMessage)}/i')).toBeVisible({ timeout: 5000 });`);
        lines.push(`  });`);
        lines.push('');
      }
    } 
    // Fallback to static validations if no runtime errors
    else if (hasStaticValidations) {
      for (const validation of comp.validations) {
        for (const rule of validation.rules || []) {
          const testedField = comp.elements?.find((f: any) => 
            f.selector?.includes(validation.fieldName)
          );
          
          if (!testedField) continue;
          
          const testName = `Validation - ${validation.fieldName}: ${rule.errorMessage || rule.message || rule.type}`;
          lines.push(`  test('${testName}', async ({ page }) => {`);
          lines.push(`    await page.goto('${route}');`);
          lines.push('');
          
          // Fill other fields with valid data
          const otherFields = uniqueInputs.filter((el: any) => {
            const selector = (el as any).selector || '';
            return selector !== testedField.selector && 
                   !selector.includes('form') &&
                   !selector.includes('Form') &&
                   !selector.includes('remember') &&
                   !selector.includes('Wrapper');
          });
          
          if (otherFields.length > 0) {
            lines.push(`    // Fill other fields with valid data`);
            for (const field of otherFields) {
              const selector = (field as any).selector || '';
              const fieldName = this.extractFieldName(selector);
              const value = this.getTestValue(selector, fieldName, { projectRoot });
              lines.push(`    await smartFill(page, '${fieldName}', '${value}');`);
            }
            lines.push('');
          }
          
          // Test invalid field
          lines.push(`    // Enter invalid ${validation.fieldName}`);
          const fieldName = this.extractFieldName(testedField.selector);
          const invalidValue = this.getInvalidValue(rule.type);
          lines.push(`    await smartFill(page, '${fieldName}', '${invalidValue}');`);
          
          lines.push(`    await page.click('button[type="submit"]');`);
          lines.push('');
          lines.push(`    // Expect validation error message`);
          lines.push(`    await expect(page.locator('text=/error|required|invalid/i')).toBeVisible({ timeout: 5000 });`);
          lines.push(`  });`);
          lines.push('');
        }
      }
    }
    
    return lines;
  }
  
  private generateErrorTestsCode(journey: any): string[] {
    const lines: string[] = [];
    lines.push(`  // ============================================`);
    lines.push(`  // ERROR SCENARIOS`);
    lines.push(`  // ============================================`);
    lines.push('');
    
    const comp = journey.enrichedData?.components?.[0];
    if (!comp || !comp.apiCalls || comp.apiCalls.length === 0) return lines;
    
    // Get all fillable inputs for this component
    const allInputs = comp.elements?.filter((el: any) => 
      this.isInputElement(el.type)
    ) || [];
    
    // Deduplicate by selector
    const uniqueInputs = Array.from(
      new Map(allInputs.map((el: any) => [el.selector, el])).values()
    ).filter((el: any) => {
      const selector = (el as any).selector || '';
      return !selector.includes('form') &&
             !selector.includes('Form') &&
             !selector.includes('remember') &&
             !selector.includes('Wrapper');
    });
    
    for (let i = 0; i < comp.apiCalls.length; i++) {
      const api = comp.apiCalls[i];
      // Add index suffix if multiple APIs have same endpoint+method
      const duplicates = comp.apiCalls.filter(a => a.endpoint === api.endpoint && a.method === api.method);
      const testSuffix = duplicates.length > 1 ? ` #${duplicates.indexOf(api) + 1}` : '';
      
      // Server error
      lines.push(`  test('should handle server error for ${api.endpoint}${testSuffix}', async ({ page }) => {`);
      lines.push(`    await page.route('**${api.endpoint}', route => {`);
      lines.push(`      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });`);
      lines.push(`    });`);
      lines.push(`    await page.goto('${this.inferRoute(comp.path || comp.name)}');`);
      lines.push('');
      
      // Fill ALL form fields with valid test data using smart selectors
      if (uniqueInputs.length > 0) {
        lines.push(`    // Fill form with test data`);
        for (const input of uniqueInputs) {
          const playwrightSelector = this.generatePlaywrightSelector(input);
          const selector = (input as any).selector || '';
          const value = this.getTestValue(selector);
          
          if (playwrightSelector.startsWith('page.')) {
            lines.push(`    await ${playwrightSelector}.fill('${value}');`);
          } else {
            lines.push(`    await page.locator('${selector}').fill('${value}');`);
          }
        }
        lines.push('');
      }
      
      lines.push(`    await page.click('button[type="submit"]');`);
      lines.push(`    await expect(page.locator('text=/error|wrong/i')).toBeVisible();`);
      lines.push(`  });`);
      lines.push('');
    }
    
    return lines;
  }
  
  private generateEdgeCaseTestsCode(journey: any): string[] {
    const lines: string[] = [];
    lines.push(`  // ============================================`);
    lines.push(`  // EDGE CASES`);
    lines.push(`  // ============================================`);
    lines.push('');
    
    if (!journey.enrichedData?.edgeCases) return lines;
    
    for (const edgeCase of journey.enrichedData.edgeCases) {
      lines.push(`  test('Edge case - ${edgeCase}', async ({ page }) => {`);
      lines.push(`    // TODO: Implement edge case test`);
      lines.push(`    // ${edgeCase}`);
      lines.push(`  });`);
      lines.push('');
    }
    
    return lines;
  }
  
  /**
   * Add navigation checks based on route type
   */
  private addNavigationChecks(lines: string[], route: string): void {
    if (route.includes('login') || route.includes('signin')) {
      lines.push(`    // Verify successful login - redirected away from login page`);
      lines.push(`    await expect(page).not.toHaveURL('${route}');`);
      lines.push(`    await expect(page).toHaveURL(/\\/(dashboard|home|$)/); // Common post-login destinations`);
    } else if (route.includes('register') || route.includes('signup')) {
      lines.push(`    // Verify successful registration - redirected away from signup page`);
      lines.push(`    await expect(page).not.toHaveURL('${route}');`);
    } else {
      // For other flows, verify success indication
      lines.push(`    // Verify success indication`);
      lines.push(`    await expect(page.locator('text=/success|saved|created|updated|submitted/i')).toBeVisible({ timeout: 5000 }).catch(() => {});`);
    }
  }
  
  private inferRoute(componentPath: string | undefined): string {
    if (!componentPath) return '/';
    const lower = componentPath.toLowerCase();
    
    // Auth routes
    if (lower.includes('signin')) return '/signin';
    if (lower.includes('login')) return '/login';
    if (lower.includes('signup')) return '/signup';
    if (lower.includes('register')) return '/register';
    
    // User routes
    if (lower.includes('profile')) return '/profile';
    if (lower.includes('settings')) return '/settings';
    if (lower.includes('account')) return '/account';
    
    // Banking/Financial routes
    if (lower.includes('bankaccount')) return '/bankaccounts';
    if (lower.includes('bank')) return '/bank';
    if (lower.includes('payment')) return '/payments';
    if (lower.includes('transaction')) return '/transaction/new';
    
    // Content routes
    if (lower.includes('comment')) return '/';
    if (lower.includes('post')) return '/new';
    if (lower.includes('article')) return '/editor';
    
    // Fallback: try to extract route from path
    const pathSegments = componentPath.split('/');
    const fileName = pathSegments[pathSegments.length - 1];
    const baseName = fileName.replace(/Form\.(tsx|jsx|ts|js)$/, '').toLowerCase();
    
    // Convert camelCase to kebab-case route
    const route = baseName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    
    return `/${route}`;
  }
  
  /**
   * Smart input element detection - works with ANY UI library
   * Detects: input, Field, TextField, FormInput, SelectWrapper, etc.
   */
  private isInputElement(type: string): boolean {
    if (!type) return false;
    const lower = type.toLowerCase();
    
    // Pattern 1: Contains 'input' (input, FormInput, TextInput, SelectInput)
    if (lower.includes('input')) return true;
    
    // Pattern 2: Contains 'field' (Field, TextField, FormField, InputField)
    if (lower.includes('field')) return true;
    
    // Pattern 3: Contains 'textbox' (Textbox, TextBox)
    if (lower.includes('textbox') || lower.includes('textarea')) return true;
    
    // Pattern 4: Contains 'select' (Select, SelectWrapper, SelectInput)
    if (lower.includes('select')) return true;
    
    // Pattern 5: Wrapper patterns (FormInputWrapper, InputWrapper)
    // But EXCLUDE form wrappers themselves (Form, FormWrapper without Input)
    if (lower.includes('wrapper') && 
        (lower.includes('input') || lower.includes('field') || lower.includes('select'))) {
      return true;
    }
    
    // Pattern 6: Specific UI library components
    if (lower === 'field') return true; // Formik Field
    if (lower.includes('formitem')) return true; // Ant Design Form.Item
    if (lower.includes('formcontrol')) return true; // Material-UI FormControl
    
    return false;
  }
  
  /**
   * Smart test data generation based on field semantics
   * Works with ANY form field by analyzing name patterns
   * Uses REAL seed data for login, UNIQUE data for registration
   */
  private getTestValue(selector: string, fieldName?: string, options?: { 
    isLoginForm?: boolean; 
    isRegisterForm?: boolean;
    projectRoot?: string;
  }): string {
    const field = (fieldName || selector).toLowerCase();
    
    // === LOGIN FORMS: Use REAL seed data ===
    if (options?.isLoginForm && options.projectRoot) {
      const seedUser = this.seedDataParser.getLoginUser(options.projectRoot);
      if (seedUser) {
        if (field.includes('username') || field.includes('user')) return seedUser.username;
        if (field.includes('password')) return seedUser.password;
        if (field.includes('email')) return seedUser.email || 'test@example.com';
      }
    }
    
    // === REGISTRATION FORMS: Use UNIQUE data ===
    if (options?.isRegisterForm) {
      const uniqueData = this.seedDataParser.getUniqueRegistrationData();
      if (field.includes('username') || field.includes('user')) return uniqueData.username;
      if (field.includes('email')) return uniqueData.email;
    }
    
    // === FALLBACK: Generic identity fields ===
    if (field.includes('email')) return 'test.user@example.com';
    if (field.includes('username')) return 'testuser123';
    
    // === NAME FIELDS (specific before generic) ===
    if (field.includes('firstname') || field === 'first') return 'John';
    if (field.includes('lastname') || field === 'last') return 'Doe';
    if (field.includes('middlename')) return 'M';
    if (field.includes('fullname')) return 'John Doe';
    // Generic "name" (but NOT firstName/lastName)
    if (field.includes('name') && !field.includes('user')) {
      // Context-specific names
      if (field.includes('bank')) return 'Chase Bank';
      if (field.includes('company') || field.includes('organization')) return 'Acme Corp';
      if (field.includes('card')) return 'John Doe';
      return 'John Doe'; // Default for generic "name"
    }
    
    // === PASSWORD FIELDS ===
    if (field.includes('password')) {
      // Return SAME password for confirm fields
      return 'SecurePass123!';
    }
    if (field.includes('confirm')) {
      // Confirmations match their base field
      if (field.includes('email')) return 'test.user@example.com';
      return 'SecurePass123!'; // Assume password confirm
    }
    
    // === FINANCIAL FIELDS ===
    if (field.includes('routing') || field.includes('aba')) return '123456789'; // 9 digits
    if (field.includes('account') && field.includes('number')) return '9876543210'; // 10 digits
    if (field.includes('card') && field.includes('number')) return '4532123456789012'; // Valid test card
    if (field.includes('cvv') || field.includes('cvc')) return '123';
    if (field.includes('amount') || field.includes('price')) return '100.00';
    if (field.includes('balance')) return '1000.00';
    
    // === ADDRESS FIELDS ===
    if (field.includes('street') || field.includes('address1')) return '123 Main Street';
    if (field.includes('address2') || field.includes('apt')) return 'Apt 4B';
    if (field.includes('city')) return 'San Francisco';
    if (field.includes('state') || field.includes('province')) return 'CA';
    if (field.includes('zip') || field.includes('postal')) return '94102';
    if (field.includes('country')) return 'United States';
    
    // === CONTACT FIELDS ===
    if (field.includes('phone') || field.includes('mobile') || field.includes('tel')) return '+1-555-123-4567';
    if (field.includes('fax')) return '+1-555-123-4568';
    if (field.includes('website') || field.includes('url')) return 'https://example.com';
    
    // === CONTENT FIELDS ===
    if (field.includes('title')) return 'Test Title';
    if (field.includes('subject')) return 'Test Subject';
    if (field.includes('description') || field.includes('bio')) return 'This is a test description for automated testing purposes.';
    if (field.includes('comment') || field.includes('note')) return 'This is a test comment.';
    if (field.includes('message') || field.includes('body')) return 'This is a test message body.';
    
    // === DATE/TIME FIELDS ===
    if (field.includes('date')) {
      if (field.includes('birth')) return '1990-01-15';
      return new Date().toISOString().split('T')[0]; // Today's date
    }
    if (field.includes('time')) return '14:30';
    
    // === NUMERIC FIELDS ===
    if (field.includes('age')) return '30';
    if (field.includes('year')) return '2024';
    if (field.includes('quantity') || field.includes('qty')) return '1';
    if (field.includes('number') && !field.includes('phone')) return '12345';
    
    // === BOOLEAN/CHOICE FIELDS ===
    if (field.includes('gender')) return 'Other';
    if (field.includes('size')) return 'Medium';
    if (field.includes('color')) return 'Blue';
    
    // === DEFAULT ===
    return 'Test Value';
  }
  
  /**
   * Generate smart Playwright selector with fallback hierarchy
   * Strategy: name attribute > placeholder regex > role > css selector
   * Works with: Ant Design, Material-UI, plain HTML, i18n
   */
  private generatePlaywrightSelector(element: any): string {
    const selector = element.selector || '';
    
    // Extract field name from selector
    const fieldMatch = selector.match(/(?:id|name)=[\"']([^\"']+)[\"']/) || 
                      selector.match(/#([a-zA-Z]+)/) ||
                      selector.match(/\[name=[\"']([^\"']+)[\"']\]/);
    const fieldName = fieldMatch ? fieldMatch[1] : '';
    
    if (!fieldName) {
      // No field name - return original selector
      return `page.locator('${selector}')`;
    }
    
    // STRATEGY 1: Use [name="..."] attribute (most reliable!)
    // Works with ALL form libraries (Ant Design, Material-UI, Formik, React Hook Form)
    if (selector.includes('name=') || selector.startsWith('[name=')) {
      return `page.locator('[name="${fieldName}"]')`;
    }
    
    // STRATEGY 2: Use placeholder with regex (works with i18n)
    // Matches: "Username", "User Name", "username", "Enter username", etc.
    const placeholderRegex = this.getPlaceholderRegex(fieldName);
    if (placeholderRegex) {
      return `page.getByPlaceholder(/${placeholderRegex}/i)`;
    }
    
    // STRATEGY 3: Use getByRole for inputs
    // Works when name/placeholder not available
    const role = this.inferRole(element.type);
    if (role) {
      return `page.getByRole('${role}', { name: /${fieldName}/i })`;
    }
    
    // STRATEGY 4: Fallback to CSS selector
    return `page.locator('${selector}')`;
  }
  
  /**
   * Get regex pattern for placeholder matching (works with i18n)
   */
  private getPlaceholderRegex(fieldName: string): string | null {
    const patterns: Record<string, string> = {
      username: 'user.*name|email|login',
      password: 'pass.*word|mot.*de.*passe',
      email: 'e.*mail|correo',
      name: 'name|nom|nombre',
      title: 'title|titre|titulo',
      subject: 'subject|sujet|asunto',
      description: 'description|descripción',
      body: 'body|content|message',
      sender: 'sender|from|de',
      address: 'address|adresse|dirección',
      contact: 'contact|phone|tel',
      confirmPassword: 'confirm.*pass|répéter.*mot',
      firstName: 'first.*name|prénom',
      lastName: 'last.*name|nom.*famille'
    };
    
    // Direct match
    if (patterns[fieldName]) {
      return patterns[fieldName];
    }
    
    // Check if fieldName contains known pattern
    const lowerFieldName = fieldName.toLowerCase();
    for (const [key, pattern] of Object.entries(patterns)) {
      if (lowerFieldName.includes(key.toLowerCase())) {
        return pattern;
      }
    }
    
    // Generic fallback: match field name with word boundaries
    return fieldName.replace(/([A-Z])/g, '.*$1').toLowerCase();
  }
  
  /**
   * Infer ARIA role from element type
   */
  private inferRole(elementType: string): string | null {
    if (!elementType) return null;
    
    const type = elementType.toLowerCase();
    if (type.includes('input') || type.includes('textbox')) return 'textbox';
    if (type.includes('button')) return 'button';
    if (type.includes('select')) return 'combobox';
    if (type.includes('checkbox')) return 'checkbox';
    if (type.includes('radio')) return 'radio';
    
    return null;
  }
  
  private getInvalidValue(ruleType: string): string {
    if (ruleType === 'required') return '';
    if (ruleType === 'email') return 'not-email';
    if (ruleType === 'min') return 'x';
    return 'invalid';
  }
  
  private getTestFileName(journeyName: string): string {
    // Remove emojis and special characters, keep only alphanumeric and spaces
    const cleanName = journeyName
      .replace(/[^\w\s-]/g, '') // Remove emojis and special chars
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    return cleanName + '.spec.ts';
  }
  
  private countTestCases(testCode: string): number {
    return (testCode.match(/test\(/g) || []).length;
  }
  
  /**
   * Extract field name from selector
   */
  private extractFieldName(selector: string): string {
    // Try [name="fieldName"]
    const nameMatch = selector.match(/\[name=\\?["']([^"']+)\\?["']\]/) || 
                     selector.match(/name=\\?"([^"]+)\\?"/); 
    if (nameMatch) return nameMatch[1];
    
    // Try #fieldName
    const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9_]*)/);
    if (idMatch) return idMatch[1];
    
    // Try placeholder
    const placeholderMatch = selector.match(/placeholder=\\?"([^"]+)\\?"/); 
    if (placeholderMatch) return placeholderMatch[1];
    
    // Return selector as-is
    return selector;
  }
  
  /**
   * Get invalid value based on trigger type
   */
  private getInvalidValueForTrigger(trigger: string, fieldName: string): string {
    if (trigger === 'empty') return '';
    if (trigger === 'format') {
      // Field-specific invalid formats
      const lower = fieldName.toLowerCase();
      if (lower.includes('email')) return 'invalid-email';
      if (lower.includes('phone')) return 'abc123';
      if (lower.includes('url')) return 'not-a-url';
      if (lower.includes('number')) return 'not-a-number';
      if (lower.includes('date')) return '99/99/9999';
    }
    return 'invalid-value';
  }
  
  /**
   * Escape special regex characters in error messages
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
