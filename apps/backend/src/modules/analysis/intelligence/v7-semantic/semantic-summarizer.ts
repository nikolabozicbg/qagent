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

The ONLY source of truth is the BEHAVIOR GRAPH.
If something is not present in the behavior graph,
it does not exist.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES (NO EXCEPTIONS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST NEVER:
- invent behavior
- guess missing steps
- infer features from UI
- assume routes or paths
- hardcode logic
- specialize output for one application
- generalize beyond the provided graph

If any information is missing or ambiguous:
→ explicitly mark it as "UNKNOWN"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY structured data.
NO explanations.
NO code.
NO assumptions.

{
  "suites": [
    {
      "name": "<Business Domain>",
      "description": "<Business capability>",
      "preconditions": [],
      "cases": [
        {
          "name": "<User Goal>",
          "intent": "<User intent>",
          "preconditions": [],
          "steps": [
            {
              "action": "<User action>",
              "expected": "<Observable system behavior>"
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
  const prompt = buildV7SemanticPrompt(input.payload, input.goals);
  const out = await llmClient.completeJSON<V7SemanticOutput>(prompt, {
    systemPrompt: V7_SEMANTIC_SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 4096,
  });

  return validateSemanticOutput(out);
}

function buildV7SemanticPrompt(payload: BehaviorGraphPayload, goals: V7UserGoal[]): string {
  // Keep it compact and deterministic: we pass only verified nodes/edges plus derived goals.
  return JSON.stringify({
    project: payload.project,
    graph: payload.graph,
    derivedUserGoals: goals,
  });
}

function validateSemanticOutput(out: any): V7SemanticOutput {
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

  // Minimal shape validation; never “fix” content.
  for (const s of suites) {
    if (!s?.name) unknowns.push('UNKNOWN: suite.name missing');
    if (!s?.description) unknowns.push('UNKNOWN: suite.description missing');
    if (!Array.isArray(s?.cases)) unknowns.push('UNKNOWN: suite.cases missing');
  }

  return {
    suites,
    unknowns: [...(Array.isArray(out.unknowns) ? out.unknowns : []), ...unknowns],
  };
}
