/**
 * V5 Discovery - Validator
 * 
 * DATA-DRIVEN validation - no if-else per action type.
 * 
 * 5 Checks:
 * 1. selectorExists - every selector in steps must exist in scanner.elements
 * 2. valueSatisfiesConstraints - values must match constraints (valid for happy-path, invalid for validation tests)
 * 3. stepOnCorrectPage - elements must be on current page after navigation
 * 4. assertionSelectorExists - assertion targets must exist in scanner.elements
 * 5. constraintCoverage - every constraint rule must have a test case
 */

import {
  ScannerPayload,
  ScannerElement,
  ScannerConstraint,
  GeneratorOutput,
  GeneratedSuite,
  GeneratedCase,
  GeneratedStep,
  GeneratedAssertion,
  ValidatorResult,
  ValidatorChecks,
  ValidatorIssue,
  CheckResult,
  CoverageResult,
} from './types';

/**
 * Validate generator output against scanner data
 */
export function validate(
  generatorOutput: GeneratorOutput,
  scannerPayload: ScannerPayload
): ValidatorResult {
  const issues: ValidatorIssue[] = [];
  
  // Build lookup maps for O(1) access
  const selectorSet = buildSelectorSet(scannerPayload.elements);
  const elementBySelector = buildElementBySelector(scannerPayload.elements);
  const elementById = buildElementById(scannerPayload.elements);
  const pageById = buildPageById(scannerPayload);
  const constraintByField = buildConstraintByField(scannerPayload.constraints);
  
  // Check results
  const selectorExistsResult: CheckResult = { passed: 0, failed: 0 };
  const valueSatisfiesResult: CheckResult = { passed: 0, failed: 0 };
  const stepOnPageResult: CheckResult = { passed: 0, failed: 0 };
  const assertionSelectorResult: CheckResult = { passed: 0, failed: 0 };
  
  // Track tested constraints for coverage
  const testedConstraints = new Set<string>();
  
  // Validate each suite
  for (const suite of generatorOutput.suites) {
    for (const testCase of suite.cases) {
      // Track current page for step validation
      let currentPageId: string | null = null;
      
      // Validate steps
      for (const step of testCase.steps) {
        // Check 1: Selector exists (for non-navigate actions)
        if (step.action !== 'navigate') {
          const exists = selectorSet.has(step.target);
          if (exists) {
            selectorExistsResult.passed++;
          } else {
            selectorExistsResult.failed++;
            issues.push(createIssue(
              'selector-not-found',
              `${suite.name}/${testCase.name}/${step.id}`,
              step.target,
              'error',
              `Selector "${step.target}" not found in scanner data. Use a selector from scanner.elements`
            ));
          }
        } else {
          // Navigate action - update current page
          const page = findPageByUrl(scannerPayload, step.target);
          currentPageId = page?.id || null;
        }
        
        // Check 2: Value satisfies constraints (for fill actions with value)
        if (step.action === 'fill' && step.value !== null) {
          const validationResult = validateValue(
            step.target,
            step.value,
            testCase.type,
            testCase.testedConstraint,
            constraintByField,
            elementBySelector
          );
          
          if (validationResult.valid) {
            valueSatisfiesResult.passed++;
          } else {
            valueSatisfiesResult.failed++;
            issues.push(createIssue(
              'value-constraint-mismatch',
              `${suite.name}/${testCase.name}/${step.id}`,
              step.value,
              'warning',
              validationResult.reason
            ));
          }
        }
        
        // Check 3: Step on correct page
        if (step.action !== 'navigate' && currentPageId) {
          const element = elementBySelector.get(step.target);
          if (element) {
            if (element.pageId === currentPageId) {
              stepOnPageResult.passed++;
            } else {
              stepOnPageResult.failed++;
              issues.push(createIssue(
                'element-wrong-page',
                `${suite.name}/${testCase.name}/${step.id}`,
                step.target,
                'error',
                `Element is on page "${element.pageId}" but current page is "${currentPageId}"`
              ));
            }
          }
        }
      }
      
      // Validate assertions
      for (const assertion of testCase.assertions) {
        // Check 4: Assertion selector exists (for element assertions)
        if (assertion.target) {
          const exists = selectorSet.has(assertion.target);
          if (exists) {
            assertionSelectorResult.passed++;
          } else {
            assertionSelectorResult.failed++;
            issues.push(createIssue(
              'assertion-selector-not-found',
              `${suite.name}/${testCase.name}/assertion`,
              assertion.target,
              'warning',
              `Assertion target "${assertion.target}" not found. Use URL assertion or valid selector`
            ));
          }
        }
      }
      
      // Track tested constraint
      if (testCase.testedConstraint) {
        testedConstraints.add(testCase.testedConstraint);
      }
    }
  }
  
  // Check 5: Constraint coverage
  const coverageResult = calculateCoverage(
    scannerPayload.constraints,
    testedConstraints,
    issues
  );
  
  // Calculate overall score
  const totalChecks = 
    selectorExistsResult.passed + selectorExistsResult.failed +
    valueSatisfiesResult.passed + valueSatisfiesResult.failed +
    stepOnPageResult.passed + stepOnPageResult.failed +
    assertionSelectorResult.passed + assertionSelectorResult.failed;
  
  const passedChecks =
    selectorExistsResult.passed +
    valueSatisfiesResult.passed +
    stepOnPageResult.passed +
    assertionSelectorResult.passed;
  
  // Include coverage in score (weighted)
  const checkScore = totalChecks > 0 ? passedChecks / totalChecks : 1;
  const coverageScore = coverageResult.total > 0 
    ? coverageResult.covered / coverageResult.total 
    : 1;
  
  // 70% check score + 30% coverage score
  const score = checkScore * 0.7 + coverageScore * 0.3;
  
  const checks: ValidatorChecks = {
    selectorExists: selectorExistsResult,
    valueSatisfiesConstraints: valueSatisfiesResult,
    stepOnCorrectPage: stepOnPageResult,
    assertionSelectorExists: assertionSelectorResult,
    constraintCoverage: coverageResult,
  };
  
  const errorCount = issues.filter(i => i.severity === 'error').length;
  
  return {
    valid: errorCount === 0,
    score,
    checks,
    issues,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildSelectorSet(elements: ScannerElement[]): Set<string> {
  const set = new Set<string>();
  for (const el of elements) {
    for (const sel of el.selectors) {
      set.add(sel.value);
    }
  }
  return set;
}

function buildElementBySelector(elements: ScannerElement[]): Map<string, ScannerElement> {
  const map = new Map<string, ScannerElement>();
  for (const el of elements) {
    for (const sel of el.selectors) {
      map.set(sel.value, el);
    }
  }
  return map;
}

function buildElementById(elements: ScannerElement[]): Map<string, ScannerElement> {
  const map = new Map<string, ScannerElement>();
  for (const el of elements) {
    map.set(el.id, el);
  }
  return map;
}

function buildPageById(payload: ScannerPayload): Map<string, { id: string; url: string }> {
  const map = new Map<string, { id: string; url: string }>();
  for (const page of payload.pages) {
    map.set(page.id, page);
  }
  return map;
}

function buildConstraintByField(constraints: ScannerConstraint[]): Map<string, ScannerConstraint> {
  const map = new Map<string, ScannerConstraint>();
  for (const c of constraints) {
    map.set(c.field, c);
  }
  return map;
}

function findPageByUrl(payload: ScannerPayload, url: string): { id: string; url: string } | null {
  return payload.pages.find(p => p.url === url) || null;
}

function createIssue(
  type: string,
  location: string,
  target: string,
  severity: 'error' | 'warning',
  suggestion: string
): ValidatorIssue {
  return {
    id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    location,
    target,
    severity,
    suggestion,
  };
}

interface ValueValidationResult {
  valid: boolean;
  reason: string;
}

function validateValue(
  selector: string,
  value: string,
  caseType: string,
  testedConstraint: string | null,
  constraintByField: Map<string, ScannerConstraint>,
  elementBySelector: Map<string, ScannerElement>
): ValueValidationResult {
  // Find the element to get field name
  const element = elementBySelector.get(selector);
  if (!element) {
    return { valid: true, reason: 'Element not found, skipping validation' };
  }
  
  // Get field name from element attributes
  const fieldName = element.attributes['name'] as string || 
                    element.attributes['id'] as string ||
                    null;
  
  if (!fieldName) {
    return { valid: true, reason: 'No field name found, skipping validation' };
  }
  
  // Get constraints for this field
  const constraint = constraintByField.get(fieldName);
  if (!constraint) {
    return { valid: true, reason: 'No constraints for field, any value accepted' };
  }
  
  // For happy-path cases, value should be valid
  if (caseType === 'happy-path') {
    const isValidExample = constraint.validExamples.includes(value);
    if (isValidExample) {
      return { valid: true, reason: 'Value is from validExamples' };
    }
    
    // Check if value satisfies all rules
    const satisfiesRules = checkValueAgainstRules(value, constraint.rules);
    if (satisfiesRules.valid) {
      return { valid: true, reason: 'Value satisfies all constraint rules' };
    }
    
    return { 
      valid: false, 
      reason: `Happy-path value "${value}" doesn't satisfy constraints: ${satisfiesRules.reason}` 
    };
  }
  
  // For validation cases, value should intentionally violate the tested constraint
  if (caseType === 'validation' && testedConstraint) {
    // Parse testedConstraint (format: "fieldName.ruleName")
    const [constraintField, ruleName] = testedConstraint.split('.');
    
    if (constraintField !== fieldName) {
      // This field is not the one being tested, so it should have valid value
      return { valid: true, reason: 'This field is not the tested constraint' };
    }
    
    // Check if value is from invalidExamples for this rule
    const matchingInvalid = constraint.invalidExamples.find(
      inv => inv.violates === ruleName && inv.value === value
    );
    
    if (matchingInvalid) {
      return { valid: true, reason: `Value intentionally violates ${ruleName}` };
    }
    
    // Check if value actually violates the rule
    const rule = constraint.rules.find(r => r.type === ruleName);
    if (rule && !checkSingleRule(value, rule)) {
      return { valid: true, reason: `Value violates ${ruleName} rule` };
    }
    
    return { 
      valid: false, 
      reason: `Validation test for ${ruleName} but value "${value}" doesn't violate it` 
    };
  }
  
  return { valid: true, reason: 'No specific validation required' };
}

interface RuleCheckResult {
  valid: boolean;
  reason: string;
}

function checkValueAgainstRules(value: string, rules: ScannerConstraint['rules']): RuleCheckResult {
  for (const rule of rules) {
    if (!checkSingleRule(value, rule)) {
      return { valid: false, reason: `Violates ${rule.type} rule` };
    }
  }
  return { valid: true, reason: 'All rules satisfied' };
}

function checkSingleRule(value: string, rule: ScannerConstraint['rules'][0]): boolean {
  switch (rule.type) {
    case 'required':
      return value.length > 0;
    
    case 'minLength':
      return value.length >= (rule.value as number);
    
    case 'maxLength':
      return value.length <= (rule.value as number);
    
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    
    case 'pattern':
      if (rule.pattern) {
        return new RegExp(rule.pattern).test(value);
      }
      return true;
    
    default:
      // Unknown rule type - assume valid
      return true;
  }
}

function calculateCoverage(
  constraints: ScannerConstraint[],
  testedConstraints: Set<string>,
  issues: ValidatorIssue[]
): CoverageResult {
  // Build list of all constraint rules
  const allRules: string[] = [];
  for (const c of constraints) {
    for (const rule of c.rules) {
      allRules.push(`${c.field}.${rule.type}`);
    }
  }
  
  // Find uncovered
  const uncovered: string[] = [];
  for (const rule of allRules) {
    if (!testedConstraints.has(rule)) {
      uncovered.push(rule);
      issues.push(createIssue(
        'constraint-not-covered',
        'coverage-check',
        rule,
        'warning',
        `No test case for constraint "${rule}". Add a validation test case with testedConstraint="${rule}"`
      ));
    }
  }
  
  return {
    covered: allRules.length - uncovered.length,
    total: allRules.length,
    uncovered,
  };
}
