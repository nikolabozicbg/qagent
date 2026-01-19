/**
 * V9 Discovery Semantic Layer
 * 
 * LLM-based naming and grouping. STRICTLY BOUNDED:
 * - LLM input: ONLY normalized merged model (no raw code)
 * - LLM output: ONLY names/descriptions/tags/intent strings and grouping suggestions
 * - LLM must operate in JSON-only mode
 * - Output must be runtime-validated; if invalid, fallback to deterministic naming
 */

import { MergedTestModel, InternalSuite, InternalCase } from './types';

export interface SemanticEnrichment {
  suites: SuiteSemantics[];
}

export interface SuiteSemantics {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface CaseSemantics {
  id: string;
  name: string;
  intent: string;
  tags: string[];
}

/**
 * LLM prompt for semantic enrichment (JSON-only mode)
 */
const SEMANTIC_SYSTEM_PROMPT = `You are a test naming assistant. Your ONLY job is to provide human-readable names and descriptions for test suites and cases.

RULES:
1. You receive a JSON object describing test structure (routes, actions, elements)
2. You MUST return ONLY a JSON object with names and descriptions
3. You MUST NOT invent test behavior, steps, or assertions
4. You MUST NOT suggest new tests
5. Names should describe WHAT is being tested, not HOW
6. Descriptions should be 1-2 sentences
7. Tags should be lowercase, hyphen-separated

OUTPUT FORMAT (STRICT JSON):
{
  "suites": [
    {
      "id": "suite:route",
      "name": "Human Readable Suite Name",
      "description": "Brief description of what this suite tests",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

/**
 * Enrich merged model with semantic names using LLM
 * Falls back to deterministic naming if LLM fails
 */
export async function enrichWithSemantics(
  model: MergedTestModel,
  llmClient?: LLMClient
): Promise<SemanticEnrichment> {
  // If no LLM client, use deterministic naming
  if (!llmClient) {
    return deterministicEnrichment(model);
  }

  try {
    const prompt = buildSemanticPrompt(model);
    const response = await llmClient.complete(prompt, SEMANTIC_SYSTEM_PROMPT);
    
    // Parse and validate LLM response
    const parsed = parseAndValidateLLMResponse(response, model);
    
    if (parsed) {
      return parsed;
    }
  } catch (error) {
    console.error('[V9 Semantic] LLM enrichment failed, using deterministic fallback:', error);
  }

  // Fallback to deterministic naming
  return deterministicEnrichment(model);
}

/**
 * Build prompt for LLM (only structural info, no code)
 */
function buildSemanticPrompt(model: MergedTestModel): string {
  const suiteDescriptions = model.suites.map(suite => ({
    id: suite.id,
    route: suite.route,
    caseCount: suite.cases.length,
    caseTypes: getCaseTypes(suite.cases),
    hasFormInteraction: suite.cases.some(c => 
      c.steps.some(s => s.action.type === 'fill' || s.action.type === 'submit')
    ),
    hasNavigation: suite.cases.some(c => 
      c.steps.some(s => s.action.type === 'navigate' || s.action.targetRoute)
    ),
    hasRuntimeEvidence: suite.cases.some(c => c.hasRuntimeEvidence),
  }));

  return JSON.stringify({
    instruction: 'Provide human-readable names and descriptions for these test suites',
    suites: suiteDescriptions,
  });
}

function getCaseTypes(cases: InternalCase[]): string[] {
  const types = new Set<string>();
  
  for (const c of cases) {
    if (c.steps.some(s => s.action.type === 'submit')) {
      types.add('form-submission');
    }
    if (c.steps.some(s => s.action.type === 'click')) {
      types.add('click-interaction');
    }
    if (c.steps.some(s => s.action.type === 'navigate')) {
      types.add('navigation');
    }
    if (c.steps.some(s => s.action.type === 'fill')) {
      types.add('data-entry');
    }
  }

  return Array.from(types);
}

/**
 * Parse and validate LLM response
 */
function parseAndValidateLLMResponse(
  response: string,
  model: MergedTestModel
): SemanticEnrichment | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!parsed.suites || !Array.isArray(parsed.suites)) {
      console.error('[V9 Semantic] Invalid LLM response: missing suites array');
      return null;
    }

    // Validate each suite
    const validSuites: SuiteSemantics[] = [];
    const suiteIds = new Set(model.suites.map(s => s.id));

    for (const suite of parsed.suites) {
      if (!suite.id || !suiteIds.has(suite.id)) {
        console.warn(`[V9 Semantic] Unknown suite ID in LLM response: ${suite.id}`);
        continue;
      }

      if (typeof suite.name !== 'string' || suite.name.length === 0) {
        console.warn(`[V9 Semantic] Invalid suite name for ${suite.id}`);
        continue;
      }

      validSuites.push({
        id: suite.id,
        name: sanitizeName(suite.name),
        description: sanitizeDescription(suite.description || ''),
        tags: sanitizeTags(suite.tags || []),
      });
    }

    // Ensure all suites have semantics (fill in missing with deterministic)
    for (const modelSuite of model.suites) {
      if (!validSuites.find(s => s.id === modelSuite.id)) {
        validSuites.push(deterministicSuiteSemantics(modelSuite));
      }
    }

    return { suites: validSuites };
  } catch (error) {
    console.error('[V9 Semantic] Failed to parse LLM response:', error);
    return null;
  }
}

/**
 * Deterministic naming fallback (no LLM)
 */
function deterministicEnrichment(model: MergedTestModel): SemanticEnrichment {
  return {
    suites: model.suites.map(deterministicSuiteSemantics),
  };
}

function deterministicSuiteSemantics(suite: InternalSuite): SuiteSemantics {
  // Derive name from route
  const routeParts = suite.route.split('/').filter(Boolean);
  const lastPart = routeParts[routeParts.length - 1] || 'home';
  
  // Convert route segment to readable name
  const name = lastPart
    .replace(/[_-]/g, ' ')
    .replace(/:/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Generate description from case types
  const caseTypes = getCaseTypes(suite.cases);
  const description = `Tests for ${suite.route} route covering ${caseTypes.join(', ')}`;

  // Generate tags from route and case types
  const tags = [
    ...routeParts.filter(p => !p.startsWith(':')),
    ...caseTypes,
  ];

  return {
    id: suite.id,
    name: `${name} Tests`,
    description,
    tags: tags.map(t => t.toLowerCase().replace(/\s+/g, '-')),
  };
}

/**
 * Generate deterministic case semantics
 */
export function deterministicCaseSemantics(
  caseData: InternalCase,
  suiteRoute: string
): CaseSemantics {
  // Determine primary action type
  const primaryActions = caseData.steps
    .filter(s => s.action.type !== 'navigate')
    .map(s => s.action.type);
  
  const primaryAction = primaryActions[0] || 'interact';

  // Build name
  let name: string;
  switch (primaryAction) {
    case 'submit':
      name = `Submit form on ${suiteRoute}`;
      break;
    case 'fill':
      name = `Fill form fields on ${suiteRoute}`;
      break;
    case 'click':
      name = `Click interaction on ${suiteRoute}`;
      break;
    default:
      name = `Verify ${suiteRoute} page`;
  }

  // Build intent
  const hasRuntimeEvidence = caseData.hasRuntimeEvidence;
  const intent = hasRuntimeEvidence
    ? `Verified: ${primaryAction} action on ${suiteRoute}`
    : `Candidate: ${primaryAction} action on ${suiteRoute}`;

  // Tags
  const tags = [
    primaryAction,
    hasRuntimeEvidence ? 'verified' : 'candidate',
  ];

  return {
    id: caseData.id,
    name,
    intent,
    tags,
  };
}

// Sanitization helpers

function sanitizeName(name: string): string {
  // Remove potentially problematic characters, limit length
  return name
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 100);
}

function sanitizeDescription(description: string): string {
  return description
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 500);
}

function sanitizeTags(tags: unknown[]): string[] {
  return tags
    .filter(t => typeof t === 'string')
    .map(t => (t as string).toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    .slice(0, 10);
}

// LLM Client interface (to be implemented by caller)
export interface LLMClient {
  complete(prompt: string, systemPrompt: string): Promise<string>;
}
