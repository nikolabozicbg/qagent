/**
 * Intelligent Test Discovery - Main Entry Point
 * 
 * Orchestrates the intelligent test discovery pipeline:
 * 1. Perception: Extract raw data from scanner output
 * 2. Understanding: Classify fields and forms semantically
 * 3. Reasoning: Cluster into suites and generate test cases
 * 4. Validation: Quality check and filtering
 */

export * from './types';
export * from './field-classifier';
export * from './form-classifier';
export * from './suite-clustering';
export * from './test-case-generator';

import {
  RawFieldData,
  RawFormData,
  ClassifiedForm,
  TestSuite,
  DiscoveryResult,
  SuiteCluster,
} from './types';
import { classifyForm, classifyForms } from './form-classifier';
import { clusterIntoSuites, mergeSmallClusters } from './suite-clustering';
import { generateTestSuites, getCaseStatistics } from './test-case-generator';

// ============================================================================
// QUALITY VALIDATION
// ============================================================================

interface QualityMetrics {
  overall: number;
  fieldResolution: number;
  selectorQuality: number;
  caseCoverage: number;
  recommendation: 'PUBLISH' | 'REVIEW' | 'NEEDS_WORK';
}

/**
 * Calculate quality metrics for generated suites
 */
function calculateQualityMetrics(suites: TestSuite[], forms: ClassifiedForm[]): QualityMetrics {
  if (suites.length === 0) {
    return {
      overall: 0,
      fieldResolution: 0,
      selectorQuality: 0,
      caseCoverage: 0,
      recommendation: 'NEEDS_WORK',
    };
  }
  
  // Field resolution: How many fields were classified with high confidence
  let totalFields = 0;
  let resolvedFields = 0;
  for (const form of forms) {
    for (const field of form.fields) {
      totalFields++;
      if (field.semantic.type !== 'UNKNOWN' && field.semantic.confidence >= 0.5) {
        resolvedFields++;
      }
    }
  }
  const fieldResolution = totalFields > 0 ? resolvedFields / totalFields : 0;
  
  // Selector quality: How many fields have stable selectors
  let totalSelectors = 0;
  let stableSelectors = 0;
  for (const form of forms) {
    for (const field of form.fields) {
      if (field.selectors.length > 0) {
        totalSelectors++;
        if (field.selectors[0].isStable && field.selectors[0].score >= 80) {
          stableSelectors++;
        }
      }
    }
  }
  const selectorQuality = totalSelectors > 0 ? stableSelectors / totalSelectors : 0;
  
  // Case coverage: Ratio of case types generated
  const allCases = suites.flatMap(s => s.cases);
  const caseTypes = new Set(allCases.map(c => c.classification.type));
  const expectedCaseTypes = 3; // happy-path, validation, error/edge
  const caseCoverage = Math.min(caseTypes.size / expectedCaseTypes, 1);
  
  // Overall quality
  const overall = (fieldResolution * 0.4) + (selectorQuality * 0.3) + (caseCoverage * 0.3);
  
  // Recommendation
  let recommendation: 'PUBLISH' | 'REVIEW' | 'NEEDS_WORK';
  if (overall >= 0.7 && fieldResolution >= 0.6) {
    recommendation = 'PUBLISH';
  } else if (overall >= 0.4) {
    recommendation = 'REVIEW';
  } else {
    recommendation = 'NEEDS_WORK';
  }
  
  return {
    overall,
    fieldResolution,
    selectorQuality,
    caseCoverage,
    recommendation,
  };
}

// ============================================================================
// SCANNER OUTPUT ADAPTER
// ============================================================================

interface ScannerForm {
  id?: string;
  name?: string;
  component?: string;
  file?: string;
  route?: string;
  fields?: Array<{
    name?: string;
    id?: string;
    type?: string;
    placeholder?: string;
    label?: string;
    required?: boolean;
    selector?: string;
    [key: string]: unknown;
  }>;
  submitButton?: {
    text?: string;
    selector?: string;
  };
  [key: string]: unknown;
}

/**
 * Convert scanner output to RawFormData
 */
function adaptScannerForm(scannerForm: ScannerForm, index: number): RawFormData {
  const fields: RawFieldData[] = (scannerForm.fields || []).map((f, i) => ({
    name: f.name || null,
    id: f.id || null,
    type: f.type || null,
    placeholder: f.placeholder || null,
    autocomplete: (f as Record<string, unknown>).autocomplete as string | null || null,
    ariaLabel: (f as Record<string, unknown>).ariaLabel as string | null || null,
    ariaDescribedBy: null,
    role: (f as Record<string, unknown>).role as string | null || null,
    labelText: f.label || null,
    labelFor: null,
    required: f.required || false,
    pattern: null,
    minLength: null,
    maxLength: null,
    min: null,
    max: null,
    dataTestId: (f as Record<string, unknown>).dataTestId as string | null || null,
    dataTest: (f as Record<string, unknown>).dataTest as string | null || null,
    dataCy: (f as Record<string, unknown>).dataCy as string | null || null,
    formId: scannerForm.id || null,
    position: i,
    filePath: scannerForm.file || '',
    componentName: scannerForm.component || '',
  }));
  
  return {
    id: scannerForm.id || `form-${index}`,
    name: scannerForm.name || `Form ${index}`,
    componentName: scannerForm.component || '',
    filePath: scannerForm.file || '',
    route: scannerForm.route || null,
    url: scannerForm.route || null,
    submitText: scannerForm.submitButton?.text || null,
    submitSelector: scannerForm.submitButton?.selector || null,
    fields,
    submitButton: scannerForm.submitButton ? {
      text: scannerForm.submitButton.text || null,
      selector: scannerForm.submitButton.selector || null,
    } : null,
    hasValidation: fields.some(f => f.required),
    submitEndpoint: null,
    successRedirect: null,
  };
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export interface IntelligentDiscoveryOptions {
  minSuiteSize?: number;
  maxSuiteSize?: number;
  similarityThreshold?: number;
  minQuality?: number;
}

/**
 * Run the intelligent test discovery pipeline
 */
export async function runIntelligentDiscovery(
  scannerForms: ScannerForm[],
  options: IntelligentDiscoveryOptions = {}
): Promise<DiscoveryResult> {
  const startTime = Date.now();
  
  const {
    minSuiteSize = 1,
    maxSuiteSize = 10,
    similarityThreshold = 0.5,
    minQuality = 0.3,
  } = options;
  
  // Step 1: Adapt scanner output to raw form data
  const rawForms: RawFormData[] = scannerForms.map((form, i) => adaptScannerForm(form, i));
  
  // Step 2: Classify all forms
  const classifiedForms: ClassifiedForm[] = classifyForms(rawForms);
  
  // Step 3: Cluster forms into suites
  let clusters: SuiteCluster[] = clusterIntoSuites(classifiedForms, {
    minClusterSize: minSuiteSize,
    maxClusterSize: maxSuiteSize,
    similarityThreshold,
  });
  
  // Merge small clusters
  clusters = mergeSmallClusters(clusters, 2);
  
  // Step 4: Generate test suites with cases
  const suites: TestSuite[] = generateTestSuites(clusters);
  
  // Step 5: Calculate quality metrics
  const quality = calculateQualityMetrics(suites, classifiedForms);
  
  // Step 6: Filter out low quality suites if needed
  const filteredSuites = quality.overall >= minQuality 
    ? suites 
    : suites.filter(s => s.confidence >= minQuality);
  
  // Convert to output format
  const outputSuites = filteredSuites.map(suite => ({
    id: suite.id,
    name: suite.name,
    description: `Test suite for ${suite.domain.primary} domain`,
    domain: suite.domain,
    priority: suite.priority,
    coverage: suite.coverage,
    cases: suite.cases.map(c => ({
      id: c.id,
      name: c.name,
      classification: {
        type: c.classification.type,
        confidence: c.classification.confidence,
        derivedFrom: {
          source: 'form',
          rule: c.classification.derivedFrom.rule,
          reference: c.classification.derivedFrom.formPurpose,
        },
      },
      priority: {
        level: c.priority.toUpperCase(),
        riskScore: c.priority === 'high' ? 90 : c.priority === 'medium' ? 60 : 30,
      },
      prerequisites: {
        requiredState: c.preconditions,
      },
      steps: c.steps.map((step, idx) => ({
        index: idx,
        action: step.action,
        target: typeof step.target === 'string' 
          ? { semantic: 'ELEMENT', resolved: step.target, confidence: 0.7 }
          : { semantic: step.target.semantic, resolved: step.target.resolved, confidence: 0.9 },
        value: step.value ? { primary: step.value, generator: 'static' } : undefined,
        selector: step.selector ? {
          primary: step.selector.primary,
          candidates: step.selector.candidates,
        } : undefined,
        expected: step.assertion ? {
          type: step.assertion.type,
          value: step.assertion.expected,
          matcher: 'contains',
        } : undefined,
        reasoning: step.description,
      })),
      estimatedDuration: c.steps.length * 2,
    })),
  }));
  
  const stats = getCaseStatistics(filteredSuites);
  
  return {
    suites: outputSuites,
    quality,
    metadata: {
      processingTime: Date.now() - startTime,
      totalRoutes: new Set(classifiedForms.map(f => f.raw.route).filter(Boolean)).size,
      totalForms: classifiedForms.length,
      totalCases: stats.totalCases,
      totalSteps: outputSuites.reduce((sum, s) => 
        sum + s.cases.reduce((cSum, c) => cSum + c.steps.length, 0), 0),
    },
  };
}

/**
 * Quick classification of a single form (for preview)
 */
export function classifyFormQuick(scannerForm: ScannerForm): ClassifiedForm {
  const rawForm = adaptScannerForm(scannerForm, 0);
  return classifyForm(rawForm);
}

/**
 * Get quality assessment without generating full suites
 */
export function assessQuality(scannerForms: ScannerForm[]): {
  formsCount: number;
  fieldsCount: number;
  resolvedFieldsPercent: number;
  domainsDetected: string[];
  recommendation: string;
} {
  const rawForms = scannerForms.map((form, i) => adaptScannerForm(form, i));
  const classifiedForms = classifyForms(rawForms);
  
  let totalFields = 0;
  let resolvedFields = 0;
  const domains = new Set<string>();
  
  for (const form of classifiedForms) {
    domains.add(form.domain.primary);
    for (const field of form.fields) {
      totalFields++;
      if (field.semantic.type !== 'UNKNOWN') {
        resolvedFields++;
      }
    }
  }
  
  const resolvedPercent = totalFields > 0 ? (resolvedFields / totalFields) * 100 : 0;
  
  return {
    formsCount: classifiedForms.length,
    fieldsCount: totalFields,
    resolvedFieldsPercent: Math.round(resolvedPercent),
    domainsDetected: Array.from(domains),
    recommendation: resolvedPercent >= 60 ? 'GOOD' : resolvedPercent >= 40 ? 'ACCEPTABLE' : 'NEEDS_WORK',
  };
}
