import type { Browser, BrowserContext, Page } from 'playwright';
import type {
  V8ExecutionMapping,
  V8GoalInput,
  V8ObservedEffects,
  V8Report,
} from './types';
import { createObservationSession } from './observer';

export async function executeOneGoal(params: {
  browser: Browser;
  baseUrl: string;
  goal: V8GoalInput;
  mapping?: V8ExecutionMapping;
  timeoutMs?: number;
}): Promise<V8Report> {
  const { browser, baseUrl, goal, mapping } = params;
  const timeoutMs = params.timeoutMs ?? 10_000;

  if (!mapping?.actions?.[goal.startUserActionId]) {
    return {
      verifiedGoals: [],
      unverifiedGoals: [{ goalId: goal.id, reason: 'NO_EXECUTION_MAPPING' }],
    };
  }

  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();

  const startUrl = mapping.startPath ? new URL(mapping.startPath, baseUrl).toString() : baseUrl;

  try {
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    const { session } = await createObservationSession(page, context);

    // Execute the mapped action (deterministic; provided externally)
    const action = mapping.actions[goal.startUserActionId];
    if (action.type === 'click') {
      await page.click(action.selector, { timeout: timeoutMs });
    } else if (action.type === 'fill') {
      await page.fill(action.selector, action.value, { timeout: timeoutMs });
    } else if (action.type === 'press') {
      await page.press(action.selector, action.key, { timeout: timeoutMs });
    }

    // Allow effects to materialize (deterministic time bound)
    await page.waitForTimeout(500);

    const navigation = session.getNavigation();
    const apiCalls = session.getApiCalls();
    const stateChanges = await session.getStateChanges();
    const uiSignals = session.getUiSignals();

    const observedEffects: V8ObservedEffects = {};
    if (navigation) observedEffects.navigation = navigation;
    if (apiCalls.length > 0) observedEffects.apiCalls = apiCalls;
    if (stateChanges) observedEffects.stateChanges = stateChanges;
    if (uiSignals.pageErrors.length > 0 || uiSignals.consoleErrors.length > 0) {
      observedEffects.uiSignals = uiSignals;
    }

    const verified =
      !!observedEffects.navigation ||
      (observedEffects.apiCalls && observedEffects.apiCalls.length > 0) ||
      !!observedEffects.stateChanges ||
      !!observedEffects.uiSignals;

    if (!verified) {
      return {
        verifiedGoals: [],
        unverifiedGoals: [{ goalId: goal.id, reason: 'NO_OBSERVED_EFFECTS' }],
      };
    }

    return {
      verifiedGoals: [{ goalId: goal.id, observedEffects }],
      unverifiedGoals: [],
    };
  } catch (err: any) {
    return {
      verifiedGoals: [],
      unverifiedGoals: [{ goalId: goal.id, reason: `EXECUTION_ERROR: ${String(err?.message || err)}` }],
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}
