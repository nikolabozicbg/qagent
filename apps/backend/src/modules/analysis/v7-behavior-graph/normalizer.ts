import {
  BehaviorGraphPayload,
  BehaviorGraph,
  BehaviorNode,
  BehaviorEdge,
} from '../types/behavior-graph.types';

export interface V7NormalizationResult {
  payload: BehaviorGraphPayload;
  stats: {
    nodesIn: number;
    edgesIn: number;
    nodesOut: number;
    edgesOut: number;
    removedDuplicateNodes: number;
    removedDuplicateEdges: number;
  };
}

export function normalizeBehaviorGraphPayload(input: BehaviorGraphPayload): V7NormalizationResult {
  const nodesIn = input.graph.nodes.length;
  const edgesIn = input.graph.edges.length;

  const nodeById = new Map<string, BehaviorNode>();
  for (const n of input.graph.nodes) {
    if (!nodeById.has(n.id)) nodeById.set(n.id, n);
  }

  const normalizedNodes = Array.from(nodeById.values()).map(n =>
    n.type === 'Page' ? ({
      ...n,
      route: canonicalizeRoute((n as any).route),
    } as BehaviorNode) : n
  );

  const edgeById = new Map<string, BehaviorEdge>();
  for (const e of input.graph.edges) {
    if (!edgeById.has(e.id)) edgeById.set(e.id, e);
  }

  const normalizedEdges = Array.from(edgeById.values());

  const graph: BehaviorGraph = {
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };

  return {
    payload: {
      ...input,
      graph,
    },
    stats: {
      nodesIn,
      edgesIn,
      nodesOut: normalizedNodes.length,
      edgesOut: normalizedEdges.length,
      removedDuplicateNodes: nodesIn - normalizedNodes.length,
      removedDuplicateEdges: edgesIn - normalizedEdges.length,
    },
  };
}

function canonicalizeRoute(route: string): string {
  if (!route) return route;
  // Ensure leading slash, remove trailing slash (except root)
  const withSlash = route.startsWith('/') ? route : `/${route}`;
  const trimmed = withSlash !== '/' ? withSlash.replace(/\/+$/, '') : withSlash;
  return trimmed;
}
