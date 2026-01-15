import {
  BehaviorGraphPayload,
  BehaviorNodeType,
  BehaviorEdgeType,
  V7ValidationIssue,
} from '../types/behavior-graph.types';

const NODE_TYPES: readonly BehaviorNodeType[] = [
  'Page',
  'UserAction',
  'Form',
  'ApiCall',
  'StateMutation',
  'Navigation',
  'Conditional',
] as const;

const EDGE_TYPES: readonly BehaviorEdgeType[] = [
  'triggers',
  'depends_on',
  'results_in',
  'blocks',
  'redirects_to',
] as const;

export interface V7ValidationResult {
  valid: boolean;
  issues: V7ValidationIssue[];
}

export function validateBehaviorGraphPayload(payload: BehaviorGraphPayload): V7ValidationResult {
  const issues: V7ValidationIssue[] = [];

  if (payload.version !== 'v7') {
    issues.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'payload.version must be v7',
    });
  }

  if (!payload.project?.name) {
    issues.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'payload.project.name is required',
    });
  }

  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const nodeIdExists = new Set<string>();

  for (const node of payload.graph?.nodes || []) {
    if (!node?.id) {
      issues.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'node.id is required',
      });
      continue;
    }

    if (nodeIds.has(node.id)) {
      issues.push({
        code: 'DUPLICATE_NODE_ID',
        message: `Duplicate node id: ${node.id}`,
        nodeId: node.id,
      });
    }
    nodeIds.add(node.id);
    nodeIdExists.add(node.id);

    if (!NODE_TYPES.includes(node.type as BehaviorNodeType)) {
      issues.push({
        code: 'INVALID_NODE_TYPE',
        message: `Invalid node type: ${String(node.type)}`,
        nodeId: node.id,
      });
      continue;
    }

    // Required fields by node type (minimal invariants)
    if (node.type === 'Page') {
      if (!(node as any).route) {
        issues.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Page.route is required',
          nodeId: node.id,
        });
      }
    }

    if (node.type === 'UserAction') {
      if (!(node as any).actionType) {
        issues.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: 'UserAction.actionType is required',
          nodeId: node.id,
        });
      }
    }

    if (node.type === 'Form') {
      if (!Array.isArray((node as any).fields)) {
        issues.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Form.fields is required (array)',
          nodeId: node.id,
        });
      }
    }
  }

  for (const edge of payload.graph?.edges || []) {
    if (!edge?.id) {
      issues.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'edge.id is required',
      });
      continue;
    }

    if (edgeIds.has(edge.id)) {
      issues.push({
        code: 'DUPLICATE_EDGE_ID',
        message: `Duplicate edge id: ${edge.id}`,
        edgeId: edge.id,
      });
    }
    edgeIds.add(edge.id);

    if (!EDGE_TYPES.includes(edge.type as BehaviorEdgeType)) {
      issues.push({
        code: 'INVALID_EDGE_TYPE',
        message: `Invalid edge type: ${String(edge.type)}`,
        edgeId: edge.id,
      });
      continue;
    }

    if (!edge.source || !edge.target) {
      issues.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'edge.source and edge.target are required',
        edgeId: edge.id,
      });
      continue;
    }

    if (!nodeIdExists.has(edge.source) || !nodeIdExists.has(edge.target)) {
      issues.push({
        code: 'INVALID_EDGE_ENDPOINT',
        message: `Edge endpoints must reference existing node ids (missing source or target)`,
        edgeId: edge.id,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}
