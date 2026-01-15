import { Injectable, Logger } from '@nestjs/common';
import { CodeIntelligenceService } from './code-intelligence.service';
import { PatternRecognizerService } from './pattern-recognizer.service';
import { GraphFlowAnalyzerService } from './graph-flow-analyzer.service';
import { AIProviderService } from '../../../services/ai-provider.service';
import { TestSuite, TestCase, TestStep } from '../smart-journey-discovery.service';
import { ComponentAnalysis, RouteInfo } from './types/intelligence.types';
import { FlowPath } from './types/graph.types';

/**
 * Domain represents a discovered feature area in the application
 * Entirely inferred from code analysis, never hardcoded
 */
interface InferredDomain {
  name: string;           // e.g., "Bank Accounts", "Transactions" - inferred from routes/components
  slug: string;           // e.g., "bank-accounts" - URL-safe version
  routes: string[];       // Routes belonging to this domain
  components: string[];   // Components belonging to this domain  
  flows: FlowPath[];      // User flows in this domain
  characteristics: DomainCharacteristics;
}

interface DomainCharacteristics {
  hasAuth: boolean;       // Contains login/signup/auth patterns
  hasForms: boolean;      // Contains form submissions
  hasCRUD: boolean;       // Contains create/read/update/delete operations
  hasNavigation: boolean; // Contains navigation between views
  isProtected: boolean;   // Requires authentication
  complexity: 'simple' | 'moderate' | 'complex';
}

@Injectable()
export class HolisticSynthesizerService {
  private readonly logger = new Logger(HolisticSynthesizerService.name);

  constructor(
    private readonly codeIntelligence: CodeIntelligenceService,
    private readonly patternRecognizer: PatternRecognizerService,
    private readonly graphFlowAnalyzer: GraphFlowAnalyzerService,
    private readonly aiProvider: AIProviderService,
  ) {}

  /**
   * Main synthesis: analyze workspace and generate test suites
   * Fully dynamic - all names, categories, and structures are inferred from code
   */
  async synthesize(workspacePath: string): Promise<TestSuite[]> {
    this.logger.log(`🔍 Starting holistic analysis of ${workspacePath}`);

    try {
      // Step 1: Code Intelligence - Extract all components, routes, APIs
      const components = await this.codeIntelligence.analyzeWorkspace(workspacePath);
      this.logger.log(`✅ Analyzed ${components.length} components`);

      const routes = this.codeIntelligence.extractRoutes(components);
      this.logger.log(`✅ Extracted ${routes.length} routes`);

      const apiCalls = this.codeIntelligence.extractAPIPatterns(components);
      this.logger.log(`✅ Found ${apiCalls.length} API calls`);
      
      const totalForms = components.reduce((sum, c) => sum + c.jsx.forms.length, 0);
      const totalLinks = components.reduce((sum, c) => sum + c.jsx.links.length, 0);
      this.logger.log(`✅ Found ${totalForms} forms, ${totalLinks} links`);

      // Step 2: Build navigation graph with universal links
      const universalLinks = this.codeIntelligence.getUniversalLinks();
      this.logger.log(`✅ Found ${universalLinks.length} universal navigation points`);
      
      const navGraph = this.graphFlowAnalyzer.buildNavigationGraphWithUniversalLinks(
        components, 
        routes, 
        universalLinks
      );
      
      // Step 3: Discover ALL user flows dynamically
      const entryPoints = this.discoverEntryPoints(routes, universalLinks);
      this.logger.log(`✅ Discovered ${entryPoints.length} entry points: ${entryPoints.join(', ')}`);
      
      const userFlows = this.graphFlowAnalyzer.discoverUserFlows(navGraph, entryPoints);
      this.logger.log(`✅ Discovered ${userFlows.length} user flows`);

      // Step 4: Infer domains from flows and routes (NO HARDCODING)
      const domains = this.inferDomains(userFlows, routes, components, apiCalls);
      this.logger.log(`✅ Inferred ${domains.length} domains: ${domains.map(d => d.name).join(', ')}`);

      // Step 5: Generate test suites from inferred domains
      const suites = this.generateSuitesFromDomains(domains, components);
      this.logger.log(`✅ Generated ${suites.length} test suites`);

      // Step 6: Enrich with metadata
      const enriched = this.enrichWithMetadata(suites, components);
      
      return enriched;
    } catch (error) {
      this.logger.error(`Failed to synthesize: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Discover entry points dynamically from routes and links
   * No hardcoded ['/signin', '/signup'] - infers from actual data
   */
  private discoverEntryPoints(routes: RouteInfo[], universalLinks: any[]): string[] {
    const entryPoints = new Set<string>();
    
    // Root is always an entry point
    entryPoints.add('/');
    
    // Public routes are entry points
    for (const route of routes) {
      if (!route.isProtected) {
        entryPoints.add(route.path);
      }
    }
    
    // Routes that look like entry points based on path analysis
    const entryPatterns = [
      /^\/(sign-?in|login|auth)$/i,
      /^\/(sign-?up|register|join)$/i,
      /^\/(home|dashboard|main)$/i,
      /^\/$/,
    ];
    
    for (const route of routes) {
      if (entryPatterns.some(p => p.test(route.path))) {
        entryPoints.add(route.path);
      }
    }
    
    // Also check universal links for entry-like destinations
    for (const link of universalLinks) {
      if (entryPatterns.some(p => p.test(link.href))) {
        entryPoints.add(link.href);
      }
    }
    
    return [...entryPoints];
  }

  /**
   * Infer application domains from flows - FULLY DYNAMIC
   * Groups related routes/flows into logical feature areas
   */
  private inferDomains(
    flows: FlowPath[], 
    routes: RouteInfo[], 
    components: ComponentAnalysis[],
    apiCalls: any[]
  ): InferredDomain[] {
    const domainMap = new Map<string, InferredDomain>();
    
    // Strategy 1: Group by route prefix (e.g., /bankaccounts/* → "Bank Accounts")
    const routePrefixes = this.extractRoutePrefixes(routes, flows);
    
    for (const [prefix, prefixRoutes] of routePrefixes.entries()) {
      const domainName = this.inferDomainName(prefix, prefixRoutes, components);
      const slug = this.slugify(domainName);
      
      if (!domainMap.has(slug)) {
        domainMap.set(slug, {
          name: domainName,
          slug,
          routes: [],
          components: [],
          flows: [],
          characteristics: this.initCharacteristics(),
        });
      }
      
      const domain = domainMap.get(slug)!;
      domain.routes.push(...prefixRoutes);
    }
    
    // Strategy 2: Assign flows to domains based on routes they touch
    for (const flow of flows) {
      const domainSlug = this.findDomainForFlow(flow, domainMap);
      if (domainSlug && domainMap.has(domainSlug)) {
        domainMap.get(domainSlug)!.flows.push(flow);
      } else {
        // Create new domain from flow if no match
        const newDomain = this.createDomainFromFlow(flow, components);
        if (newDomain && !domainMap.has(newDomain.slug)) {
          domainMap.set(newDomain.slug, newDomain);
        } else if (newDomain && domainMap.has(newDomain.slug)) {
          domainMap.get(newDomain.slug)!.flows.push(flow);
        }
      }
    }
    
    // Strategy 3: Analyze characteristics for each domain
    for (const domain of domainMap.values()) {
      domain.characteristics = this.analyzeCharacteristics(domain, components, apiCalls);
      domain.components = this.findComponentsForDomain(domain, components);
    }
    
    // Filter out empty domains
    const domains = [...domainMap.values()].filter(
      d => d.flows.length > 0 || d.routes.length > 0
    );
    
    return domains;
  }

  /**
   * Extract route prefixes for grouping
   */
  private extractRoutePrefixes(routes: RouteInfo[], flows: FlowPath[]): Map<string, string[]> {
    const prefixMap = new Map<string, string[]>();
    
    // Collect all unique paths from routes and flows
    const allPaths = new Set<string>();
    routes.forEach(r => allPaths.add(r.path));
    flows.forEach(f => f.nodes.forEach(n => allPaths.add(n)));
    
    for (const path of allPaths) {
      const prefix = this.getRoutePrefix(path);
      if (!prefixMap.has(prefix)) {
        prefixMap.set(prefix, []);
      }
      prefixMap.get(prefix)!.push(path);
    }
    
    return prefixMap;
  }

  /**
   * Get the prefix/domain from a route path
   */
  private getRoutePrefix(path: string): string {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return 'home';
    
    // Skip dynamic segments
    const firstStatic = parts.find(p => !p.startsWith(':') && !p.startsWith('['));
    return firstStatic || parts[0] || 'home';
  }

  /**
   * Infer a human-readable domain name from route prefix
   */
  private inferDomainName(prefix: string, routes: string[], components: ComponentAnalysis[]): string {
    // Try to find a matching component name for better naming
    const relatedComponent = components.find(c => 
      c.name.toLowerCase().includes(prefix.toLowerCase()) ||
      prefix.toLowerCase().includes(c.name.toLowerCase().replace(/container|page|view|component/gi, ''))
    );
    
    if (relatedComponent) {
      // Extract clean name from component
      return this.cleanComponentName(relatedComponent.name);
    }
    
    // Convert prefix to title case
    return this.prefixToTitle(prefix);
  }

  /**
   * Clean component name for display
   */
  private cleanComponentName(name: string): string {
    return name
      .replace(/Container|Page|View|Component|Screen|Form$/g, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2') // CamelCase to spaces
      .trim();
  }

  /**
   * Convert route prefix to title
   */
  private prefixToTitle(prefix: string): string {
    return prefix
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Create URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Initialize empty characteristics
   */
  private initCharacteristics(): DomainCharacteristics {
    return {
      hasAuth: false,
      hasForms: false,
      hasCRUD: false,
      hasNavigation: false,
      isProtected: false,
      complexity: 'simple',
    };
  }

  /**
   * Find which domain a flow belongs to
   * Prioritizes specific domains over generic ones like 'home'
   */
  private findDomainForFlow(flow: FlowPath, domainMap: Map<string, InferredDomain>): string | null {
    // Find the most specific (non-root) route in the flow
    const specificRoutes = flow.nodes.filter(n => n !== '/' && n.length > 1);
    
    if (specificRoutes.length === 0) {
      return 'home'; // Only has root route
    }
    
    // Extract primary prefix from the most specific route (usually the destination)
    const primaryRoute = specificRoutes[specificRoutes.length - 1]; // Last non-root node
    const primaryPrefix = this.getRoutePrefix(primaryRoute);
    const primarySlug = this.slugify(this.prefixToTitle(primaryPrefix));
    
    // Try exact match first
    if (domainMap.has(primarySlug)) {
      return primarySlug;
    }
    
    // Try partial match on slug
    for (const [slug, domain] of domainMap.entries()) {
      if (slug === 'home') continue; // Skip home for partial matching
      
      // Check if domain slug is part of primary prefix or vice versa
      if (primarySlug.includes(slug) || slug.includes(primarySlug)) {
        return slug;
      }
      
      // Check if any route in flow matches this domain's routes
      for (const node of specificRoutes) {
        const nodePrefix = this.getRoutePrefix(node);
        if (nodePrefix === slug.replace(/-/g, '')) {
          return slug;
        }
      }
    }
    
    // If no specific match, return null to create new domain
    return null;
  }

  /**
   * Create a new domain from a flow that doesn't match existing domains
   */
  private createDomainFromFlow(flow: FlowPath, components: ComponentAnalysis[]): InferredDomain | null {
    if (flow.nodes.length === 0) return null;
    
    // Extract domain name from flow's primary route
    const primaryRoute = flow.nodes.find(n => n !== '/') || flow.nodes[0];
    const prefix = this.getRoutePrefix(primaryRoute);
    const name = this.prefixToTitle(prefix);
    
    return {
      name,
      slug: this.slugify(name),
      routes: [...flow.nodes],
      components: [],
      flows: [flow],
      characteristics: this.initCharacteristics(),
    };
  }

  /**
   * Analyze domain characteristics from its flows and routes
   */
  private analyzeCharacteristics(
    domain: InferredDomain, 
    components: ComponentAnalysis[],
    apiCalls: any[]
  ): DomainCharacteristics {
    const chars = this.initCharacteristics();
    
    // Check for auth patterns in routes
    const authPatterns = /sign-?in|sign-?up|login|logout|register|auth|password|reset/i;
    chars.hasAuth = domain.routes.some(r => authPatterns.test(r));
    
    // Check for forms in related components
    const domainComponents = components.filter(c =>
      domain.routes.some(r => 
        c.name.toLowerCase().includes(this.getRoutePrefix(r).toLowerCase())
      )
    );
    chars.hasForms = domainComponents.some(c => c.jsx.forms.length > 0);
    
    // Check for CRUD operations in API calls
    const domainApis = apiCalls.filter(api =>
      domain.routes.some(r => api.endpoint?.includes(this.getRoutePrefix(r)))
    );
    chars.hasCRUD = domainApis.some(api => 
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(api.method)
    ) || domain.routes.some(r => /\/new|\/edit|\/create|\/update|\/delete/i.test(r));
    
    // Check for navigation (multiple routes)
    chars.hasNavigation = domain.routes.length > 1 || domain.flows.length > 1;
    
    // Check if protected
    chars.isProtected = domain.flows.some(f => f.metadata?.isProtected);
    
    // Determine complexity
    const score = (
      (chars.hasAuth ? 2 : 0) +
      (chars.hasForms ? 1 : 0) +
      (chars.hasCRUD ? 2 : 0) +
      (domain.flows.length > 3 ? 1 : 0) +
      (domain.routes.length > 5 ? 1 : 0)
    );
    chars.complexity = score >= 4 ? 'complex' : score >= 2 ? 'moderate' : 'simple';
    
    return chars;
  }

  /**
   * Find components that belong to a domain
   */
  private findComponentsForDomain(domain: InferredDomain, components: ComponentAnalysis[]): string[] {
    const domainComponents = new Set<string>();
    
    for (const component of components) {
      // Check if component name matches domain
      const nameMatch = domain.slug.split('-').some(part =>
        component.name.toLowerCase().includes(part)
      );
      
      // Check if component has routes in this domain
      const routeMatch = component.jsx.links.some(link =>
        domain.routes.includes(link.href)
      );
      
      if (nameMatch || routeMatch) {
        domainComponents.add(component.name);
      }
    }
    
    return [...domainComponents];
  }

  /**
   * Generate test suites from inferred domains - FULLY DYNAMIC
   * All names, categories, priorities, tags derived from actual code analysis
   */
  private generateSuitesFromDomains(domains: InferredDomain[], components: ComponentAnalysis[]): TestSuite[] {
    const suites: TestSuite[] = [];
    const timestamp = Date.now();
    
    for (const domain of domains) {
      // Skip domains with no flows
      if (domain.flows.length === 0) continue;
      
      const suiteId = `suite-${domain.slug}-${timestamp}`;
      const testCases = this.generateTestCasesForDomain(domain, suiteId, components);
      
      // Skip if no test cases generated
      if (testCases.length === 0) continue;
      
      // All values are dynamically inferred from the domain
      const priority = this.inferPriority(domain);
      const category = this.inferCategory(domain);
      const tags = this.extractTags(domain);
      const complexity = this.inferComplexity(domain);
      const characteristics = this.extractCharacteristicsAsStrings(domain);
      const description = this.generateDomainDescription(domain);
      
      suites.push({
        id: suiteId,
        name: domain.name,
        description,
        category,
        priority,
        tags,
        testCases,
        stats: {
          totalCases: testCases.length,
          totalSteps: testCases.reduce((sum, c) => sum + c.steps.length, 0),
          estimatedDuration: this.estimateDuration(domain, testCases),
          complexity,
        },
        metadata: {
          components: domain.components,
          routes: domain.routes,
          apis: [],
          generatedFrom: 'universal-discovery',
          characteristics,
        },
      });
    }
    
    return suites;
  }

  /**
   * Generate test cases for a domain - all values dynamically derived
   */
  private generateTestCasesForDomain(
    domain: InferredDomain, 
    suiteId: string,
    components: ComponentAnalysis[]
  ): TestCase[] {
    const cases: TestCase[] = [];
    
    for (const flow of domain.flows) {
      const caseId = `case-${domain.slug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate dynamic case name from flow
      const caseName = this.generateCaseNameFromFlow(flow, domain);
      
      // Generate steps from flow
      const steps = this.generateStepsFromFlow(flow, caseId, components);
      
      // Infer priority from flow confidence
      const priority = this.inferCasePriority(flow);
      
      // Extract tags from flow
      const tags = this.extractFlowTags(flow, domain);
      
      // Infer flow type
      const flowType = this.inferFlowType(flow);
      
      cases.push({
        id: caseId,
        suiteId,
        name: caseName,
        description: `Test flow: ${flow.nodes.join(' → ')}`,
        priority,
        tags,
        status: 'pending',
        steps,
        metadata: {
          components: domain.components,
          apis: [],
          selectors: flow.selectors || [],
          estimatedDuration: steps.length * 5,
          flowType,
        },
      });
    }
    
    return cases;
  }
  
  /**
   * Infer case priority from flow
   */
  private inferCasePriority(flow: FlowPath): string {
    if (flow.confidence >= 0.8 && flow.metadata?.hasForm) return 'critical';
    if (flow.confidence >= 0.8) return 'high';
    if (flow.confidence >= 0.5) return 'medium';
    return 'low';
  }
  
  /**
   * Extract tags from flow
   */
  private extractFlowTags(flow: FlowPath, domain: InferredDomain): string[] {
    const tags: string[] = [];
    
    if (flow.metadata?.hasForm) tags.push('form');
    if (flow.metadata?.isProtected) tags.push('protected');
    if (flow.metadata?.hasCRUD) tags.push('crud');
    
    // Add route-based tags
    for (const node of flow.nodes) {
      const prefix = this.getRoutePrefix(node);
      if (prefix && prefix !== 'home' && !tags.includes(prefix)) {
        tags.push(prefix);
      }
    }
    
    return tags.slice(0, 5);
  }
  
  /**
   * Infer flow type from characteristics
   */
  private inferFlowType(flow: FlowPath): string {
    if (flow.metadata?.hasForm && flow.category?.includes('auth')) return 'authentication-flow';
    if (flow.metadata?.hasForm) return 'form-submission-flow';
    if (flow.metadata?.hasCRUD) return 'data-operation-flow';
    if (flow.nodes.length > 3) return 'multi-step-flow';
    return 'navigation-flow';
  }

  /**
   * Generate case name from flow - DYNAMIC
   */
  private generateCaseNameFromFlow(flow: FlowPath, domain: InferredDomain): string {
    // Use flow's purpose if available
    if (flow.purpose && flow.purpose !== `Navigate: ${flow.nodes.join(' → ')}`) {
      return flow.purpose;
    }
    
    // Generate from entry/exit points
    const entry = this.routeToReadable(flow.entryPoint);
    const exit = this.routeToReadable(flow.exitPoint);
    
    if (entry === exit) {
      return `${domain.name} - ${entry}`;
    }
    
    return `${entry} to ${exit}`;
  }

  /**
   * Convert route to readable text
   */
  private routeToReadable(route: string): string {
    if (route === '/') return 'Home';
    
    const parts = route.split('/').filter(Boolean);
    return parts
      .map(p => p.startsWith(':') ? 'Details' : this.prefixToTitle(p))
      .join(' ');
  }

  /**
   * Generate test steps from flow
   */
  private generateStepsFromFlow(flow: FlowPath, caseId: string, components: ComponentAnalysis[]): TestStep[] {
    const steps: TestStep[] = [];
    
    for (let i = 0; i < flow.nodes.length; i++) {
      const node = flow.nodes[i];
      const stepId = `step-${caseId}-${i}`;
      
      if (i === 0) {
        // Initial navigation
        steps.push({
          id: stepId,
          caseId,
          index: i,
          action: 'navigate',
          target: node,
          description: `Navigate to ${this.routeToReadable(node)}`,
          selector: node,
        });
      } else {
        // Click to navigate
        const edge = flow.edges?.[i - 1];
        const trigger = edge?.data?.trigger || `Navigate to ${node}`;
        const selector = flow.selectors?.[i - 1] || `a[href="${node}"]`;
        
        steps.push({
          id: `${stepId}-click`,
          caseId,
          index: steps.length,
          action: 'click',
          target: trigger,
          description: trigger,
          selector,
        });
        
        // Verify navigation
        steps.push({
          id: `${stepId}-verify`,
          caseId,
          index: steps.length,
          action: 'verify',
          target: node,
          description: `Verify navigated to ${this.routeToReadable(node)}`,
          assertions: [`URL contains "${node}"`],
        });
      }
    }
    
    // Add form interaction steps if flow has forms
    if (flow.metadata?.hasForm) {
      const formComponent = components.find(c => 
        flow.nodes.some(n => c.name.toLowerCase().includes(this.getRoutePrefix(n).toLowerCase())) &&
        c.jsx.forms.length > 0
      );
      
      if (formComponent && formComponent.jsx.forms[0]) {
        const form = formComponent.jsx.forms[0];
        for (const field of form.fields) {
          steps.push({
            id: `step-${caseId}-fill-${field.name}`,
            caseId,
            index: steps.length,
            action: 'fill',
            target: field.name,
            value: this.generateTestValue(field),
            description: `Enter ${field.label || field.name}`,
            selector: field.selector || `[name="${field.name}"]`,
          });
        }
        
        steps.push({
          id: `step-${caseId}-submit`,
          caseId,
          index: steps.length,
          action: 'submit',
          target: 'form',
          description: 'Submit form',
          selector: form.submitButton || 'button[type="submit"]',
        });
      }
    }
    
    return steps;
  }

  /**
   * Generate appropriate test value for a form field
   */
  private generateTestValue(field: any): string {
    const name = field.name.toLowerCase();
    const type = field.type?.toLowerCase() || 'text';
    
    // Generate contextual test data based on field name/type
    if (name.includes('email')) return 'test@example.com';
    if (name.includes('password')) return 'TestPassword123!';
    if (name.includes('phone')) return '555-123-4567';
    if (name.includes('name')) return 'Test User';
    if (name.includes('amount') || type === 'number') return '100';
    if (name.includes('date') || type === 'date') return '2024-01-15';
    if (name.includes('url')) return 'https://example.com';
    
    return `test-${field.name}`;
  }

  /**
   * Infer priority dynamically based on domain analysis
   * Returns descriptive priority string, not hardcoded enum
   */
  private inferPriority(domain: InferredDomain): string {
    const chars = domain.characteristics;
    
    // Calculate priority score based on characteristics
    let score = 0;
    
    if (chars.hasAuth) score += 40;
    if (chars.hasCRUD) score += 25;
    if (chars.isProtected) score += 15;
    if (chars.hasForms) score += 15;
    if (chars.complexity === 'complex') score += 10;
    else if (chars.complexity === 'moderate') score += 5;
    
    // Add score based on flow count
    score += Math.min(domain.flows.length * 3, 15);
    
    // Convert score to priority level
    if (score >= 50) return 'critical';
    if (score >= 35) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }

  /**
   * Infer category dynamically from domain - NO hardcoded values
   * Category is derived from what we actually found in the code
   */
  private inferCategory(domain: InferredDomain): string {
    // Just use the domain slug as category - it's already derived from actual code
    return domain.slug;
  }
  
  /**
   * Extract tags dynamically from domain characteristics
   */
  private extractTags(domain: InferredDomain): string[] {
    const tags: string[] = [];
    const chars = domain.characteristics;
    
    if (chars.hasAuth) tags.push('authentication', 'security');
    if (chars.hasCRUD) tags.push('data', 'crud');
    if (chars.hasForms) tags.push('forms', 'user-input');
    if (chars.hasNavigation) tags.push('navigation');
    if (chars.isProtected) tags.push('protected', 'requires-auth');
    
    // Add complexity tag
    tags.push(`complexity-${chars.complexity}`);
    
    // Add domain-specific tags from routes
    for (const route of domain.routes.slice(0, 5)) {
      const parts = route.split('/').filter(Boolean);
      for (const part of parts) {
        if (!part.startsWith(':') && part.length > 2 && !tags.includes(part)) {
          tags.push(part);
        }
      }
    }
    
    return [...new Set(tags)].slice(0, 10); // Dedupe and limit
  }
  
  /**
   * Infer complexity string from domain
   */
  private inferComplexity(domain: InferredDomain): string {
    const chars = domain.characteristics;
    const flowCount = domain.flows.length;
    const routeCount = domain.routes.length;
    
    if (chars.complexity === 'complex' || flowCount > 5 || routeCount > 10) {
      return 'complex';
    }
    if (chars.complexity === 'moderate' || flowCount > 2 || routeCount > 5) {
      return 'moderate';
    }
    return 'simple';
  }
  
  /**
   * Extract characteristics as string array for metadata
   */
  private extractCharacteristicsAsStrings(domain: InferredDomain): string[] {
    const result: string[] = [];
    const chars = domain.characteristics;
    
    if (chars.hasAuth) result.push('has-authentication');
    if (chars.hasCRUD) result.push('has-crud-operations');
    if (chars.hasForms) result.push('has-forms');
    if (chars.hasNavigation) result.push('has-navigation');
    if (chars.isProtected) result.push('is-protected');
    
    return result;
  }

  /**
   * Generate domain description dynamically
   */
  private generateDomainDescription(domain: InferredDomain): string {
    const parts: string[] = [];
    
    if (domain.characteristics.hasAuth) {
      parts.push('user authentication');
    }
    if (domain.characteristics.hasCRUD) {
      parts.push('data operations');
    }
    if (domain.characteristics.hasForms) {
      parts.push('form submissions');
    }
    if (domain.characteristics.hasNavigation) {
      parts.push('navigation flows');
    }
    
    if (parts.length === 0) {
      return `Test suite for ${domain.name}`;
    }
    
    return `Test suite covering ${parts.join(', ')} in ${domain.name}`;
  }

  /**
   * Estimate test duration based on domain and cases
   */
  private estimateDuration(domain: InferredDomain, cases: TestCase[]): number {
    let baseTime = cases.reduce((sum, c) => sum + c.steps.length * 5, 0);
    
    // Add time for complex operations
    if (domain.characteristics.hasAuth) baseTime += 30;
    if (domain.characteristics.hasForms) baseTime += 20;
    if (domain.characteristics.hasCRUD) baseTime += 25;
    
    return baseTime;
  }

  /**
   * Enrich suites with metadata from component analysis
   */
  private enrichWithMetadata(suites: TestSuite[], components: ComponentAnalysis[]): TestSuite[] {
    for (const suite of suites) {
      for (const testCase of suite.testCases) {
        // Enrich steps with real selectors from components
        for (const step of testCase.steps) {
          if (step.action === 'fill' && step.target) {
            // Find component that might have this form field
            for (const component of components) {
              for (const form of component.jsx.forms) {
                const field = form.fields.find(f => f.name === step.target);
                if (field && field.selector) {
                  step.selector = field.selector;
                  break;
                }
              }
            }
          }
        }
      }
    }

    return suites;
  }
}
