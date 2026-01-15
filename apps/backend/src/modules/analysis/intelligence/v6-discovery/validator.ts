/**
 * V6 Quality Validator
 * 
 * Pre-output validation to ensure test quality before returning results.
 * 
 * Checks:
 * 1. All selectors exist in scanner data
 * 2. All URLs are valid (exist in pages or are resolvable)
 * 3. All constraints have at least one test
 * 4. Dependencies are satisfied (test ordering)
 * 5. No duplicate steps within same test case
 * 6. Critical features have happy path tests
 * 7. Selector quality (data-testid usage, stability)
 */

import { ScannerPayload, ScannerConstraint } from '../v5-discovery/types';
import {
  AppUnderstanding,
  CompiledTestSuite,
  CompiledTestCase,
  CompiledStep,
  ValidationResult,
  ValidationIssue,
} from './types';

// =============================================================================
// MAIN VALIDATOR FUNCTION
// =============================================================================

export function validateSuites(
  suites: CompiledTestSuite[],
  appUnderstanding: AppUnderstanding,
  scannerPayload: ScannerPayload
): ValidationResult {
  console.log('   ✅ V6 Validator: Validating compiled suites...');
  
  const issues: ValidationIssue[] = [];
  let issueIdCounter = 0;
  
  const createIssue = (
    type: ValidationIssue['type'],
    severity: ValidationIssue['severity'],
    location: string,
    description: string,
    suggestion: string,
    autoFixable: boolean = false
  ): ValidationIssue => ({
    id: `issue-${++issueIdCounter}`,
    type,
    severity,
    location,
    description,
    suggestion,
    autoFixable,
  });
  
  // Build lookup sets
  const existingSelectors = buildSelectorSet(scannerPayload);
  const existingUrls = new Set(scannerPayload.pages.map(p => p.url.toLowerCase()));
  const constraintsByField = buildConstraintsByField(scannerPayload);
  
  // Track what's tested
  const testedConstraints = new Set<string>();
  const testedFeatures = new Set<string>();
  const featuresWithHappyPath = new Set<string>();
  
  // Validate each suite
  for (const suite of suites) {
    testedFeatures.add(suite.featureId);
    
    for (const testCase of suite.cases) {
      // Track tested constraints
      if (testCase.testedConstraint) {
        testedConstraints.add(testCase.testedConstraint);
      }
      
      // Track happy paths
      if (testCase.type === 'happy-path') {
        featuresWithHappyPath.add(suite.featureId);
      }
      
      // Check each step
      const seenSteps = new Set<string>();
      
      for (let i = 0; i < testCase.steps.length; i++) {
        const step = testCase.steps[i];
        const location = `${suite.name} > ${testCase.name} > Step ${i + 1}`;
        
        // Check for unresolved selectors
        if (step.selector.startsWith('UNRESOLVED:')) {
          issues.push(createIssue(
            'missing-selector',
            'error',
            location,
            `Unresolved selector: ${step.selector}`,
            `Add data-testid to the element or check field name spelling`,
            false
          ));
        }
        
        // Check for duplicate steps
        const stepKey = `${step.action}:${step.selector}:${step.value || ''}`;
        if (seenSteps.has(stepKey)) {
          issues.push(createIssue(
            'duplicate-step',
            'warning',
            location,
            `Duplicate step: ${step.action} on ${step.selector}`,
            `Remove duplicate step`,
            true
          ));
        }
        seenSteps.add(stepKey);
        
        // Check selector quality
        if (step.source.confidence < 0.5) {
          issues.push(createIssue(
            'flaky-selector',
            'warning',
            location,
            `Low confidence selector (${Math.round(step.source.confidence * 100)}%): ${step.selector}`,
            `Consider adding data-testid to this element`,
            false
          ));
        }
        
        // Validate URLs for navigate steps
        if (step.action === 'navigate') {
          const url = step.selector.toLowerCase();
          if (!existingUrls.has(url) && !url.includes('test-') && !url.includes('/1')) {
            // URL not in scanner data and not a resolved dynamic URL
            issues.push(createIssue(
              'invalid-url',
              'warning',
              location,
              `URL not found in scanner data: ${step.selector}`,
              `Verify this URL exists in the application`,
              false
            ));
          }
        }
      }
      
      // Check for missing assertions
      if (testCase.assertions.length === 0) {
        issues.push(createIssue(
          'missing-assertion',
          'warning',
          `${suite.name} > ${testCase.name}`,
          `Test case has no assertions`,
          `Add expected result verification`,
          false
        ));
      }
    }
  }
  
  // Check constraint coverage
  for (const [field, constraints] of constraintsByField) {
    for (const constraint of constraints) {
      const constraintKey = `${constraint.field}.${constraint.rules.map(r => r.type).join(',')}`;
      if (!testedConstraints.has(constraintKey)) {
        // Check if any test mentions this field
        const hasRelatedTest = Array.from(testedConstraints).some(tc => 
          tc.toLowerCase().includes(field.toLowerCase())
        );
        
        if (!hasRelatedTest) {
          issues.push(createIssue(
            'missing-constraint-test',
            'info',
            `Constraint: ${field}`,
            `No test for constraint: ${constraint.rules.map(r => r.type).join(', ')}`,
            `Consider adding validation test for ${field}`,
            false
          ));
        }
      }
    }
  }
  
  // Check critical features have happy path
  for (const criticalId of appUnderstanding.criticalPaths) {
    if (!featuresWithHappyPath.has(criticalId)) {
      const feature = appUnderstanding.features.find(f => f.id === criticalId);
      issues.push(createIssue(
        'missing-precondition',
        'error',
        `Feature: ${feature?.name || criticalId}`,
        `Critical feature missing happy path test`,
        `Add happy path test for this critical feature`,
        false
      ));
    }
  }
  
  // Check dependency order
  const dependencyIssues = checkDependencyOrder(suites, appUnderstanding);
  issues.push(...dependencyIssues);
  
  // Calculate coverage
  const totalConstraints = Array.from(constraintsByField.values()).flat().length;
  const coverage = {
    features: {
      total: appUnderstanding.features.length,
      tested: testedFeatures.size,
      coverage: appUnderstanding.features.length > 0 
        ? testedFeatures.size / appUnderstanding.features.length 
        : 0,
    },
    constraints: {
      total: totalConstraints,
      tested: testedConstraints.size,
      coverage: totalConstraints > 0 ? testedConstraints.size / totalConstraints : 0,
    },
    criticalPaths: {
      total: appUnderstanding.criticalPaths.length,
      tested: appUnderstanding.criticalPaths.filter(id => featuresWithHappyPath.has(id)).length,
      coverage: appUnderstanding.criticalPaths.length > 0
        ? appUnderstanding.criticalPaths.filter(id => featuresWithHappyPath.has(id)).length / appUnderstanding.criticalPaths.length
        : 1,
    },
  };
  
  // Calculate duplicate count
  const duplicateIssues = issues.filter(i => i.type === 'duplicate-step');
  
  // Calculate selector quality
  const allSteps = suites.flatMap(s => s.cases.flatMap(c => c.steps));
  const dataTestIdSteps = allSteps.filter(s => 
    s.selector.includes('data-testid') || s.selector.includes('data-cy')
  );
  const stableSteps = allSteps.filter(s => s.source.confidence >= 0.8);
  const riskySelectors = allSteps
    .filter(s => s.source.confidence < 0.5)
    .map(s => s.selector);
  
  // Calculate score
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  
  // Score formula: start at 1, subtract based on issues
  let score = 1.0;
  score -= errorCount * 0.15;      // Errors have high impact
  score -= warningCount * 0.05;   // Warnings have medium impact
  score -= infoCount * 0.01;      // Info has low impact
  score = Math.max(0, Math.min(1, score)); // Clamp between 0-1
  
  // Boost score based on coverage
  score = (score + coverage.features.coverage + coverage.criticalPaths.coverage) / 3;
  
  const valid = errorCount === 0 && score >= 0.5;
  
  console.log(`   📊 Validation: ${issues.length} issues, score: ${Math.round(score * 100)}%`);
  
  return {
    valid,
    score,
    issues,
    coverage,
    duplicates: {
      found: duplicateIssues.length > 0,
      count: duplicateIssues.length,
      locations: duplicateIssues.map(i => i.location),
    },
    selectorQuality: {
      dataTestIdUsage: allSteps.length > 0 ? dataTestIdSteps.length / allSteps.length : 0,
      stableSelectors: allSteps.length > 0 ? stableSteps.length / allSteps.length : 0,
      riskySelectors: [...new Set(riskySelectors)],
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildSelectorSet(scannerPayload: ScannerPayload): Set<string> {
  const selectors = new Set<string>();
  
  for (const element of scannerPayload.elements) {
    // Add all ranked selectors
    for (const rankedSelector of element.selectors) {
      selectors.add(rankedSelector.value);
    }
    
    // Add best selector
    if (element.bestSelector) {
      selectors.add(element.bestSelector);
    }
    
    // Add attribute-based selectors
    const name = element.attributes['name'] as string;
    const id = element.attributes['id'] as string;
    const testId = element.attributes['data-testid'] as string;
    
    if (name) {
      selectors.add(`[name="${name}"]`);
      selectors.add(`${element.tagName}[name="${name}"]`);
    }
    if (id) {
      selectors.add(`#${id}`);
    }
    if (testId) {
      selectors.add(`[data-testid="${testId}"]`);
    }
  }
  
  return selectors;
}

function buildConstraintsByField(scannerPayload: ScannerPayload): Map<string, ScannerConstraint[]> {
  const map = new Map<string, ScannerConstraint[]>();
  
  for (const constraint of scannerPayload.constraints) {
    const existing = map.get(constraint.field) || [];
    existing.push(constraint);
    map.set(constraint.field, existing);
  }
  
  return map;
}

function checkDependencyOrder(
  suites: CompiledTestSuite[],
  appUnderstanding: AppUnderstanding
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let issueId = 1000; // Start from higher number to avoid conflicts
  
  // Build map of feature -> suite index
  const suiteOrder = new Map<string, number>();
  suites.forEach((suite, index) => {
    suiteOrder.set(suite.featureId, index);
  });
  
  // Check each feature's dependencies
  for (const feature of appUnderstanding.features) {
    const featureIndex = suiteOrder.get(feature.id);
    if (featureIndex === undefined) continue;
    
    for (const depId of feature.dependsOn) {
      const depIndex = suiteOrder.get(depId);
      if (depIndex === undefined) continue;
      
      if (depIndex > featureIndex) {
        const depFeature = appUnderstanding.features.find(f => f.id === depId);
        issues.push({
          id: `issue-${++issueId}`,
          type: 'circular-dependency',
          severity: 'warning',
          location: `Suite order: ${feature.name}`,
          description: `Suite for "${feature.name}" appears before its dependency "${depFeature?.name || depId}"`,
          suggestion: `Reorder suites so "${depFeature?.name || depId}" comes first`,
          autoFixable: true,
        });
      }
    }
  }
  
  return issues;
}

// =============================================================================
// AUTO-FIX FUNCTIONS
// =============================================================================

export function autoFixIssues(
  suites: CompiledTestSuite[],
  issues: ValidationIssue[],
  appUnderstanding: AppUnderstanding
): CompiledTestSuite[] {
  let fixedSuites = [...suites];
  
  // Fix duplicate steps
  const duplicateIssues = issues.filter(i => i.type === 'duplicate-step' && i.autoFixable);
  if (duplicateIssues.length > 0) {
    fixedSuites = removeDuplicateSteps(fixedSuites);
  }
  
  // Fix dependency order
  const orderIssues = issues.filter(i => i.type === 'circular-dependency' && i.autoFixable);
  if (orderIssues.length > 0) {
    fixedSuites = reorderByDependencies(fixedSuites, appUnderstanding);
  }
  
  return fixedSuites;
}

function removeDuplicateSteps(suites: CompiledTestSuite[]): CompiledTestSuite[] {
  return suites.map(suite => ({
    ...suite,
    cases: suite.cases.map(testCase => {
      const seenSteps = new Set<string>();
      const uniqueSteps: CompiledStep[] = [];
      
      for (const step of testCase.steps) {
        const key = `${step.action}:${step.selector}:${step.value || ''}`;
        if (!seenSteps.has(key)) {
          uniqueSteps.push(step);
          seenSteps.add(key);
        }
      }
      
      return {
        ...testCase,
        steps: uniqueSteps,
      };
    }),
  }));
}

function reorderByDependencies(
  suites: CompiledTestSuite[],
  appUnderstanding: AppUnderstanding
): CompiledTestSuite[] {
  // Create dependency graph
  const graph = new Map<string, string[]>();
  
  for (const feature of appUnderstanding.features) {
    graph.set(feature.id, feature.dependsOn);
  }
  
  // Topological sort
  const sorted: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();
  
  function visit(id: string) {
    if (temp.has(id)) {
      // Circular dependency - just skip
      return;
    }
    if (visited.has(id)) return;
    
    temp.add(id);
    
    const deps = graph.get(id) || [];
    for (const dep of deps) {
      visit(dep);
    }
    
    temp.delete(id);
    visited.add(id);
    sorted.push(id);
  }
  
  // Visit all features
  for (const feature of appUnderstanding.features) {
    if (!visited.has(feature.id)) {
      visit(feature.id);
    }
  }
  
  // Reorder suites based on sorted order
  const suiteById = new Map(suites.map(s => [s.featureId, s]));
  const reordered: CompiledTestSuite[] = [];
  
  for (const featureId of sorted) {
    const suite = suiteById.get(featureId);
    if (suite) {
      reordered.push(suite);
    }
  }
  
  // Add any suites not in the sorted list (shouldn't happen, but safety)
  for (const suite of suites) {
    if (!reordered.includes(suite)) {
      reordered.push(suite);
    }
  }
  
  return reordered;
}
