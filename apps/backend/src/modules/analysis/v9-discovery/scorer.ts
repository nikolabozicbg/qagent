/**
 * V9 Discovery Quality Scorer
 * 
 * Computes quality and confidence scores for test artifacts
 * based on provenance, coverage, and semantic factors.
 */

import { ProvenanceSource, MergedTestModel, InternalSuite, InternalCase, InternalStep } from './types';

export interface ScoredModel {
  suites: ScoredSuite[];
  summary: ModelSummary;
}

export interface ScoredSuite {
  id: string;
  cases: ScoredCase[];
  coverage: SuiteCoverage;
}

export interface ScoredCase {
  id: string;
  confidence: number;       // 0-1, how confident we are this is a valid test case
  priority: 'high' | 'medium' | 'low';
  provenance: ProvenanceBreakdown;
}

export interface ProvenanceBreakdown {
  staticCount: number;      // Steps from SBG only
  runtimeCount: number;     // Steps from ROG only
  mergedCount: number;      // Steps with both static and runtime evidence
  totalSteps: number;
}

export interface SuiteCoverage {
  routesCovered: string[];
  actionTypesCovered: string[];
  hasFormTests: boolean;
  hasNavigationTests: boolean;
  hasDataEntryTests: boolean;
}

export interface ModelSummary {
  totalSuites: number;
  totalCases: number;
  totalSteps: number;
  averageConfidence: number;
  provenanceBreakdown: {
    pureStatic: number;     // Cases with only SBG evidence
    pureRuntime: number;    // Cases with only ROG evidence
    merged: number;         // Cases with both
  };
  qualityIndicators: QualityIndicators;
}

export interface QualityIndicators {
  hasHighConfidenceCases: boolean;
  hasCriticalPathCoverage: boolean;
  hasFormInteractionCoverage: boolean;
  completenessScore: number;  // 0-1
}

/**
 * Score the entire merged model
 */
export function scoreModel(model: MergedTestModel): ScoredModel {
  const scoredSuites = model.suites.map(scoreSuite);
  const summary = computeSummary(scoredSuites, model);

  return {
    suites: scoredSuites,
    summary,
  };
}

/**
 * Score a single suite
 */
function scoreSuite(suite: InternalSuite): ScoredSuite {
  const scoredCases = suite.cases.map(c => scoreCase(c, suite.route));

  const coverage: SuiteCoverage = {
    routesCovered: [suite.route],
    actionTypesCovered: getUniqueActionTypes(suite.cases),
    hasFormTests: suite.cases.some(c => 
      c.steps.some(s => s.action.type === 'submit' || s.action.type === 'fill')
    ),
    hasNavigationTests: suite.cases.some(c => 
      c.steps.some(s => s.action.type === 'navigate')
    ),
    hasDataEntryTests: suite.cases.some(c => 
      c.steps.some(s => s.action.type === 'fill')
    ),
  };

  return {
    id: suite.id,
    cases: scoredCases,
    coverage,
  };
}

/**
 * Score a single case
 */
function scoreCase(caseData: InternalCase, suiteRoute: string): ScoredCase {
  const provenance = computeProvenanceBreakdown(caseData.steps);
  const confidence = computeConfidence(caseData, provenance);
  const priority = computePriority(caseData, confidence, suiteRoute);

  return {
    id: caseData.id,
    confidence,
    priority,
    provenance,
  };
}

/**
 * Compute provenance breakdown for a case
 */
function computeProvenanceBreakdown(steps: InternalStep[]): ProvenanceBreakdown {
  let staticCount = 0;
  let runtimeCount = 0;
  let mergedCount = 0;

  for (const step of steps) {
    switch (step.from) {
      case 'SBG':
        staticCount++;
        break;
      case 'ROG':
        runtimeCount++;
        break;
      case 'MERGED':
        mergedCount++;
        break;
    }
  }

  return {
    staticCount,
    runtimeCount,
    mergedCount,
    totalSteps: steps.length,
  };
}

/**
 * Compute confidence score (0-1) for a case
 * 
 * Factors:
 * - Merged evidence (both static + runtime) is highest confidence
 * - Runtime-only is medium confidence (observed behavior)
 * - Static-only is lower confidence (theoretical behavior)
 * - More steps generally means more complete test
 */
function computeConfidence(
  caseData: InternalCase, 
  provenance: ProvenanceBreakdown
): number {
  if (provenance.totalSteps === 0) {
    return 0;
  }

  // Base confidence from provenance
  const mergedWeight = 1.0;
  const runtimeWeight = 0.8;
  const staticWeight = 0.5;

  const weightedSum = 
    (provenance.mergedCount * mergedWeight) +
    (provenance.runtimeCount * runtimeWeight) +
    (provenance.staticCount * staticWeight);

  const avgWeight = weightedSum / provenance.totalSteps;

  // Bonus for having complete flow (navigate -> action -> result)
  const hasCompleteFlow = caseData.steps.some(s => s.action.type === 'navigate') &&
    caseData.steps.some(s => s.action.type !== 'navigate');
  const flowBonus = hasCompleteFlow ? 0.1 : 0;

  // Penalty for too few steps (might be incomplete)
  const stepPenalty = provenance.totalSteps < 2 ? 0.2 : 0;

  // Calculate final confidence
  const confidence = Math.min(1, Math.max(0, avgWeight + flowBonus - stepPenalty));

  return Math.round(confidence * 100) / 100;
}

/**
 * Compute priority based on confidence and route importance
 */
function computePriority(
  caseData: InternalCase,
  confidence: number,
  suiteRoute: string
): 'high' | 'medium' | 'low' {
  // Critical routes get higher priority
  const criticalPatterns = [
    /login/i, /auth/i, /signup/i, /register/i,
    /checkout/i, /payment/i, /order/i,
    /account/i, /profile/i, /settings/i,
  ];
  
  const isCriticalRoute = criticalPatterns.some(p => p.test(suiteRoute));
  
  // Form submissions are high priority
  const hasFormSubmission = caseData.steps.some(s => s.action.type === 'submit');

  // High priority if:
  // - High confidence AND critical route
  // - High confidence AND form submission
  // - Very high confidence (>= 0.9)
  if (confidence >= 0.9 || 
      (confidence >= 0.7 && isCriticalRoute) ||
      (confidence >= 0.7 && hasFormSubmission)) {
    return 'high';
  }

  // Medium priority if:
  // - Medium confidence OR critical route
  if (confidence >= 0.5 || isCriticalRoute) {
    return 'medium';
  }

  return 'low';
}

/**
 * Get unique action types from cases
 */
function getUniqueActionTypes(cases: InternalCase[]): string[] {
  const types = new Set<string>();
  
  for (const c of cases) {
    for (const step of c.steps) {
      types.add(step.action.type);
    }
  }

  return Array.from(types);
}

/**
 * Compute summary for entire model
 */
function computeSummary(
  scoredSuites: ScoredSuite[],
  model: MergedTestModel
): ModelSummary {
  const totalSuites = scoredSuites.length;
  const allCases = scoredSuites.flatMap(s => s.cases);
  const totalCases = allCases.length;
  const totalSteps = model.suites.reduce((sum, s) => 
    sum + s.cases.reduce((csum, c) => csum + c.steps.length, 0), 0);

  // Average confidence
  const averageConfidence = allCases.length > 0
    ? allCases.reduce((sum, c) => sum + c.confidence, 0) / allCases.length
    : 0;

  // Provenance breakdown at case level
  const provenanceBreakdown = {
    pureStatic: 0,
    pureRuntime: 0,
    merged: 0,
  };

  for (const c of allCases) {
    if (c.provenance.mergedCount > 0) {
      provenanceBreakdown.merged++;
    } else if (c.provenance.runtimeCount > 0 && c.provenance.staticCount === 0) {
      provenanceBreakdown.pureRuntime++;
    } else {
      provenanceBreakdown.pureStatic++;
    }
  }

  // Quality indicators
  const hasHighConfidenceCases = allCases.some(c => c.confidence >= 0.8);
  
  const criticalRoutes = ['/login', '/auth', '/checkout', '/signup'];
  const coveredRoutes = new Set(model.suites.map(s => s.route));
  const hasCriticalPathCoverage = criticalRoutes.some(r => 
    Array.from(coveredRoutes).some(cr => cr.includes(r))
  );

  const hasFormInteractionCoverage = scoredSuites.some(s => s.coverage.hasFormTests);

  // Completeness score based on how well the model covers different aspects
  let completenessPoints = 0;
  const maxPoints = 5;
  
  if (totalSuites > 0) completenessPoints++;
  if (totalCases >= totalSuites) completenessPoints++;
  if (hasHighConfidenceCases) completenessPoints++;
  if (hasFormInteractionCoverage) completenessPoints++;
  if (provenanceBreakdown.merged > 0) completenessPoints++;

  const completenessScore = completenessPoints / maxPoints;

  return {
    totalSuites,
    totalCases,
    totalSteps,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    provenanceBreakdown,
    qualityIndicators: {
      hasHighConfidenceCases,
      hasCriticalPathCoverage,
      hasFormInteractionCoverage,
      completenessScore: Math.round(completenessScore * 100) / 100,
    },
  };
}
