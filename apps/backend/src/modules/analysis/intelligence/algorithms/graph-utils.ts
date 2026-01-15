/**
 * Graph utility class with basic operations
 */

import { Graph, GraphNode, GraphEdge } from '../types/graph.types';

export class GraphUtils<N = any, E = any> {
  private graph: Graph<N, E>;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
    };
  }

  addNode(id: string, data: N, type: string, metadata?: Record<string, any>): void {
    this.graph.nodes.set(id, { id, data, type, metadata });
    if (!this.graph.edges.has(id)) {
      this.graph.edges.set(id, []);
    }
  }

  addEdge(from: string, to: string, weight: number, type: string, data?: E): void {
    if (!this.graph.nodes.has(from) || !this.graph.nodes.has(to)) {
      throw new Error(`Cannot add edge: nodes ${from} or ${to} do not exist`);
    }

    const edge: GraphEdge<E> = { from, to, weight, type, data };
    const edges = this.graph.edges.get(from) || [];
    edges.push(edge);
    this.graph.edges.set(from, edges);
  }

  getNode(id: string): GraphNode<N> | undefined {
    return this.graph.nodes.get(id);
  }

  getNeighbors(id: string): string[] {
    const edges = this.graph.edges.get(id) || [];
    return edges.map(e => e.to);
  }

  getEdges(from: string): GraphEdge<E>[] {
    return this.graph.edges.get(from) || [];
  }

  getAllNodes(): GraphNode<N>[] {
    return Array.from(this.graph.nodes.values());
  }

  getAllEdges(): GraphEdge<E>[] {
    const allEdges: GraphEdge<E>[] = [];
    for (const edges of this.graph.edges.values()) {
      allEdges.push(...edges);
    }
    return allEdges;
  }

  getGraph(): Graph<N, E> {
    return this.graph;
  }

  nodeCount(): number {
    return this.graph.nodes.size;
  }

  edgeCount(): number {
    return this.getAllEdges().length;
  }

  hasNode(id: string): boolean {
    return this.graph.nodes.has(id);
  }

  hasEdge(from: string, to: string): boolean {
    const edges = this.graph.edges.get(from) || [];
    return edges.some(e => e.to === to);
  }

  clear(): void {
    this.graph.nodes.clear();
    this.graph.edges.clear();
  }

  clone(): GraphUtils<N, E> {
    const cloned = new GraphUtils<N, E>();
    
    // Clone nodes
    for (const [id, node] of this.graph.nodes) {
      cloned.addNode(id, node.data, node.type, node.metadata);
    }

    // Clone edges
    for (const [from, edges] of this.graph.edges) {
      for (const edge of edges) {
        cloned.addEdge(edge.from, edge.to, edge.weight, edge.type, edge.data);
      }
    }

    return cloned;
  }

  toAdjacencyList(): Map<string, string[]> {
    const adjList = new Map<string, string[]>();
    for (const [nodeId, edges] of this.graph.edges) {
      adjList.set(nodeId, edges.map(e => e.to));
    }
    return adjList;
  }
}
