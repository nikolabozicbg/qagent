/**
 * Depth-First Search algorithms for path discovery
 */

import { GraphUtils } from './graph-utils';
import { Path, GraphEdge } from '../types/graph.types';

export class DFSAlgorithm {
  /**
   * Find all paths from start to end node
   */
  static findAllPaths<N, E>(
    graph: GraphUtils<N, E>,
    start: string,
    end: string,
    maxDepth: number = 10,
  ): Path[] {
    const paths: Path[] = [];
    const visited = new Set<string>();
    const currentPath: string[] = [];
    const currentEdges: GraphEdge<E>[] = [];

    const dfs = (nodeId: string, depth: number): void => {
      if (depth > maxDepth) return;

      visited.add(nodeId);
      currentPath.push(nodeId);

      if (nodeId === end) {
        paths.push({
          nodes: [...currentPath],
          edges: [...currentEdges],
          weight: currentEdges.reduce((sum, e) => sum + e.weight, 0),
        });
      } else {
        const neighbors = graph.getNeighbors(nodeId);
        const edges = graph.getEdges(nodeId);

        for (let i = 0; i < neighbors.length; i++) {
          const neighbor = neighbors[i];
          if (!visited.has(neighbor)) {
            currentEdges.push(edges[i]);
            dfs(neighbor, depth + 1);
            currentEdges.pop();
          }
        }
      }

      currentPath.pop();
      visited.delete(nodeId);
    };

    if (graph.hasNode(start)) {
      dfs(start, 0);
    }

    return paths;
  }

  /**
   * Find all paths from start node up to maxDepth
   */
  static findAllPathsFromStart<N, E>(
    graph: GraphUtils<N, E>,
    start: string,
    maxDepth: number = 5,
  ): Path[] {
    const paths: Path[] = [];
    const visited = new Set<string>();
    const currentPath: string[] = [];
    const currentEdges: GraphEdge<E>[] = [];

    const dfs = (nodeId: string, depth: number): void => {
      if (depth > maxDepth) return;

      visited.add(nodeId);
      currentPath.push(nodeId);

      // Add current path if it has at least 2 nodes
      if (currentPath.length >= 2) {
        paths.push({
          nodes: [...currentPath],
          edges: [...currentEdges],
          weight: currentEdges.reduce((sum, e) => sum + e.weight, 0),
        });
      }

      const neighbors = graph.getNeighbors(nodeId);
      const edges = graph.getEdges(nodeId);

      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        if (!visited.has(neighbor)) {
          currentEdges.push(edges[i]);
          dfs(neighbor, depth + 1);
          currentEdges.pop();
        }
      }

      currentPath.pop();
      visited.delete(nodeId);
    };

    if (graph.hasNode(start)) {
      dfs(start, 0);
    }

    return paths;
  }

  /**
   * Detect cycles in the graph
   */
  static detectCycles<N, E>(graph: GraphUtils<N, E>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recStack.add(nodeId);
      currentPath.push(nodeId);

      const neighbors = graph.getNeighbors(nodeId);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStartIndex = currentPath.indexOf(neighbor);
          const cycle = currentPath.slice(cycleStartIndex);
          cycles.push([...cycle, neighbor]);
        }
      }

      currentPath.pop();
      recStack.delete(nodeId);
    };

    for (const node of graph.getAllNodes()) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  /**
   * Check if graph has a cycle
   */
  static hasCycle<N, E>(graph: GraphUtils<N, E>): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = graph.getNeighbors(nodeId);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of graph.getAllNodes()) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * Topological sort (for DAGs)
   */
  static topologicalSort<N, E>(graph: GraphUtils<N, E>): string[] | null {
    if (DFSAlgorithm.hasCycle(graph)) {
      return null; // Cannot sort graph with cycles
    }

    const visited = new Set<string>();
    const stack: string[] = [];

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);

      const neighbors = graph.getNeighbors(nodeId);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      }

      stack.push(nodeId);
    };

    for (const node of graph.getAllNodes()) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return stack.reverse();
  }
}
