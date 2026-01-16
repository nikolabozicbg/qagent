import type {
  ExecutableTestCase,
  ExecutableTestStep,
  V7DerivedUserGoal,
  V8ExecutionMapping,
  V8RuntimeReport,
} from './types';

export type PromoteParams = {
  derivedUserGoals: V7DerivedUserGoal[];
  v8Report: V8RuntimeReport;
  executionMapping: V8ExecutionMapping;
  // provenance only; V8 promotion does not interpret this.
  reportSource: string;
  goalId: string;
};

export function promoteVerifiedGoal(params: PromoteParams): ExecutableTestCase | null {
  const { derivedUserGoals, v8Report, executionMapping, reportSource, goalId } = params;

  const goal = derivedUserGoals.find(g => g.id === goalId);
  if (!goal) return null;

  const verified = v8Report.verifiedGoals.find(g => g.goalId === goalId);
  if (!verified) return null;

  const mappedAction = executionMapping.actions[goal.startUserActionId];
  if (!mappedAction) return null;

  const effects = verified.observedEffects || {};
  const signalsUsed: Array<'navigation' | 'apiCalls' | 'stateChanges' | 'uiSignals'> = [];

  const assertions: ExecutableTestStep['assertions'] = [];

  if (effects.navigation) {
    signalsUsed.push('navigation');
    assertions.push({
      type: 'url_changed',
      fromUrl: effects.navigation.fromUrl,
      toUrl: effects.navigation.toUrl,
    });
  }

  if (effects.apiCalls && effects.apiCalls.length > 0) {
    signalsUsed.push('apiCalls');
    for (const c of effects.apiCalls) {
      assertions.push({ type: 'http_observed', method: c.method, url: c.url, status: c.status });
    }
  }

  if (effects.stateChanges) {
    signalsUsed.push('stateChanges');
    if (effects.stateChanges.cookiesDelta) {
      assertions.push({ type: 'storage_delta', scope: 'cookies', details: effects.stateChanges.cookiesDelta });
    }
    if (effects.stateChanges.localStorageDelta) {
      assertions.push({ type: 'storage_delta', scope: 'localStorage', details: effects.stateChanges.localStorageDelta });
    }
    if (effects.stateChanges.sessionStorageDelta) {
      assertions.push({ type: 'storage_delta', scope: 'sessionStorage', details: effects.stateChanges.sessionStorageDelta });
    }
  }

  if (effects.uiSignals) {
    const errs = effects.uiSignals;
    const pageErrors = errs.pageErrors || [];
    const consoleErrors = errs.consoleErrors || [];
    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      signalsUsed.push('uiSignals');
      for (const m of pageErrors) assertions.push({ type: 'ui_signal_observed', kind: 'pageerror', message: m });
      for (const m of consoleErrors) assertions.push({ type: 'ui_signal_observed', kind: 'console.error', message: m });
    }
  }

  // Strict: promotion is forbidden unless at least one VERIFIED effect exists.
  if (signalsUsed.length === 0) return null;

  const step: ExecutableTestStep = {
    action: mappedAction,
    assertions,
  };

  // Name must come from runtime effect(s), not AI. Use a deterministic, effect-based label.
  const nameParts: string[] = [];
  if (effects.navigation) nameParts.push(`NAV:${effects.navigation.fromUrl}→${effects.navigation.toUrl}`);
  if (effects.apiCalls && effects.apiCalls.length > 0) nameParts.push(`HTTP:${effects.apiCalls.length}`);
  if (effects.stateChanges) nameParts.push('STATE:delta');
  if (effects.uiSignals && ((effects.uiSignals.pageErrors || []).length + (effects.uiSignals.consoleErrors || []).length > 0)) {
    nameParts.push('UI:errors');
  }
  const name = nameParts.length > 0 ? nameParts.join(' | ') : 'VERIFIED_EFFECT';

  return {
    name,
    goalId: goal.id,
    steps: [step],
    provenance: {
      v7: { startUserActionId: goal.startUserActionId, terminalNodeId: goal.terminalNodeId },
      v8: { reportSource, verifiedGoalId: verified.goalId },
      mapping: { startUserActionId: goal.startUserActionId },
      signalsUsed,
    },
  };
}
