/**
 * V6 Step Compiler
 * 
 * PURE TRANSLATOR - NO LOGIC
 * 
 * This module converts test plans (human-readable) to compiled tests (executable).
 * 
 * Key responsibilities:
 * 1. Map field names → actual selectors from scanner data
 * 2. Map button text → actual button selectors
 * 3. Resolve dynamic URLs with real values from sample data
 * 4. Deduplicate steps that target the same element
 * 5. Generate proper assertions based on expected results
 * 
 * NO DECISION MAKING:
 * - Does NOT decide what to test (that's the LLM's job)
 * - Does NOT decide if a selector is "good" (that's scanner's job)
 * - Just translates and reports what it can't resolve
 */

import { ScannerPayload, ScannerElement, ScannerPage, ScannerConstraint } from '../v5-discovery/types';
import {
  AppUnderstanding,
  AppFeature,
  FeatureTestPlan,
  TestCase,
  TestStep,
  CompiledTestSuite,
  CompiledTestCase,
  CompiledStep,
  CompiledAssertion,
  EnhancedScannerPayload,
} from './types';

// =============================================================================
// MAIN COMPILER FUNCTION
// =============================================================================

export interface CompilationResult {
  suites: CompiledTestSuite[];
  unresolved: UnresolvedItem[];
}

export interface UnresolvedItem {
  type: 'field' | 'button' | 'url' | 'assertion';
  target: string;
  context: string;
  suggestion?: string;
}

export function compileTestPlans(
  testPlans: FeatureTestPlan[],
  appUnderstanding: AppUnderstanding,
  scannerPayload: ScannerPayload | EnhancedScannerPayload
): CompilationResult {
  console.log('   🔧 V6 Step Compiler: Compiling test plans...');
  
  // Build lookup maps
  const lookups = buildLookups(scannerPayload);
  
  const suites: CompiledTestSuite[] = [];
  const unresolved: UnresolvedItem[] = [];
  
  for (const plan of testPlans) {
    const feature = appUnderstanding.features.find(f => f.id === plan.featureId);
    if (!feature) continue;
    
    const result = compileFeatureTestPlan(plan, feature, scannerPayload, lookups);
    
    suites.push(result.suite);
    unresolved.push(...result.unresolved);
  }
  
  // Deduplicate across suites
  const deduplicatedSuites = deduplicateSteps(suites);
  
  console.log(`   ✅ Compiled ${deduplicatedSuites.length} suites, ${unresolved.length} unresolved items`);
  
  return {
    suites: deduplicatedSuites,
    unresolved,
  };
}

// =============================================================================
// LOOKUP MAPS
// =============================================================================

interface Lookups {
  /** Field name → best element */
  fieldByName: Map<string, ScannerElement>;
  
  /** Button text → best element */
  buttonByText: Map<string, ScannerElement>;
  
  /** Form ID → elements */
  elementsByForm: Map<string, ScannerElement[]>;
  
  /** Page ID → page */
  pageById: Map<string, ScannerPage>;
  
  /** URL → page */
  pageByUrl: Map<string, ScannerPage>;
  
  /** Element ID → constraints */
  constraintsByElementId: Map<string, ScannerConstraint[]>;
  
  /** Dynamic URL → sample values */
  dynamicUrls: Map<string, string[]>;
}

function buildLookups(scannerPayload: ScannerPayload | EnhancedScannerPayload): Lookups {
  const fieldByName = new Map<string, ScannerElement>();
  const buttonByText = new Map<string, ScannerElement>();
  const elementsByForm = new Map<string, ScannerElement[]>();
  const pageById = new Map<string, ScannerPage>();
  const pageByUrl = new Map<string, ScannerPage>();
  const constraintsByElementId = new Map<string, ScannerConstraint[]>();
  
  // Build page maps
  for (const page of scannerPayload.pages) {
    pageById.set(page.id, page);
    pageByUrl.set(page.url, page);
    // Also index normalized URL
    pageByUrl.set(page.url.toLowerCase(), page);
  }
  
  // Build element maps
  for (const el of scannerPayload.elements) {
    // Index by form
    if (el.formId) {
      const existing = elementsByForm.get(el.formId) || [];
      existing.push(el);
      elementsByForm.set(el.formId, existing);
    }
    
    // Index fields by name (multiple names for flexibility)
    if (el.tagName === 'input' || el.tagName === 'select' || el.tagName === 'textarea') {
      const name = el.attributes['name'] as string;
      const id = el.attributes['id'] as string;
      const placeholder = el.attributes['placeholder'] as string;
      
      if (name) {
        fieldByName.set(name, el);
        fieldByName.set(name.toLowerCase(), el);
      }
      if (id) {
        fieldByName.set(id, el);
        fieldByName.set(id.toLowerCase(), el);
      }
      if (placeholder) {
        fieldByName.set(placeholder.toLowerCase(), el);
      }
      
      // Also index by nearby text (labels)
      for (const text of el.nearbyText || []) {
        if (text.length < 50) {
          fieldByName.set(text.toLowerCase(), el);
        }
      }
    }
    
    // Index buttons by text
    if (el.tagName === 'button' || (el.tagName === 'input' && el.attributes['type'] === 'submit')) {
      const text = el.textContent?.trim();
      if (text) {
        buttonByText.set(text, el);
        buttonByText.set(text.toLowerCase(), el);
      }
      
      // Also index by value attribute for input[type=submit]
      const value = el.attributes['value'] as string;
      if (value) {
        buttonByText.set(value, el);
        buttonByText.set(value.toLowerCase(), el);
      }
    }
  }
  
  // Build constraint map
  for (const c of scannerPayload.constraints) {
    const existing = constraintsByElementId.get(c.elementId) || [];
    existing.push(c);
    constraintsByElementId.set(c.elementId, existing);
  }
  
  // Build dynamic URLs map (from enhanced payload or derive from pages)
  const dynamicUrls = new Map<string, string[]>();
  
  const enhanced = scannerPayload as EnhancedScannerPayload;
  if (enhanced.sampleData?.dynamicUrls) {
    for (const [pattern, samples] of Object.entries(enhanced.sampleData.dynamicUrls)) {
      dynamicUrls.set(pattern, samples);
    }
  }
  
  // Also detect dynamic URLs from page list
  for (const page of scannerPayload.pages) {
    if (page.url.includes('[') || page.url.includes(':')) {
      // This is a dynamic URL pattern - try to find sample
      const pattern = page.url;
      if (!dynamicUrls.has(pattern)) {
        // Generate sample based on pattern
        dynamicUrls.set(pattern, [resolveDynamicUrl(pattern)]);
      }
    }
  }
  
  return {
    fieldByName,
    buttonByText,
    elementsByForm,
    pageById,
    pageByUrl,
    constraintsByElementId,
    dynamicUrls,
  };
}

// =============================================================================
// FEATURE COMPILATION
// =============================================================================

interface FeatureCompilationResult {
  suite: CompiledTestSuite;
  unresolved: UnresolvedItem[];
}

function compileFeatureTestPlan(
  plan: FeatureTestPlan,
  feature: AppFeature,
  scannerPayload: ScannerPayload,
  lookups: Lookups
): FeatureCompilationResult {
  const cases: CompiledTestCase[] = [];
  const unresolved: UnresolvedItem[] = [];
  
  for (const testCase of plan.cases) {
    const result = compileTestCase(testCase, feature, scannerPayload, lookups);
    cases.push(result.case);
    unresolved.push(...result.unresolved);
  }
  
  const suite: CompiledTestSuite = {
    id: `suite-${feature.id}`,
    name: `${feature.name} Tests`,
    featureId: feature.id,
    priority: feature.priority,
    cases,
  };
  
  return { suite, unresolved };
}

interface TestCaseCompilationResult {
  case: CompiledTestCase;
  unresolved: UnresolvedItem[];
}

function compileTestCase(
  testCase: TestCase,
  feature: AppFeature,
  scannerPayload: ScannerPayload,
  lookups: Lookups
): TestCaseCompilationResult {
  const compiledSteps: CompiledStep[] = [];
  const setupSteps: CompiledStep[] = [];
  const unresolved: UnresolvedItem[] = [];
  
  // Compile preconditions to setup steps
  for (const precondition of testCase.preconditions) {
    if (precondition.type === 'auth') {
      // Add login steps if we know the login feature
      // For now, just add a comment - real implementation would look up login feature
      setupSteps.push({
        action: 'comment',
        selector: '',
        description: `PRECONDITION: ${precondition.description}`,
        source: {
          originalTarget: precondition.description,
          resolvedFrom: 'precondition',
          confidence: 1.0,
        },
      });
    }
  }
  
  // Compile each step
  for (const step of testCase.steps) {
    const compiled = compileStep(step, feature, lookups);
    
    if (compiled.success) {
      compiledSteps.push(compiled.step!);
    } else {
      // Add unresolved item
      unresolved.push({
        type: compiled.unresolvedType!,
        target: step.target,
        context: `${feature.name} > ${testCase.name}`,
        suggestion: compiled.suggestion,
      });
      
      // Still add a placeholder step
      compiledSteps.push({
        action: step.action,
        selector: `UNRESOLVED:${step.target}`,
        value: step.value,
        description: `${step.action} ${step.target} (UNRESOLVED)`,
        source: {
          originalTarget: step.target,
          resolvedFrom: 'unresolved',
          confidence: 0,
        },
      });
    }
  }
  
  // Compile assertions
  const assertions = compileAssertions(testCase, feature, lookups);
  
  return {
    case: {
      id: testCase.id,
      name: testCase.name,
      type: testCase.type,
      priority: testCase.priority,
      setup: setupSteps,
      steps: compiledSteps,
      assertions,
      teardown: [],
      testedConstraint: testCase.type === 'validation' ? testCase.rationale : undefined,
      source: {
        featureId: feature.id,
        testPlanCaseId: testCase.id,
        compiledAt: new Date().toISOString(),
      },
    },
    unresolved,
  };
}

// =============================================================================
// STEP COMPILATION
// =============================================================================

interface StepCompilationResult {
  success: boolean;
  step?: CompiledStep;
  unresolvedType?: 'field' | 'button' | 'url';
  suggestion?: string;
}

function compileStep(
  step: TestStep,
  feature: AppFeature,
  lookups: Lookups
): StepCompilationResult {
  switch (step.action) {
    case 'navigate':
      return compileNavigateStep(step, lookups);
    
    case 'fill':
      return compileFillStep(step, feature, lookups);
    
    case 'click':
      return compileClickStep(step, feature, lookups);
    
    case 'select':
      return compileSelectStep(step, feature, lookups);
    
    case 'check':
    case 'uncheck':
      return compileCheckStep(step, feature, lookups);
    
    case 'wait':
      return compileWaitStep(step);
    
    case 'assert':
      return compileAssertStep(step, lookups);
    
    default:
      return {
        success: true,
        step: {
          action: step.action,
          selector: step.target,
          value: step.value,
          description: `${step.action} ${step.target}`,
          source: {
            originalTarget: step.target,
            resolvedFrom: 'passthrough',
            confidence: 0.5,
          },
        },
      };
  }
}

function compileNavigateStep(step: TestStep, lookups: Lookups): StepCompilationResult {
  let url = step.target;
  let confidence = 1.0;
  let resolvedFrom = 'exact';
  
  // Check if URL exists in pages
  const page = lookups.pageByUrl.get(url) || lookups.pageByUrl.get(url.toLowerCase());
  
  if (!page) {
    // URL might be dynamic - try to resolve
    if (url.includes('[') || url.includes(':')) {
      const resolved = resolveDynamicUrl(url);
      url = resolved;
      confidence = 0.8;
      resolvedFrom = 'dynamic-resolved';
    } else {
      // URL not found - might still be valid, just lower confidence
      confidence = 0.6;
      resolvedFrom = 'not-in-scanner';
    }
  }
  
  return {
    success: true,
    step: {
      action: 'navigate',
      selector: url,
      description: `Navigate to ${url}`,
      source: {
        originalTarget: step.target,
        resolvedFrom,
        confidence,
      },
    },
  };
}

function compileFillStep(
  step: TestStep,
  feature: AppFeature,
  lookups: Lookups
): StepCompilationResult {
  // Try to find element by field name
  const element = findElement(step.target, feature, lookups);
  
  if (!element) {
    return {
      success: false,
      unresolvedType: 'field',
      suggestion: `Could not find field "${step.target}". Available fields: ${Array.from(lookups.fieldByName.keys()).slice(0, 5).join(', ')}`,
    };
  }
  
  const selector = getBestSelector(element);
  
  return {
    success: true,
    step: {
      action: 'fill',
      selector,
      value: step.value || '',
      description: `Fill ${step.target} with "${step.value}"`,
      source: {
        originalTarget: step.target,
        resolvedFrom: `element:${element.id}`,
        confidence: getSelectorConfidence(selector),
      },
    },
  };
}

function compileClickStep(
  step: TestStep,
  feature: AppFeature,
  lookups: Lookups
): StepCompilationResult {
  // First try to find as button
  const button = lookups.buttonByText.get(step.target) || 
                 lookups.buttonByText.get(step.target.toLowerCase());
  
  if (button) {
    const selector = getBestSelector(button);
    
    return {
      success: true,
      step: {
        action: 'click',
        selector,
        description: `Click ${step.target}`,
        source: {
          originalTarget: step.target,
          resolvedFrom: `button:${button.id}`,
          confidence: getSelectorConfidence(selector),
        },
      },
    };
  }
  
  // Try as field (for clickable inputs like radio/checkbox)
  const element = findElement(step.target, feature, lookups);
  
  if (element) {
    const selector = getBestSelector(element);
    
    return {
      success: true,
      step: {
        action: 'click',
        selector,
        description: `Click ${step.target}`,
        source: {
          originalTarget: step.target,
          resolvedFrom: `element:${element.id}`,
          confidence: getSelectorConfidence(selector),
        },
      },
    };
  }
  
  // Try as text-based selector (last resort)
  return {
    success: true,
    step: {
      action: 'click',
      selector: `text="${step.target}"`,
      description: `Click ${step.target}`,
      source: {
        originalTarget: step.target,
        resolvedFrom: 'text-selector',
        confidence: 0.5,
      },
    },
  };
}

function compileSelectStep(
  step: TestStep,
  feature: AppFeature,
  lookups: Lookups
): StepCompilationResult {
  const element = findElement(step.target, feature, lookups);
  
  if (!element) {
    return {
      success: false,
      unresolvedType: 'field',
      suggestion: `Could not find select field "${step.target}"`,
    };
  }
  
  const selector = getBestSelector(element);
  
  return {
    success: true,
    step: {
      action: 'select',
      selector,
      value: step.value || '',
      description: `Select "${step.value}" in ${step.target}`,
      source: {
        originalTarget: step.target,
        resolvedFrom: `element:${element.id}`,
        confidence: getSelectorConfidence(selector),
      },
    },
  };
}

function compileCheckStep(
  step: TestStep,
  feature: AppFeature,
  lookups: Lookups
): StepCompilationResult {
  const element = findElement(step.target, feature, lookups);
  
  if (!element) {
    return {
      success: false,
      unresolvedType: 'field',
      suggestion: `Could not find checkbox/radio "${step.target}"`,
    };
  }
  
  const selector = getBestSelector(element);
  
  return {
    success: true,
    step: {
      action: step.action,
      selector,
      description: `${step.action === 'check' ? 'Check' : 'Uncheck'} ${step.target}`,
      source: {
        originalTarget: step.target,
        resolvedFrom: `element:${element.id}`,
        confidence: getSelectorConfidence(selector),
      },
    },
  };
}

function compileWaitStep(step: TestStep): StepCompilationResult {
  return {
    success: true,
    step: {
      action: 'wait',
      selector: step.target,
      description: `Wait for ${step.target}`,
      timeout: parseInt(step.value || '5000', 10),
      source: {
        originalTarget: step.target,
        resolvedFrom: 'wait-target',
        confidence: 1.0,
      },
    },
  };
}

function compileAssertStep(step: TestStep, lookups: Lookups): StepCompilationResult {
  return {
    success: true,
    step: {
      action: 'assert',
      selector: step.target,
      value: step.value,
      description: `Assert ${step.target}`,
      source: {
        originalTarget: step.target,
        resolvedFrom: 'assert-target',
        confidence: 0.8,
      },
    },
  };
}

// =============================================================================
// ASSERTION COMPILATION
// =============================================================================

function compileAssertions(
  testCase: TestCase,
  feature: AppFeature,
  lookups: Lookups
): CompiledAssertion[] {
  const assertions: CompiledAssertion[] = [];
  const expected = testCase.expectedResult;
  
  switch (expected.type) {
    case 'redirect':
      assertions.push({
        type: 'url',
        expected: expected.target.startsWith('/') ? expected.target : `/${expected.target}`,
        confidence: 0.9,
        source: 'expected-result',
        description: expected.description,
      });
      break;
    
    case 'error-visible':
    case 'success-visible':
    case 'element-visible':
      assertions.push({
        type: 'visible',
        selector: resolveAssertionSelector(expected.target, lookups),
        expected: expected.target,
        confidence: 0.8,
        source: 'expected-result',
        description: expected.description,
      });
      break;
    
    case 'element-hidden':
      assertions.push({
        type: 'hidden',
        selector: resolveAssertionSelector(expected.target, lookups),
        expected: expected.target,
        confidence: 0.8,
        source: 'expected-result',
        description: expected.description,
      });
      break;
    
    case 'state-change':
    case 'value-changed':
      // For state changes, we add a generic assertion
      assertions.push({
        type: 'visible',
        selector: '[data-testid], .success, .alert-success, [role="alert"]',
        expected: expected.description,
        confidence: 0.5,
        source: 'expected-result',
        description: expected.description,
      });
      break;
  }
  
  return assertions;
}

function resolveAssertionSelector(target: string, lookups: Lookups): string {
  // Try to find element by text
  const button = lookups.buttonByText.get(target.toLowerCase());
  if (button) {
    return getBestSelector(button);
  }
  
  // Common assertion target patterns
  if (target.toLowerCase().includes('error')) {
    return '[role="alert"], .error, .error-message, [data-testid*="error"]';
  }
  
  if (target.toLowerCase().includes('success')) {
    return '.success, .success-message, [data-testid*="success"], .alert-success';
  }
  
  if (target.toLowerCase().includes('validation')) {
    return '[role="alert"], .validation-error, .field-error, .invalid-feedback';
  }
  
  // Default: use text selector
  return `text="${target}"`;
}

// =============================================================================
// ELEMENT RESOLUTION
// =============================================================================

function findElement(
  target: string,
  feature: AppFeature,
  lookups: Lookups
): ScannerElement | null {
  // 1. Try exact match by name
  const byName = lookups.fieldByName.get(target);
  if (byName) return byName;
  
  // 2. Try lowercase match
  const byLowerName = lookups.fieldByName.get(target.toLowerCase());
  if (byLowerName) return byLowerName;
  
  // 3. Try to find in feature's forms
  for (const formId of feature.forms) {
    const formElements = lookups.elementsByForm.get(formId) || [];
    
    for (const el of formElements) {
      const name = (el.attributes['name'] as string || '').toLowerCase();
      const id = (el.attributes['id'] as string || '').toLowerCase();
      const placeholder = (el.attributes['placeholder'] as string || '').toLowerCase();
      const targetLower = target.toLowerCase();
      
      if (name === targetLower || id === targetLower || placeholder.includes(targetLower)) {
        return el;
      }
      
      // Check nearby text
      for (const text of el.nearbyText || []) {
        if (text.toLowerCase().includes(targetLower)) {
          return el;
        }
      }
    }
  }
  
  // 4. Fuzzy match - find element whose name contains target
  for (const [key, el] of lookups.fieldByName) {
    if (key.includes(target.toLowerCase()) || target.toLowerCase().includes(key)) {
      return el;
    }
  }
  
  return null;
}

// =============================================================================
// SELECTOR HELPERS
// =============================================================================

function getBestSelector(element: ScannerElement): string {
  // Priority 1: Use bestSelector if it's stable
  if (element.bestSelector) {
    if (element.bestSelector.includes('data-testid') || 
        element.bestSelector.includes('data-cy') ||
        element.bestSelector.includes('data-test')) {
      return element.bestSelector;
    }
  }
  
  // Priority 2: Build selector from attributes
  const testId = element.attributes['data-testid'] as string;
  if (testId) return `[data-testid="${testId}"]`;
  
  const dataCy = element.attributes['data-cy'] as string;
  if (dataCy) return `[data-cy="${dataCy}"]`;
  
  // Priority 3: For inputs, use name attribute
  const name = element.attributes['name'] as string;
  if (name && (element.tagName === 'input' || element.tagName === 'select' || element.tagName === 'textarea')) {
    return `${element.tagName}[name="${name}"]`;
  }
  
  // Priority 4: For buttons, use type=submit or text
  if (element.tagName === 'button') {
    if (element.attributes['type'] === 'submit') {
      return 'button[type="submit"]';
    }
    if (element.textContent) {
      return `button:has-text("${element.textContent.trim()}")`;
    }
  }
  
  // Priority 5: Use bestSelector as fallback
  if (element.bestSelector) {
    return element.bestSelector;
  }
  
  // Last resort: ID
  const id = element.attributes['id'] as string;
  if (id) return `#${id}`;
  
  return element.tagName;
}

function getSelectorConfidence(selector: string): number {
  if (selector.includes('data-testid') || selector.includes('data-cy')) return 0.95;
  if (selector.includes('[name=')) return 0.9;
  if (selector.includes('button[type="submit"]')) return 0.85;
  if (selector.includes(':has-text')) return 0.7;
  if (selector.startsWith('#')) return 0.8;
  if (selector.includes('text=')) return 0.5;
  return 0.6;
}

// =============================================================================
// URL RESOLUTION
// =============================================================================

function resolveDynamicUrl(url: string): string {
  return url
    // Next.js style: [param]
    .replace(/\[token\]/gi, 'test-token-123')
    .replace(/\[id\]/gi, '1')
    .replace(/\[slug\]/gi, 'test-slug')
    .replace(/\[\w*[Ii]d\]/g, '1')  // [userId], [orderId], etc.
    .replace(/\[\w+\]/g, 'test-param')
    // Express style: :param
    .replace(/:token/gi, 'test-token-123')
    .replace(/:id/gi, '1')
    .replace(/:slug/gi, 'test-slug')
    .replace(/:\w*[Ii]d/g, '1')
    .replace(/:\w+/g, 'test-param');
}

// =============================================================================
// DEDUPLICATION
// =============================================================================

function deduplicateSteps(suites: CompiledTestSuite[]): CompiledTestSuite[] {
  return suites.map(suite => ({
    ...suite,
    cases: suite.cases.map(testCase => {
      const seenSelectors = new Set<string>();
      const deduplicatedSteps: CompiledStep[] = [];
      
      for (const step of testCase.steps) {
        // For fill actions, check for duplicate selectors
        if (step.action === 'fill') {
          const key = `${step.action}:${step.selector}`;
          if (seenSelectors.has(key)) {
            // Skip duplicate fill for same selector
            continue;
          }
          seenSelectors.add(key);
        }
        
        deduplicatedSteps.push(step);
      }
      
      return {
        ...testCase,
        steps: deduplicatedSteps,
      };
    }),
  }));
}
