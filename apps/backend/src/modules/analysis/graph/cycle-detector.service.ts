import { Injectable } from '@nestjs/common';
import { NavigationGraph } from '../types/graph.types';

/**
 * CycleDetector
 * 
 * SOLID Principle: Single Responsibility
 * Responsibility: Detect cycles and strongly connected components in navigation graph
 * 
 * Uses Tarjan's algorithm for efficient SCC detection.
 * Does NOT build graph or discover paths - those are separate concerns.
 */
@Injectable()
export class CycleDetectorService {
  
  /**
   * Detect strongly connected components (SCCs) using Tarjan's algorithm
   * 
   * SCC = maximal set of nodes where every node is reachable from every other
   * In navigation terms: user can navigate in a loop through these pages
   * 
   * Time Complexity: O(V + E)
   * Space Complexity: O(V)
   * 
   * @returns Array of SCCs, each SCC is array of routes
   */
  detectCycles(graph: NavigationGraph): string[][] {
    const sccs: string[][] = [];
    const stack: string[] = [];
    const indices = new Map<string, number>();
    const lowLinks = new Map<string, number>();
    const onStack = new Set<string>();
    let index = 0;
    
    // Run Tarjan's algorithm from each unvisited node
    for (const route of graph.nodes.keys()) {
      if (!indices.has(route)) {
        this.strongConnect(
          route,
          graph,
          indices,
          lowLinks,
          onStack,
          stack,
          sccs,
          index
        );
      }
    }
    
    // Filter out trivial SCCs (single node with no self-loop)
    return sccs.filter(scc => this.isNonTrivialCycle(scc, graph));
  }
  
  /**
   * Tarjan's strongConnect recursive function
   * Core of the SCC detection algorithm
   */
  private strongConnect(
    route: string,
    graph: NavigationGraph,
    indices: Map<string, number>,
    lowLinks: Map<string, number>,
    onStack: Set<string>,
    stack: string[],
    sccs: string[][],
    index: number
  ): number {
    // Set the depth index for this node
    indices.set(route, index);
    lowLinks.set(route, index);
    index++;
    
    // Push to stack and mark as on stack
    stack.push(route);
    onStack.add(route);
    
    // Consider successors (outbound edges)
    const edges = graph.edges.get(route) || [];
    for (const edge of edges) {
      const target = edge.target;
      
      if (!indices.has(target)) {
        // Successor not yet visited; recurse
        index = this.strongConnect(
          target,
          graph,
          indices,
          lowLinks,
          onStack,
          stack,
          sccs,
          index
        );
        
        // Update lowLink
        lowLinks.set(
          route,
          Math.min(lowLinks.get(route)!, lowLinks.get(target)!)
        );
      } else if (onStack.has(target)) {
        // Successor is on stack (part of current SCC)
        lowLinks.set(
          route,
          Math.min(lowLinks.get(route)!, indices.get(target)!)
        );
      }
    }
    
    // If route is root of SCC, pop the stack to form SCC
    if (lowLinks.get(route) === indices.get(route)) {
      const scc: string[] = [];
      let w: string;
      
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== route);
      
      sccs.push(scc);
    }
    
    return index;
  }
  
  /**
   * Check if SCC is non-trivial (represents actual cycle)
   * Trivial SCC = single node with no self-loop
   */
  private isNonTrivialCycle(scc: string[], graph: NavigationGraph): boolean {
    // Multiple nodes = definitely a cycle
    if (scc.length > 1) return true;
    
    // Single node - check for self-loop
    const route = scc[0];
    const edges = graph.edges.get(route) || [];
    return edges.some(edge => edge.target === route);
  }
  
  /**
   * Analyze cycles to extract useful information
   * Returns metadata about cycles in the application
   */
  analyzeCycles(graph: NavigationGraph): CycleAnalysis {
    const sccs = this.detectCycles(graph);
    
    return {
      hasCycles: sccs.length > 0,
      cycleCount: sccs.length,
      cycles: sccs.map(scc => this.analyzeSingleCycle(scc, graph)),
      criticalCycles: sccs
        .filter(scc => this.isCriticalCycle(scc, graph))
        .map(scc => this.analyzeSingleCycle(scc, graph))
    };
  }
  
  /**
   * Analyze single cycle
   */
  private analyzeSingleCycle(scc: string[], graph: NavigationGraph): CycleInfo {
    return {
      routes: scc,
      size: scc.length,
      type: this.classifyCycle(scc),
      isCritical: this.isCriticalCycle(scc, graph),
      avgWeight: this.calculateAvgCycleWeight(scc, graph)
    };
  }
  
  /**
   * Classify cycle type based on routes involved
   */
  private classifyCycle(scc: string[]): string {
    const routes = scc.map(r => r.toLowerCase()).join(' ');
    
    if (routes.includes('auth') || routes.includes('login')) {
      return 'auth';
    }
    
    if (routes.includes('wizard') || routes.includes('step')) {
      return 'wizard';
    }
    
    if (routes.includes('edit') || routes.includes('form')) {
      return 'form';
    }
    
    if (routes.includes('tab') || routes.includes('view')) {
      return 'navigation';
    }
    
    return 'generic';
  }
  
  /**
   * Check if cycle is critical (should be tested carefully)
   * Critical = involves auth, forms, or high-weight edges
   */
  private isCriticalCycle(scc: string[], graph: NavigationGraph): boolean {
    // Auth cycles are critical
    if (scc.some(route => route.toLowerCase().includes('auth') || 
                          route.toLowerCase().includes('login'))) {
      return true;
    }
    
    // Cycles with high average weight are critical
    const avgWeight = this.calculateAvgCycleWeight(scc, graph);
    if (avgWeight > 3.0) return true;
    
    // Cycles involving forms are critical
    for (const route of scc) {
      const node = graph.nodes.get(route);
      if (node && node.metadata.uiElements.includes('form')) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate average edge weight within cycle
   */
  private calculateAvgCycleWeight(scc: string[], graph: NavigationGraph): number {
    let totalWeight = 0;
    let edgeCount = 0;
    
    const sccSet = new Set(scc);
    
    for (const route of scc) {
      const edges = graph.edges.get(route) || [];
      
      // Only count edges within the cycle
      for (const edge of edges) {
        if (sccSet.has(edge.target)) {
          totalWeight += edge.weight;
          edgeCount++;
        }
      }
    }
    
    return edgeCount > 0 ? totalWeight / edgeCount : 0;
  }
}

/**
 * Cycle analysis result
 */
export interface CycleAnalysis {
  hasCycles: boolean;
  cycleCount: number;
  cycles: CycleInfo[];
  criticalCycles: CycleInfo[];
}

/**
 * Information about single cycle
 */
export interface CycleInfo {
  routes: string[];
  size: number;
  type: string; // 'auth' | 'wizard' | 'form' | 'navigation' | 'generic'
  isCritical: boolean;
  avgWeight: number;
}
