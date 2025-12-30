import { Injectable } from '@nestjs/common';
import { NavigationGraphBuilderService } from './navigation-graph-builder.service';
import { WeightCalculatorService } from './weight-calculator.service';
import { PathDiscoveryService } from './path-discovery.service';
import { CycleDetectorService } from './cycle-detector.service';
import { NavigationGraph, ComponentAnalysis, Journey } from '../types/graph.types';
import { CycleAnalysis } from './cycle-detector.service';

/**
 * NavigationGraphService
 * 
 * SOLID Principles:
 * - Facade Pattern: Provides simple interface to complex graph subsystem
 * - Dependency Inversion: Depends on abstractions (services) not implementations
 * - Open/Closed: Can add new analysis without modifying this class
 * 
 * Coordinates all graph analysis services to discover user journeys.
 * This is the ONLY entry point for journey discovery from outside.
 */
@Injectable()
export class NavigationGraphService {
  
  constructor(
    private readonly graphBuilder: NavigationGraphBuilderService,
    private readonly weightCalculator: WeightCalculatorService,
    private readonly pathDiscovery: PathDiscoveryService,
    private readonly cycleDetector: CycleDetectorService
  ) {}
  
  /**
   * Main entry point: Discover journeys from components
   * 
   * Pipeline:
   * 1. Build graph from components (NavigationGraphBuilder)
   * 2. Calculate edge weights (WeightCalculator)
   * 3. Detect cycles (CycleDetector) - for validation
   * 4. Discover journeys (PathDiscoveryService)
   * 
   * @param components Component analysis from code
   * @param options Discovery options
   * @returns Discovered journeys sorted by priority
   */
  async discoverJourneys(
    components: ComponentAnalysis[],
    options: DiscoveryOptions = {}
  ): Promise<JourneyDiscoveryResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Build navigation graph
      const graph = this.graphBuilder.buildGraph(components);
      
      if (graph.nodes.size === 0) {
        return this.emptyResult('No components to analyze');
      }
      
      // Step 2: Calculate edge weights
      this.weightCalculator.calculateWeights(graph);
      
      // Step 3: Detect cycles (for validation and warnings)
      const cycleAnalysis = this.cycleDetector.analyzeCycles(graph);
      
      // Step 4: Discover journeys via DFS
      const maxDepth = options.maxDepth || 10;
      const minSteps = options.minSteps || 2;
      const journeys = this.pathDiscovery.discoverJourneys(graph, maxDepth, minSteps);
      
      // Step 5: Apply filters if provided
      const filteredJourneys = this.applyFilters(journeys, options);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        journeys: filteredJourneys,
        metadata: {
          componentCount: components.length,
          nodeCount: graph.nodes.size,
          edgeCount: this.countEdges(graph),
          journeyCount: filteredJourneys.length,
          hasCycles: cycleAnalysis.hasCycles,
          cycleCount: cycleAnalysis.cycleCount,
          criticalCycleCount: cycleAnalysis.criticalCycles.length,
          analysisTimeMs: duration
        },
        cycles: cycleAnalysis,
        warnings: this.generateWarnings(graph, cycleAnalysis),
        debug: {
          edgeSample: this.getEdgeSample(graph)
        }
      };
      
    } catch (error) {
      return {
        success: false,
        journeys: [],
        metadata: {
          componentCount: components.length,
          nodeCount: 0,
          edgeCount: 0,
          journeyCount: 0,
          hasCycles: false,
          cycleCount: 0,
          criticalCycleCount: 0,
          analysisTimeMs: Date.now() - startTime
        },
        cycles: {
          hasCycles: false,
          cycleCount: 0,
          cycles: [],
          criticalCycles: []
        },
        warnings: [],
        error: error.message
      };
    }
  }
  
  /**
   * Count total edges in graph
   */
  private countEdges(graph: NavigationGraph): number {
    let count = 0;
    for (const edges of graph.edges.values()) {
      count += edges.length;
    }
    return count;
  }
  
  /**
   * Get sample edges for debugging
   */
  private getEdgeSample(graph: NavigationGraph): string[] {
    const sample: string[] = [];
    for (const [source, edges] of graph.edges) {
      for (const edge of edges) {
        sample.push(`${source} -> ${edge.target} (${edge.trigger}, weight: ${edge.weight.toFixed(2)})`);
      }
    }
    return sample.slice(0, 10); // First 10 edges
  }
  
  /**
   * Apply filters to journeys based on options
   */
  private applyFilters(journeys: Journey[], options: DiscoveryOptions): Journey[] {
    let filtered = journeys;
    
    // Filter by minimum priority
    if (options.minPriority !== undefined) {
      filtered = filtered.filter(j => j.priority >= options.minPriority!);
    }
    
    // Filter by tags
    if (options.requiredTags && options.requiredTags.length > 0) {
      filtered = filtered.filter(j => 
        options.requiredTags!.some(tag => j.tags.includes(tag))
      );
    }
    
    // Filter by minimum steps
    if (options.minSteps !== undefined) {
      filtered = filtered.filter(j => j.steps.length >= options.minSteps!);
    }
    
    // Filter by maximum steps
    if (options.maxSteps !== undefined) {
      filtered = filtered.filter(j => j.steps.length <= options.maxSteps!);
    }
    
    // Limit result count
    if (options.maxResults !== undefined) {
      filtered = filtered.slice(0, options.maxResults);
    }
    
    return filtered;
  }
  
  /**
   * Generate warnings about graph structure
   */
  private generateWarnings(graph: NavigationGraph, cycles: CycleAnalysis): string[] {
    const warnings: string[] = [];
    
    // Warn about disconnected components
    const disconnected = this.findDisconnectedNodes(graph);
    if (disconnected.length > 0) {
      warnings.push(
        `Found ${disconnected.length} disconnected routes that cannot be reached: ${disconnected.slice(0, 3).join(', ')}${disconnected.length > 3 ? '...' : ''}`
      );
    }
    
    // Warn about critical cycles
    if (cycles.criticalCycles.length > 0) {
      warnings.push(
        `Found ${cycles.criticalCycles.length} critical cycle(s) that may cause infinite loops in tests`
      );
    }
    
    // Warn about dead ends (pages with no outbound navigation)
    const deadEnds = this.findDeadEnds(graph);
    if (deadEnds.length > 5) {
      warnings.push(
        `Found ${deadEnds.length} pages with no outbound navigation (potential dead ends)`
      );
    }
    
    return warnings;
  }
  
  /**
   * Find disconnected nodes (no incoming or outgoing edges)
   */
  private findDisconnectedNodes(graph: NavigationGraph): string[] {
    const disconnected: string[] = [];
    
    for (const [route, edges] of graph.edges) {
      // No outgoing edges
      const hasOutgoing = edges.length > 0;
      
      // Check for incoming edges
      let hasIncoming = false;
      for (const otherEdges of graph.edges.values()) {
        if (otherEdges.some(e => e.target === route)) {
          hasIncoming = true;
          break;
        }
      }
      
      // If no incoming AND no outgoing (except root routes)
      if (!hasOutgoing && !hasIncoming && route !== '/' && !route.includes('home')) {
        disconnected.push(route);
      }
    }
    
    return disconnected;
  }
  
  /**
   * Find dead ends (pages with no outbound navigation)
   */
  private findDeadEnds(graph: NavigationGraph): string[] {
    const deadEnds: string[] = [];
    
    for (const [route, edges] of graph.edges) {
      if (edges.length === 0) {
        deadEnds.push(route);
      }
    }
    
    return deadEnds;
  }
  
  /**
   * Empty result helper
   */
  private emptyResult(message: string): JourneyDiscoveryResult {
    return {
      success: false,
      journeys: [],
      metadata: {
        componentCount: 0,
        nodeCount: 0,
        edgeCount: 0,
        journeyCount: 0,
        hasCycles: false,
        cycleCount: 0,
        criticalCycleCount: 0,
        analysisTimeMs: 0
      },
      cycles: {
        hasCycles: false,
        cycleCount: 0,
        cycles: [],
        criticalCycles: []
      },
      warnings: [message],
      error: message
    };
  }
}

/**
 * Discovery options
 */
export interface DiscoveryOptions {
  /** Max depth for DFS (default 10) */
  maxDepth?: number;
  
  /** Minimum priority to include (filter low-priority journeys) */
  minPriority?: number;
  
  /** Only include journeys with these tags */
  requiredTags?: string[];
  
  /** Minimum steps in journey */
  minSteps?: number;
  
  /** Maximum steps in journey */
  maxSteps?: number;
  
  /** Maximum number of results to return */
  maxResults?: number;
}

/**
 * Journey discovery result
 */
export interface JourneyDiscoveryResult {
  success: boolean;
  journeys: Journey[];
  metadata: DiscoveryMetadata;
  cycles: CycleAnalysis;
  warnings: string[];
  error?: string;
  debug?: any;
}

/**
 * Discovery metadata
 */
export interface DiscoveryMetadata {
  componentCount: number;
  nodeCount: number;
  edgeCount: number;
  journeyCount: number;
  hasCycles: boolean;
  cycleCount: number;
  criticalCycleCount: number;
  analysisTimeMs: number;
}
