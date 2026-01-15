/**
 * V4 Discovery - LLM Generator
 * 
 * Uses LLM to generate meaningful test cases from journeys.
 * LLM provides:
 * - Human-readable names
 * - Realistic test data
 * - Edge case suggestions
 * - Assertions
 */

import {
  AppGraph,
  Journey,
  Suite,
  Case,
  Step,
  CaseType,
  LLMInput,
  LLMOutput,
  FieldNode,
  FieldSignals,
  FormNode,
  RouteNode,
  ButtonNode,
} from './types';

/**
 * Generate test suites from journeys using LLM
 */
export async function generateSuites(
  journeys: Journey[],
  graph: AppGraph,
  context: { appName: string; framework: string },
  llmClient?: LLMClient
): Promise<Suite[]> {
  const suites: Suite[] = [];
  
  for (const journey of journeys) {
    // Build LLM input
    const llmInput = buildLLMInput(journey, graph, context);
    
    // If LLM client provided, use it; otherwise use rule-based fallback
    let llmOutput: LLMOutput;
    if (llmClient) {
      llmOutput = await llmClient.generateTestCases(llmInput);
    } else {
      llmOutput = generateWithoutLLM(journey, graph);
    }
    
    // Convert LLM output to Suite
    const suite = buildSuite(journey, graph, llmOutput);
    suites.push(suite);
  }
  
  return suites;
}

/**
 * Build input for LLM
 */
function buildLLMInput(
  journey: Journey,
  graph: AppGraph,
  context: { appName: string; framework: string }
): LLMInput {
  const routes = graph.nodes
    .filter(n => n.type === 'route')
    .map(n => (n as RouteNode).path);
  
  return {
    graph,
    journey,
    context: {
      ...context,
      routes,
    },
  };
}

/**
 * Generate test cases without LLM (rule-based fallback)
 * This ensures the system works even without LLM
 */
function generateWithoutLLM(journey: Journey, graph: AppGraph): LLMOutput {
  // Get entry route
  const entryNode = graph.nodes.find(n => n.id === journey.entryNode) as RouteNode;
  const routePath = entryNode?.path || '/unknown';
  
  // Find the form for this journey (should be just one now)
  const formNode = journey.formId 
    ? graph.nodes.find(n => n.id === journey.formId) as FormNode | undefined
    : (journey.nodes
        .map(id => graph.nodes.find(n => n.id === id))
        .find(n => n?.type === 'form') as FormNode | undefined);
  
  // Find fields in this journey
  const fieldNodes = journey.nodes
    .map(id => graph.nodes.find(n => n.id === id))
    .filter(n => n?.type === 'field') as FieldNode[];
  
  // Generate suite name - unique per route AND form
  const suiteName = generateUniqueSuiteName(routePath, journey.formName || formNode?.name);
  
  // Generate cases
  const cases: LLMOutput['cases'] = [];
  
  // Case 1: Happy path (if has form)
  if (formNode) {
    const formDisplayName = journey.formName || formNode.name || 'form';
    
    cases.push({
      name: `Complete ${formDisplayName} successfully`,
      description: `User fills all fields and submits the form`,
      type: 'happy-path',
      preconditions: journey.isAuthRequired ? ['User is authenticated'] : [],
      expectedOutcome: 'Form submission succeeds',
      testData: generateTestData(fieldNodes),
      edgeCases: [],
    });
    
    // Case 2: Validation - empty required fields
    const requiredFields = fieldNodes.filter(f => f.isRequired);
    if (requiredFields.length > 0) {
      cases.push({
        name: `Cannot submit with empty required fields`,
        description: `Validation errors shown for empty required fields`,
        type: 'validation',
        preconditions: journey.isAuthRequired ? ['User is authenticated'] : [],
        expectedOutcome: 'Validation errors displayed',
        testData: {},
        edgeCases: requiredFields.map(f => `Empty ${f.name || 'field'}`),
      });
    }
    
    // Case 3: Individual field validation
    for (const field of requiredFields.slice(0, 3)) { // Limit to 3
      cases.push({
        name: `Cannot submit with invalid ${field.name || 'field'}`,
        description: `Validation error for ${field.name || 'field'}`,
        type: 'validation',
        preconditions: journey.isAuthRequired ? ['User is authenticated'] : [],
        expectedOutcome: `Error message for ${field.name || 'field'}`,
        testData: generateTestDataExcept(fieldNodes, field.id),
        edgeCases: [],
      });
    }
  }
  
  // Case for navigation-only journeys
  if (!formNode) {
    cases.push({
      name: `Navigate to ${routePath}`,
      description: `User can access ${routePath}`,
      type: 'happy-path',
      preconditions: journey.isAuthRequired ? ['User is authenticated'] : [],
      expectedOutcome: `Page ${routePath} is displayed`,
      testData: {},
      edgeCases: [],
    });
  }
  
  return {
    suiteName,
    suiteDescription: `Tests for ${routePath}`,
    cases,
  };
}

/**
 * Generate unique suite name from route path and form name
 * Ensures no duplicate suite names
 */
function generateUniqueSuiteName(routePath: string, formName?: string): string {
  // Clean path - remove leading slash and dynamic segments
  const pathCleaned = routePath
    .replace(/^\//,'')
    .replace(/\[.*?\]/g, '')
    .replace(/\//g, ' ')
    .trim();
  
  // Generate path-based name
  let suiteName = '';
  if (pathCleaned) {
    suiteName = pathCleaned
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  
  // If we have a form name and it adds info, append it
  if (formName) {
    const cleanFormName = formName
      .replace(/Form$/i, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
    
    // Only append form name if it's different from route-based name
    const routeWords = suiteName.toLowerCase().split(/\s+/);
    const formWords = cleanFormName.toLowerCase().split(/\s+/);
    
    // Check if form name adds new info
    const hasNewInfo = formWords.some(fw => !routeWords.some(rw => rw.includes(fw) || fw.includes(rw)));
    
    if (hasNewInfo && cleanFormName && cleanFormName.toLowerCase() !== 'form') {
      suiteName = suiteName ? `${suiteName} - ${cleanFormName}` : cleanFormName;
    }
  }
  
  return suiteName || 'Home';
}

/**
 * Generate test data for fields
 * Uses field signals to generate appropriate values
 */
function generateTestData(fields: FieldNode[]): Record<string, string> {
  const data: Record<string, string> = {};
  
  for (const field of fields) {
    data[field.id] = generateValueForField(field);
  }
  
  return data;
}

/**
 * Generate test data excluding one field
 */
function generateTestDataExcept(
  fields: FieldNode[],
  excludeId: string
): Record<string, string> {
  const data: Record<string, string> = {};
  
  for (const field of fields) {
    if (field.id !== excludeId) {
      data[field.id] = generateValueForField(field);
    }
  }
  
  return data;
}

/**
 * Generate a value for a field based on its signals
 * Uses HTML semantics + field name patterns
 */
function generateValueForField(field: FieldNode): string {
  const { signals, htmlType, name } = field;
  const nameLower = (name || '').toLowerCase();
  
  // 1. Use HTML type first (most reliable)
  switch (htmlType) {
    case 'email':
      return 'test@example.com';
    case 'password':
      return 'TestPassword123!';
    case 'tel':
      return '+1234567890';
    case 'number':
      return '42';
    case 'date':
      return '2024-01-15';
    case 'url':
      return 'https://example.com';
    case 'checkbox':
      return 'true';
    case 'radio':
      return 'option1';
  }
  
  // 2. Use autocomplete hint (HTML standard)
  if (signals.autocomplete) {
    const value = getValueForAutocomplete(signals.autocomplete);
    if (value) return value;
  }
  
  // 3. Infer from field name (universal patterns)
  const valueFromName = inferValueFromName(nameLower, signals);
  if (valueFromName) return valueFromName;
  
  // 4. Infer from label/placeholder
  const labelLower = (signals.label || '').toLowerCase();
  const placeholderLower = (signals.placeholder || '').toLowerCase();
  
  const valueFromLabel = inferValueFromName(labelLower, signals);
  if (valueFromLabel) return valueFromLabel;
  
  const valueFromPlaceholder = inferValueFromName(placeholderLower, signals);
  if (valueFromPlaceholder) return valueFromPlaceholder;
  
  // 5. Default based on HTML type or generic
  if (htmlType === 'textarea') {
    return 'This is a test description with multiple words.';
  }
  
  return 'Test Value';
}

/**
 * Get value for HTML autocomplete attribute
 */
function getValueForAutocomplete(autocomplete: string): string | null {
  const values: Record<string, string> = {
    'email': 'test@example.com',
    'current-password': 'TestPassword123!',
    'new-password': 'TestPassword123!',
    'username': 'testuser',
    'name': 'John Doe',
    'given-name': 'John',
    'family-name': 'Doe',
    'tel': '+1234567890',
    'tel-national': '1234567890',
    'street-address': '123 Test Street',
    'address-line1': '123 Test Street',
    'address-line2': 'Apt 4B',
    'address-level1': 'California',
    'address-level2': 'San Francisco',
    'postal-code': '94102',
    'country': 'United States',
    'country-name': 'United States',
    'cc-number': '4111111111111111',
    'cc-name': 'John Doe',
    'cc-exp': '12/25',
    'cc-exp-month': '12',
    'cc-exp-year': '2025',
    'cc-csc': '123',
    'organization': 'Test Company Inc.',
    'organization-title': 'Software Engineer',
    'bday': '1990-01-15',
    'bday-day': '15',
    'bday-month': '1',
    'bday-year': '1990',
    'sex': 'male',
    'url': 'https://example.com',
    'photo': 'https://example.com/photo.jpg',
  };
  return values[autocomplete] || null;
}

/**
 * Infer test value from field name using universal patterns
 * These patterns work for ANY web app, not just specific domains
 */
function inferValueFromName(name: string, signals: FieldSignals): string | null {
  if (!name) return null;
  
  // Email patterns
  if (name.includes('email') || name.includes('e-mail')) {
    return 'test@example.com';
  }
  
  // Password patterns
  if (name.includes('password') || name.includes('pwd') || name === 'pass') {
    if (name.includes('confirm') || name.includes('repeat') || name.includes('verify')) {
      return 'TestPassword123!';
    }
    return 'TestPassword123!';
  }
  
  // Name patterns
  if (name === 'name' || name === 'fullname' || name === 'full_name') {
    return 'John Doe';
  }
  if (name.includes('firstname') || name.includes('first_name') || name.includes('given')) {
    return 'John';
  }
  if (name.includes('lastname') || name.includes('last_name') || name.includes('family') || name.includes('surname')) {
    return 'Doe';
  }
  if (name.includes('username') || name === 'user') {
    return 'testuser';
  }
  
  // Contact patterns
  if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) {
    return '+1234567890';
  }
  
  // Address patterns
  if (name.includes('street') || name.includes('address1') || name === 'address') {
    return '123 Test Street';
  }
  if (name.includes('address2') || name.includes('apt') || name.includes('suite')) {
    return 'Apt 4B';
  }
  if (name.includes('city') || name.includes('locality')) {
    return 'San Francisco';
  }
  if (name.includes('state') || name.includes('province') || name.includes('region')) {
    return 'California';
  }
  if (name.includes('zip') || name.includes('postal')) {
    return '94102';
  }
  if (name.includes('country')) {
    return 'United States';
  }
  
  // Payment patterns
  if (name.includes('card') && (name.includes('num') || name.includes('number'))) {
    return '4111111111111111';
  }
  if (name.includes('cvv') || name.includes('cvc') || name.includes('csc')) {
    return '123';
  }
  if (name.includes('expir') || name.includes('exp')) {
    if (name.includes('month')) return '12';
    if (name.includes('year')) return '2025';
    return '12/25';
  }
  
  // Organization/Company
  if (name.includes('company') || name.includes('org') || name.includes('business')) {
    return 'Test Company Inc.';
  }
  if (name.includes('title') || name.includes('position') || name.includes('role')) {
    return 'Software Engineer';
  }
  
  // URLs and websites
  if (name.includes('url') || name.includes('website') || name.includes('link')) {
    return 'https://example.com';
  }
  
  // Description/content patterns
  if (name.includes('description') || name.includes('content') || name.includes('message') || name.includes('comment') || name.includes('note')) {
    return 'This is a test description with sample content.';
  }
  if (name.includes('subject') || name.includes('title')) {
    return 'Test Subject';
  }
  
  // Quantity/Amount patterns
  if (name.includes('quantity') || name.includes('qty') || name.includes('amount') || name.includes('count')) {
    return '1';
  }
  if (name.includes('price') || name.includes('cost') || name.includes('total')) {
    return '99.99';
  }
  
  // Date patterns
  if (name.includes('date') || name.includes('birthday') || name.includes('dob')) {
    return '1990-01-15';
  }
  
  // Search
  if (name.includes('search') || name.includes('query') || name === 'q') {
    return 'test search query';
  }
  
  // Code patterns
  if (name.includes('code') || name.includes('token') || name.includes('pin')) {
    return '123456';
  }
  
  return null;
}

/**
 * Build Suite from LLM output
 */
function buildSuite(
  journey: Journey,
  graph: AppGraph,
  llmOutput: LLMOutput
): Suite {
  const cases: Case[] = llmOutput.cases.map((c, idx) => ({
    id: `case:${journey.id}:${idx}`,
    name: c.name,
    description: c.description,
    type: c.type,
    preconditions: c.preconditions,
    steps: buildSteps(journey, graph, c.testData),
    expectedOutcome: c.expectedOutcome,
  }));
  
  return {
    id: `suite:${journey.id}`,
    name: llmOutput.suiteName,
    description: llmOutput.suiteDescription,
    journey,
    cases,
  };
}

/**
 * Build steps from journey and test data
 */
function buildSteps(
  journey: Journey,
  graph: AppGraph,
  testData: Record<string, string>
): Step[] {
  const steps: Step[] = [];
  let stepIndex = 0;
  
  // Step 1: Navigate to entry route
  const entryNode = graph.nodes.find(n => n.id === journey.entryNode) as RouteNode;
  if (entryNode) {
    steps.push({
      id: `step:${stepIndex++}`,
      action: 'navigate',
      target: entryNode.path,
    });
  }
  
  // Steps for each node in journey
  for (const nodeId of journey.nodes) {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    if (node.type === 'field') {
      const fieldNode = node as FieldNode;
      const value = testData[fieldNode.id] || generateValueForField(fieldNode);
      
      steps.push({
        id: `step:${stepIndex++}`,
        action: 'fill',
        target: fieldNode.selector,
        value,
      });
    }
    
    if (node.type === 'button' && (node as ButtonNode).buttonType === 'submit') {
      const buttonNode = node as ButtonNode;
      steps.push({
        id: `step:${stepIndex++}`,
        action: 'click',
        target: buttonNode.selector,
      });
    }
  }
  
  // Final assertion
  steps.push({
    id: `step:${stepIndex++}`,
    action: 'assert',
    target: 'page',
    assertion: {
      type: 'visible',
      expected: 'success',
    },
  });
  
  return steps;
}

/**
 * LLM Client interface
 */
export interface LLMClient {
  generateTestCases(input: LLMInput): Promise<LLMOutput>;
}

/**
 * Create LLM prompt for test case generation
 */
export function createLLMPrompt(input: LLMInput): string {
  const { journey, graph, context } = input;
  
  // Get nodes in journey
  const nodes = journey.nodes
    .map(id => graph.nodes.find(n => n.id === id))
    .filter(Boolean);
  
  const forms = nodes.filter(n => n!.type === 'form') as FormNode[];
  const fields = nodes.filter(n => n!.type === 'field') as FieldNode[];
  const entryRoute = graph.nodes.find(n => n.id === journey.entryNode) as RouteNode;
  
  return `
You are a QA engineer generating test cases for a web application.

Application: ${context.appName}
Framework: ${context.framework}
Route: ${entryRoute?.path || 'unknown'}

Forms on this page:
${forms.map(f => `- ${f.name}`).join('\n')}

Fields:
${fields.map(f => `- ${f.name || 'unnamed'}: type=${f.htmlType}, required=${f.isRequired}, selector="${f.selector}"`).join('\n')}

Generate test cases in JSON format:
{
  "suiteName": "Human readable suite name",
  "suiteDescription": "Brief description",
  "cases": [
    {
      "name": "Test case name",
      "description": "What this tests",
      "type": "happy-path|validation|error|edge|security",
      "preconditions": ["Any setup required"],
      "expectedOutcome": "What should happen",
      "testData": { "fieldId": "value" },
      "edgeCases": ["Potential edge cases"]
    }
  ]
}

Generate at least:
1. One happy-path case
2. One validation case for empty required fields
3. One error handling case

Use realistic test data values.
`.trim();
}
