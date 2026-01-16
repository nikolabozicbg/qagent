export type V7DerivedUserGoal = {
  id: string;
  startUserActionId: string;
  terminalNodeId: string;
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
  pageErrors?: string[];
  consoleErrors?: string[];
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

export type V8RuntimeReport = {
  verifiedGoals: V8VerifiedGoal[];
  unverifiedGoals: Array<{ goalId: string; reason: string }>;
};

export type V8ExecutionMapping = {
  actions: Record<
    string,
    | { type: 'click'; selector: string }
    | { type: 'fill'; selector: string; value: string }
    | { type: 'press'; selector: string; key: string }
  >;
  startPath?: string;
};

export type ExecutableTestStep = {
  action: { type: 'click' | 'fill' | 'press'; selector: string; value?: string; key?: string };
  assertions: Array<
    | { type: 'url_changed'; fromUrl: string; toUrl: string }
    | { type: 'http_observed'; method: string; url: string; status?: number }
    | { type: 'storage_delta'; scope: 'cookies' | 'localStorage' | 'sessionStorage'; details: any }
    | { type: 'ui_signal_observed'; kind: 'pageerror' | 'console.error'; message: string }
  >;
};

export type ExecutableTestCase = {
  name: string;
  goalId: string;
  steps: ExecutableTestStep[];
  provenance: {
    v7: { startUserActionId: string; terminalNodeId: string };
    v8: { reportSource: string; verifiedGoalId: string };
    mapping: { startUserActionId: string };
    signalsUsed: Array<'navigation' | 'apiCalls' | 'stateChanges' | 'uiSignals'>;
  };
};
