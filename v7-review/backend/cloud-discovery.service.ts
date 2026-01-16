import { Injectable } from '@nestjs/common';
import {
  AnalysisPayload,
  DiscoveryResponse,
  TestSuiteOutput,
  TestCaseOutput,
  TestStepOutput,
} from './types/analysis-payload.types';
import { AISynthesizerService } from './intelligence/ai-synthesizer.service';
import { UniversalTestBuilderService, UniversalSuite } from './intelligence/universal-test-builder.service';
import { runIntelligentDiscovery, assessQuality } from './intelligence/intelligent-discovery';
import { runV4Discovery, convertToLegacyFormat } from './intelligence/v4-discovery';
import { runV5Discovery, convertToLegacyFormat as convertV5ToLegacy, createLLMClient } from './intelligence/v5-discovery';
import { runV6Pipeline, V6Result, V6Options } from './intelligence/v6-discovery';
import { AIProviderService } from '../../services/ai-provider.service';
import { BehaviorGraphPayload } from './types/behavior-graph.types';
import { processBehaviorGraph } from './v7-behavior-graph';
import { summarizeBehaviorGraphSemantically } from './intelligence/v7-semantic/semantic-summarizer';
import { createV7LLMClient } from './intelligence/v7-semantic/llm-client';

/**
 * Cloud Discovery Service
 * 
 * Processes pre-parsed analysis data (AnalysisPayload) and generates test suites.
 * This service does NOT access filesystem - it works purely with data sent by client.
 * 
 * NEW FLOW (v2 - Deterministic):
 * 1. Client scans local repo, parses AST, extracts data
 * 2. Client sends AnalysisPayload to this service
 * 3. DeterministicTestBuilder generates structure (100% coverage guaranteed)
 * 4. AI optionally enriches descriptions (not structure)
 * 5. Returns DiscoveryResponse with test suites
 */

@Injectable()
export class CloudDiscoveryService {
  
  private universalBuilder: UniversalTestBuilderService;
  
  constructor(
    private readonly aiSynthesizer: AISynthesizerService,
    private readonly aiProvider: AIProviderService,
  ) {
    this.universalBuilder = new UniversalTestBuilderService();
  }

  /**
   * V7: Behavior-Driven Discovery (Behavior Graph + deterministic goal extraction + semantic AI)
   * Strict separation from v2-v6 discovery logic.
   */
  async discoverV7(
    payload: BehaviorGraphPayload
  ): Promise<{
    success: true;
    suites: import('./intelligence/v7-semantic/semantic-summarizer').V7SemanticSuite[];
    unknowns?: string[];
    reason?: 'NO_DETERMINISTIC_USER_GOALS';
  } | {
    success: false;
    suites: [];
    reason: 'INVALID_BEHAVIOR_GRAPH';
  }> {
    console.log(`\n🧠 API: Behavior-Driven Discovery V7 for ${payload.project.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const processed = processBehaviorGraph(payload);
    if (!processed.ok || !processed.payload || !processed.goals) {
      return {
        success: false,
        suites: [],
        reason: 'INVALID_BEHAVIOR_GRAPH',
      };
    }

    // V7 rule: if there are ZERO deterministic user goals, we MUST return empty suites and skip AI.
    const deterministicGoals = processed.goals.filter(g => g.terminalNodeId !== 'UNKNOWN');
    if (deterministicGoals.length === 0) {
      return {
        success: true,
        suites: [],
        reason: 'NO_DETERMINISTIC_USER_GOALS',
      };
    }

    const llmClient = createV7LLMClient(this.aiProvider);
    const semantic = await summarizeBehaviorGraphSemantically(
      { payload: processed.payload, goals: deterministicGoals },
      llmClient
    );

    return {
      success: true,
      suites: semantic.suites,
      unknowns: semantic.unknowns,
    };
  }
  
  /**
   * Main entry: Process analysis payload and generate test suites
   * V2: Uses deterministic builder for guaranteed 100% coverage
   */
  async discover(payload: AnalysisPayload): Promise<DiscoveryResponse> {
    const startTime = Date.now();
    
    console.log('\n☁️  Cloud Discovery Service V2 (Deterministic)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Project: ${payload.project.name}`);
    console.log(`   Framework: ${payload.project.framework.name}`);
    console.log(`   Components: ${payload.components.length}`);
    console.log(`   Routes: ${payload.routes.length}`);
    console.log(`   Forms: ${payload.forms.length}`);
    console.log(`   APIs: ${payload.apis.length}`);
    console.log('');
    
    try {
      // Step 1: Detect entities (for metadata)
      const entities = this.detectEntities(payload);
      console.log(`📊 Step 1: Detected ${entities.length} entities`);
      
      // Step 2: Generate test suites UNIVERSALLY (works for any app)
      console.log('🌐 Step 2: Building test suites universally...');
      const generatedSuites = this.universalBuilder.build(payload);
      
      // Step 3: Convert to output format
      console.log('📦 Step 3: Converting to output format...');
      const suites = this.convertGeneratedToOutput(generatedSuites, payload);
      
      const processingTime = Date.now() - startTime;
      
      // Calculate coverage (should be 100%)
      const coveredRoutes = new Set<string>();
      const coveredForms = new Set<string>();
      const coveredEntities = new Set<string>();
      
      for (const suite of suites) {
        suite.coverage.routes.forEach(r => coveredRoutes.add(r));
        suite.coverage.forms.forEach(f => coveredForms.add(f));
        suite.coverage.entities.forEach(e => coveredEntities.add(e));
      }
      
      const totalCases = suites.reduce((sum, s) => sum + s.testCases.length, 0);
      const totalSteps = suites.reduce((sum, s) => 
        sum + s.testCases.reduce((cs, c) => cs + c.steps.length, 0), 0);
      
      // Log results
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Universal Discovery complete:`);
      console.log(`   ${suites.length} suites, ${totalCases} cases, ${totalSteps} steps`);
      console.log(`   Route coverage: ${coveredRoutes.size}/${payload.routes.length} (${Math.round(coveredRoutes.size / payload.routes.length * 100)}%)`);
      console.log(`   Form coverage: ${coveredForms.size}/${payload.forms.length}`);
      console.log(`   Processing time: ${processingTime}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return {
        success: true,
        suites,
        summary: {
          totalSuites: suites.length,
          totalCases,
          totalSteps,
          coverage: {
            routes: { total: payload.routes.length, covered: coveredRoutes.size },
            forms: { total: payload.forms.length, covered: coveredForms.size },
            entities: { total: entities.length, covered: coveredEntities.size },
          },
        },
        analysis: {
          detectedEntities: entities,
          detectedFlows: generatedSuites.map(s => s.name),
          processingTime,
          aiModel: 'universal-v1',
        },
      };
      
    } catch (error) {
      console.error('❌ Universal Discovery failed:', error);
      return {
        success: false,
        suites: [],
        summary: {
          totalSuites: 0,
          totalCases: 0,
          totalSteps: 0,
          coverage: {
            routes: { total: payload.routes.length, covered: 0 },
            forms: { total: payload.forms.length, covered: 0 },
            entities: { total: 0, covered: 0 },
          },
        },
        analysis: {
          detectedEntities: [],
          detectedFlows: [],
          processingTime: Date.now() - startTime,
          aiModel: null,
        },
      };
    }
  }
  
  /**
   * V3: Intelligent Discovery - uses semantic classification and probabilistic matching
   * 
   * Improvements over V2:
   * - Multi-signal weighted voting for field classification (not string matching)
   * - Naive Bayes-style form purpose classification
   * - MST-based suite clustering (domain grouping, not 1:1)
   * - Diverse test case generation (happy-path + validation + error + edge)
   * - Ranked selector candidates with confidence scores
   */
  async discoverIntelligent(payload: AnalysisPayload): Promise<DiscoveryResponse> {
    const startTime = Date.now();
    
    console.log('\n🧠 Cloud Discovery Service V3 (Intelligent)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Project: ${payload.project.name}`);
    console.log(`   Framework: ${payload.project.framework.name}`);
    console.log(`   Forms: ${payload.forms.length}`);
    console.log(`   Routes: ${payload.routes.length}`);
    console.log('');
    
    try {
      // Pre-processing: Map forms to routes (critical for V3 entity extraction)
      const routeByFile = this.buildRouteMap(payload);
      const routeByComponent = this.buildComponentRouteMap(payload);
      
      // Convert payload forms to scanner format for intelligent discovery
      const scannerForms = payload.forms.map(f => {
        // Try multiple strategies to find the route
        let resolvedRoute = f.route;
        if (!resolvedRoute) {
          // Strategy 1: Match by file path
          resolvedRoute = routeByFile.get(f.filePath) || null;
        }
        if (!resolvedRoute) {
          // Strategy 2: Match by component name
          resolvedRoute = routeByComponent.get(f.componentName) || null;
        }
        if (!resolvedRoute) {
          // Strategy 3: Infer from file path (e.g., pages/sign-in.tsx → /sign-in)
          resolvedRoute = this.inferRouteFromPath(f.filePath);
        }
        
        return {
          id: f.id,
          name: f.name,
          component: f.componentName,
          file: f.filePath,
          route: resolvedRoute,
          fields: f.fields.map(field => ({
            name: field.name,
            id: (field as any).id || null,
            type: field.type,
            placeholder: (field as any).placeholder || null,
            label: field.label,
            required: field.isRequired,
            selector: field.selector,
            autocomplete: (field as any).autocomplete || null,
            ariaLabel: (field as any).ariaLabel || null,
            dataTestId: (field as any).dataTestId || null,
            dataTest: (field as any).dataTest || null,
            dataCy: (field as any).dataCy || null,
          })),
          submitButton: f.submitButton,
        };
      });
      
      // Run intelligent discovery
      const result = await runIntelligentDiscovery(scannerForms, {
        minSuiteSize: 1,
        maxSuiteSize: 8,
        similarityThreshold: 0.45,
        minQuality: 0.3,
      });
      
      // Convert to output format
      const suites: TestSuiteOutput[] = result.suites.map(suite => ({
        id: suite.id,
        name: suite.name,
        description: suite.description,
        category: this.mapDomainToCategory(suite.domain.primary),
        priority: suite.priority.level.toLowerCase() as TestSuiteOutput['priority'],
        tags: [suite.domain.primary],
        testCases: suite.cases.map(tc => ({
          id: tc.id,
          name: tc.name,
          description: tc.classification.derivedFrom.reference,
          type: this.mapCaseType(tc.classification.type),
          priority: tc.priority.level.toLowerCase() as TestCaseOutput['priority'],
          steps: tc.steps.map(step => ({
            index: step.index,
            action: step.action,
            target: step.target.resolved,
            selector: step.selector?.primary || null,
            value: step.value?.primary || null,
            description: step.reasoning,
          })),
          estimatedDuration: tc.estimatedDuration,
        })),
        coverage: suite.coverage,
      }));
      
      const processingTime = Date.now() - startTime;
      
      // Log results with quality metrics
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Intelligent Discovery complete:`);
      console.log(`   ${result.metadata.totalForms} forms → ${result.suites.length} suites`);
      console.log(`   ${result.metadata.totalCases} cases, ${result.metadata.totalSteps} steps`);
      console.log(`   Quality: ${Math.round(result.quality.overall * 100)}% (${result.quality.recommendation})`);
      console.log(`   Field Resolution: ${Math.round(result.quality.fieldResolution * 100)}%`);
      console.log(`   Selector Quality: ${Math.round(result.quality.selectorQuality * 100)}%`);
      console.log(`   Processing time: ${processingTime}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return {
        success: true,
        suites,
        summary: {
          totalSuites: suites.length,
          totalCases: result.metadata.totalCases,
          totalSteps: result.metadata.totalSteps,
          coverage: {
            routes: { total: result.metadata.totalRoutes, covered: result.metadata.totalRoutes },
            forms: { total: result.metadata.totalForms, covered: result.metadata.totalForms },
            entities: { total: 0, covered: 0 },
          },
        },
        analysis: {
          detectedEntities: result.suites.flatMap(s => s.coverage.entities),
          detectedFlows: result.suites.map(s => s.name),
          processingTime,
          aiModel: 'intelligent-v3',
        },
      };
      
    } catch (error) {
      console.error('❌ Intelligent Discovery failed:', error);
      // Fall back to universal discovery
      console.log('⚠️  Falling back to Universal Discovery V2...');
      return this.discover(payload);
    }
  }
  
  /**
   * V4: Graph-based Discovery with LLM enhancement
   * 
   * Flow:
   * 1. Build application graph (routes, forms, fields, APIs)
   * 2. Discover journeys via graph traversal (DFS/BFS)
   * 3. Generate test suites from journeys (LLM or rule-based)
   * 
   * Improvements over V3:
   * - Graph representation is framework-agnostic
   * - No hardcoded patterns for field classification
   * - Journeys discovered from structure, not guessed
   * - Future-proof: works for ANY web app
   */
  async discoverV4(payload: AnalysisPayload): Promise<DiscoveryResponse> {
    const startTime = Date.now();
    
    try {
      // Run V4 Discovery
      const result = await runV4Discovery(payload, {
        useLLM: false, // Start with rule-based, can enable LLM later
      });
      
      // Convert to legacy format for compatibility
      const legacyResult = convertToLegacyFormat(result);
      
      legacyResult.analysis.processingTime = Date.now() - startTime;
      
      return legacyResult;
      
    } catch (error) {
      console.error('❌ V4 Discovery failed:', error);
      // Fall back to V3
      console.log('⚠️  Falling back to V3 Intelligent Discovery...');
      return this.discoverIntelligent(payload);
    }
  }
  
  /**
   * V5: Zero Weakness Universal Discovery
   * 
   * Pipeline:
   * 1. Convert payload to V5 format (pages, elements with ranked selectors, constraints)
   * 2. Analyzer: LLM extracts domains, journeys, auth boundary (validated against scanner data)
   * 3. Generator: Creates tests using ONLY scanner data (source tracking for each step)
   * 4. Validator: 5 data-driven checks (selector exists, value satisfies constraints, etc.)
   * 5. Critic: Checklist-based review (cannot miss required tests)
   * 6. Self-Heal: Fix issues iteratively (max 2 attempts per issue, max 3 iterations)
   * 
   * Guarantees:
   * - No hardcoded action types
   * - No invented selectors/values (all from scanner data)
   * - 100% constraint coverage
   * - Always produces output
   */
  /**
   * V5 Discovery with optional LLM enhancement
   * 
   * @param payload - Analysis payload
   * @param useLLM - Whether to use LLM for semantic analysis (default: true if available)
   */
  async discoverV5(payload: AnalysisPayload, useLLM: boolean = true): Promise<DiscoveryResponse> {
    const startTime = Date.now();
    
    try {
      // Create LLM client if LLM is requested
      const llmClient = useLLM ? createLLMClient(this.aiProvider) : undefined;
      
      if (llmClient?.isAvailable()) {
        console.log('   🧠 LLM-enhanced V5 Discovery (AI-powered semantic analysis)');
      } else {
        console.log('   📝 Rule-based V5 Discovery (no LLM available)');
      }
      
      // Run V5 Discovery
      const result = await runV5Discovery(payload, {
        useLLM: useLLM && llmClient?.isAvailable(),
        llmClient,
        skipSelfHeal: false,
        minQualityScore: 0.85,
      });
      
      // Convert to legacy format for compatibility
      const legacyResult = convertV5ToLegacy(result);
      
      legacyResult.analysis.processingTime = Date.now() - startTime;
      legacyResult.analysis.aiModel = llmClient?.isAvailable() ? 'v5-llm-enhanced' : 'v5-rule-based';
      
      return legacyResult;
      
    } catch (error) {
      console.error('❌ V5 Discovery failed:', error);
      // Fall back to V4
      console.log('⚠️  Falling back to V4 Discovery...');
      return this.discoverV4(payload);
    }
  }
  
  /**
   * V6: Intelligent LLM-First Test Generation
   * 
   * Pipeline:
   * 1. LLM Analyzer - Understands the app (features, not pages)
   * 2. Test Plan Generator - LLM generates test plans per feature
   * 3. Step Compiler - Pure translator (field names → selectors)
   * 4. Quality Validator - Validates and auto-fixes issues
   * 
   * Key differences from V5:
   * - LLM makes ALL decisions, code just translates
   * - No hardcoded heuristics at all
   * - Test ordering based on data dependencies
   * - Proper deduplication and validation
   */
  async discoverV6(payload: AnalysisPayload, options: V6Options = {}): Promise<DiscoveryResponse> {
    const startTime = Date.now();
    
    try {
      // Convert payload to V5 scanner format (V6 uses the same format)
      const scannerPayload = this.convertToScannerPayload(payload);
      
      // Run V6 Pipeline
      const result = await runV6Pipeline(scannerPayload, this.aiProvider, {
        autoFix: true,
        debug: options.debug ?? false,
        ...options,
      });
      
      // Convert to legacy format for compatibility
      const legacyResult = this.convertV6ToLegacy(result, payload);
      
      legacyResult.analysis.processingTime = Date.now() - startTime;
      legacyResult.analysis.aiModel = 'v6-intelligent';
      
      return legacyResult;
      
    } catch (error) {
      console.error('❌ V6 Discovery failed:', error);
      // Fall back to V5
      console.log('⚠️  Falling back to V5 Discovery...');
      return this.discoverV5(payload);
    }
  }
  
  /**
   * Convert V6 result to legacy DiscoveryResponse format
   */
  private convertV6ToLegacy(result: V6Result, payload: AnalysisPayload): DiscoveryResponse {
    const suites: TestSuiteOutput[] = result.suites.map(suite => {
      const feature = result.appUnderstanding.features.find(f => f.id === suite.featureId);
      
      return {
        id: suite.id,
        name: suite.name,
        description: feature?.description || `Tests for ${suite.name}`,
        category: this.mapV6CategoryToLegacy(feature?.category || 'general'),
        priority: suite.priority,
        tags: [feature?.category || 'general', suite.priority],
        testCases: suite.cases.map((tc, index) => ({
          id: tc.id,
          name: tc.name,
          description: tc.testedConstraint || `Test case for ${suite.name}`,
          type: this.mapV6TypeToLegacy(tc.type),
          priority: tc.priority as 'critical' | 'high' | 'medium' | 'low',
          steps: tc.steps.map((step, stepIndex) => ({
            index: stepIndex + 1,
            action: step.action,
            target: step.description,
            selector: step.selector,
            value: step.value || null,
            description: step.description,
          })),
          estimatedDuration: 30, // Default
        })),
        coverage: {
          routes: feature?.pages?.map(pageId => {
            const page = payload.routes.find(r => r.path.includes(pageId));
            return page?.path || pageId;
          }) || [],
          forms: feature?.forms || [],
          entities: [],
        },
      };
    });
    
    const totalCases = suites.reduce((sum, s) => sum + s.testCases.length, 0);
    const totalSteps = suites.reduce((sum, s) => 
      sum + s.testCases.reduce((cs, c) => cs + c.steps.length, 0), 0);
    
    return {
      success: result.success,
      suites,
      summary: {
        totalSuites: suites.length,
        totalCases,
        totalSteps,
        coverage: {
          routes: {
            total: payload.routes.length,
            covered: result.validation.coverage.features.tested,
          },
          forms: {
            total: payload.forms.length,
            covered: result.stats.featuresDetected,
          },
          entities: {
            total: result.appUnderstanding.dataEntities.length,
            covered: result.appUnderstanding.dataEntities.length,
          },
        },
      },
      analysis: {
        detectedEntities: result.appUnderstanding.dataEntities.map(e => e.name),
        detectedFlows: result.appUnderstanding.features.map(f => f.name),
        processingTime: result.stats.processingTimeMs,
        aiModel: 'v6-intelligent',
      },
    };
  }
  
  private mapV6CategoryToLegacy(category: string): TestSuiteOutput['category'] {
    const map: Record<string, TestSuiteOutput['category']> = {
      'auth': 'authentication',
      'financial': 'forms',
      'content': 'crud',
      'settings': 'user-management',
      'admin': 'crud',
      'navigation': 'general',
    };
    return map[category] || 'general';
  }
  
  private mapV6TypeToLegacy(type: string): TestCaseOutput['type'] {
    const map: Record<string, TestCaseOutput['type']> = {
      'happy-path': 'happy-path',
      'validation': 'validation',
      'security': 'security',
      'edge-case': 'edge-case',
      'negative': 'error-handling',
      'boundary': 'edge-case',
    };
    return map[type] || 'happy-path';
  }
  
  /**
   * Convert AnalysisPayload to V5/V6 ScannerPayload format
   */
  private convertToScannerPayload(payload: AnalysisPayload): import('./intelligence/v5-discovery/types').ScannerPayload {
    // Build pages from routes
    const pages = payload.routes.map(route => ({
      id: `page-${route.path.replace(/\//g, '-').replace(/^-/, '')}`,
      file: route.filePath || '',
      url: route.path,
      elementIds: [] as string[],
      isProtected: route.isProtected || false,
    }));
    
    // Build elements from forms
    const elements: import('./intelligence/v5-discovery/types').ScannerElement[] = [];
    const constraints: import('./intelligence/v5-discovery/types').ScannerConstraint[] = [];
    
    for (const form of payload.forms) {
      const pageId = pages.find(p => p.file === form.filePath)?.id || pages[0]?.id || 'page-unknown';
      const formId = form.id;
      
      for (const field of form.fields) {
        const elementId = `el-${formId}-${field.name}`;
        
        elements.push({
          id: elementId,
          pageId,
          tagName: field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input',
          attributes: {
            name: field.name,
            type: field.type,
            placeholder: (field as any).placeholder || '',
            required: field.isRequired,
          },
          textContent: null,
          nearbyText: field.label ? [field.label] : [],
          selectors: [
            { value: `[name="${field.name}"]`, rank: 1, stability: 'high' as const, basedOn: 'name' },
          ],
          bestSelector: `[name="${field.name}"]`,
          formId,
        });
        
        // Build constraints from validations
        if (field.validations && field.validations.length > 0) {
          const rules: import('./intelligence/v5-discovery/types').ConstraintRule[] = [];
          
          for (const validation of field.validations) {
            if (validation.type === 'required') {
              rules.push({ type: 'required' });
            } else if (validation.type === 'minLength' && validation.value) {
              rules.push({ type: 'minLength', value: Number(validation.value) });
            } else if (validation.type === 'maxLength' && validation.value) {
              rules.push({ type: 'maxLength', value: Number(validation.value) });
            } else if (validation.type === 'pattern' && validation.value) {
              rules.push({ type: 'pattern', pattern: String(validation.value) });
            } else if (validation.type === 'email') {
              rules.push({ type: 'email' });
            }
          }
          
          if (rules.length > 0) {
            constraints.push({
              field: field.name,
              elementId,
              rules,
              validExamples: [],
              invalidExamples: [],
              source: 'form-validation',
            });
          }
        }
      }
      
      // Add submit button
      const submitId = `el-${formId}-submit`;
      const submitText = typeof form.submitButton === 'string' 
        ? form.submitButton 
        : form.submitButton?.text || 'Submit';
      
      elements.push({
        id: submitId,
        pageId,
        tagName: 'button',
        attributes: {
          type: 'submit',
        },
        textContent: submitText,
        nearbyText: [],
        selectors: [
          { value: 'button[type="submit"]', rank: 1, stability: 'high' as const, basedOn: 'type' },
        ],
        bestSelector: 'button[type="submit"]',
        formId,
      });
    }
    
    return {
      config: {
        detectedTestFramework: 'playwright',
        selectorPriority: ['data-testid', 'data-cy', 'name', 'id', 'class'],
        detectionReason: 'auto-detected',
      },
      pages,
      elements,
      constraints,
      flows: [],
      unknownValidations: [],
      project: {
        name: payload.project.name,
        framework: payload.project.framework.name,
        version: payload.project.framework.version || '1.0.0',
      },
    };
  }
  
  /**
   * Map case type from intelligent discovery to output format
   */
  private mapCaseType(type: string): TestCaseOutput['type'] {
    const typeMap: Record<string, TestCaseOutput['type']> = {
      'happy-path': 'happy-path',
      'validation': 'validation',
      'error': 'error-handling',
      'edge': 'edge-case',
      'security': 'security',
    };
    return typeMap[type] || 'happy-path';
  }
  
  /**
   * Map domain to suite category
   */
  private mapDomainToCategory(domain: string): TestSuiteOutput['category'] {
    const categoryMap: Record<string, TestSuiteOutput['category']> = {
      'Authentication': 'authentication',
      'User': 'user-management',
      'Payment': 'forms',
      'Banking': 'forms',
      'Transaction': 'crud',
      'Checkout': 'forms',
      'Product': 'crud',
      'Search': 'general',
      'Contact': 'forms',
      'Generic': 'general',
    };
    return categoryMap[domain] || 'general';
  }
  
  /**
   * Convert generated suites to output format
   */
  private convertGeneratedToOutput(generatedSuites: UniversalSuite[], payload: AnalysisPayload): TestSuiteOutput[] {
    return generatedSuites.map(suite => ({
      id: suite.id,
      name: suite.name,
      description: suite.description,
      category: suite.category as TestSuiteOutput['category'],
      priority: suite.priority,
      tags: suite.tags,
      testCases: suite.testCases.map(tc => ({
        id: tc.id,
        name: tc.name,
        description: tc.description,
        type: this.mapTestCaseType(tc.type),
        priority: tc.priority,
        steps: tc.steps.map(step => ({
          index: step.index,
          action: step.action,
          target: step.target,
          selector: step.selector,
          value: step.value,
          description: step.description,
        })),
        estimatedDuration: tc.estimatedDuration,
      })),
      coverage: suite.coverage,
    }));
  }
  
  /**
   * Map generated test case type to output type
   */
  private mapTestCaseType(type: string): TestCaseOutput['type'] {
    const typeMap: Record<string, TestCaseOutput['type']> = {
      'happy-path': 'happy-path',
      'validation': 'validation',
      'security': 'security',
      'edge-case': 'edge-case',
      'crud-create': 'happy-path',
      'crud-read': 'happy-path',
      'crud-update': 'happy-path',
      'crud-delete': 'happy-path',
    };
    return typeMap[type] || 'happy-path';
  }
  
  /**
   * Detect entities from types - semantic analysis
   */
  private detectEntities(payload: AnalysisPayload): string[] {
    const entities: string[] = [];
    
    for (const type of payload.types) {
      // Skip props, state, and utility types
      if (type.semanticType === 'props' || type.semanticType === 'state') continue;
      if (type.name.endsWith('Props') || type.name.endsWith('State')) continue;
      if (type.name.startsWith('I') && type.name.length > 1 && type.name[1] === type.name[1].toUpperCase()) {
        // Could be IProduct -> Product
        const entityName = type.name.slice(1);
        if (!entities.includes(entityName)) entities.push(entityName);
        continue;
      }
      
      // Has multiple properties that look like data fields
      const dataProperties = type.properties.filter(p => 
        !p.name.startsWith('on') && // not event handlers
        !p.name.startsWith('render') && // not render props
        !p.type.includes('=>') // not functions
      );
      
      if (dataProperties.length >= 2) {
        if (!entities.includes(type.name)) {
          entities.push(type.name);
        }
      }
    }
    
    // Also infer from route paths
    for (const route of payload.routes) {
      const segments = route.path.split('/').filter(Boolean);
      for (const seg of segments) {
        if (seg.startsWith('[')) continue; // dynamic param
        const singular = seg.replace(/s$/, '');
        const capitalized = singular.charAt(0).toUpperCase() + singular.slice(1);
        if (!entities.includes(capitalized) && capitalized.length > 2) {
          // Check if it looks like an entity name
          if (payload.types.some(t => t.name.toLowerCase() === singular.toLowerCase())) {
            entities.push(capitalized);
          }
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Build feature clusters - entity-centric grouping
   */
  private buildFeatureClusters(
    payload: AnalysisPayload, 
    entities: string[]
  ): FeatureCluster[] {
    const clusters: FeatureCluster[] = [];
    
    // Use inferred flows from relationships if available
    if (payload.relationships.inferredFlows.length > 0) {
      for (const flow of payload.relationships.inferredFlows) {
        clusters.push({
          name: flow.name,
          description: flow.description,
          entities: flow.entities,
          routes: flow.steps,
          importance: flow.importance,
        });
      }
    }
    
    // Create clusters for entities not covered by flows
    const coveredEntities = new Set(clusters.flatMap(c => c.entities));
    
    for (const entity of entities) {
      if (coveredEntities.has(entity)) continue;
      
      // Find routes for this entity
      const entityRoutes = payload.relationships.entityToRoutes[entity] || [];
      
      // Find routes by path matching
      const routesByPath = payload.routes
        .filter(r => r.path.toLowerCase().includes(entity.toLowerCase()))
        .map(r => r.path);
      
      const allRoutes = [...new Set([...entityRoutes, ...routesByPath])];
      
      if (allRoutes.length > 0) {
        clusters.push({
          name: `${entity} Management`,
          description: `CRUD operations for ${entity}`,
          entities: [entity],
          routes: allRoutes,
          importance: 0.6,
        });
      }
    }
    
    // Sort by importance
    return clusters.sort((a, b) => b.importance - a.importance);
  }
  
  /**
   * Build AI context string - ENHANCED with structured form data and test credentials
   */
  private buildAIContext(
    payload: AnalysisPayload,
    entities: string[],
    clusters: FeatureCluster[]
  ): string {
    let context = `# Application Analysis: ${payload.project.name}\n\n`;
    
    // Project overview
    context += `## Overview\n`;
    context += `- Framework: ${payload.project.framework.name}\n`;
    context += `- Router: ${payload.project.framework.router || 'Custom'}\n`;
    context += `- Components: ${payload.components.length}\n`;
    context += `- Routes: ${payload.routes.length}\n`;
    context += `- Forms: ${payload.forms.length}\n\n`;
    
    // Detected entities
    context += `## Detected Entities (${entities.length})\n`;
    for (const entity of entities) {
      context += `- ${entity}\n`;
    }
    context += '\n';
    
    // Feature clusters (MANDATORY)
    context += `## MANDATORY FEATURE CLUSTERS (MUST generate at least 1 suite per cluster)\n`;
    context += `Total clusters: ${clusters.length}\n\n`;
    
    for (const cluster of clusters) {
      context += `### ${cluster.name} [Importance: ${cluster.importance.toFixed(2)}]\n`;
      context += `Description: ${cluster.description}\n`;
      context += `Entities: ${cluster.entities.join(', ')}\n`;
      context += `Routes to cover: ${cluster.routes.join(', ')}\n\n`;
    }
    
    // All routes grouped
    context += `## ALL ROUTES - MUST HAVE TEST COVERAGE (${payload.routes.length} total)\n`;
    for (const route of payload.routes) {
      context += `- ${route.path}`;
      if (route.isProtected) context += ' [PROTECTED]';
      if (route.isDynamic) context += ' [DYNAMIC]';
      context += '\n';
    }
    context += '\n';
    
    // ENHANCED: Detailed form information with selectors and test data
    if (payload.forms.length > 0) {
      context += `## FORMS WITH SELECTORS (USE THESE EXACT SELECTORS)\n`;
      context += `IMPORTANT: Use the selectors provided below. DO NOT invent data-testid selectors.\n\n`;
      
      for (const form of payload.forms) {
        context += `### ${form.name}\n`;
        context += `- Route: ${form.route || 'unknown'}\n`;
        context += `- Component: ${form.componentName}\n`;
        context += `- Library: ${form.library || 'native'}\n`;
        context += `- Has Validation: ${form.hasValidation}\n`;
        if (form.successRedirect) {
          context += `- Success Redirect: ${form.successRedirect}\n`;
        }
        
        // Fields with exact selectors
        context += `- Fields:\n`;
        for (const field of form.fields) {
          context += `  * ${field.name}:`;
          context += ` type=${field.type}`;
          if (field.isRequired) context += ', required';
          context += `\n`;
          context += `    SELECTOR: ${field.selector || `input[name="${field.name}"]`}\n`;
          if (field.label) {
            context += `    Label: "${field.label}"\n`;
          }
        }
        
        // Submit button with selector
        if (form.submitButton) {
          context += `- Submit Button:\n`;
          context += `  * Text: "${form.submitButton.text || 'Submit'}"\n`;
          context += `  * SELECTOR: ${form.submitButton.selector || 'button[type="submit"]'}\n`;
        }
        
        // Test data if available
        if (form.testData && Object.keys(form.testData).length > 0) {
          context += `- TEST DATA (use these values in tests):\n`;
          for (const [key, value] of Object.entries(form.testData)) {
            context += `  * ${key}: ${value}\n`;
          }
        }
        
        context += '\n';
      }
    }
    
    // Navigation links (user flows)
    if (payload.relationships.navigationLinks.length > 0) {
      context += `## Navigation Links (User Flow Hints)\n`;
      for (const link of payload.relationships.navigationLinks.slice(0, 20)) {
        context += `- ${link.from} -> ${link.to}`;
        if (link.linkText) context += ` ("${link.linkText}")`;
        if (link.selector) context += ` [selector: ${link.selector}]`;
        context += '\n';
      }
      context += '\n';
    }
    
    // Business logic hints
    context += `## Business Logic Hints\n`;
    
    // Auth patterns
    const authForms = payload.forms.filter(f => 
      f.name.toLowerCase().includes('login') || 
      f.name.toLowerCase().includes('sign') ||
      f.name.toLowerCase().includes('register')
    );
    if (authForms.length > 0) {
      context += `- Authentication: App has ${authForms.length} auth forms (${authForms.map(f => f.name).join(', ')})\n`;
    }
    
    // Protected routes
    const protectedRoutes = payload.routes.filter(r => 
      r.path.includes('dashboard') || 
      r.path.includes('admin') || 
      r.path.includes('settings')
    );
    if (protectedRoutes.length > 0) {
      context += `- Protected Routes: ${protectedRoutes.length} routes likely require auth (${protectedRoutes.map(r => r.path).join(', ')})\n`;
    }
    
    // CRUD patterns
    const crudEntities = entities.filter(e => {
      const eLower = e.toLowerCase();
      return payload.routes.some(r => r.path.toLowerCase().includes(eLower));
    });
    if (crudEntities.length > 0) {
      context += `- CRUD Entities: ${crudEntities.join(', ')} - generate create/read/update tests\n`;
    }
    
    context += '\n';
    
    return context;
  }
  
  /**
   * Build DSA input for AI Synthesizer
   */
  private buildDSAInput(payload: AnalysisPayload): any {
    return {
      projectName: payload.project.name,
      forms: payload.forms.map(f => ({
        name: f.name,
        component: f.componentName,
        fields: f.fields.map(field => ({
          name: field.name,
          type: field.type,
          required: field.isRequired,
          label: field.label,
          selector: field.selector,
        })),
        submitButton: f.submitButton,
        submitAction: f.submitEndpoint,
        hasValidation: f.hasValidation,
      })),
      routes: payload.routes.map(r => ({
        path: r.path,
        component: r.component,
        isProtected: r.isProtected,
        isDynamic: r.isDynamic,
        params: r.params,
      })),
      apis: payload.apis.map(a => ({
        method: a.method,
        path: a.path,
        hasAuth: a.hasAuth,
        usedBy: a.calledFrom.map(c => c.component),
      })),
      components: payload.components.map(c => c.name),
      behaviors: payload.behaviors.map(b => ({
        tag: b.type,
        description: b.description,
      })),
      rawFlowsCount: payload.routes.length,
    };
  }
  
  /**
   * Convert AI output to DiscoveryResponse format
   */
  private convertToOutputFormat(
    aiSuites: any[],
    payload: AnalysisPayload
  ): TestSuiteOutput[] {
    // Build route-to-form map for efficient lookup
    const routeToForms = new Map<string, string[]>();
    for (const form of payload.forms) {
      if (form.route) {
        if (!routeToForms.has(form.route)) routeToForms.set(form.route, []);
        routeToForms.get(form.route)!.push(form.name);
      }
    }
    
    // Build route-to-entity map
    const routeToEntities = new Map<string, string[]>();
    for (const [entity, routes] of Object.entries(payload.relationships.entityToRoutes || {})) {
      for (const route of routes) {
        if (!routeToEntities.has(route)) routeToEntities.set(route, []);
        routeToEntities.get(route)!.push(entity);
      }
    }
    
    return aiSuites.map((suite, index) => {
      const testCases: TestCaseOutput[] = (suite.testCases || []).map((tc: any, caseIndex: number) => {
        const steps: TestStepOutput[] = (tc.steps || []).map((step: any, stepIndex: number) => ({
          index: stepIndex,
          action: step.action,
          target: step.target,
          selector: step.selector || null,
          value: step.value || null,
          description: step.description || `${step.action} ${step.target}`,
          expectedOutcome: step.expectedOutcome,
          api: step.api,
        }));
        
        return {
          id: tc.id || `tc-${index}-${caseIndex}`,
          name: tc.name,
          description: tc.description || '',
          type: tc.type || 'happy-path',
          priority: (tc.priority || 'medium').toLowerCase(),
          steps,
          testData: tc.testData,
          estimatedDuration: tc.estimatedDuration || steps.length * 5,
        };
      });
      
      // Extract coverage info from test cases
      const coveredRoutes = new Set<string>();
      const coveredForms = new Set<string>();
      const coveredEntities = new Set<string>();
      
      for (const tc of testCases) {
        for (const step of tc.steps) {
          // Track routes
          if (step.action === 'navigate' && step.target) {
            // Normalize route (remove dynamic parts for matching)
            const normalizedRoute = step.target.replace(/\/[a-z0-9-]+$/i, '/[slug]');
            coveredRoutes.add(step.target);
            
            // Find forms on this route
            const formsOnRoute = routeToForms.get(step.target) || routeToForms.get(normalizedRoute) || [];
            formsOnRoute.forEach(f => coveredForms.add(f));
            
            // Find entities related to this route
            const entitiesOnRoute = routeToEntities.get(step.target) || routeToEntities.get(normalizedRoute) || [];
            entitiesOnRoute.forEach(e => coveredEntities.add(e));
            
            // Also infer entity from route path
            const pathSegments = step.target.split('/').filter(Boolean);
            for (const seg of pathSegments) {
              if (seg.startsWith('[')) continue;
              // Check if segment matches an entity (singular or plural)
              const singular = seg.replace(/s$/, '');
              const capitalized = singular.charAt(0).toUpperCase() + singular.slice(1);
              if (payload.types.some(t => t.name.toLowerCase() === singular.toLowerCase())) {
                coveredEntities.add(capitalized);
              }
            }
          }
          
          // Track forms from fill actions via selector parsing
          if (step.action === 'fill' && step.selector) {
            // Parse selector: input[name="email"] -> email
            const match = step.selector.match(/\[name=["']([^"']+)["']\]/);
            if (match) {
              const fieldName = match[1];
              // Find form with this field
              const form = payload.forms.find(f => 
                f.fields.some(field => field.name === fieldName)
              );
              if (form) coveredForms.add(form.name);
            }
          }
        }
      }
      
      // Also add entities from suite metadata
      if (suite.entities) {
        suite.entities.forEach((e: string) => coveredEntities.add(e));
      }
      
      return {
        id: suite.id || `suite-${index}`,
        name: suite.name,
        description: suite.description || '',
        category: suite.category || 'general',
        priority: (suite.priority || 'medium').toLowerCase() as any,
        tags: suite.tags || [],
        testCases,
        coverage: {
          routes: Array.from(coveredRoutes),
          forms: Array.from(coveredForms),
          entities: Array.from(coveredEntities),
        },
      };
    });
  }
  
  /**
   * Validate and fix test steps - ensure all interactive steps have valid selectors
   */
  private validateAndFixSuites(
    suites: TestSuiteOutput[],
    payload: AnalysisPayload
  ): TestSuiteOutput[] {
    let fixedCount = 0;
    let invalidCount = 0;
    
    // Build field name to selector map from forms
    const fieldSelectors = new Map<string, string>();
    for (const form of payload.forms) {
      for (const field of form.fields) {
        if (!fieldSelectors.has(field.name)) {
          const selector = this.generateFieldSelector(field.name, field.type);
          fieldSelectors.set(field.name, selector);
        }
      }
    }
    
    for (const suite of suites) {
      for (const testCase of suite.testCases) {
        for (const step of testCase.steps) {
          const validation = this.validateStep(step);
          
          if (!validation.valid) {
            invalidCount++;
            // Try to fix the step
            const fixed = this.fixStep(step, fieldSelectors, payload);
            if (fixed) {
              fixedCount++;
            }
          }
        }
      }
    }
    
    console.log(`   Validated steps: ${invalidCount} issues found, ${fixedCount} auto-fixed`);
    return suites;
  }
  
  /**
   * Validate a single step
   */
  private validateStep(step: TestStepOutput): { valid: boolean; reason?: string } {
    // Navigate doesn't need selector
    if (step.action === 'navigate') {
      return { valid: true };
    }
    
    // fill, click, select MUST have selector
    if (['fill', 'click', 'select'].includes(step.action)) {
      if (!step.selector || step.selector === 'null') {
        return { valid: false, reason: `${step.action} needs selector` };
      }
    }
    
    // fill MUST have value
    if (step.action === 'fill') {
      if (!step.value && step.value !== '') {
        return { valid: false, reason: 'fill needs value' };
      }
    }
    
    // verify should have either selector or value (for URL checks)
    if (step.action === 'verify') {
      if (!step.selector && !step.value) {
        // Check if target indicates URL verification
        if (step.target === 'url' || step.target?.startsWith('/')) {
          return { valid: true }; // URL verification without selector is OK
        }
        return { valid: false, reason: 'verify needs selector or value' };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Try to fix an invalid step
   */
  private fixStep(
    step: TestStepOutput,
    fieldSelectors: Map<string, string>,
    payload: AnalysisPayload
  ): boolean {
    // Fix fill without selector
    if (step.action === 'fill' && (!step.selector || step.selector === 'null')) {
      // Try to infer from target (field name)
      const fieldName = step.target?.toLowerCase() || '';
      
      // Check if we have this field in our map
      if (fieldSelectors.has(fieldName)) {
        step.selector = fieldSelectors.get(fieldName)!;
        return true;
      }
      
      // Generate selector from field name
      step.selector = this.generateFieldSelector(fieldName, 'text');
      return true;
    }
    
    // Fix click without selector
    if (step.action === 'click' && (!step.selector || step.selector === 'null')) {
      const target = step.target?.toLowerCase() || '';
      
      if (target.includes('submit') || step.description?.toLowerCase().includes('submit')) {
        step.selector = 'button[type="submit"]';
        return true;
      }
      
      // Try to extract button text from description
      const desc = step.description || '';
      const textMatch = desc.match(/click\s+(?:on\s+)?["']?([^"']+)["']?\s*button/i) ||
                       desc.match(/click\s+([^\s]+)/i);
      if (textMatch) {
        step.selector = `button:has-text("${textMatch[1]}")`;
        return true;
      }
      
      // Default to generic button
      step.selector = 'button';
      return true;
    }
    
    // Fix verify without selector
    if (step.action === 'verify' && (!step.selector || step.selector === 'null')) {
      const target = step.target?.toLowerCase() || '';
      
      // URL verification
      if (target === 'url' || target.startsWith('/')) {
        step.value = step.value || step.target;
        return true;
      }
      
      // Success message
      if (target.includes('success') || step.description?.toLowerCase().includes('success')) {
        step.selector = '.toast-success, .bg-green-50, [role="status"], .text-green-600';
        return true;
      }
      
      // Error message
      if (target.includes('error') || step.description?.toLowerCase().includes('error')) {
        step.selector = '.toast-error, .bg-red-50, [role="alert"], .text-red-600, .text-red-500';
        return true;
      }
      
      // Modal
      if (target.includes('modal') || step.description?.toLowerCase().includes('modal')) {
        step.selector = '.fixed.inset-0, [role="dialog"], [role="alertdialog"]';
        return true;
      }
      
      // Table/list
      if (target.includes('list') || target.includes('table')) {
        step.selector = 'table, .rounded-xl, [role="table"]';
        return true;
      }
      
      // Page title
      if (target.includes('title') || target.includes('header')) {
        step.selector = 'h1, h2';
        return true;
      }
      
      // Generic element existence check
      step.selector = 'body';
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate selector for a field
   */
  private generateFieldSelector(fieldName: string, fieldType: string): string {
    const name = fieldName.toLowerCase();
    
    if (fieldType === 'textarea' || name.includes('description') || name.includes('content') || name.includes('message')) {
      return `textarea[name="${fieldName}"]`;
    }
    
    if (fieldType === 'select' || name.includes('category') || name.includes('country') || name.includes('role')) {
      return `select[name="${fieldName}"]`;
    }
    
    return `input[name="${fieldName}"]`;
  }
  
  // ============================================================================
  // V3 HELPER METHODS: Route Mapping
  // ============================================================================
  
  /**
   * Build route map by file path
   */
  private buildRouteMap(payload: AnalysisPayload): Map<string, string> {
    const map = new Map<string, string>();
    for (const route of payload.routes) {
      if (route.filePath) {
        map.set(route.filePath, route.path);
      }
    }
    return map;
  }
  
  /**
   * Build route map by component name
   */
  private buildComponentRouteMap(payload: AnalysisPayload): Map<string, string> {
    const map = new Map<string, string>();
    for (const route of payload.routes) {
      if (route.component) {
        map.set(route.component, route.path);
      }
    }
    // Also use routeToComponent relationship
    if (payload.relationships?.routeToComponent) {
      for (const [route, component] of Object.entries(payload.relationships.routeToComponent)) {
        map.set(component, route);
      }
    }
    return map;
  }
  
  /**
   * Infer route from file path (Next.js/SvelteKit convention)
   * e.g., src/app/sign-in/page.tsx → /sign-in
   *       src/routes/dashboard/+page.svelte → /dashboard
   *       pages/products/[id].tsx → /products/[id]
   */
  private inferRouteFromPath(filePath: string): string | null {
    if (!filePath) return null;
    
    // Normalize path
    const normalized = filePath.replace(/\\/g, '/');
    
    // Next.js App Router: app/xxx/page.tsx
    const appRouterMatch = normalized.match(/app\/(.+?)\/(page|layout)\.(tsx?|jsx?)$/);
    if (appRouterMatch) {
      let route = '/' + appRouterMatch[1];
      // Handle groups: (auth)/sign-in → /sign-in
      route = route.replace(/\/\([^)]+\)/g, '');
      return route || '/';
    }
    
    // Next.js Pages Router: pages/xxx.tsx
    const pagesRouterMatch = normalized.match(/pages\/(.+?)\.(tsx?|jsx?)$/);
    if (pagesRouterMatch) {
      let route = '/' + pagesRouterMatch[1];
      // Remove index suffix
      route = route.replace(/\/index$/, '') || '/';
      return route;
    }
    
    // SvelteKit: routes/xxx/+page.svelte
    const sveltekitMatch = normalized.match(/routes\/(.+?)\/\+page\.svelte$/);
    if (sveltekitMatch) {
      return '/' + sveltekitMatch[1];
    }
    
    // Generic: src/screens/SignIn.tsx → /sign-in
    const screenMatch = normalized.match(/(?:screens?|views?|pages?)\/([^/]+?)\.(tsx?|jsx?)$/i);
    if (screenMatch) {
      const name = screenMatch[1]
        .replace(/Page$|Screen$|View$/i, '')
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
      return '/' + name;
    }
    
    // Component name based inference: SignInForm → /sign-in
    const componentMatch = normalized.match(/\/([A-Z][a-zA-Z]+)(?:Form|Page|Screen)?\.tsx?$/);
    if (componentMatch) {
      const name = componentMatch[1]
        .replace(/Form$|Page$|Screen$/i, '')
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
      if (name.length > 2) {
        return '/' + name;
      }
    }
    
    return null;
  }
}

interface FeatureCluster {
  name: string;
  description: string;
  entities: string[];
  routes: string[];
  importance: number;
}
