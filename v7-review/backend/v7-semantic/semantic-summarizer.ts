import { BehaviorGraphPayload, V7UserGoal } from '../../types/behavior-graph.types';
import { V7LLMClient } from './llm-client';

export interface V7SemanticSuite {
  name: string;
  description: string;
  preconditions: string[];
  cases: Array<{
    name: string;
    intent: string;
    preconditions: string[];
    steps: Array<{ action: string; expected: string }>;
    successCriteria: string[];
    failureScenarios: string[];
    edgeCases: string[];
  }>;
}

export interface V7SemanticOutput {
  suites: V7SemanticSuite[];
  unknowns: string[];
}

export const V7_SEMANTIC_SYSTEM_PROMPT = `You are an AI SEMANTIC ANALYSIS LAYER.

You are used ONLY because certain tasks require
natural-language abstraction and semantic grouping.

You are NOT used for:
- code analysis
- behavior discovery
- control flow reconstruction
- feature inference
- test logic generation

All deterministic logic is owned by the system.
You exist ONLY to translate VERIFIED behavior into
human-meaningful structure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE OF TRUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The ONLY source of truth is derivedUserGoals (the list you receive).
You must NOT use or reference any other context.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES (NO EXCEPTIONS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST NEVER:
- invent domains (e.g. "Authentication", "Checkout", "Navigation")
- invent user actions
- invent terminal outcomes
- assume typical flows (login/signup/etc.)
- guess missing steps

If information is missing or ambiguous:
→ explicitly mark it as "UNKNOWN".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Suites are OPTIONAL.
- If you cannot name a domain strictly from derivedUserGoals, set suite.name = "UNKNOWN".
- "Navigation" is NOT a valid domain.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY structured JSON (no extra keys).
NO explanations.
NO code.

{
  "suites": [
    {
      "name": "UNKNOWN",
      "description": "UNKNOWN",
      "preconditions": [],
      "cases": [
        {
          "name": "UNKNOWN",
          "intent": "UNKNOWN",
          "preconditions": [],
          "steps": [
            {
              "action": "UNKNOWN",
              "expected": "UNKNOWN"
            }
          ],
          "successCriteria": [],
          "failureScenarios": [],
          "edgeCases": []
        }
      ]
    }
  ],
  "unknowns": []
}`;

export async function summarizeBehaviorGraphSemantically(
  input: {
    payload: BehaviorGraphPayload;
    goals: V7UserGoal[];
  },
  llmClient: V7LLMClient
): Promise<V7SemanticOutput> {
  const prompt = buildV7SemanticPrompt(input.goals);
  const out = await llmClient.completeJSON<V7SemanticOutput>(prompt, {
    systemPrompt: V7_SEMANTIC_SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 4096,
  });

  return validateSemanticOutput(out, input.goals);
}

function buildV7SemanticPrompt(goals: V7UserGoal[]): string {
  // V7 rule: AI must operate ONLY on derivedUserGoals.
  // We additionally provide strict formatting expectations that can be validated.
  return JSON.stringify({
    derivedUserGoals: goals,
    outputRequirements: {
      suiteName: 'UNKNOWN',
      caseNameMustEqualGoalId: true,
      stepActionMustReferenceStartUserActionId: true,
      stepExpectedMustReferenceTerminalNodeId: true,
    },
  });
}

function validateSemanticOutput(out: any, goals: V7UserGoal[]): V7SemanticOutput {
  const unknowns: string[] = [];

  if (!out || typeof out !== 'object') {
    return { suites: [], unknowns: ['UNKNOWN: AI output is not an object'] };
  }

  if (!Array.isArray(out.suites)) {
    unknowns.push('UNKNOWN: AI output missing suites[]');
  }

  if (!Array.isArray(out.unknowns)) {
    unknowns.push('UNKNOWN: AI output missing unknowns[]');
  }

  const suites: V7SemanticSuite[] = Array.isArray(out.suites) ? out.suites : [];
  const goalById = new Map(goals.map(g => [g.id, g] as const));

  // Strict V7 guardrails:
  // - Do not allow invented domains → suite.name MUST be UNKNOWN
  // - Do not allow invented goals/actions/outcomes → each case must map to a derived goal
  //   and steps must reference the goal's startUserActionId and terminalNodeId.
  let violated = false;

  for (const s of suites) {
    if (!s?.name) {
      unknowns.push('UNKNOWN: suite.name missing');
      violated = true;
      continue;
    }
    if (s.name !== 'UNKNOWN') {
      unknowns.push(`UNKNOWN: suite.name must be "UNKNOWN" (got "${String(s.name)}")`);
      violated = true;
    }
    if (s?.name === 'Navigation') {
      unknowns.push('UNKNOWN: invalid suite.name "Navigation"');
      violated = true;
    }
    if (!s?.description) {
      unknowns.push('UNKNOWN: suite.description missing');
      violated = true;
    }
    if (!Array.isArray(s?.preconditions)) {
      unknowns.push('UNKNOWN: suite.preconditions missing');
      violated = true;
    }
    if (!Array.isArray(s?.cases)) {
      unknowns.push('UNKNOWN: suite.cases missing');
      violated = true;
      continue;
    }

    for (const c of s.cases) {
      if (!c?.name) {
        unknowns.push('UNKNOWN: case.name missing');
        violated = true;
        continue;
      }
      const goal = goalById.get(c.name);
      if (!goal) {
        unknowns.push(`UNKNOWN: case.name must equal a derived goal id (got "${String(c.name)}")`);
        violated = true;
        continue;
      }

      const steps = Array.isArray(c.steps) ? c.steps : [];
      if (steps.length === 0) {
        unknowns.push(`UNKNOWN: case.steps missing for ${goal.id}`);
        violated = true;
        continue;
      }

      const actionText = String(steps[0]?.action ?? '');
      const expectedText = String(steps[0]?.expected ?? '');
      if (!actionText.includes(goal.startUserActionId)) {
        unknowns.push(`UNKNOWN: step.action must reference startUserActionId (${goal.startUserActionId}) for ${goal.id}`);
        violated = true;
      }
      if (!expectedText.includes(goal.terminalNodeId)) {
        unknowns.push(`UNKNOWN: step.expected must reference terminalNodeId (${goal.terminalNodeId}) for ${goal.id}`);
        violated = true;
      }
    }
  }

  if (violated) {
    return {
      suites: [],
      unknowns: [...(Array.isArray(out.unknowns) ? out.unknowns : []), ...unknowns],
    };
  }

  return {
    suites,
    unknowns: [...(Array.isArray(out.unknowns) ? out.unknowns : []), ...unknowns],
  };
}
