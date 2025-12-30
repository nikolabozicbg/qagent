import { Injectable } from '@nestjs/common';
import { NavigationGraph, Edge, GraphNode } from '../types/graph.types';

/**
 * WeightCalculator
 * 
 * SOLID Principle: Single Responsibility
 * Responsibility: Calculate edge weights based on graph analysis
 * 
 * This class ONLY calculates weights. It does NOT build graphs or find paths.
 * Weight = likelihood that users will follow this edge in real usage.
 */
@Injectable()
export class WeightCalculatorService {
  
  /**
   * Calculate weights for all edges in graph
   * Mutates the graph in place for performance
   * 
   * Time Complexity: O(E) where E = number of edges
   */
  calculateWeights(graph: NavigationGraph): void {
    for (const [sourceRoute, edges] of graph.edges) {
      const sourceNode = graph.nodes.get(sourceRoute);
      if (!sourceNode) continue;
      
      for (const edge of edges) {
        const targetNode = graph.nodes.get(edge.target);
        if (!targetNode) continue;
        
        edge.weight = this.calculateEdgeWeight(edge, sourceNode, targetNode, graph);
      }
    }
  }
  
  /**
   * Calculate weight for single edge
   * Returns value between 0.0 (unlikely) and 10.0 (very likely)
   * 
   * Weight factors:
   * - Trigger type (click vs programmatic)
   * - Condition presence (conditional nav less likely)
   * - Auth flow importance
   * - Node type compatibility
   * - Outbound edge count (fewer = more likely)
   */
  private calculateEdgeWeight(
    edge: Edge,
    sourceNode: GraphNode,
    targetNode: GraphNode,
    graph: NavigationGraph
  ): number {
    let weight = 1.0; // Base weight
    
    // Factor 1: Trigger type
    weight *= this.getTriggerMultiplier(edge.trigger);
    
    // Factor 2: Condition presence
    weight *= this.getConditionMultiplier(edge.condition);
    
    // Factor 3: Auth flow importance
    weight += this.getAuthFlowBonus(sourceNode, targetNode);
    
    // Factor 4: Node type compatibility
    weight *= this.getNodeTypeMultiplier(sourceNode, targetNode);
    
    // Factor 5: Edge scarcity (fewer outbound edges = each more important)
    weight *= this.getScarcityMultiplier(sourceNode.route, graph);
    
    // Clamp to [0.1, 10.0] range
    return Math.max(0.1, Math.min(10.0, weight));
  }
  
  /**
   * Trigger type multiplier
   * User clicks are more reliable than programmatic navigation
   */
  private getTriggerMultiplier(trigger: string): number {
    switch (trigger) {
      case 'click': return 1.5; // Link clicks - high reliability
      case 'submit': return 1.8; // Form submissions - very common
      case 'programmatic': return 1.0; // Code-driven - base weight
      case 'redirect': return 0.8; // Auto-redirects - less common
      default: return 1.0;
    }
  }
  
  /**
   * Condition multiplier
   * Conditional navigation is less likely than unconditional
   */
  private getConditionMultiplier(condition: string | undefined): number {
    if (!condition) return 1.0; // No condition - always happens
    
    // Has condition - reduce weight (not always taken)
    return 0.6;
  }
  
  /**
   * Auth flow bonus
   * Certain patterns are critical user journeys
   */
  private getAuthFlowBonus(sourceNode: GraphNode, targetNode: GraphNode): number {
    let bonus = 0;
    
    // Login → Dashboard (very common)
    if (this.isAuthPage(sourceNode) && this.isDashboard(targetNode)) {
      bonus += 2.0;
    }
    
    // Register → Verify/Login (common flow)
    if (this.isRegisterPage(sourceNode) && 
        (this.isVerifyPage(targetNode) || this.isAuthPage(targetNode))) {
      bonus += 1.5;
    }
    
    // Any page → Login (when auth required)
    if (targetNode.metadata.authRequired && this.isAuthPage(targetNode)) {
      bonus += 1.0;
    }
    
    return bonus;
  }
  
  /**
   * Node type compatibility multiplier
   * Some transitions are more natural than others
   */
  private getNodeTypeMultiplier(sourceNode: GraphNode, targetNode: GraphNode): number {
    const sourceType = sourceNode.metadata.type;
    const targetType = targetNode.metadata.type;
    
    // Modal → Page (rare, modals usually stay in place)
    if (sourceType === 'modal' && targetType === 'page') {
      return 0.5;
    }
    
    // Redirect → anywhere (common, redirects always trigger)
    if (sourceType === 'redirect') {
      return 1.5;
    }
    
    // API → Page (common, API success leads to UI)
    if (sourceType === 'api' && targetType === 'page') {
      return 1.2;
    }
    
    // Page → Page (standard navigation)
    if (sourceType === 'page' && targetType === 'page') {
      return 1.0;
    }
    
    return 1.0; // Default
  }
  
  /**
   * Edge scarcity multiplier
   * Fewer outbound edges = each edge more important
   * 
   * Example: Login page with only 1 navigation (to dashboard) - that edge is critical
   * Example: Homepage with 20 links - each link less important individually
   */
  private getScarcityMultiplier(sourceRoute: string, graph: NavigationGraph): number {
    const edges = graph.edges.get(sourceRoute) || [];
    const count = edges.length;
    
    if (count === 0) return 1.0;
    if (count === 1) return 2.0; // Single exit - very important!
    if (count === 2) return 1.5;
    if (count <= 5) return 1.2;
    if (count <= 10) return 1.0;
    
    // Many exits - dilute importance
    return 0.8;
  }
  
  // ============ Helper predicates ============
  
  private isAuthPage(node: GraphNode): boolean {
    const route = node.route.toLowerCase();
    return route.includes('login') || 
           route.includes('signin') || 
           route.includes('auth');
  }
  
  private isRegisterPage(node: GraphNode): boolean {
    const route = node.route.toLowerCase();
    return route.includes('register') || 
           route.includes('signup') || 
           route.includes('sign-up');
  }
  
  private isVerifyPage(node: GraphNode): boolean {
    const route = node.route.toLowerCase();
    return route.includes('verify') || 
           route.includes('confirm') || 
           route.includes('activation');
  }
  
  private isDashboard(node: GraphNode): boolean {
    const route = node.route.toLowerCase();
    return route.includes('dashboard') || 
           route.includes('home') || 
           route === '/' ||
           route === '/app';
  }
}
