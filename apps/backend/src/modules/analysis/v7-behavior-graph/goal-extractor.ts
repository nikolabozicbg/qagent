import {
  BehaviorGraph,
  BehaviorNode,
  BehaviorEdge,
  V7UserGoal,
} from '../types/behavior-graph.types';

export interface V7GoalExtractionResult {
  goals: V7UserGoal[];
  stats: {
    userActions: number;
    goals: number;
    ambiguousGoals: number;
  };
}

export function extractUserGoals(graph: BehaviorGraph): V7GoalExtractionResult {
  const nodesById = new Map(graph.nodes.map(n => [n.id, n] as const));
  const edgesBySource = new Map<string, BehaviorEdge[]>();

  for (const e of graph.edges) {
    const existing = edgesBySource.get(e.source) || [];
    existing.push(e);
    edgesBySource.set(e.source, existing);
  }

  const userActions = graph.nodes.filter(n => n.type === 'UserAction');

  const goals: V7UserGoal[] = [];
  let ambiguousGoals = 0;

  for (const ua of userActions) {
    const result = deriveGoalFromUserAction(ua, nodesById, edgesBySource);
    if (result) {
      goals.push(result.goal);
      if (result.ambiguous) ambiguousGoals++;
    } else {
      goals.push({
        id: `goal:${ua.id}`,
        startUserActionId: ua.id,
        terminalNodeId: 'UNKNOWN',
        orderedNodeIds: [ua.id],
        orderedEdgeIds: [],
        unknowns: ['No deterministic path from UserAction to Navigation/StateMutation found'],
      });
      ambiguousGoals++;
    }
  }

  return {
    goals,
    stats: {
      userActions: userActions.length,
      goals: goals.length,
      ambiguousGoals,
    },
  };
}

function deriveGoalFromUserAction(
  ua: BehaviorNode,
  nodesById: Map<string, BehaviorNode>,
  edgesBySource: Map<string, BehaviorEdge[]>
): { goal: V7UserGoal; ambiguous: boolean } | null {
  // BFS to first terminal node (Navigation or StateMutation)
  // Deterministic only if there is exactly one shortest terminal path.
  type State = { nodeId: string; pathNodes: string[]; pathEdges: string[] };

  const queue: State[] = [{ nodeId: ua.id, pathNodes: [ua.id], pathEdges: [] }];
  const visited = new Set<string>();

  const terminalPaths: State[] = [];
  let shortestLen: number | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (shortestLen !== null && current.pathEdges.length > shortestLen) {
      continue;
    }

    const node = nodesById.get(current.nodeId);
    if (!node) continue;

    if (node.type === 'Navigation' || node.type === 'StateMutation') {
      if (shortestLen === null) shortestLen = current.pathEdges.length;
      terminalPaths.push(current);
      continue;
    }

    const outgoing = edgesBySource.get(current.nodeId) || [];
    for (const e of outgoing) {
      // Only follow causal edges for goal derivation
      if (e.type !== 'triggers' && e.type !== 'results_in' && e.type !== 'redirects_to') continue;

      const nextId = e.target;
      // prevent trivial loops
      const visitKey = `${current.nodeId}->${nextId}:${e.type}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);

      queue.push({
        nodeId: nextId,
        pathNodes: [...current.pathNodes, nextId],
        pathEdges: [...current.pathEdges, e.id],
      });
    }
  }

  if (terminalPaths.length === 0) return null;

  // Keep shortest only
  const shortest = terminalPaths.filter(p => p.pathEdges.length === shortestLen);
  const ambiguous = shortest.length !== 1;

  const chosen = shortest[0];

  const unknowns: string[] = [];
  if (ambiguous) {
    unknowns.push('Multiple terminal paths found; ordering/terminal selection is ambiguous');
  }

  return {
    goal: {
      id: `goal:${ua.id}`,
      startUserActionId: ua.id,
      terminalNodeId: chosen.nodeId,
      orderedNodeIds: chosen.pathNodes,
      orderedEdgeIds: chosen.pathEdges,
      unknowns,
    },
    ambiguous,
  };
}
