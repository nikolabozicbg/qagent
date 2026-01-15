/**
 * Graph data structures for flow analysis
 */

export interface Graph<N = any, E = any> {
  nodes: Map<string, GraphNode<N>>;
  edges: Map<string, GraphEdge<E>[]>;
}

export interface GraphNode<T = any> {
  id: string;
  data: T;
  type: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge<T = any> {
  from: string;
  to: string;
  weight: number;
  type: string;
  data?: T;
}

export interface Path {
  nodes: string[];
  edges: GraphEdge[];
  weight: number;
  metadata?: Record<string, any>;
}

export interface FlowPath extends Path {
  entryPoint: string;
  exitPoint: string;
  purpose: string;
  category: PathCategory;
  confidence: number;
  selectors: string[];
  assertions: string[];
}

export type PathCategory = 
  | 'authentication'
  | 'crud-create'
  | 'crud-read'
  | 'crud-update'
  | 'crud-delete'
  | 'navigation'
  | 'workflow'
  | 'error-handling'
  | 'other';

export interface NavigationGraphNode {
  route: string;
  component: string;
  isProtected: boolean;
  hasParams: boolean;
  forms: number;
  apiCalls: number;
}

export interface NavigationGraphEdge {
  trigger: string; // Link click, form submit, redirect
  condition?: string;
  userAction: boolean;
}

export interface CentralityScores {
  betweenness: Map<string, number>;
  closeness: Map<string, number>;
  degree: Map<string, number>;
  pagerank: Map<string, number>;
}

export interface FeatureCluster {
  id: string;
  nodes: string[];
  cohesion: number;
  purpose: string;
  category: PathCategory;
}
