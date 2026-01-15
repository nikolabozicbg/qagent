/**
 * V6 Test Plan Generator
 * 
 * Generates test plans for each feature using LLM.
 * 
 * Key differences from V5:
 * - LLM generates test cases, not code
 * - Steps use FIELD NAMES, not selectors
 * - LLM decides what to test based on feature context
 * - Includes validation, security, and edge cases intelligently
 */

import { LLMClient } from '../v5-discovery/llm-client';
import { ScannerPayload, ScannerElement, ScannerConstraint } from '../v5-discovery/types';
import {
  AppUnderstanding,
  AppFeature,
  FeatureTestPlan,
  TestCase,
  TestStep,
  TestPrecondition,
  ExpectedResult,
} from './types';

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

export async function generateTestPlans(
  appUnderstanding: AppUnderstanding,
  scannerPayload: ScannerPayload,
  llmClient: LLMClient
): Promise<FeatureTestPlan[]> {
  console.log('   📝 V6 Test Plan Generator: Creating test plans...');
  
  const plans: FeatureTestPlan[] = [];
  
  // Generate test plan for each feature
  for (const feature of appUnderstanding.features) {
    console.log(`   📋 Generating tests for: ${feature.name}`);
    
    try {
      const plan = await generateFeatureTestPlan(
        feature,
        appUnderstanding,
        scannerPayload,
        llmClient
      );
      plans.push(plan);
    } catch (error) {
      console.error(`   ⚠️ Failed to generate plan for ${feature.name}:`, error);
      // Create fallback plan
      plans.push(createFallbackPlan(feature, scannerPayload));
    }
  }
  
  console.log(`   ✅ Generated ${plans.length} test plans with ${plans.reduce((sum, p) => sum + p.cases.length, 0)} test cases`);
  
  return plans;
}

// =============================================================================
// PER-FEATURE TEST PLAN GENERATION
// =============================================================================

interface FeatureContext {
  feature: AppFeature;
  formFields: Array<{
    name: string;
    type: string;
    required: boolean;
    constraints: Array<{ type: string; value?: string | number }>;
    validExamples: string[];
    invalidExamples: Array<{ value: string; violates: string; reason: string }>;
  }>;
  pageUrls: string[];
  relatedFeatures: Array<{ id: string; name: string; relationship: string }>;
  successIndicator: AppFeature['successIndicator'];
  failureIndicator: AppFeature['failureIndicator'];
}

async function generateFeatureTestPlan(
  feature: AppFeature,
  appUnderstanding: AppUnderstanding,
  scannerPayload: ScannerPayload,
  llmClient: LLMClient
): Promise<FeatureTestPlan> {
  // Prepare feature context
  const context = prepareFeatureContext(feature, appUnderstanding, scannerPayload);
  
  if (!llmClient.isAvailable()) {
    return createFallbackPlan(feature, scannerPayload);
  }
  
  // Generate test cases using LLM
  const prompt = buildTestPlanPrompt(context, appUnderstanding);
  
  const response = await llmClient.completeJSON<LLMTestPlanResponse>(prompt, {
    systemPrompt: TEST_PLAN_SYSTEM_PROMPT,
    temperature: 0.4,
    maxTokens: 4096,
  });
  
  // Convert LLM response to FeatureTestPlan
  return convertLLMResponse(feature, response, context);
}

function prepareFeatureContext(
  feature: AppFeature,
  appUnderstanding: AppUnderstanding,
  scannerPayload: ScannerPayload
): FeatureContext {
  // Get form fields for this feature
  const formFields: FeatureContext['formFields'] = [];
  
  const constraintsByElementId = buildConstraintsByElementId(scannerPayload);
  
  for (const formId of feature.forms) {
    const formElements = scannerPayload.elements.filter(el => el.formId === formId);
    
    for (const el of formElements) {
      if (el.tagName !== 'input' && el.tagName !== 'select' && el.tagName !== 'textarea') continue;
      
      const type = (el.attributes['type'] as string || 'text').toLowerCase();
      if (type === 'hidden' || type === 'submit') continue;
      
      const constraints = constraintsByElementId.get(el.id) || [];
      const rules = constraints.flatMap(c => c.rules);
      const validExamples = constraints.flatMap(c => c.validExamples);
      const invalidExamples = constraints.flatMap(c => c.invalidExamples);
      
      formFields.push({
        name: (el.attributes['name'] as string) || el.id,
        type,
        required: rules.some(r => r.type === 'required'),
        constraints: rules.map(r => ({ type: r.type, value: r.value })),
        validExamples,
        invalidExamples,
      });
    }
  }
  
  // Get page URLs
  const pageUrls = feature.pages.map(pageId => {
    const page = scannerPayload.pages.find(p => p.id === pageId);
    return page?.url || '';
  }).filter(Boolean);
  
  // Get related features
  const relatedFeatures: FeatureContext['relatedFeatures'] = [];
  
  // Dependencies
  for (const depId of feature.dependsOn) {
    const depFeature = appUnderstanding.features.find(f => f.id === depId);
    if (depFeature) {
      relatedFeatures.push({
        id: depId,
        name: depFeature.name,
        relationship: 'depends-on',
      });
    }
  }
  
  // Features that depend on this one
  for (const f of appUnderstanding.features) {
    if (f.dependsOn.includes(feature.id)) {
      relatedFeatures.push({
        id: f.id,
        name: f.name,
        relationship: 'required-by',
      });
    }
  }
  
  return {
    feature,
    formFields,
    pageUrls,
    relatedFeatures,
    successIndicator: feature.successIndicator,
    failureIndicator: feature.failureIndicator,
  };
}

// =============================================================================
// LLM PROMPT & RESPONSE
// =============================================================================

const TEST_PLAN_SYSTEM_PROMPT = `You are a senior QA engineer creating test cases for a web application feature.

Your test cases should be:
1. PRACTICAL - Test real user scenarios, not edge cases nobody cares about
2. FOCUSED - One clear objective per test case
3. COMPLETE - Include preconditions, steps, and expected results
4. SMART - Test the most important validations, not every possible combination

TEST CASE DISTRIBUTION (per feature):
- 1 Happy Path (critical) - The main success scenario
- 1-2 Validation Tests (high) - Most important validation rules
- 0-1 Security Test (if applicable) - Only for sensitive features
- 0-1 Edge Case (medium) - Only if there's a meaningful boundary condition

STEP FORMAT:
- Use FIELD NAMES, not selectors (e.g., "email" not "[data-testid=email]")
- Use BUTTON TEXT, not technical selectors (e.g., "Sign In" not "button[type=submit]")
- Keep steps simple and clear

VALUE SELECTION:
- For happy path: Use realistic, valid values
- For validation: Use values that SPECIFICALLY violate the constraint being tested
- For edge cases: Use boundary values (min-1, max+1, etc.)

DO NOT:
- Create more than 5 test cases per feature
- Test every constraint - pick the 2-3 most important ones
- Use technical selector syntax in steps
- Create tests for the same thing twice`;

interface LLMTestPlanResponse {
  cases: Array<{
    id: string;
    name: string;
    type: 'happy-path' | 'validation' | 'security' | 'edge-case' | 'negative' | 'boundary';
    priority: 'critical' | 'high' | 'medium' | 'low';
    rationale: string;
    preconditions: Array<{
      type: 'auth' | 'data' | 'navigation' | 'state';
      description: string;
    }>;
    steps: Array<{
      action: 'navigate' | 'fill' | 'click' | 'select' | 'check' | 'uncheck' | 'wait' | 'assert';
      target: string;
      value?: string;
      valueReason?: string;
    }>;
    expectedResult: {
      type: 'redirect' | 'error-visible' | 'success-visible' | 'state-change' | 'element-visible' | 'element-hidden';
      target: string;
      description: string;
    };
  }>;
}

function buildTestPlanPrompt(context: FeatureContext, appUnderstanding: AppUnderstanding): string {
  const fieldsSection = context.formFields.length > 0
    ? context.formFields.map(f => {
        const req = f.required ? '*' : '';
        const constraints = f.constraints.length > 0
          ? ` [${f.constraints.map(c => c.type + (c.value !== undefined ? `:${c.value}` : '')).join(', ')}]`
          : '';
        const invalids = f.invalidExamples.length > 0
          ? `\n      Invalid examples: ${f.invalidExamples.map(i => `"${i.value}" (${i.reason})`).join(', ')}`
          : '';
        return `  - ${f.name}${req} (${f.type})${constraints}${invalids}`;
      }).join('\n')
    : '  No form fields';

  const dependenciesSection = context.relatedFeatures.length > 0
    ? context.relatedFeatures.map(r => `  - ${r.relationship}: ${r.name}`).join('\n')
    : '  None';

  const preconditionsSection = context.feature.preconditions.length > 0
    ? context.feature.preconditions.map(p => `  - [${p.type}] ${p.description}`).join('\n')
    : '  None';

  return `Create test cases for this feature.

# Feature: ${context.feature.name}
${context.feature.description}

## Category: ${context.feature.category}
## Priority: ${context.feature.priority}
## Risk Level: ${context.feature.riskLevel}

## Pages
${context.pageUrls.map(u => `  - ${u}`).join('\n')}

## Form Fields (required fields marked with *)
${fieldsSection}

## Preconditions
${preconditionsSection}

## Dependencies
${dependenciesSection}

## Success Indicator
Type: ${context.successIndicator.type}
Target: ${context.successIndicator.target}
Description: ${context.successIndicator.description}

${context.failureIndicator ? `## Failure Indicator
Type: ${context.failureIndicator.type}
Target: ${context.failureIndicator.target}
Description: ${context.failureIndicator.description}` : ''}

# Instructions

Generate test cases as JSON:

{
  "cases": [
    {
      "id": "unique-test-id",
      "name": "Descriptive test name",
      "type": "happy-path|validation|security|edge-case|negative|boundary",
      "priority": "critical|high|medium|low",
      "rationale": "Why this test is important",
      "preconditions": [
        { "type": "auth|data|navigation|state", "description": "What must be true" }
      ],
      "steps": [
        { "action": "navigate", "target": "/url" },
        { "action": "fill", "target": "fieldName", "value": "test value", "valueReason": "why this value" },
        { "action": "click", "target": "Button Text" }
      ],
      "expectedResult": {
        "type": "redirect|error-visible|success-visible|state-change",
        "target": "URL or element description",
        "description": "What should happen"
      }
    }
  ]
}

RULES:
1. Generate 3-5 test cases max
2. MUST include one happy path test
3. For validation tests, use ACTUAL invalid values from the form field data
4. Use field NAMES in steps, not selectors
5. Steps should be in order: navigate → fill fields → click submit
6. Each test should have a clear, single objective`;
}

function convertLLMResponse(
  feature: AppFeature,
  response: LLMTestPlanResponse,
  context: FeatureContext
): FeatureTestPlan {
  const cases: TestCase[] = response.cases.map((c, index) => {
    // Build preconditions
    const preconditions: TestPrecondition[] = c.preconditions.map(p => ({
      type: p.type,
      description: p.description,
    }));
    
    // Add feature's preconditions if not already included
    for (const fp of feature.preconditions) {
      if (!preconditions.some(p => p.type === fp.type && p.description === fp.description)) {
        preconditions.push({
          type: fp.type,
          description: fp.description,
        });
      }
    }
    
    // Build steps
    const steps: TestStep[] = c.steps.map(s => ({
      action: s.action,
      target: s.target,
      value: s.value,
      valueReason: s.valueReason,
    }));
    
    // Build expected result
    const expectedResult: ExpectedResult = {
      type: c.expectedResult.type as ExpectedResult['type'],
      target: c.expectedResult.target,
      description: c.expectedResult.description,
    };
    
    return {
      id: c.id || `${feature.id}-case-${index}`,
      name: c.name,
      type: c.type,
      priority: c.priority,
      rationale: c.rationale,
      preconditions,
      steps,
      expectedResult,
    };
  });
  
  return {
    featureId: feature.id,
    featureName: feature.name,
    cases,
  };
}

// =============================================================================
// FALLBACK PLAN (No LLM)
// =============================================================================

function createFallbackPlan(
  feature: AppFeature,
  scannerPayload: ScannerPayload
): FeatureTestPlan {
  const cases: TestCase[] = [];
  
  // Get page URL
  const pageUrl = feature.pages.length > 0
    ? scannerPayload.pages.find(p => p.id === feature.pages[0])?.url || '/'
    : '/';
  
  // Get form fields
  const constraintsByElementId = buildConstraintsByElementId(scannerPayload);
  const formElements: ScannerElement[] = [];
  
  for (const formId of feature.forms) {
    const elements = scannerPayload.elements.filter(el => el.formId === formId);
    formElements.push(...elements);
  }
  
  const inputFields = formElements.filter(el => {
    if (el.tagName !== 'input' && el.tagName !== 'select' && el.tagName !== 'textarea') return false;
    const type = (el.attributes['type'] as string || '').toLowerCase();
    return type !== 'hidden' && type !== 'submit';
  });
  
  // 1. HAPPY PATH TEST
  const happyPathSteps: TestStep[] = [
    { action: 'navigate', target: pageUrl },
  ];
  
  for (const field of inputFields) {
    const fieldName = (field.attributes['name'] as string) || field.id;
    const type = (field.attributes['type'] as string || 'text').toLowerCase();
    
    if (type === 'checkbox' || type === 'radio') {
      happyPathSteps.push({ action: 'check', target: fieldName });
    } else {
      const value = getDefaultValue(field, constraintsByElementId);
      happyPathSteps.push({ action: 'fill', target: fieldName, value });
    }
  }
  
  // Find submit button
  const submitButton = formElements.find(el => 
    el.tagName === 'button' && el.attributes['type'] === 'submit'
  );
  
  if (submitButton) {
    const buttonText = submitButton.textContent?.trim() || 'Submit';
    happyPathSteps.push({ action: 'click', target: buttonText });
  }
  
  cases.push({
    id: `${feature.id}-happy-path`,
    name: `${feature.name} - Successful submission`,
    type: 'happy-path',
    priority: 'critical',
    rationale: 'Verify the main success scenario works',
    preconditions: feature.preconditions.map(p => ({
      type: p.type,
      description: p.description,
    })),
    steps: happyPathSteps,
    expectedResult: {
      type: feature.successIndicator.type as ExpectedResult['type'],
      target: feature.successIndicator.target,
      description: feature.successIndicator.description,
    },
  });
  
  // 2. EMPTY SUBMISSION TEST (if has required fields)
  const hasRequired = inputFields.some(el => {
    const constraints = constraintsByElementId.get(el.id) || [];
    return constraints.some(c => c.rules.some(r => r.type === 'required'));
  });
  
  if (hasRequired && submitButton) {
    const buttonText = submitButton.textContent?.trim() || 'Submit';
    
    cases.push({
      id: `${feature.id}-empty-submission`,
      name: `${feature.name} - Cannot submit empty form`,
      type: 'validation',
      priority: 'high',
      rationale: 'Verify required field validation works',
      preconditions: feature.preconditions.map(p => ({
        type: p.type,
        description: p.description,
      })),
      steps: [
        { action: 'navigate', target: pageUrl },
        { action: 'click', target: buttonText },
      ],
      expectedResult: {
        type: 'error-visible',
        target: 'validation error',
        description: 'Form should show validation error for required fields',
      },
    });
  }
  
  return {
    featureId: feature.id,
    featureName: feature.name,
    cases,
  };
}

function getDefaultValue(element: ScannerElement, constraintsByElementId: Map<string, ScannerConstraint[]>): string {
  const type = (element.attributes['type'] as string || 'text').toLowerCase();
  const name = ((element.attributes['name'] as string) || '').toLowerCase();
  
  // Check for valid examples in constraints
  const constraints = constraintsByElementId.get(element.id) || [];
  for (const c of constraints) {
    if (c.validExamples.length > 0 && c.validExamples[0] !== 'test') {
      return c.validExamples[0];
    }
  }
  
  // Smart defaults
  if (type === 'email' || name.includes('email')) return 'testuser@example.com';
  if (type === 'password' || name.includes('password')) return 'SecurePass123!';
  if (name.includes('first') && name.includes('name')) return 'John';
  if (name.includes('last') && name.includes('name')) return 'Doe';
  if (name === 'username') return 'testuser123';
  if (name === 'name' || name === 'fullname') return 'Test User';
  if (type === 'tel' || name.includes('phone')) return '+1234567890';
  if (type === 'number') return '10';
  if (type === 'date' || name.includes('date')) return '2025-01-15';
  if (type === 'url' || name.includes('url')) return 'https://example.com';
  
  return 'Test Value';
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildConstraintsByElementId(payload: ScannerPayload): Map<string, ScannerConstraint[]> {
  const map = new Map<string, ScannerConstraint[]>();
  for (const c of payload.constraints) {
    const existing = map.get(c.elementId) || [];
    existing.push(c);
    map.set(c.elementId, existing);
  }
  return map;
}
