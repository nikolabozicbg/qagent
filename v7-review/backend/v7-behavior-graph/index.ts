import { BehaviorGraphPayload, V7UserGoal } from '../types/behavior-graph.types';
import { validateBehaviorGraphPayload } from './validator';
import { normalizeBehaviorGraphPayload } from './normalizer';
import { extractUserGoals } from './goal-extractor';

export interface V7ProcessorResult {
  ok: boolean;
  payload?: BehaviorGraphPayload;
  goals?: V7UserGoal[];
  unknowns?: string[];
  validationIssues?: ReturnType<typeof validateBehaviorGraphPayload>['issues'];
  stats?: {
    normalization: ReturnType<typeof normalizeBehaviorGraphPayload>['stats'];
    goalExtraction: ReturnType<typeof extractUserGoals>['stats'];
  };
}

export function processBehaviorGraph(payload: BehaviorGraphPayload): V7ProcessorResult {
  const validation = validateBehaviorGraphPayload(payload);
  if (!validation.valid) {
    return {
      ok: false,
      validationIssues: validation.issues,
    };
  }

  const normalized = normalizeBehaviorGraphPayload(payload);
  const goalsResult = extractUserGoals(normalized.payload.graph);

  const unknowns: string[] = [];
  for (const g of goalsResult.goals) {
    unknowns.push(...g.unknowns);
  }

  return {
    ok: true,
    payload: normalized.payload,
    goals: goalsResult.goals,
    unknowns,
    stats: {
      normalization: normalized.stats,
      goalExtraction: goalsResult.stats,
    },
  };
}
