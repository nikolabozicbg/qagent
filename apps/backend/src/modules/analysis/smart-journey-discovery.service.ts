import { Injectable } from '@nestjs/common';
import { FlowDiscoveryService } from './flow-discovery.service';
import { AISynthesizerService, DSAInput, AITestSuite, AISynthesisResult } from './intelligence/ai-synthesizer.service';
import { CodeIntelligenceService } from './intelligence/code-intelligence.service';
import { DiscoveryOrchestratorService, DiscoveryResult } from './v3/discovery-orchestrator.service';

/**
 * Smart Journey Discovery Service
 * 
 * Wraps FlowDiscoveryService and converts journeys to Test Suites format.
 * Now supports AI-powered synthesis for meaningful, deduplicated test suites.
 */

/**
 * TestSuite - Fully dynamic, no hardcoded categories or priorities
 * All values are inferred from code analysis
 */
export interface TestSuite {
  id: string;
  name: string;              // Dynamically inferred from domain/routes
  description: string;       // Dynamically generated from characteristics
  category: string;          // Dynamically inferred (e.g., "bank-accounts", "user-auth", "transactions")
  priority: string;          // Dynamically calculated (e.g., "critical", "high", "medium", "low")
  tags: string[];            // Dynamically extracted keywords/labels
  testCases: TestCase[];
  stats: {
    totalCases: number;
    totalSteps: number;
    estimatedDuration: number; // seconds
    complexity: string;        // Dynamically assessed
  };
  metadata: {
    components: string[];
    routes: string[];
    apis: string[];
    generatedFrom: string;     // How it was discovered
    characteristics: string[]; // What makes this suite special
  };
}

/**
 * TestCase - Fully dynamic
 */
export interface TestCase {
  id: string;
  suiteId: string;
  name: string;              // Dynamically generated from flow
  description: string;       // Dynamically generated
  priority: string;          // Dynamically inferred
  tags: string[];            // Dynamically extracted
  steps: TestStep[];
  status: string;            // Dynamic status
  testData?: {
    valid?: Record<string, any>;
    invalid?: Record<string, any>;
  };
  metadata: {
    components: string[];
    apis: string[];
    selectors: string[];
    edgeCases?: string[];
    estimatedDuration: number;
    flowType?: string;       // What kind of flow this represents
  };
}

/**
 * TestStep - Fully dynamic actions
 */
export interface TestStep {
  id: string;
  caseId: string;
  index: number;
  action: string;            // Dynamic action type (navigate, click, fill, verify, etc.)
  target: string;
  value?: string;
  description: string;       // Human-readable step description
  selector?: string;
  assertions?: string[];
  expectedOutcome?: string;  // What should happen after this step
  api?: {
    method: string;
    endpoint: string;
    expectedStatus: number;
  };
}

export interface SuiteDiscoveryResult {
  success: boolean;
  suites: TestSuite[];
  totalCases: number;
  totalSteps: number;
  analysisTime: number;
  metadata: {
    analysisLayers: string[];
    coverage: {
      routes: { total: number; covered: number };
      components: { total: number; covered: number };
      apis: { total: number; covered: number };
    };
  };
}

@Injectable()
export class SmartJourneyDiscoveryService {
  
  constructor(
    private readonly flowDiscoveryService: FlowDiscoveryService,
    private readonly aiSynthesizer: AISynthesizerService,
    private readonly codeIntelligence: CodeIntelligenceService,
    private readonly discoveryOrchestrator: DiscoveryOrchestratorService,
  ) {}
  
  /**
   * AI-POWERED Discovery v3: Uses new Discovery Orchestrator + Claude
   * 
   * Phase 1: Run v3 Discovery Orchestrator for deep static analysis
   * Phase 2: Use rich context to generate meaningful, deduplicated test suites via AI
   */
  async discoverTestSuitesWithAI(workspacePath: string): Promise<SuiteDiscoveryResult> {
    const startTime = Date.now();
    
    console.log('\n🤖 AI-Powered Suite Discovery v3.0 starting...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      // Step 1: Run v3 Discovery Orchestrator
      console.log('📊 Step 1: Running v3 Discovery Orchestrator...');
      const v3Result = await this.discoveryOrchestrator.discover(workspacePath);
      
      // Step 2: Build rich DSA input from v3 analysis
      console.log('\n📋 Step 2: Building AI context from v3 analysis...');
      const dsaInput = this.buildDSAInputFromV3(v3Result, workspacePath);
      
      console.log(`   Components: ${v3Result.summary.totalComponents}`);
      console.log(`   Routes: ${v3Result.summary.totalRoutes}`);
      console.log(`   Forms: ${v3Result.summary.totalForms}`);
      console.log(`   APIs: ${v3Result.summary.totalAPIEndpoints}`);
      console.log(`   Behaviors: ${v3Result.behaviorAnalysis.behaviorCatalog.length} patterns`);
      console.log(`   Selectors: ${v3Result.selectorAnalysis.selectors.length}`);
      
      // Step 3: Call AI Synthesizer with rich context
      console.log('\n🧠 Step 3: AI is synthesizing meaningful test suites...');
      const aiContext = this.discoveryOrchestrator.buildAIContext(v3Result);
      
      // DEBUG: Log AI context to verify DomainDetector output
      console.log('\n📝 AI CONTEXT BEING SENT:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(aiContext);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const aiResult = await this.aiSynthesizer.synthesizeTestSuites(
        dsaInput,
        aiContext
      );
      
      // Step 4: Enrich AI suites with v3 selector data
      const suites = this.convertAISuitesToTestSuitesV3(aiResult.suites, v3Result);
      
      const analysisTime = Date.now() - startTime;
      const totalCases = suites.reduce((sum, s) => sum + s.testCases.length, 0);
      const totalSteps = suites.reduce((sum, s) => 
        sum + s.testCases.reduce((caseSum, c) => caseSum + c.steps.length, 0), 0
      );
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ AI Discovery v3.0 complete:`);
      console.log(`   ${suites.length} suites, ${totalCases} cases, ${totalSteps} steps`);
      console.log(`   Reduction ratio: ${aiResult.summary.reductionRatio.toFixed(1)}x`);
      console.log(`   Analysis time: ${analysisTime}ms`);
      console.log(`   Model: ${aiResult.aiModel}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return {
        success: true,
        suites,
        totalCases,
        totalSteps,
        analysisTime,
        metadata: {
          analysisLayers: ['v3-orchestrator', 'ai-synthesis'],
          coverage: {
            routes: { total: v3Result.summary.totalRoutes, covered: v3Result.summary.totalRoutes },
            components: { total: v3Result.summary.totalComponents, covered: v3Result.summary.totalComponents },
            apis: { total: v3Result.summary.totalAPIEndpoints, covered: v3Result.summary.totalAPIEndpoints }
          },
          aiModel: aiResult.aiModel,
          reductionRatio: aiResult.summary.reductionRatio,
          v3Timing: v3Result.timing,
          selectorCoverage: v3Result.summary.selectorCoverage,
        } as any
      };
    } catch (error) {
      console.error('\n❌ AI Suite discovery v3 failed:', error);
      console.log('   Falling back to legacy discovery...\n');
      // Fallback to regular discovery
      return this.discoverTestSuites(workspacePath);
    }
  }
  
  /**
   * Build DSAInput from v3 DiscoveryResult
   */
  private buildDSAInputFromV3(v3Result: DiscoveryResult, workspacePath: string): DSAInput {
    const { formAnalysis, navigationAnalysis, apiAnalysis, componentAnalysis, behaviorAnalysis } = v3Result;
    
    // Convert v3 forms to DSA format
    const forms = formAnalysis.forms.map(form => ({
      name: form.name,
      component: form.componentName,
      fields: form.fields.map(f => ({
        name: f.name,
        type: f.type,
        required: f.isRequired,
        label: f.label || f.name,
        selector: f.selector.primary,
        validation: f.validation,
      })),
      submitButton: form.submitButtons[0] ? {
        selector: form.submitButtons[0].selector.primary,
        text: form.submitButtons[0].text,
      } : null,
      submitAction: form.submitHandler?.apiEndpoint || null,
      hasValidation: form.hasClientValidation,
    }));
    
    // Convert v3 routes to DSA format
    const routes = navigationAnalysis.routes.map(route => ({
      path: route.path,
      component: route.component,
      isProtected: route.isProtected,
      isDynamic: route.isDynamic,
      params: route.params,
    }));
    
    // Convert v3 APIs to DSA format
    const apis = apiAnalysis.endpoints.map(endpoint => ({
      method: endpoint.method,
      path: endpoint.path,
      source: endpoint.source,
      usedBy: endpoint.usedBy,
      hasAuth: endpoint.hasAuth,
    }));
    
    // Extract component names
    const components = componentAnalysis.components.map(c => c.name);
    
    // Build navigation points from v3 links
    const navigationPoints = navigationAnalysis.links.map(link => ({
      component: link.from,   // source component
      target: link.to,        // target path
      type: 'link',
      text: link.text,
    }));
    
    // Use behavior catalog for richer context
    const behaviors = behaviorAnalysis.behaviorCatalog.map(b => ({
      tag: b.tag,
      description: b.description,
      count: b.count,
    }));
    
    return {
      projectName: workspacePath.split('/').pop() || 'Project',
      forms,
      routes,
      apis,
      components,
      navigationPoints,
      behaviors,
      rawFlowsCount: formAnalysis.statistics.totalForms * 3 + navigationAnalysis.routes.length,
    };
  }
  
  /**
   * Convert AI suites to TestSuites with v3 selector enrichment
   */
  private convertAISuitesToTestSuitesV3(aiSuites: AITestSuite[], v3Result: DiscoveryResult): TestSuite[] {
    const { selectorAnalysis, formAnalysis } = v3Result;
    
    // Build selector lookup maps
    const selectorByElement = new Map<string, string>();
    const selectorByTestId = new Map<string, string>();
    
    for (const sel of selectorAnalysis.selectors) {
      // Use primary selector
      const primarySelector = sel.primary?.selector;
      if (!primarySelector) continue;
      
      // Index by test ID if available
      if (sel.primary.strategy === 'testId') {
        const testIdMatch = primarySelector.match(/="([^"]+)"/);
        if (testIdMatch) {
          selectorByTestId.set(testIdMatch[1], primarySelector);
        }
      }
      
      // Index by element tag + role
      const key = `${sel.tagName}-${sel.role || sel.elementId}`;
      selectorByElement.set(key, primarySelector);
    }
    
    // Build form field selector lookup
    const formFieldSelectors = new Map<string, string>();
    for (const form of formAnalysis.forms) {
      for (const field of form.fields) {
        formFieldSelectors.set(`${form.name}.${field.name}`, field.selector.primary);
        formFieldSelectors.set(field.name.toLowerCase(), field.selector.primary);
      }
    }
    
    return aiSuites.map((aiSuite, suiteIndex) => {
      const suiteId = aiSuite.id || `suite-ai-${suiteIndex + 1}`;
      
      const testCases: TestCase[] = aiSuite.testCases.map((aiCase, caseIndex) => {
        const caseId = aiCase.id || `case-ai-${suiteIndex}-${caseIndex}`;
        
        const steps: TestStep[] = aiCase.steps.map((aiStep, stepIndex) => {
          // Try to enrich selector from v3 analysis
          let enrichedSelector = aiStep.selector;
          
          if (!enrichedSelector && aiStep.target) {
            // Try to find selector from form fields
            const fieldSelector = formFieldSelectors.get(aiStep.target.toLowerCase());
            if (fieldSelector) {
              enrichedSelector = fieldSelector;
            }
          }
          
          return {
            id: `step-${caseId}-${stepIndex}`,
            caseId,
            index: stepIndex,
            action: aiStep.action,
            target: aiStep.target,
            value: aiStep.value,
            description: aiStep.description,
            selector: enrichedSelector,
            assertions: [],
            expectedOutcome: undefined,
          };
        });
        
        return {
          id: caseId,
          suiteId,
          name: aiCase.name,
          description: aiCase.description,
          priority: this.normalizePriority(aiCase.priority),
          tags: [],
          steps,
          status: 'pending',
          metadata: {
            components: [],
            apis: [],
            selectors: steps.map(s => s.selector).filter(Boolean) as string[],
            estimatedDuration: steps.length * 5,
            flowType: aiCase.type,
          }
        };
      });
      
      return {
        id: suiteId,
        name: aiSuite.name,
        description: aiSuite.description,
        category: aiSuite.category,
        priority: this.normalizePriority(aiSuite.priority),
        tags: aiSuite.tags,
        testCases,
        stats: {
          totalCases: testCases.length,
          totalSteps: testCases.reduce((sum, c) => sum + c.steps.length, 0),
          estimatedDuration: testCases.reduce((sum, c) => sum + (c.metadata?.estimatedDuration || 30), 0),
          complexity: testCases.length > 10 ? 'complex' : testCases.length > 5 ? 'moderate' : 'simple',
        },
        metadata: {
          components: [],
          routes: [],
          apis: [],
          generatedFrom: 'ai-synthesis-v3',
          characteristics: [aiSuite.category, ...aiSuite.tags],
        }
      };
    });
  }
  
  /**
   * Normalize priority to uppercase
   */
  private normalizePriority(priority: string): string {
    const upperPriority = (priority || 'medium').toUpperCase();
    // Map to valid priorities
    if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(upperPriority)) {
      return upperPriority;
    }
    return 'MEDIUM';
  }
  
  /**
   * Convert AI-generated suites to our TestSuite format
   */
  private convertAISuitesToTestSuites(aiSuites: AITestSuite[]): TestSuite[] {
    return aiSuites.map((aiSuite, suiteIndex) => {
      const suiteId = aiSuite.id || `suite-ai-${suiteIndex + 1}`;
      
      const testCases: TestCase[] = aiSuite.testCases.map((aiCase, caseIndex) => {
        const caseId = aiCase.id || `case-ai-${suiteIndex}-${caseIndex}`;
        
        const steps: TestStep[] = aiCase.steps.map((aiStep, stepIndex) => ({
          id: `step-${caseId}-${stepIndex}`,
          caseId,
          index: stepIndex,
          action: aiStep.action,
          target: aiStep.target,
          value: aiStep.value,
          description: aiStep.description,
          selector: aiStep.selector,
          assertions: [],
          expectedOutcome: undefined,
        }));
        
        return {
          id: caseId,
          suiteId,
          name: aiCase.name,
          description: aiCase.description,
          priority: this.normalizePriority(aiCase.priority),
          tags: [],
          steps,
          status: 'pending',
          metadata: {
            components: [],
            apis: [],
            selectors: steps.map(s => s.selector).filter(Boolean) as string[],
            estimatedDuration: steps.length * 5,
            flowType: aiCase.type,
          }
        };
      });
      
      return {
        id: suiteId,
        name: aiSuite.name,
        description: aiSuite.description,
        category: aiSuite.category,
        priority: this.normalizePriority(aiSuite.priority),
        tags: aiSuite.tags,
        testCases,
        stats: {
          totalCases: testCases.length,
          totalSteps: testCases.reduce((sum, c) => sum + c.steps.length, 0),
          estimatedDuration: testCases.reduce((sum, c) => sum + (c.metadata?.estimatedDuration || 30), 0),
          complexity: testCases.length > 10 ? 'complex' : testCases.length > 5 ? 'moderate' : 'simple',
        },
        metadata: {
          components: [],
          routes: [],
          apis: [],
          generatedFrom: 'ai-synthesis',
          characteristics: [aiSuite.category, ...aiSuite.tags],
        }
      };
    });
  }
  
  /**
   * Main entry point: Discover test suites from application
   * Uses existing FlowDiscoveryService and converts journeys to suites
   */
  async discoverTestSuites(workspacePath: string): Promise<SuiteDiscoveryResult> {
    const startTime = Date.now();
    
    console.log('🚀 Smart Journey Discovery: Using advanced journey discovery...');
    
    try {
      // Use existing working discovery service
      const discoveryResult = await this.flowDiscoveryService.discoverJourneysAdvanced(workspacePath);
      
      if (!discoveryResult.success || !discoveryResult.journeys) {
        console.warn('⚠️ Journey discovery returned no results');
        return this.emptyResult(Date.now() - startTime);
      }
      
      const journeys = discoveryResult.journeys;
      console.log(`📊 Found ${journeys.length} journeys, converting to test suites...`);
      
      // Convert journeys to test suites
      const suites = this.convertJourneysToSuites(journeys);
      
      const analysisTime = Date.now() - startTime;
      const totalCases = suites.reduce((sum, s) => sum + s.testCases.length, 0);
      const totalSteps = suites.reduce((sum, s) => 
        sum + s.testCases.reduce((caseSum, c) => caseSum + c.steps.length, 0), 0
      );
      
      console.log(`✅ Discovery complete: ${suites.length} suites, ${totalCases} cases, ${totalSteps} steps (${analysisTime}ms)`);
      
      return {
        success: true,
        suites,
        totalCases,
        totalSteps,
        analysisTime,
        metadata: {
          analysisLayers: ['graph', 'navigation', 'intent'],
          coverage: {
            routes: { 
              total: discoveryResult.metadata?.nodeCount || 0, 
              covered: journeys.length 
            },
            components: { total: 0, covered: 0 },
            apis: { total: 0, covered: 0 }
          }
        }
      };
    } catch (error) {
      console.error('❌ Suite discovery failed:', error);
      return this.emptyResult(Date.now() - startTime);
    }
  }
  
  /**
   * Convert journeys from FlowDiscoveryService to TestSuites
   */
  private convertJourneysToSuites(journeys: any[]): TestSuite[] {
    // Group journeys by category
    const suiteMap = new Map<string, any[]>();
    
    for (const journey of journeys) {
      const category = this.categorizeJourney(journey);
      if (!suiteMap.has(category)) {
        suiteMap.set(category, []);
      }
      suiteMap.get(category)!.push(journey);
    }
    
    // Convert each group to a suite
    const suites: TestSuite[] = [];
    let suiteIndex = 1;
    
    for (const [category, journeysInSuite] of suiteMap.entries()) {
      const suiteId = `suite-${suiteIndex++}`;
      const testCases: TestCase[] = [];
      
      for (const journey of journeysInSuite) {
        const testCase = this.convertJourneyToTestCase(journey, suiteId);
        testCases.push(testCase);
      }
      
      const suite: TestSuite = {
        id: suiteId,
        name: this.getSuiteName(category),
        description: `Test suite for ${category} functionality`,
        category: category,
        priority: this.calculateSuitePriority(testCases),
        tags: this.extractSuiteTags(category, journeysInSuite),
        testCases,
        stats: {
          totalCases: testCases.length,
          totalSteps: testCases.reduce((sum, c) => sum + c.steps.length, 0),
          estimatedDuration: testCases.reduce((sum, c) => sum + (c.metadata?.estimatedDuration || 30), 0),
          complexity: this.inferSuiteComplexity(testCases),
        },
        metadata: {
          components: [...new Set(testCases.flatMap(c => c.metadata?.components || []))],
          routes: [...new Set(journeysInSuite.map(j => j.route || '').filter(Boolean))],
          apis: [...new Set(testCases.flatMap(c => c.metadata?.apis || []))],
          generatedFrom: 'discovery',
          characteristics: this.extractSuiteCharacteristics(testCases),
        }
      };
      
      suites.push(suite);
    }
    
    return suites;
  }
  
  /**
   * Convert single journey to test case - fully dynamic
   */
  private convertJourneyToTestCase(journey: any, suiteId: string): TestCase {
    const caseId = `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert journey steps to test steps
    const steps: TestStep[] = (journey.steps || []).map((step: any, index: number) => ({
      id: `step-${caseId}-${index}`,
      caseId,
      index,
      action: this.mapStepAction(step.action || step.type),
      target: step.target || step.route || step.component || '',
      value: step.value,
      description: step.description || `${step.action} ${step.target}`,
      selector: step.selector,
      assertions: step.assertions || [],
      expectedOutcome: step.expectedOutcome,
      api: step.api
    }));
    
    return {
      id: caseId,
      suiteId,
      name: journey.name || 'Untitled Test Case',
      description: journey.description || `Test case for ${journey.name}`,
      priority: this.mapPriority(journey.priority),
      tags: this.extractCaseTags(journey),
      steps,
      status: 'pending',
      testData: journey.testData,
      metadata: {
        components: journey.components || [],
        apis: journey.apis || [],
        selectors: steps.map(s => s.selector).filter(Boolean) as string[],
        edgeCases: journey.edgeCases || [],
        estimatedDuration: steps.length * 5,
        flowType: this.inferJourneyFlowType(journey),
      }
    };
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  private categorizeJourney(journey: any): string {
    const name = journey.name?.toLowerCase() || '';
    const route = journey.route?.toLowerCase() || '';
    const description = journey.description?.toLowerCase() || '';
    const tags = journey.tags || [];
    
    // Authentication - HIGHEST PRIORITY
    if (name.includes('login') || name.includes('signin') || 
        name.includes('register') || name.includes('signup') ||
        name.includes('sign in') || name.includes('sign up') ||
        name.includes('user registration') ||
        description.includes('login') || description.includes('auth') ||
        route.includes('login') || route.includes('signin') ||
        route.includes('register') || route.includes('signup') ||
        tags.includes('auth')) {
      return 'authentication';
    }
    
    // CRUD operations - HIGH PRIORITY
    if (name.includes('create') || name.includes('edit') || 
        name.includes('update') || name.includes('delete') ||
        name.includes('transaction') || name.includes('manage') ||
        description.includes('create') || description.includes('crud') ||
        route.includes('create') || route.includes('edit') ||
        route.includes('/new') || route.includes('delete') ||
        route.includes('transaction') ||
        tags.includes('crud')) {
      return 'crud';
    }
    
    // Workflow (multi-step processes)
    if (name.includes('checkout') || name.includes('payment') ||
        name.includes('wizard') || name.includes('onboarding') ||
        description.includes('workflow') ||
        (journey.steps && journey.steps.length > 5)) {
      return 'workflow';
    }
    
    // Navigation - LOWER PRIORITY (only explicit navigation intent)
    if ((name.startsWith('navigate to') && !name.includes('transaction') && !name.includes('user')) ||
        description.startsWith('user navigates to')) {
      return 'navigation';
    }
    
    return 'other';
  }
  
  private getSuiteName(category: string): string {
    const names: Record<string, string> = {
      authentication: 'Authentication & Authorization',
      crud: 'CRUD Operations',
      navigation: 'Navigation & Routing',
      workflow: 'Multi-Step Workflows',
      other: 'General Functionality'
    };
    return names[category] || 'Test Suite';
  }
  
  private calculateSuitePriority(testCases: TestCase[]): string {
    // Dynamic priority calculation based on test case priorities
    const priorities = testCases.map(c => c.priority.toLowerCase());
    if (priorities.includes('critical')) return 'critical';
    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    return 'low';
  }
  
  private mapPriority(priority: any): string {
    if (typeof priority === 'number') {
      if (priority === 1) return 'critical';
      if (priority === 2) return 'high';
      if (priority === 3) return 'medium';
      return 'low';
    }
    
    const p = String(priority || '').toLowerCase();
    if (['critical', 'high', 'medium', 'low'].includes(p)) {
      return p;
    }
    
    return 'medium';
  }
  
  private mapStepAction(action: string): string {
    // Map common action names to standardized ones
    const actionMap: Record<string, string> = {
      'navigate': 'navigate',
      'click': 'click',
      'fill': 'fill',
      'type': 'fill',
      'input': 'fill',
      'submit': 'submit',
      'verify': 'verify',
      'assert': 'verify',
      'wait': 'wait',
      'api': 'api-call',
      'api-call': 'api-call'
    };
    
    return actionMap[action?.toLowerCase()] || action || 'click';
  }
  
  // ============================================
  // NEW DYNAMIC HELPER METHODS
  // ============================================
  
  private extractSuiteTags(category: string, journeys: any[]): string[] {
    const tags = new Set<string>();
    tags.add(category);
    
    for (const journey of journeys) {
      if (journey.tags) {
        journey.tags.forEach((t: string) => tags.add(t));
      }
      // Extract tags from route
      if (journey.route) {
        const parts = journey.route.split('/').filter(Boolean);
        parts.forEach((p: string) => {
          if (p.length > 2 && !p.startsWith(':')) tags.add(p);
        });
      }
    }
    
    return [...tags].slice(0, 10);
  }
  
  private inferSuiteComplexity(testCases: TestCase[]): string {
    const totalSteps = testCases.reduce((sum, c) => sum + c.steps.length, 0);
    const avgSteps = totalSteps / testCases.length;
    
    if (avgSteps > 10 || testCases.length > 5) return 'complex';
    if (avgSteps > 5 || testCases.length > 3) return 'moderate';
    return 'simple';
  }
  
  private extractSuiteCharacteristics(testCases: TestCase[]): string[] {
    const chars = new Set<string>();
    
    for (const tc of testCases) {
      if (tc.steps.some(s => s.action === 'fill')) chars.add('has-forms');
      if (tc.steps.some(s => s.action === 'api-call')) chars.add('has-api-calls');
      if (tc.steps.some(s => s.action === 'navigate')) chars.add('has-navigation');
      if (tc.metadata.flowType) chars.add(tc.metadata.flowType);
    }
    
    return [...chars];
  }
  
  private extractCaseTags(journey: any): string[] {
    const tags: string[] = [];
    
    if (journey.tags) {
      tags.push(...journey.tags);
    }
    
    // Infer tags from journey properties
    if (journey.route) {
      const parts = journey.route.split('/').filter(Boolean);
      for (const part of parts) {
        if (part.length > 2 && !part.startsWith(':') && !tags.includes(part)) {
          tags.push(part);
        }
      }
    }
    
    return tags.slice(0, 5);
  }
  
  private inferJourneyFlowType(journey: any): string {
    const name = (journey.name || '').toLowerCase();
    const route = (journey.route || '').toLowerCase();
    
    if (name.includes('login') || name.includes('signin') || route.includes('auth')) {
      return 'authentication-flow';
    }
    if (name.includes('create') || name.includes('new')) {
      return 'create-flow';
    }
    if (name.includes('edit') || name.includes('update')) {
      return 'update-flow';
    }
    if (name.includes('delete')) {
      return 'delete-flow';
    }
    if (journey.steps && journey.steps.length > 5) {
      return 'multi-step-flow';
    }
    
    return 'navigation-flow';
  }
  
  private emptyResult(analysisTime: number): SuiteDiscoveryResult {
    return {
      success: true,
      suites: [],
      totalCases: 0,
      totalSteps: 0,
      analysisTime,
      metadata: {
        analysisLayers: [],
        coverage: {
          routes: { total: 0, covered: 0 },
          components: { total: 0, covered: 0 },
          apis: { total: 0, covered: 0 }
        }
      }
    };
  }
}
