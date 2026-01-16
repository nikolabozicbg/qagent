export type V8GoalInput = {
  id: string;
  startUserActionId: string;
  terminalNodeId: string;
  // Optional: V7 may include route hints in future; V8 treats them as opaque.
  pageRouteHint?: string;
};

export type V8InputFile = {
  derivedUserGoals: V8GoalInput[];
};

export type V8ExecutionAction =
  | { type: 'click'; selector: string }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'press'; selector: string; key: string };

export type V8ExecutionMapping = {
  // Deterministic mapping provided externally (V8 does NOT infer selectors).
  actions: Record<string, V8ExecutionAction>;
  // Optional: where to start before executing an action (e.g. '/').
  // If omitted, baseUrl is used.
  startPath?: string;
};

export type V8BatchExecutionMapping = V8ExecutionMapping & {
  version: 'v8-mapping-1';
  batch: {
    goalIds: string[];
    mode: 'isolated';
    timeoutMs?: number;
  };
};

export type V8ObservedNavigation = {
  fromUrl: string;
  toUrl: string;
};

export type V8ObservedApiCall = {
  method: string;
  url: string;
  status?: number;
};

export type V8ObservedStateChanges = {
  cookiesDelta?: {
    added: Array<{ name: string; value: string }>;
    removed: Array<{ name: string; value: string }>;
    changed: Array<{ name: string; from: string; to: string }>;
  };
  localStorageDelta?: {
    added: Record<string, string>;
    removed: string[];
    changed: Array<{ key: string; from: string; to: string }>;
  };
  sessionStorageDelta?: {
    added: Record<string, string>;
    removed: string[];
    changed: Array<{ key: string; from: string; to: string }>;
  };
};

export type V8ObservedUiSignals = {
  pageErrors: string[];
  consoleErrors: string[];
};

export type V8ObservedEffects = {
  navigation?: V8ObservedNavigation;
  apiCalls?: V8ObservedApiCall[];
  stateChanges?: V8ObservedStateChanges;
  uiSignals?: V8ObservedUiSignals;
};

export type V8VerifiedGoal = {
  goalId: string;
  observedEffects: V8ObservedEffects;
};

export type V8UnverifiedGoal = {
  goalId: string;
  reason: string;
};

export type V8Report = {
  verifiedGoals: V8VerifiedGoal[];
  unverifiedGoals: V8UnverifiedGoal[];
};

// UI-ready output (no AI): suites grouped deterministically by NAV_TO:<toUrl> else UNCLUSTERED
export type UiReadySuite = {
  name: string;
  cases: any[]; // promoted ExecutableTestCase objects (kept serializable)
};

export type UiReadyOutput = {
  success: true;
  suites: UiReadySuite[];
  v8Report: V8Report;
};
