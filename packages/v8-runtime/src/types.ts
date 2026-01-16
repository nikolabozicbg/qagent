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

export type V8ExecutionMapping = {
  // Deterministic mapping provided externally (V8 does NOT infer selectors).
  // Example:
  // {
  //   "ua:abcd": { "type": "click", "selector": "button[data-testid='submit']" }
  // }
  actions: Record<
    string,
    | { type: 'click'; selector: string }
    | { type: 'fill'; selector: string; value: string }
    | { type: 'press'; selector: string; key: string }
  >;
  // Optional: where to start before executing an action (e.g. '/').
  // If omitted, baseUrl is used.
  startPath?: string;
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
