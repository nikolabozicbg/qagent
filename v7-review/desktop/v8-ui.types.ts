/**
 * V8 UI-ready output types (render-only).
 * Source of truth: ui-ready.suites.json emitted by packages/v8-runtime CLI.
 */

export type V8UiReadyAssertion = Record<string, any>;

export interface V8UiReadyStep {
  action: {
    type: string;
    selector?: string;
    value?: string;
    url?: string;
  };
  assertions: V8UiReadyAssertion[];
}

export interface V8UiReadyCase {
  name: string;
  goalId: string;
  steps: V8UiReadyStep[];
  provenance: Record<string, any>;
}

export interface V8UiReadySuite {
  name: string;
  cases: V8UiReadyCase[];
}

export interface V8UiReadyReport {
  verifiedGoals: Array<Record<string, any>>;
  unverifiedGoals: Array<Record<string, any>>;
}

export interface V8UiReadyOutput {
  success: boolean;
  suites: V8UiReadySuite[];
  v8Report?: V8UiReadyReport;
}
