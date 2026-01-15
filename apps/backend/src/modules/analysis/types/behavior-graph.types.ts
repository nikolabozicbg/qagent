export type BehaviorNodeType =
  | 'Page'
  | 'UserAction'
  | 'Form'
  | 'ApiCall'
  | 'StateMutation'
  | 'Navigation'
  | 'Conditional';

export type BehaviorEdgeType =
  | 'triggers'
  | 'depends_on'
  | 'results_in'
  | 'blocks'
  | 'redirects_to';

export interface BehaviorGraphPayload {
  version: 'v7';
  project: {
    name: string;
    framework: {
      name: string;
      version?: string;
      router?: string | null;
    };
  };
  graph: BehaviorGraph;
}

export interface BehaviorGraph {
  nodes: BehaviorNode[];
  edges: BehaviorEdge[];
}

export interface BehaviorNodeBase {
  id: string;
  type: BehaviorNodeType;
  /** Absolute or repo-relative path; optional in MVP */
  filePath?: string;
  /** 1-indexed line number; optional in MVP */
  line?: number;
}

export interface PageNode extends BehaviorNodeBase {
  type: 'Page';
  route: string;
  /** Whether backend/electron could deterministically verify auth gating. */
  isProtected?: boolean;
}

export interface FormNode extends BehaviorNodeBase {
  type: 'Form';
  /** Optional stable identifier if available (e.g. inferred form key) */
  formId?: string;
  fields: Array<{
    name: string;
    inputType?: string;
    required?: boolean;
    constraints?: Array<{ type: string; value?: string | number | boolean }>;
  }>;
}

export interface UserActionNode extends BehaviorNodeBase {
  type: 'UserAction';
  /** click | submit | confirm | cancel (stringly typed for portability) */
  actionType: string;
  /** Human hint if available (e.g. handler name, label) */
  label?: string;
}

export interface ApiCallNode extends BehaviorNodeBase {
  type: 'ApiCall';
  method?: string;
  endpoint?: string;
}

export interface NavigationNode extends BehaviorNodeBase {
  type: 'Navigation';
  /** target route if statically known */
  to?: string;
}

export interface ConditionalNode extends BehaviorNodeBase {
  type: 'Conditional';
  /** deterministic description if extractable (e.g. "if not authenticated") */
  condition?: string;
}

export interface StateMutationNode extends BehaviorNodeBase {
  type: 'StateMutation';
  /** deterministic key/target if extractable (e.g. "auth.token", "cart.items") */
  stateKey?: string;
  /** set | unset | update | invalidate etc. */
  mutationType?: string;
}

export type BehaviorNode =
  | PageNode
  | FormNode
  | UserActionNode
  | ApiCallNode
  | NavigationNode
  | ConditionalNode
  | StateMutationNode;

export interface BehaviorEdge {
  id: string;
  type: BehaviorEdgeType;
  source: string;
  target: string;
}

export interface V7ValidationIssue {
  code:
    | 'INVALID_NODE_TYPE'
    | 'INVALID_EDGE_TYPE'
    | 'DUPLICATE_NODE_ID'
    | 'DUPLICATE_EDGE_ID'
    | 'MISSING_NODE'
    | 'INVALID_EDGE_ENDPOINT'
    | 'MISSING_REQUIRED_FIELD';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface V7UserGoal {
  id: string;
  /** Starting UserAction node */
  startUserActionId: string;
  /** Terminal node that ends the goal */
  terminalNodeId: string;
  /** Ordered chain if deterministically derivable */
  orderedNodeIds: string[];
  orderedEdgeIds: string[];
  unknowns: string[];
}
