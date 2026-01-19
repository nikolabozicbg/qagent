/**
 * V9 Discovery Pipeline Orchestrator
 * 
 * Main entry point for the Discovery V9 endpoint.
 * Coordinates: validation → normalization → merging → semantic → scoring → output
 */

import {
  DiscoveryV9Request,
  DiscoveryResultV9,
  SuiteV9,
  CaseV9,
  StepV9,
  StepProvenance,
  MergedTestModel,
  InternalSuite,
  InternalCase,
} from './types';

import { validateDiscoveryV9Request, ValidationResult } from './validator';
import { normalizeDiscoveryData, NormalizedData } from './normalizer';
import { mergeGraphs } from './merger';
import { enrichWithSemantics, deterministicCaseSemantics, LLMClient, SemanticEnrichment } from './semantic';
import { scoreModel, ScoredModel, ScoredSuite, ScoredCase, ModelSummary } from './scorer';

export interface DiscoveryV9Options {
  llmClient?: LLMClient;
  enableSemanticEnrichment?: boolean;
}

export interface DiscoveryV9Result {
  ok: boolean;
  result?: DiscoveryResultV9;
  error?: string;
  validationErrors?: string[];
}

/**
 * Main V9 Discovery Pipeline
 * 
 * Stages:
 * 1. Validate request
 * 2. Normalize graphs (canonicalize IDs, routes)
 * 3. Merge SBG + ROG into internal test model
 * 4. Semantic enrichment (LLM or deterministic fallback)
 * 5. Score model (confidence, priority, coverage)
 * 6. Transform to DiscoveryResultV9 output format
 */
export async function runDiscoveryV9(
  request: DiscoveryV9Request,
  options: DiscoveryV9Options = {}
): Promise<DiscoveryV9Result> {
  const startTime = Date.now();

  // Stage 1: Validate
  console.log('[V9 Discovery] Stage 1: Validating request...');
  const validation = validateDiscoveryV9Request(request);
  if (!validation.valid) {
    return {
      ok: false,
      error: 'VALIDATION_FAILED',
      validationErrors: validation.errors,
    };
  }

  // Stage 2: Normalize
  console.log('[V9 Discovery] Stage 2: Normalizing graphs...');
  const normalized = normalizeDiscoveryData(
    request.staticGraph,
    request.runtimeGraph
  );

  // Stage 3: Merge
  console.log('[V9 Discovery] Stage 3: Merging SBG + ROG...');
  const merged = mergeGraphs(normalized);
  
  console.log(`[V9 Discovery]   - Created ${merged.suites.length} suites`);
  const totalCases = merged.suites.reduce((sum, s) => sum + s.cases.length, 0);
  const totalSteps = merged.suites.reduce(
    (sum, s) => sum + s.cases.reduce((cs, c) => cs + c.steps.length, 0),
    0
  );
  console.log(`[V9 Discovery]   - Total cases: ${totalCases}, steps: ${totalSteps}`);

  // Stage 4: Semantic enrichment
  console.log('[V9 Discovery] Stage 4: Semantic enrichment...');
  const enableSemantic = options.enableSemanticEnrichment !== false;
  const semantics = enableSemantic
    ? await enrichWithSemantics(merged, options.llmClient)
    : await enrichWithSemantics(merged); // Deterministic fallback

  // Stage 5: Score
  console.log('[V9 Discovery] Stage 5: Scoring model...');
  const scored = scoreModel(merged);

  // Stage 6: Transform to output format
  console.log('[V9 Discovery] Stage 6: Building output...');
  const result = buildDiscoveryResult(
    request,
    merged,
    semantics,
    scored,
    Date.now() - startTime
  );

  console.log(`[V9 Discovery] ✅ Complete in ${Date.now() - startTime}ms`);
  console.log(`[V9 Discovery]   - ${result.suites.length} suites`);
  console.log(`[V9 Discovery]   - ${result.summary.totalCases} cases`);
  console.log(`[V9 Discovery]   - ${result.summary.totalSteps} steps`);
  console.log(`[V9 Discovery]   - Avg confidence: ${result.summary.averageConfidence}`);

  return {
    ok: true,
    result,
  };
}

/**
 * Build the final DiscoveryResultV9 output
 */
function buildDiscoveryResult(
  request: DiscoveryV9Request,
  merged: MergedTestModel,
  semantics: SemanticEnrichment,
  scored: ScoredModel,
  durationMs: number
): DiscoveryResultV9 {
  // Create lookup maps for semantics and scores
  const semanticsBySuiteId = new Map(semantics.suites.map(s => [s.id, s]));
  const scoresBySuiteId = new Map(scored.suites.map(s => [s.id, s]));

  // Transform suites
  const suites: SuiteV9[] = merged.suites.map(internalSuite => {
    const suiteSemantics = semanticsBySuiteId.get(internalSuite.id);
    const suiteScores = scoresBySuiteId.get(internalSuite.id);

    // Create score lookup for cases
    const caseScoresById = new Map(
      suiteScores?.cases.map(c => [c.id, c]) || []
    );

    // Transform cases
    const cases: CaseV9[] = internalSuite.cases.map(internalCase => {
      const caseScore = caseScoresById.get(internalCase.id);
      const caseSemantics = deterministicCaseSemantics(internalCase, internalSuite.route);

      // Transform steps
      const steps: StepV9[] = internalCase.steps.map((internalStep, idx) => {
        const provenance: StepProvenance = {
          from: internalStep.from,
          refs: [
            internalStep.staticRef,
            internalStep.runtimeRef,
          ].filter(Boolean) as string[],
          filePath: internalStep.filePath,
          lineNumber: internalStep.lineNumber,
          runtimeObservationId: internalStep.runtimeRef,
        };

        return {
          index: idx + 1,
          action: formatAction(internalStep.action),
          expected: internalStep.expected || generateExpected(internalStep.action),
          provenance,
          description: internalStep.description,
        };
      });

      return {
        id: internalCase.id,
        name: caseSemantics.name,
        intent: caseSemantics.intent,
        priority: caseScore?.priority || 'medium',
        confidence: caseScore?.confidence || 0.5,
        preconditions: generatePreconditions(internalCase, internalSuite.route),
        steps,
        successCriteria: generateSuccessCriteria(internalCase),
        failureScenarios: generateFailureScenarios(internalCase),
        provenance: {
          from: determineOverallProvenance(internalCase),
          refs: collectAllRefs(internalCase),
        },
      };
    });

    return {
      id: internalSuite.id,
      name: suiteSemantics?.name || `Suite: ${internalSuite.route}`,
      description: suiteSemantics?.description || '',
      tags: suiteSemantics?.tags || [],
      cases,
      coverage: {
        routes: [internalSuite.route],
        components: internalSuite.componentIds,
        actions: getUniqueActions(internalSuite.cases),
      },
    };
  });

  // Build summary
  const summary = {
    totalSuites: suites.length,
    totalCases: scored.summary.totalCases,
    totalSteps: scored.summary.totalSteps,
    averageConfidence: scored.summary.averageConfidence,
    provenanceBreakdown: scored.summary.provenanceBreakdown,
    qualityIndicators: scored.summary.qualityIndicators,
  };

  // Build diagnostics
  const diagnostics = {
    processingTimeMs: durationMs,
    inputStats: {
      sbgNodes: request.staticGraph?.nodes?.length || 0,
      rogPages: request.runtimeGraph?.pages?.length || 0,
    },
    mergeStats: {
      matchedNodes: countMatchedNodes(merged),
      unmatchedStatic: countUnmatchedStatic(merged),
      unmatchedRuntime: countUnmatchedRuntime(merged),
    },
  };

  return {
    success: true,
    suites,
    summary,
    diagnostics,
    timestamp: new Date().toISOString(),
    version: 'v9',
  };
}

// Helper functions

function formatAction(action: { type: string; selector?: string; value?: string }): string {
  switch (action.type) {
    case 'navigate':
      return `Navigate to ${action.value || 'page'}`;
    case 'click':
      return `Click ${action.selector || 'element'}`;
    case 'fill':
      return `Fill ${action.selector || 'field'} with "${action.value || 'value'}"`;
    case 'submit':
      return `Submit form`;
    case 'assert':
      return `Verify ${action.value || 'condition'}`;
    default:
      return `${action.type} ${action.selector || action.value || ''}`.trim();
  }
}

function generateExpected(action: { type: string; selector?: string; value?: string }): string {
  switch (action.type) {
    case 'navigate':
      return 'Page loads successfully';
    case 'click':
      return 'Element responds to click';
    case 'fill':
      return 'Field accepts input';
    case 'submit':
      return 'Form submission processed';
    default:
      return 'Action completes successfully';
  }
}

function generatePreconditions(caseData: InternalCase, route: string): string[] {
  const conditions: string[] = [];

  // Navigation precondition
  conditions.push(`User is on ${route}`);

  // If form, user should be logged in (for most forms)
  const hasFormActions = caseData.steps.some(s => 
    s.action.type === 'fill' || s.action.type === 'submit'
  );
  if (hasFormActions && !route.includes('login') && !route.includes('signup')) {
    conditions.push('User is authenticated');
  }

  return conditions;
}

function generateSuccessCriteria(caseData: InternalCase): string[] {
  const criteria: string[] = [];

  // Check for form submission
  const hasSubmit = caseData.steps.some(s => s.action.type === 'submit');
  if (hasSubmit) {
    criteria.push('Form submission succeeds without errors');
    criteria.push('Success feedback displayed to user');
  }

  // Check for navigation
  const hasNavigation = caseData.steps.some(s => s.action.type === 'navigate');
  if (hasNavigation) {
    criteria.push('Page navigation completes');
    criteria.push('Expected content is visible');
  }

  if (criteria.length === 0) {
    criteria.push('All actions complete without errors');
  }

  return criteria;
}

function generateFailureScenarios(caseData: InternalCase): string[] {
  const scenarios: string[] = [];

  const hasFormActions = caseData.steps.some(s => 
    s.action.type === 'fill' || s.action.type === 'submit'
  );

  if (hasFormActions) {
    scenarios.push('Validation error for invalid input');
    scenarios.push('Server error during submission');
    scenarios.push('Network timeout');
  }

  scenarios.push('Element not found on page');
  scenarios.push('Unexpected page state');

  return scenarios;
}

function determineOverallProvenance(caseData: InternalCase): 'SBG' | 'ROG' | 'MERGED' {
  const sources = new Set(caseData.steps.map(s => s.from));
  
  if (sources.has('MERGED') || (sources.has('SBG') && sources.has('ROG'))) {
    return 'MERGED';
  }
  if (sources.has('ROG')) {
    return 'ROG';
  }
  return 'SBG';
}

function collectAllRefs(caseData: InternalCase): string[] {
  const refs = new Set<string>();
  
  for (const step of caseData.steps) {
    if (step.staticRef) refs.add(step.staticRef);
    if (step.runtimeRef) refs.add(step.runtimeRef);
  }

  return Array.from(refs);
}

function getUniqueActions(cases: InternalCase[]): string[] {
  const actions = new Set<string>();
  
  for (const c of cases) {
    for (const step of c.steps) {
      actions.add(step.action.type);
    }
  }

  return Array.from(actions);
}

function countMatchedNodes(merged: MergedTestModel): number {
  let count = 0;
  for (const suite of merged.suites) {
    for (const c of suite.cases) {
      for (const step of c.steps) {
        if (step.from === 'MERGED') {
          count++;
        }
      }
    }
  }
  return count;
}

function countUnmatchedStatic(merged: MergedTestModel): number {
  let count = 0;
  for (const suite of merged.suites) {
    for (const c of suite.cases) {
      for (const step of c.steps) {
        if (step.from === 'SBG') {
          count++;
        }
      }
    }
  }
  return count;
}

function countUnmatchedRuntime(merged: MergedTestModel): number {
  let count = 0;
  for (const suite of merged.suites) {
    for (const c of suite.cases) {
      for (const step of c.steps) {
        if (step.from === 'ROG') {
          count++;
        }
      }
    }
  }
  return count;
}

// Re-export types
export {
  DiscoveryV9Request,
  DiscoveryResultV9,
  ValidationResult,
  NormalizedData,
  MergedTestModel,
  SemanticEnrichment,
  ScoredModel,
  LLMClient,
};
