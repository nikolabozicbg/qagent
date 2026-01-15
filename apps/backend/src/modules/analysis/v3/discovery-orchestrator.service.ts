import { Injectable } from '@nestjs/common';
import { ProjectScannerService, ProjectMetadata } from './project-scanner.service';
import { ASTParserService, ParsedFile } from './ast-parser.service';
import { DependencyGraphService, DependencyGraph } from './dependency-graph.service';
import { ComponentAnalyzerService, ComponentAnalysis } from './component-analyzer.service';
import { BehaviorInferenceService, BehaviorAnalysis } from './behavior-inference.service';
import { FormIntelligenceService, FormAnalysis } from './form-intelligence.service';
import { StateDetectorService, StateAnalysis } from './state-detector.service';
import { APIMapperService, APIAnalysis } from './api-mapper.service';
import { NavigationMapperService, NavigationAnalysis } from './navigation-mapper.service';
import { SelectorExtractorService, SelectorAnalysis } from './selector-extractor.service';
import { DomainDetectorService, DomainAnalysis } from './domain-detector.service';

/**
 * Discovery Orchestrator v3.0
 * 
 * Main entry point that orchestrates all analysis phases:
 * - Phase 1: Extraction (Scan, Parse, Graph)
 * - Phase 2: Understanding (Components, Behaviors, Forms, State, APIs, Navigation, Selectors)
 * - Phase 3: Synthesis (ready for AI)
 */

export interface DiscoveryResult {
  // Phase 1 outputs
  projectMetadata: ProjectMetadata;
  parsedFiles: ParsedFile[];
  dependencyGraph: DependencyGraph;
  
  // Phase 2 outputs
  componentAnalysis: ComponentAnalysis;
  behaviorAnalysis: BehaviorAnalysis;
  formAnalysis: FormAnalysis;
  stateAnalysis: StateAnalysis;
  apiAnalysis: APIAnalysis;
  navigationAnalysis: NavigationAnalysis;
  selectorAnalysis: SelectorAnalysis;
  
  // v4: Domain analysis (semantic entities, flows, clusters)
  domainAnalysis: DomainAnalysis;
  
  // Summary for AI
  summary: ApplicationSummary;
  
  // Timing
  timing: PhaseTiming;
}

export interface ApplicationSummary {
  name: string;
  framework: string;
  router: string | null;
  stateManagement: string[];
  
  // Counts
  totalFiles: number;
  totalComponents: number;
  totalRoutes: number;
  totalForms: number;
  totalAPIEndpoints: number;
  
  // Key features
  hasAuth: boolean;
  hasFormsWithValidation: boolean;
  hasCRUDOperations: boolean;
  hasDataFetching: boolean;
  
  // Test readiness
  selectorCoverage: number;
  interactiveElements: number;
}

export interface PhaseTiming {
  phase1_extraction: number;
  phase2_understanding: number;
  total: number;
  breakdown: Record<string, number>;
}

@Injectable()
export class DiscoveryOrchestratorService {
  
  constructor(
    private readonly projectScanner: ProjectScannerService,
    private readonly astParser: ASTParserService,
    private readonly dependencyGraph: DependencyGraphService,
    private readonly componentAnalyzer: ComponentAnalyzerService,
    private readonly behaviorInference: BehaviorInferenceService,
    private readonly formIntelligence: FormIntelligenceService,
    private readonly stateDetector: StateDetectorService,
    private readonly apiMapper: APIMapperService,
    private readonly navigationMapper: NavigationMapperService,
    private readonly selectorExtractor: SelectorExtractorService,
    private readonly domainDetector: DomainDetectorService,
  ) {}
  
  /**
   * Run complete discovery pipeline
   */
  async discover(projectPath: string): Promise<DiscoveryResult> {
    console.log(`\n🚀 Discovery Orchestrator v3.0: Starting analysis`);
    console.log(`   Project: ${projectPath}`);
    console.log('');
    
    const totalStart = Date.now();
    const breakdown: Record<string, number> = {};
    
    // ============================================
    // PHASE 1: EXTRACTION
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 PHASE 1: EXTRACTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const phase1Start = Date.now();
    
    // 1.1 Project Scan
    let stepStart = Date.now();
    const projectMetadata = await this.projectScanner.scanProject(projectPath);
    breakdown['1.1 Project Scanner'] = Date.now() - stepStart;
    
    // 1.2 AST Parse
    stepStart = Date.now();
    const parsedFiles = await this.astParser.parseFiles(projectMetadata.sourceFiles);
    breakdown['1.2 AST Parser'] = Date.now() - stepStart;
    
    // 1.3 Dependency Graph
    stepStart = Date.now();
    const dependencyGraphResult = this.dependencyGraph.buildGraph(
      parsedFiles,
      projectPath,
      projectMetadata.tsConfig
    );
    breakdown['1.3 Dependency Graph'] = Date.now() - stepStart;
    
    const phase1Time = Date.now() - phase1Start;
    console.log(`\n✅ Phase 1 complete in ${phase1Time}ms`);
    console.log('');
    
    // ============================================
    // PHASE 2: UNDERSTANDING
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧠 PHASE 2: SEMANTIC UNDERSTANDING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const phase2Start = Date.now();
    
    // 2.1 Component Analysis
    stepStart = Date.now();
    const componentAnalysis = this.componentAnalyzer.analyzeComponents(
      parsedFiles,
      dependencyGraphResult
    );
    breakdown['2.1 Component Analyzer'] = Date.now() - stepStart;
    
    // 2.2 Behavior Inference
    stepStart = Date.now();
    const behaviorAnalysis = this.behaviorInference.analyzeBehaviors(
      componentAnalysis,
      parsedFiles
    );
    breakdown['2.2 Behavior Inference'] = Date.now() - stepStart;
    
    // 2.3 Form Intelligence
    stepStart = Date.now();
    const formAnalysis = this.formIntelligence.analyzeForms(
      componentAnalysis,
      parsedFiles
    );
    breakdown['2.3 Form Intelligence'] = Date.now() - stepStart;
    
    // 2.4 State Detection
    stepStart = Date.now();
    const stateAnalysis = this.stateDetector.analyzeState(
      parsedFiles,
      projectMetadata.framework
    );
    breakdown['2.4 State Detector'] = Date.now() - stepStart;
    
    // 2.5 API Mapping
    stepStart = Date.now();
    const apiAnalysis = this.apiMapper.analyzeAPIs(
      parsedFiles,
      stateAnalysis
    );
    breakdown['2.5 API Mapper'] = Date.now() - stepStart;
    
    // 2.6 Navigation Mapping
    stepStart = Date.now();
    const navigationAnalysis = await this.navigationMapper.analyzeNavigation(
      parsedFiles,
      projectMetadata
    );
    breakdown['2.6 Navigation Mapper'] = Date.now() - stepStart;
    
    // 2.7 Selector Extraction
    stepStart = Date.now();
    const selectorAnalysis = this.selectorExtractor.extractSelectors(parsedFiles);
    breakdown['2.7 Selector Extractor'] = Date.now() - stepStart;
    
    // 2.8 Domain Detection (v4 - semantic entities, flows, clusters)
    stepStart = Date.now();
    const domainAnalysis = this.domainDetector.analyzeDomain(
      parsedFiles,
      navigationAnalysis,
      apiAnalysis,
      formAnalysis
    );
    breakdown['2.8 Domain Detector'] = Date.now() - stepStart;
    
    const phase2Time = Date.now() - phase2Start;
    console.log(`\n✅ Phase 2 complete in ${phase2Time}ms`);
    console.log('');
    
    // ============================================
    // SUMMARY
    // ============================================
    const totalTime = Date.now() - totalStart;
    
    const summary = this.buildSummary(
      projectMetadata,
      componentAnalysis,
      formAnalysis,
      stateAnalysis,
      apiAnalysis,
      navigationAnalysis,
      selectorAnalysis,
      behaviorAnalysis
    );
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ANALYSIS SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   App: ${summary.name} (${summary.framework})`);
    console.log(`   Files: ${summary.totalFiles} | Components: ${summary.totalComponents}`);
    console.log(`   Routes: ${summary.totalRoutes} | Forms: ${summary.totalForms}`);
    console.log(`   APIs: ${summary.totalAPIEndpoints}`);
    console.log(`   Selector Coverage: ${(summary.selectorCoverage * 100).toFixed(1)}%`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      projectMetadata,
      parsedFiles,
      dependencyGraph: dependencyGraphResult,
      componentAnalysis,
      behaviorAnalysis,
      formAnalysis,
      stateAnalysis,
      apiAnalysis,
      navigationAnalysis,
      selectorAnalysis,
      domainAnalysis,
      summary,
      timing: {
        phase1_extraction: phase1Time,
        phase2_understanding: phase2Time,
        total: totalTime,
        breakdown,
      },
    };
  }
  
  /**
   * Build application summary
   */
  private buildSummary(
    project: ProjectMetadata,
    components: ComponentAnalysis,
    forms: FormAnalysis,
    state: StateAnalysis,
    api: APIAnalysis,
    navigation: NavigationAnalysis,
    selectors: SelectorAnalysis,
    behaviors: BehaviorAnalysis
  ): ApplicationSummary {
    // Check for auth
    const hasAuth = 
      navigation.guards.length > 0 ||
      behaviors.behaviorCatalog.some(b => b.tag.includes('auth')) ||
      state.contexts.some(c => c.name.toLowerCase().includes('auth'));
    
    // Check for forms with validation
    const hasFormsWithValidation = forms.forms.some(f => f.hasClientValidation);
    
    // Check for CRUD
    const hasCRUDOperations = api.endpoints.some(e => 
      e.method === 'POST' || e.method === 'PUT' || e.method === 'DELETE'
    );
    
    // Check for data fetching
    const hasDataFetching = 
      state.queries.length > 0 ||
      api.endpoints.some(e => e.method === 'GET');
    
    return {
      name: project.name,
      framework: project.framework.name,
      router: project.framework.router,
      stateManagement: project.framework.stateManagement,
      totalFiles: project.sourceFiles.length,
      totalComponents: components.statistics.totalComponents,
      totalRoutes: navigation.statistics.totalRoutes,
      totalForms: forms.statistics.totalForms,
      totalAPIEndpoints: api.statistics.totalEndpoints,
      hasAuth,
      hasFormsWithValidation,
      hasCRUDOperations,
      hasDataFetching,
      selectorCoverage: selectors.statistics.coverageScore,
      interactiveElements: selectors.statistics.interactiveElements,
    };
  }
  
  /**
   * Build AI prompt context from discovery result
   * v4: Now includes rich domain analysis with entities, flows, and clusters
   */
  buildAIContext(result: DiscoveryResult): string {
    const { summary, domainAnalysis, formAnalysis, navigationAnalysis } = result;
    
    // v4: Use semantic summary from domain analysis as primary context
    let context = domainAnalysis.semanticSummary;
    
    // Add tech stack info
    context += `\n## Tech Stack\n`;
    context += `- Framework: ${summary.framework}\n`;
    context += `- Router: ${summary.router || 'Custom/None'}\n`;
    context += `- State Management: ${summary.stateManagement.join(', ') || 'Local state only'}\n\n`;
    
    // v4.1: Add MANDATORY FEATURE CLUSTERS - AI MUST cover each one
    if (domainAnalysis.featureClusters && domainAnalysis.featureClusters.length > 0) {
      context += `## MANDATORY FEATURE CLUSTERS (MUST generate at least 1 suite per cluster)\n`;
      context += `Total clusters: ${domainAnalysis.featureClusters.length}\n\n`;
      
      for (const cluster of domainAnalysis.featureClusters) {
        context += `### ${cluster.name} [Priority: ${cluster.testPriority}]\n`;
        context += `Description: ${cluster.description}\n`;
        context += `Suggested tests: ${cluster.suggestedTestCount}\n`;
        
        if (cluster.routes && cluster.routes.length > 0) {
          context += `Routes to cover: ${cluster.routes.join(', ')}\n`;
        }
        if (cluster.entities && cluster.entities.length > 0) {
          context += `Entities involved: ${cluster.entities.join(', ')}\n`;
        }
        if (cluster.suggestedScenarios && cluster.suggestedScenarios.length > 0) {
          context += `Required scenarios:\n`;
          for (const scenario of cluster.suggestedScenarios) {
            context += `  - ${scenario}\n`;
          }
        }
        context += '\n';
      }
    }
    
    // v4.1: Add ALL ROUTES grouped by category - ensure complete coverage
    if (navigationAnalysis.routes.length > 0) {
      context += `## ALL ROUTES - MUST HAVE TEST COVERAGE (${navigationAnalysis.routes.length} total)\n`;
      
      // Group routes by path prefix for better organization
      const routeGroups = new Map<string, typeof navigationAnalysis.routes>();
      for (const route of navigationAnalysis.routes) {
        const prefix = this.getRoutePrefix(route.path);
        if (!routeGroups.has(prefix)) {
          routeGroups.set(prefix, []);
        }
        routeGroups.get(prefix)!.push(route);
      }
      
      for (const [prefix, routes] of routeGroups) {
        context += `\n### ${prefix || 'Root'} routes (${routes.length})\n`;
        for (const route of routes) {
          context += `- ${route.path}`;
          if (route.isProtected) context += ' [PROTECTED]';
          if (route.isDynamic) context += ' [DYNAMIC]';
          context += '\n';
        }
      }
      context += '\n';
    }
    
    // Add forms detail
    if (formAnalysis.forms.length > 0) {
      context += `## Forms Detail\n`;
      for (const form of formAnalysis.forms.slice(0, 10)) {
        context += `- ${form.name} (${form.fields.length} fields)\n`;
        for (const field of form.fields.slice(0, 5)) {
          context += `  - ${field.name}: ${field.type}${field.isRequired ? ' (required)' : ''}`;
          if (field.selector?.primary) {
            context += ` [selector: ${field.selector.primary}]`;
          }
          context += '\n';
        }
      }
      context += '\n';
    }
    
    return context;
  }
  
  /**
   * Extract route prefix for grouping
   */
  private getRoutePrefix(path: string): string {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'home';
    
    // Handle common patterns
    const first = segments[0];
    if (['sign-in', 'sign-up', 'signin', 'signup', 'login', 'register', 'password-reset'].includes(first)) {
      return 'auth';
    }
    if (first === 'dashboard') return 'dashboard';
    if (first === 'api') return 'api';
    
    return first;
  }
}
