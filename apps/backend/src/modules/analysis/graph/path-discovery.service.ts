import { Injectable } from '@nestjs/common';
import { NavigationGraph, GraphNode, Journey, JourneyStep } from '../types/graph.types';

/**
 * PathDiscoveryService
 * 
 * SOLID Principle: Single Responsibility
 * Responsibility: Discover meaningful paths through the navigation graph
 * 
 * Uses DFS with intelligent pruning to find user journeys.
 * Does NOT build graph or calculate weights - those are separate concerns.
 */
@Injectable()
export class PathDiscoveryService {
  
  /**
   * Discover all meaningful journeys in the graph
   * 
   * Strategy:
   * 1. Start DFS from entry points (auth pages, landing pages)
   * 2. Follow high-weight edges
   * 3. Prune low-value paths
   * 4. Stop at natural endpoints (success/error states)
   * 
   * Time Complexity: O(V + E) with pruning, worst case O(V!)
   * Space Complexity: O(V) for recursion stack
   */
  discoverJourneys(graph: NavigationGraph, maxDepth = 10, minSteps = 2): Journey[] {
    const journeys: Journey[] = [];
    const entryPoints = this.findEntryPoints(graph);
    
    console.log(`🔍 DFS starting from ${entryPoints.length} entry points: ${entryPoints.join(', ')}`);
    
    // Start DFS from each entry point
    for (const entry of entryPoints) {
      const visited = new Set<string>();
      const path: JourneyStep[] = [];
      
      this.dfs(
        graph,
        entry,
        visited,
        path,
        journeys,
        maxDepth,
        minSteps
      );
    }
    
    // Sort by priority (weight sum)
    journeys.sort((a, b) => b.priority - a.priority);
    
    return journeys;
  }
  
  /**
   * Depth-First Search with intelligent pruning
   * 
   * Pruning strategies:
   * - Max depth limit (prevent infinite loops)
   * - Low weight threshold (ignore unlikely paths)
   * - Cycle detection (avoid revisiting nodes)
   * - Natural endpoints (complete journey at success states)
   */
  private dfs(
    graph: NavigationGraph,
    currentRoute: string,
    visited: Set<string>,
    path: JourneyStep[],
    journeys: Journey[],
    remainingDepth: number,
    minSteps: number
  ): void {
    // Base case: max depth reached
    if (remainingDepth <= 0) {
      if (this.isValidJourney(path, minSteps)) {
        journeys.push(this.createJourney(path));
      }
      return;
    }
    
    // Mark as visited (cycle detection)
    visited.add(currentRoute);
    
    // Get current node
    const currentNode = graph.nodes.get(currentRoute);
    if (!currentNode) {
      visited.delete(currentRoute);
      return;
    }
    
    // Add current step to path
    const step: JourneyStep = {
      route: currentRoute,
      component: currentNode.component,
      actions: this.inferActions(currentNode),
      validations: this.inferValidations(currentNode)
    };
    path.push(step);
    
    // Check if this is a natural endpoint
    if (this.isNaturalEndpoint(currentNode, path)) {
      if (this.isValidJourney(path, minSteps)) {
        journeys.push(this.createJourney(path));
      }
      // Continue exploring (endpoint doesn't stop DFS completely)
    }
    
    // Get outbound edges, sorted by weight (high to low)
    const edges = (graph.edges.get(currentRoute) || [])
      .filter(edge => !visited.has(edge.target)) // Skip visited
      .filter(edge => edge.weight >= 0.5) // Prune low-weight edges
      .sort((a, b) => b.weight - a.weight);
    
    // Explore each edge
    for (const edge of edges) {
        this.dfs(
          graph,
          edge.target,
          visited,
          path,
          journeys,
          remainingDepth - 1,
          minSteps
        );
    }
    
    // Backtrack
    path.pop();
    visited.delete(currentRoute);
  }
  
  /**
   * Find entry points for journey discovery
   * Entry points are routes where users typically start
   */
  private findEntryPoints(graph: NavigationGraph): string[] {
    const entryPoints: string[] = [];
    
    for (const [route, node] of graph.nodes) {
      // Landing pages
      if (route === '/' || route === '/home' || route === '/landing') {
        entryPoints.push(route);
        continue;
      }
      
      // Auth pages (login/register)
      if (this.isAuthEntry(route)) {
        entryPoints.push(route);
        continue;
      }
      
      // Pages with no incoming edges (potential entry)
      if (this.hasNoIncomingEdges(route, graph)) {
        entryPoints.push(route);
      }
    }
    
    // If no entry points found, use first route
    if (entryPoints.length === 0 && graph.nodes.size > 0) {
      entryPoints.push(graph.nodes.keys().next().value);
    }
    
    return entryPoints;
  }
  
  /**
   * Check if route is auth entry point
   */
  private isAuthEntry(route: string): boolean {
    const lower = route.toLowerCase();
    return lower.includes('login') || 
           lower.includes('register') || 
           lower.includes('signup') ||
           lower.includes('signin');
  }
  
  /**
   * Check if route has no incoming edges
   */
  private hasNoIncomingEdges(route: string, graph: NavigationGraph): boolean {
    for (const edges of graph.edges.values()) {
      if (edges.some(edge => edge.target === route)) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Check if node is natural endpoint for journey
   * Natural endpoints: success pages, error pages, confirmations
   */
  private isNaturalEndpoint(node: GraphNode, path: JourneyStep[]): boolean {
    const route = node.route.toLowerCase();
    
    // Success indicators
    if (route.includes('success') || 
        route.includes('confirmation') || 
        route.includes('complete') ||
        route.includes('thank')) {
      return true;
    }
    
    // Dashboard after auth flow
    if ((route.includes('dashboard') || route.includes('home')) && 
        path.some(step => this.isAuthEntry(step.route))) {
      return true;
    }
    
    // Error pages
    if (route.includes('error') || route.includes('404') || route.includes('403')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if path forms valid journey
   * Valid = at least minSteps steps with meaningful progression
   */
  private isValidJourney(path: JourneyStep[], minSteps: number): boolean {
    // Too short
    if (path.length < minSteps) return false;
    
    // Too long (likely noise)
    if (path.length > 10) return false;
    
    // Check for meaningful progression
    // Allow some duplicates (cycles are valid in auth flows: login->register->login)
    const uniqueRoutes = new Set(path.map(step => step.route));
    if (uniqueRoutes.size < path.length * 0.5) {
      // More than 50% duplicates - likely noise
      return false;
    }
    
    return true;
  }
  
  /**
   * Create Journey object from path
   */
  private createJourney(path: JourneyStep[]): Journey {
    const steps = path.map(step => ({ ...step })); // Deep copy
    
    // Get first route as the journey route (entry point)
    const route = steps.length > 0 ? steps[0].route : '/';
    
    return {
      name: this.generateJourneyName(steps),
      route: route, // ADD route property for test generation
      steps,
      priority: this.calculatePriority(steps),
      expectedOutcomes: this.inferOutcomes(steps),
      tags: this.generateTags(steps)
    };
  }
  
  /**
   * Generate human-readable journey name
   */
  private generateJourneyName(steps: JourneyStep[]): string {
    const start = steps[0].route;
    const end = steps[steps.length - 1].route;
    
    // Format: "Login to Dashboard" or "Register to Verification"
    const startName = this.routeToName(start);
    const endName = this.routeToName(end);
    
    return `${startName} to ${endName}`;
  }
  
  /**
   * Convert route to readable name
   */
  private routeToName(route: string): string {
    // Remove leading slash and convert to title case
    return route
      .replace(/^\/+/, '')
      .split(/[-_/]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Home';
  }
  
  /**
   * Calculate journey priority
   * Higher priority = more important to test
   */
  private calculatePriority(steps: JourneyStep[]): number {
    let priority = steps.length; // Base: longer journeys slightly higher
    
    // Auth flows are critical
    const hasAuth = steps.some(step => this.isAuthEntry(step.route));
    if (hasAuth) priority += 10;
    
    // Flows with API calls are important
    const hasApi = steps.some(step => step.actions.some(a => a.includes('api')));
    if (hasApi) priority += 5;
    
    // Flows with validations are important
    const hasValidation = steps.some(step => step.validations.length > 0);
    if (hasValidation) priority += 3;
    
    return priority;
  }
  
  /**
   * Infer expected outcomes from final step
   */
  private inferOutcomes(steps: JourneyStep[]): string[] {
    const outcomes: string[] = [];
    const finalRoute = steps[steps.length - 1].route.toLowerCase();
    
    if (finalRoute.includes('success') || finalRoute.includes('complete')) {
      outcomes.push('success_displayed');
    }
    
    if (finalRoute.includes('dashboard') || finalRoute.includes('home')) {
      outcomes.push('user_authenticated');
    }
    
    if (finalRoute.includes('error')) {
      outcomes.push('error_displayed');
    }
    
    // Default outcome
    if (outcomes.length === 0) {
      outcomes.push('navigation_completed');
    }
    
    return outcomes;
  }
  
  /**
   * Generate tags for journey categorization
   */
  private generateTags(steps: JourneyStep[]): string[] {
    const tags = new Set<string>();
    
    for (const step of steps) {
      const route = step.route.toLowerCase();
      
      if (route.includes('login') || route.includes('auth')) tags.add('authentication');
      if (route.includes('register') || route.includes('signup')) tags.add('registration');
      if (route.includes('dashboard')) tags.add('dashboard');
      if (route.includes('profile')) tags.add('profile');
      if (route.includes('settings')) tags.add('settings');
      if (step.actions.some(a => a.includes('submit'))) tags.add('form');
      if (step.actions.some(a => a.includes('api'))) tags.add('api');
    }
    
    return Array.from(tags);
  }
  
  /**
   * Infer actions from node metadata
   */
  private inferActions(node: GraphNode): string[] {
    const actions: string[] = [];
    
    // API calls
    if (node.metadata.apiCalls.length > 0) {
      actions.push(...node.metadata.apiCalls.map(api => `api:${api}`));
    }
    
    // State changes
    if (node.metadata.stateChanges.length > 0) {
      actions.push(...node.metadata.stateChanges);
    }
    
    // Form submission (inferred from UI elements)
    if (node.metadata.uiElements.includes('form') || 
        node.metadata.uiElements.includes('button')) {
      actions.push('form_interaction');
    }
    
    return actions;
  }
  
  /**
   * Infer validations from node metadata
   */
  private inferValidations(node: GraphNode): string[] {
    const validations: string[] = [];
    
    // Auth requirement
    if (node.metadata.authRequired) {
      validations.push('auth_required');
    }
    
    // Input validation (inferred from UI)
    if (node.metadata.uiElements.includes('input') || 
        node.metadata.uiElements.includes('form')) {
      validations.push('input_validation');
    }
    
    return validations;
  }
}
