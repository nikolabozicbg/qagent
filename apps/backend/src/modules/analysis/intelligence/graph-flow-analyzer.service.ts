import { Injectable, Logger } from '@nestjs/common';
import { GraphUtils } from './algorithms/graph-utils';
import { DFSAlgorithm } from './algorithms/dfs';
import { ComponentAnalysis, RouteInfo, LinkInfo } from './types/intelligence.types';
import { NavigationGraphNode, NavigationGraphEdge, FlowPath } from './types/graph.types';

/**
 * Graph-Based Flow Analyzer
 * Uses DSA algorithms to discover user navigation flows
 */
@Injectable()
export class GraphFlowAnalyzerService {
  private readonly logger = new Logger(GraphFlowAnalyzerService.name);

  /**
   * Build navigation graph with universal navigation links
   */
  buildNavigationGraphWithUniversalLinks(
    components: ComponentAnalysis[],
    routes: RouteInfo[],
    universalLinks: LinkInfo[],
  ): GraphUtils<NavigationGraphNode, NavigationGraphEdge> {
    // STEP 1: Create synthetic routes from universal links
    const syntheticRoutes = this.createSyntheticRoutes(universalLinks, routes);
    const allRoutes = [...routes, ...syntheticRoutes];
    this.logger.log(`Created ${syntheticRoutes.length} synthetic routes from universal links`);
    
    // STEP 2: Build base graph with all routes (including synthetic)
    const graph = this.buildNavigationGraph(components, allRoutes);
    
    // STEP 3: Add edges from universal links
    // Key insight: we don't need to match component->route, just add edges for all links
    for (const link of universalLinks) {
      const href = link.href;
      
      // Create edges from entry points to this link destination
      const entryPoints = ['/', '/signin', '/signup'];
      for (const entry of entryPoints) {
        if (graph.hasNode(entry) && graph.hasNode(href)) {
          const edge: NavigationGraphEdge = {
            trigger: `click "${link.text}"`,
            userAction: true,
          };
          if (!graph.hasEdge(entry, href)) {
            graph.addEdge(entry, href, 1, 'navigation', edge);
          }
        }
      }
      
      // Also create edges between universal link destinations
      for (const otherLink of universalLinks) {
        if (link.href !== otherLink.href && graph.hasNode(link.href) && graph.hasNode(otherLink.href)) {
          const edge: NavigationGraphEdge = {
            trigger: `click "${otherLink.text}"`,
            userAction: true,
          };
          if (!graph.hasEdge(link.href, otherLink.href)) {
            graph.addEdge(link.href, otherLink.href, 1, 'navigation', edge);
          }
        }
      }
    }
    
    this.logger.log(`Graph enhanced with universal links: ${graph.nodeCount()} nodes, ${graph.edgeCount()} edges`);
    return graph;
  }

  /**
   * Create synthetic routes from universal link destinations
   */
  private createSyntheticRoutes(links: LinkInfo[], existingRoutes: RouteInfo[]): RouteInfo[] {
    const synthetic: RouteInfo[] = [];
    const existingPaths = new Set(existingRoutes.map(r => r.path));
    
    for (const link of links) {
      const path = link.href;
      
      // Skip if route already exists or is external
      if (existingPaths.has(path) || !link.isInternal) continue;
      if (!path.startsWith('/')) continue;
      
      // Create synthetic route
      synthetic.push({
        path,
        component: this.inferComponentFromPath(path),
        isProtected: this.inferIsProtected(path),
        params: this.extractRouteParams(path),
        queries: [],
        redirects: [],
      });
      
      existingPaths.add(path);
    }
    
    return synthetic;
  }

  /**
   * Infer component name from path
   */
  private inferComponentFromPath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return 'Home';
    
    // Convert path to PascalCase component name
    const name = parts[0]
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');
    
    return `${name}Container`;
  }

  /**
   * Infer if route is protected based on path
   */
  private inferIsProtected(path: string): boolean {
    const publicPaths = ['/signin', '/signup', '/login', '/register', '/'];
    return !publicPaths.includes(path);
  }

  /**
   * Extract route params from path
   */
  private extractRouteParams(path: string): string[] {
    const params: string[] = [];
    const regex = /:([\w]+)/g;
    let match;
    while ((match = regex.exec(path)) !== null) {
      params.push(match[1]);
    }
    return params;
  }

  /**
   * Build navigation graph from components and routes
   */
  buildNavigationGraph(
    components: ComponentAnalysis[],
    routes: RouteInfo[],
  ): GraphUtils<NavigationGraphNode, NavigationGraphEdge> {
    const graph = new GraphUtils<NavigationGraphNode, NavigationGraphEdge>();

    // Add routes as nodes
    for (const route of routes) {
      const routeNode: NavigationGraphNode = {
        route: route.path,
        component: route.component,
        isProtected: route.isProtected,
        hasParams: route.params.length > 0,
        forms: 0,
        apiCalls: 0,
      };

      // Find component analysis to get forms and API calls count
      const componentAnalysis = components.find(c => c.name === route.component);
      if (componentAnalysis) {
        routeNode.forms = componentAnalysis.jsx.forms.length;
        // Count API calls in this component
        routeNode.apiCalls = this.countAPICallsInComponent(componentAnalysis);
      }

      graph.addNode(route.path, routeNode, 'route');
    }

    // Add edges based on Link components
    for (const component of components) {
      const componentRoute = routes.find(r => r.component === component.name);
      if (!componentRoute) continue;

      const fromRoute = componentRoute.path;

      for (const link of component.jsx.links) {
        if (!link.isInternal) continue;

        // Find matching route for this link
        const toRoute = this.findMatchingRoute(link.href, routes);
        if (toRoute && graph.hasNode(toRoute.path)) {
          const edge: NavigationGraphEdge = {
            trigger: `click "${link.text}"`,
            userAction: true,
          };

          if (!graph.hasEdge(fromRoute, toRoute.path)) {
            graph.addEdge(fromRoute, toRoute.path, 1, 'navigation', edge);
          }
        }
      }
    }

    this.logger.log(`Built navigation graph: ${graph.nodeCount()} routes, ${graph.edgeCount()} links`);
    return graph;
  }

  /**
   * Discover user flows using smart DFS with limits
   * Prioritizes meaningful flows over exhaustive enumeration
   */
  discoverUserFlows(
    graph: GraphUtils<NavigationGraphNode, NavigationGraphEdge>,
    entryPoints: string[] = ['/'],
    maxFlowsPerEntry: number = 50,
    maxDepth: number = 3,
  ): FlowPath[] {
    const flows: FlowPath[] = [];
    const MAX_TOTAL_FLOWS = 200; // Hard limit to prevent memory issues

    for (const entryPoint of entryPoints) {
      if (!graph.hasNode(entryPoint)) continue;
      if (flows.length >= MAX_TOTAL_FLOWS) break;

      // Find paths with limited depth to avoid combinatorial explosion
      const paths = DFSAlgorithm.findAllPathsFromStart(graph, entryPoint, maxDepth);
      
      // Take only meaningful paths (prioritize those with forms/protection)
      let pathsFromEntry = 0;
      for (const path of paths) {
        if (pathsFromEntry >= maxFlowsPerEntry) break;
        if (flows.length >= MAX_TOTAL_FLOWS) break;
        
        const flowPath = this.pathToFlow(path, graph);
        if (flowPath) {
          // Prioritize interesting flows
          if (flowPath.metadata?.hasForm || flowPath.metadata?.isProtected || flowPath.metadata?.hasCRUD) {
            flows.unshift(flowPath); // Add to front (higher priority)
          } else {
            flows.push(flowPath);
          }
          pathsFromEntry++;
        }
      }
    }

    // Remove duplicates and limit total
    const uniqueFlows = this.deduplicateFlows(flows).slice(0, MAX_TOTAL_FLOWS);

    this.logger.log(`Discovered ${uniqueFlows.length} unique user flows (limited from ${flows.length})`);
    return uniqueFlows;
  }

  /**
   * Detect critical user flows (high importance)
   */
  detectCriticalFlows(flows: FlowPath[]): FlowPath[] {
    return flows
      .filter(flow => {
        // Critical if involves forms or protected routes
        const hasForm = flow.metadata?.hasForm === true;
        const isProtected = flow.metadata?.isProtected === true;
        const hasCRUD = flow.metadata?.hasCRUD === true;
        
        return hasForm || isProtected || hasCRUD;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Group flows by feature/domain
   */
  groupFlowsByFeature(flows: FlowPath[]): Map<string, FlowPath[]> {
    const groups = new Map<string, FlowPath[]>();

    for (const flow of flows) {
      const feature = this.inferFeatureFromFlow(flow);
      
      if (!groups.has(feature)) {
        groups.set(feature, []);
      }
      groups.get(feature)!.push(flow);
    }

    return groups;
  }

  /**
   * Convert path to flow with metadata
   */
  private pathToFlow(
    path: any,
    graph: GraphUtils<NavigationGraphNode, NavigationGraphEdge>,
  ): FlowPath | null {
    if (path.nodes.length < 2) return null;

    const entryPoint = path.nodes[0];
    const exitPoint = path.nodes[path.nodes.length - 1];

    // Get node data for metadata
    const nodes = path.nodes.map((id: string) => graph.getNode(id)?.data);
    
    const hasForm = nodes.some((n: any) => n?.forms > 0);
    const isProtected = nodes.some((n: any) => n?.isProtected);
    const hasCRUD = nodes.some((n: any) => n?.apiCalls > 0);

    // Infer purpose from path
    const purpose = this.inferFlowPurpose(path.nodes, nodes);
    const category = this.categorizeFlow(purpose, hasForm, isProtected, hasCRUD);

    // Extract selectors from edges
    const selectors = path.edges.map((edge: any) => {
      const trigger = edge.data?.trigger || '';
      return this.extractSelectorFromTrigger(trigger);
    }).filter(Boolean);

    return {
      nodes: path.nodes,
      edges: path.edges,
      weight: path.weight,
      entryPoint,
      exitPoint,
      purpose,
      category,
      confidence: this.calculateFlowConfidence(hasForm, isProtected, hasCRUD),
      selectors,
      assertions: this.generateAssertions(path.nodes),
      metadata: {
        hasForm,
        isProtected,
        hasCRUD,
        depth: path.nodes.length,
      },
    };
  }

  /**
   * Infer flow purpose from routes
   */
  private inferFlowPurpose(routes: string[], nodes: any[]): string {
    const routeStr = routes.join(' → ');

    // Check for common patterns
    if (routes.some(r => r.includes('login') || r.includes('signin'))) {
      return 'User Login';
    }
    if (routes.some(r => r.includes('signup') || r.includes('register'))) {
      return 'User Registration';
    }
    if (routes.some(r => r.includes('checkout'))) {
      return 'Checkout Process';
    }
    if (routes.some(r => r.includes('cart'))) {
      return 'Shopping Cart';
    }

    // CRUD patterns
    if (routes.some(r => /\/new$|\/create$/.test(r))) {
      return 'Create New Item';
    }
    if (routes.some(r => /\/edit$|\/update$/.test(r))) {
      return 'Update Item';
    }

    // Extract entity name from routes
    const entity = this.extractEntityFromRoutes(routes);
    if (entity) {
      if (routes.length === 2) {
        return `View ${entity} Details`;
      }
      return `Navigate to ${entity}`;
    }

    return `Navigate: ${routeStr}`;
  }

  /**
   * Categorize flow based on characteristics
   */
  private categorizeFlow(
    purpose: string,
    hasForm: boolean,
    isProtected: boolean,
    hasCRUD: boolean,
  ): FlowPath['category'] {
    const purposeLower = purpose.toLowerCase();

    if (purposeLower.includes('login') || purposeLower.includes('register') || purposeLower.includes('signup')) {
      return 'authentication';
    }

    if (hasCRUD || purposeLower.includes('create') || purposeLower.includes('update') || purposeLower.includes('delete')) {
      if (purposeLower.includes('create')) return 'crud-create';
      if (purposeLower.includes('update') || purposeLower.includes('edit')) return 'crud-update';
      if (purposeLower.includes('delete')) return 'crud-delete';
      return 'crud-read';
    }

    if (hasForm || purposeLower.includes('checkout') || purposeLower.includes('wizard')) {
      return 'workflow';
    }

    return 'navigation';
  }

  /**
   * Calculate flow confidence score
   */
  private calculateFlowConfidence(hasForm: boolean, isProtected: boolean, hasCRUD: boolean): number {
    let confidence = 0.5;

    if (hasForm) confidence += 0.2;
    if (isProtected) confidence += 0.15;
    if (hasCRUD) confidence += 0.15;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate assertions for flow
   */
  private generateAssertions(routes: string[]): string[] {
    return routes.map(route => `URL should be "${route}"`);
  }

  /**
   * Extract selector from trigger text
   */
  private extractSelectorFromTrigger(trigger: string): string {
    // Extract text from trigger like 'click "Dashboard"'
    const match = trigger.match(/click "([^"]+)"/);
    if (match) {
      return `a:contains("${match[1]}")`;
    }
    return '';
  }

  /**
   * Extract entity name from routes
   */
  private extractEntityFromRoutes(routes: string[]): string | null {
    for (const route of routes) {
      const parts = route.split('/').filter(Boolean);
      for (const part of parts) {
        // Skip common words
        if (['new', 'edit', 'create', 'update', 'delete', 'view'].includes(part)) continue;
        if (part.startsWith(':')) continue; // Skip params
        
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
    }
    return null;
  }

  /**
   * Infer feature from flow
   */
  private inferFeatureFromFlow(flow: FlowPath): string {
    const purpose = flow.purpose.toLowerCase();

    if (purpose.includes('login') || purpose.includes('auth') || purpose.includes('register')) {
      return 'Authentication';
    }
    if (purpose.includes('cart') || purpose.includes('checkout')) {
      return 'Shopping';
    }
    if (purpose.includes('profile') || purpose.includes('account') || purpose.includes('settings')) {
      return 'User Profile';
    }
    if (purpose.includes('product') || purpose.includes('item')) {
      return 'Products';
    }
    if (purpose.includes('order')) {
      return 'Orders';
    }

    // Try to extract from routes
    const entity = this.extractEntityFromRoutes(flow.nodes);
    if (entity) {
      return entity;
    }

    return 'General Navigation';
  }

  /**
   * Deduplicate similar flows
   */
  private deduplicateFlows(flows: FlowPath[]): FlowPath[] {
    const unique: FlowPath[] = [];
    const seen = new Set<string>();

    for (const flow of flows) {
      const signature = flow.nodes.join('→');
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(flow);
      }
    }

    return unique;
  }

  /**
   * Find matching route for a link href
   */
  private findMatchingRoute(href: string, routes: RouteInfo[]): RouteInfo | null {
    // Exact match
    const exact = routes.find(r => r.path === href);
    if (exact) return exact;

    // Match with params (e.g. /users/:id matches /users/123)
    for (const route of routes) {
      if (this.routeMatchesHref(route.path, href)) {
        return route;
      }
    }

    return null;
  }

  /**
   * Check if route pattern matches href
   */
  private routeMatchesHref(routePath: string, href: string): boolean {
    const routeParts = routePath.split('/').filter(Boolean);
    const hrefParts = href.split('/').filter(Boolean);

    if (routeParts.length !== hrefParts.length) return false;

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const hrefPart = hrefParts[i];

      // Param match
      if (routePart.startsWith(':')) continue;

      // Exact match required
      if (routePart !== hrefPart) return false;
    }

    return true;
  }

  /**
   * Count API calls in component
   */
  private countAPICallsInComponent(component: ComponentAnalysis): number {
    // Count fetch/axios calls (simplified)
    let count = 0;
    
    // Would need to traverse AST to count actual API calls
    // For now, estimate based on hooks
    const hasEffect = component.hooks.some(h => h.name === 'useEffect');
    if (hasEffect) count++;

    return count;
  }
}
