import type { Browser } from 'playwright';
import { promoteVerifiedGoal } from '@qagent/v8-promotion';
import type {
  UiReadyOutput,
  V8BatchExecutionMapping,
  V8Report,
} from './types';

type V7Goal = { id: string; startUserActionId: string; terminalNodeId: string };

type BatchParams = {
  browser: Browser;
  baseUrl: string;
  derivedUserGoals: V7Goal[];
  mapping: V8BatchExecutionMapping;
  // provenance only; does not affect behavior
  reportSource: string;
};

async function runOne(params: {
  browser: Browser;
  baseUrl: string;
  goal: V7Goal;
  mapping: V8BatchExecutionMapping;
}): Promise<{ ok: boolean; verifiedGoal?: { goalId: string; observedEffects: any }; unverified?: { goalId: string; reason: string } }> {
  const { executeOneGoal } = await import('./executor');

  // enforce isolated mode (each executeOneGoal creates a fresh context)
  const singleMapping = {
    actions: params.mapping.actions,
    startPath: params.mapping.startPath,
  };

  const report = await executeOneGoal({
    browser: params.browser,
    baseUrl: params.baseUrl,
    goal: params.goal,
    mapping: singleMapping,
    timeoutMs: params.mapping.batch.timeoutMs,
  });

  if (report.verifiedGoals.length > 0) {
    return { ok: true, verifiedGoal: report.verifiedGoals[0] };
  }
  return { ok: false, unverified: report.unverifiedGoals[0] || { goalId: params.goal.id, reason: 'UNVERIFIED' } };
}

function suiteKeyFromTestCase(tc: any): string {
  // Deterministic grouping rule:
  // - NAV_TO:<toUrl> if any assertion has type url_changed
  // - else UNCLUSTERED
  const steps = Array.isArray(tc?.steps) ? tc.steps : [];
  for (const st of steps) {
    const assertions = Array.isArray(st?.assertions) ? st.assertions : [];
    for (const a of assertions) {
      if (a?.type === 'url_changed' && typeof a?.toUrl === 'string') {
        return `NAV_TO:${a.toUrl}`;
      }
    }
  }
  return 'UNCLUSTERED';
}

export async function executeBatchGoals(params: BatchParams): Promise<UiReadyOutput> {
  const { browser, baseUrl, derivedUserGoals, mapping, reportSource } = params;

  if (mapping.version !== 'v8-mapping-1') {
    throw new Error('Invalid mapping version');
  }
  if (mapping.batch.mode !== 'isolated') {
    throw new Error('Invalid batch mode (must be isolated)');
  }

  const v8Report: V8Report = { verifiedGoals: [], unverifiedGoals: [] };
  const promotedCases: any[] = [];

  for (const goalId of mapping.batch.goalIds) {
    const goal = derivedUserGoals.find(g => g.id === goalId);
    if (!goal) {
      v8Report.unverifiedGoals.push({ goalId, reason: 'GOAL_NOT_FOUND' });
      continue;
    }

    // Fail-fast for missing mapping
    if (!mapping.actions[goal.startUserActionId]) {
      v8Report.unverifiedGoals.push({ goalId: goal.id, reason: 'NO_EXECUTION_MAPPING' });
      continue;
    }

    const res = await runOne({ browser, baseUrl, goal, mapping });
    if (res.verifiedGoal) {
      v8Report.verifiedGoals.push(res.verifiedGoal);

      // Promote strictly: VERIFIED + observed effects + mapping
      const tc = promoteVerifiedGoal({
        derivedUserGoals,
        v8Report: { verifiedGoals: [res.verifiedGoal], unverifiedGoals: [] },
        executionMapping: { actions: mapping.actions, startPath: mapping.startPath },
        reportSource,
        goalId: goal.id,
      });

      if (tc) {
        promotedCases.push(tc);
      }
    } else {
      v8Report.unverifiedGoals.push(res.unverified || { goalId: goal.id, reason: 'UNVERIFIED' });
    }
  }

  // Group into suites deterministically.
  const suitesByKey = new Map<string, { name: string; cases: any[] }>();
  for (const c of promotedCases) {
    const key = suiteKeyFromTestCase(c);
    const existing = suitesByKey.get(key) || { name: key, cases: [] as any[] };
    existing.cases.push(c);
    suitesByKey.set(key, existing);
  }

  // Stable ordering: NAV_TO:* first (lexicographically), UNCLUSTERED last.
  const keys = Array.from(suitesByKey.keys()).sort((a, b) => {
    if (a === 'UNCLUSTERED' && b !== 'UNCLUSTERED') return 1;
    if (b === 'UNCLUSTERED' && a !== 'UNCLUSTERED') return -1;
    return a.localeCompare(b);
  });

  const suites = keys.map(k => suitesByKey.get(k)!);

  return {
    success: true,
    suites,
    v8Report,
  };
}
