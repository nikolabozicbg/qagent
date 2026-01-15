/**
 * V5 Discovery - Main Orchestrator
 * 
 * Entry point for V5 discovery pipeline.
 * Called from cloud-discovery.service.ts when version=v5.
 * 
 * Pipeline:
 * 1. Convert legacy payload to V5 ScannerPayload format
 * 2. Analyzer: Extract semantic understanding (domains, journeys)
 * 3. Generator: Create test suites from scanner data
 * 4. Validator: Check generated tests against scanner data
 * 5. Critic: Review tests with checklist
 * 6. Self-Heal: Fix issues iteratively
 * 7. Return final suites
 */

export * from './types';
export { validate } from './validator';
export { analyze } from './agents/analyzer';
export { generate } from './agents/generator';
export { critique } from './agents/critic';
export { selfHeal } from './self-healer';
export { LLMClient, createLLMClient, type LLMOptions } from './llm-client';

import {
  ScannerPayload,
  V5DiscoveryResult,
  GeneratedSuite,
} from './types';
import { analyze } from './agents/analyzer';
import { generate } from './agents/generator';
import { validate } from './validator';
import { critique } from './agents/critic';
import { selfHeal } from './self-healer';
import { LLMClient } from './llm-client';

// =============================================================================
// OPTIONS
// =============================================================================

export interface V5DiscoveryOptions {
  /** Use LLM for semantic analysis */
  useLLM?: boolean;
  
  /** LLM client instance */
  llmClient?: LLMClient;
  
  /** Skip self-healing loop */
  skipSelfHeal?: boolean;
  
  /** Minimum quality score to accept (0-1) */
  minQualityScore?: number;
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Run V5 Discovery pipeline
 * 
 * @param payload - Scanner payload (can be legacy or V5 format)
 * @param options - Discovery options
 */
export async function runV5Discovery(
  payload: any,
  options: V5DiscoveryOptions = {}
): Promise<V5DiscoveryResult> {
  const startTime = Date.now();
  
  console.log('\n🚀 V5 Discovery - Zero Weakness Pipeline');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Step 1: Convert payload to V5 format
  console.log('📦 Step 1: Converting payload to V5 format...');
  const scannerPayload = convertToV5Payload(payload);
  
  const scannerStats = {
    pages: scannerPayload.pages.length,
    elements: scannerPayload.elements.length,
    constraints: scannerPayload.constraints.length,
    flows: scannerPayload.flows.length,
  };
  console.log(`   Pages: ${scannerStats.pages}, Elements: ${scannerStats.elements}`);
  console.log(`   Constraints: ${scannerStats.constraints}, Flows: ${scannerStats.flows}`);
  
  // Step 2: Analyze
  console.log('🔍 Step 2: Analyzing application structure...');
  const analyzerOutput = await analyze(
    scannerPayload,
    options.useLLM ? options.llmClient : undefined
  );
  console.log(`   Domains: ${analyzerOutput.domains.length}`);
  console.log(`   Journeys: ${analyzerOutput.journeys.length}`);
  
  // Step 3: Generate
  console.log('🧪 Step 3: Generating test suites...');
  const generatorOutput = await generate(
    analyzerOutput,
    scannerPayload,
    options.useLLM ? options.llmClient : undefined
  );
  const totalCases = generatorOutput.suites.reduce((sum, s) => sum + s.cases.length, 0);
  console.log(`   Suites: ${generatorOutput.suites.length}, Cases: ${totalCases}`);
  
  // Step 4: Validate
  console.log('✅ Step 4: Validating generated tests...');
  const validatorResult = validate(generatorOutput, scannerPayload);
  console.log(`   Score: ${(validatorResult.score * 100).toFixed(1)}%`);
  console.log(`   Issues: ${validatorResult.issues.length}`);
  
  // Step 5: Critique
  console.log('📋 Step 5: Reviewing with checklist...');
  const criticResult = await critique(
    generatorOutput,
    analyzerOutput,
    scannerPayload,
    options.useLLM ? options.llmClient : undefined
  );
  console.log(`   Score: ${(criticResult.score * 100).toFixed(1)}%`);
  console.log(`   Checklist: ${criticResult.checklist.filter(c => c.passed).length}/${criticResult.checklist.length} passed`);
  
  // Step 6: Self-heal (if needed)
  let finalOutput = generatorOutput;
  let iterations = 0;
  let finalValidatorScore = validatorResult.score;
  let finalCriticScore = criticResult.score;
  let manualReviewNeeded: V5DiscoveryResult['manualReviewNeeded'] = [];
  
  const combinedScore = (validatorResult.score + criticResult.score) / 2;
  const minScore = options.minQualityScore ?? 0.85;
  
  if (!options.skipSelfHeal && combinedScore < minScore) {
    console.log('🔄 Step 6: Running self-heal loop...');
    const healResult = await selfHeal(
      generatorOutput,
      scannerPayload,
      analyzerOutput,
      options.useLLM ? options.llmClient : undefined
    );
    
    if (healResult.output) {
      finalOutput = healResult.output;
    }
    iterations = healResult.iteration;
    manualReviewNeeded = healResult.manualReviewNeeded;
    
    if (healResult.scores) {
      finalValidatorScore = healResult.scores.validator;
      finalCriticScore = healResult.scores.critic;
    }
    
    console.log(`   Iterations: ${iterations}`);
    console.log(`   Fixed: ${healResult.fixed.length} issues`);
    console.log(`   Manual review: ${manualReviewNeeded.length} items`);
  } else {
    console.log('⏭️  Step 6: Skipped (quality threshold met)');
  }
  
  // Calculate final metrics
  const processingTimeMs = Date.now() - startTime;
  const finalScore = (finalValidatorScore + finalCriticScore) / 2;
  
  const totalSteps = finalOutput.suites.reduce((sum, s) => 
    sum + s.cases.reduce((cs, c) => cs + c.steps.length, 0), 0);
  
  // Coverage calculation
  const testedPages = new Set<string>();
  const testedConstraints = new Set<string>();
  
  for (const suite of finalOutput.suites) {
    for (const testCase of suite.cases) {
      // Track pages from navigate steps
      for (const step of testCase.steps) {
        if (step.action === 'navigate') {
          const page = scannerPayload.pages.find(p => p.url === step.target);
          if (page) testedPages.add(page.id);
        }
      }
      
      // Track constraints
      if (testCase.testedConstraint) {
        testedConstraints.add(testCase.testedConstraint);
      }
    }
  }
  
  // Summary
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ V5 Discovery complete:`);
  console.log(`   ${finalOutput.suites.length} suites, ${totalCases} cases, ${totalSteps} steps`);
  console.log(`   Quality score: ${(finalScore * 100).toFixed(1)}%`);
  console.log(`   Processing time: ${processingTimeMs}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return {
    success: true,
    score: finalScore,
    iterations,
    suites: finalOutput.suites,
    coverage: {
      pages: { total: scannerPayload.pages.length, tested: testedPages.size },
      constraints: { total: scannerPayload.constraints.length, tested: testedConstraints.size },
      flows: { total: scannerPayload.flows.length, tested: scannerPayload.flows.length },
    },
    manualReviewNeeded,
    debug: {
      scannerStats,
      analyzerDomains: analyzerOutput.domains.map(d => d.name),
      generatorCaseCount: totalCases,
      validatorScore: finalValidatorScore,
      criticScore: finalCriticScore,
      processingTimeMs,
    },
  };
}

// =============================================================================
// PAYLOAD CONVERSION
// =============================================================================

/**
 * Convert legacy AnalysisPayload to V5 ScannerPayload format
 */
function convertToV5Payload(legacyPayload: any): ScannerPayload {
  // Check if already in BACKEND V5 format (has url on pages)
  if (legacyPayload.config && legacyPayload.elements && legacyPayload.constraints) {
    // Check if pages have 'url' (backend format) or 'path' (electron format)
    const firstPage = legacyPayload.pages?.[0];
    if (firstPage?.url) {
      return legacyPayload as ScannerPayload;
    }
  }
  
  // Check if ELECTRON V5 format (version: 'v5', pages have 'path')
  if (legacyPayload.version === 'v5' && legacyPayload.pages?.[0]?.path !== undefined) {
    return convertElectronV5ToBackendV5(legacyPayload);
  }
  
  // Convert from legacy format
  const pages = convertPages(legacyPayload);
  const elements = convertElements(legacyPayload, pages);
  const constraints = convertConstraints(legacyPayload, elements);
  const flows = convertFlows(legacyPayload, pages);
  
  return {
    config: {
      detectedTestFramework: detectTestFramework(legacyPayload),
      selectorPriority: ['data-testid', 'data-cy', 'data-test', 'name', 'id', 'type', 'class'],
      detectionReason: null,
    },
    pages,
    elements,
    constraints,
    flows,
    unknownValidations: [],
    project: {
      name: legacyPayload.project?.name || 'Unknown',
      framework: legacyPayload.project?.framework?.name || 'unknown',
      version: legacyPayload.project?.framework?.version || '',
    },
  };
}

/**
 * Convert Electron V5 format to Backend V5 format
 * Electron uses 'path', backend uses 'url'
 * Electron has different element/constraint structures
 */
function convertElectronV5ToBackendV5(electronPayload: any): ScannerPayload {
  console.log('   Converting Electron V5 format to Backend V5...');
  
  // Convert pages: path -> url
  const pages: ScannerPayload['pages'] = (electronPayload.pages || []).map((p: any) => ({
    id: p.id,
    file: '',
    url: p.path, // Electron uses 'path', backend uses 'url'
    elementIds: p.elementIds || [],
    isProtected: p.isProtected || false,
  }));
  
  // Convert elements
  const elements: ScannerPayload['elements'] = (electronPayload.elements || []).map((el: any) => {
    // Convert Electron selector format to backend format
    const selectors = (el.selectors || []).map((s: any, idx: number) => ({
      value: s.value,
      rank: idx + 1,
      stability: s.confidence >= 0.9 ? 'highest' : s.confidence >= 0.7 ? 'high' : 'medium',
      basedOn: s.strategy || 'unknown',
    }));
    
    return {
      id: el.id,
      pageId: el.pageId,
      tagName: el.type === 'button' ? 'button' : el.type === 'link' ? 'a' : 'input',
      attributes: {
        name: el.label || '',
        type: el.role || el.type || 'text',
        placeholder: el.placeholder || '',
      },
      textContent: el.label,
      nearbyText: el.label ? [el.label] : [],
      selectors,
      bestSelector: el.bestSelector || selectors[0]?.value || '',
      formId: el.formId,
    };
  });
  
  // Convert constraints
  const constraints: ScannerPayload['constraints'] = (electronPayload.constraints || []).map((c: any) => ({
    field: c.elementId, // Use elementId as field reference
    elementId: c.elementId,
    rules: [{
      type: c.type,
      value: c.rule?.split(':')[1] || undefined,
      description: c.message || undefined,
    }],
    validExamples: c.validExamples || [],
    invalidExamples: (c.invalidExamples || []).map((inv: string) => ({
      value: inv,
      violates: c.type,
      reason: `Violates ${c.type} constraint`,
    })),
    source: c.source || 'unknown',
  }));
  
  // Convert flows
  const flows: ScannerPayload['flows'] = (electronPayload.flows || []).map((f: any) => ({
    id: f.id,
    name: f.name || 'Unknown Flow',
    steps: (f.steps || []).map((s: any) => {
      const page = pages.find(p => p.id === s.pageId);
      return {
        pageId: s.pageId,
        url: page?.url || '',
        nextAction: s.action || null,
        nextPageId: null,
      };
    }),
    detection: f.source || 'inferred',
  }));
  
  return {
    config: {
      detectedTestFramework: electronPayload.config?.detectedTestFramework || null,
      selectorPriority: electronPayload.config?.selectorPriority || ['data-testid', 'data-cy', 'name', 'id'],
      detectionReason: null,
    },
    pages,
    elements,
    constraints,
    flows,
    unknownValidations: [],
    project: {
      name: electronPayload.project?.name || 'Unknown',
      framework: electronPayload.project?.framework || 'unknown',
      version: electronPayload.project?.frameworkVersion || '',
    },
  };
}

function convertPages(payload: any): ScannerPayload['pages'] {
  const pages: ScannerPayload['pages'] = [];
  
  for (const route of (payload.routes || [])) {
    pages.push({
      id: `page-${route.path.replace(/\//g, '-').replace(/^-/, '')}`,
      file: route.filePath || '',
      url: route.path,
      elementIds: [], // Will be populated by convertElements
      isProtected: route.isProtected || false,
    });
  }
  
  return pages;
}

function convertElements(payload: any, pages: ScannerPayload['pages']): ScannerPayload['elements'] {
  const elements: ScannerPayload['elements'] = [];
  let elementIndex = 0;
  
  for (const form of (payload.forms || [])) {
    const page = pages.find(p => p.url === form.route);
    const pageId = page?.id || 'page-unknown';
    const formId = `form-${form.id || form.name?.toLowerCase().replace(/\s+/g, '-') || elementIndex}`;
    
    // Add form fields as elements
    for (const field of (form.fields || [])) {
      const elementId = `el-${elementIndex++}`;
      
      // Build selectors with ranking
      const selectors = buildRankedSelectors(field);
      
      elements.push({
        id: elementId,
        pageId,
        tagName: 'input',
        attributes: {
          name: field.name || '',
          type: field.type || 'text',
          id: field.id || '',
          required: field.isRequired || false,
          placeholder: field.placeholder || '',
          'data-testid': field.dataTestId || '',
          'data-cy': field.dataCy || '',
          'data-test': field.dataTest || '',
          autocomplete: field.autocomplete || '',
          'aria-label': field.ariaLabel || '',
        },
        textContent: null,
        nearbyText: field.label ? [field.label] : [],
        selectors,
        bestSelector: selectors[0]?.value || `[name="${field.name}"]`,
        formId,
      });
      
      // Add to page's elementIds
      if (page) {
        page.elementIds.push(elementId);
      }
    }
    
    // Add submit button if present
    if (form.submitButton) {
      const buttonId = `el-${elementIndex++}`;
      const buttonSelectors = buildButtonSelectors(form.submitButton);
      
      elements.push({
        id: buttonId,
        pageId,
        tagName: 'button',
        attributes: {
          type: 'submit',
        },
        textContent: form.submitButton.text || 'Submit',
        nearbyText: [],
        selectors: buttonSelectors,
        bestSelector: buttonSelectors[0]?.value || 'button[type="submit"]',
        formId,
      });
      
      if (page) {
        page.elementIds.push(buttonId);
      }
    }
  }
  
  return elements;
}

function buildRankedSelectors(field: any): ScannerPayload['elements'][0]['selectors'] {
  const selectors: ScannerPayload['elements'][0]['selectors'] = [];
  let rank = 1;
  
  // Highest priority: test IDs
  if (field.dataTestId) {
    selectors.push({
      value: `[data-testid="${field.dataTestId}"]`,
      rank: rank++,
      stability: 'highest',
      basedOn: 'data-testid',
    });
  }
  
  if (field.dataCy) {
    selectors.push({
      value: `[data-cy="${field.dataCy}"]`,
      rank: rank++,
      stability: 'highest',
      basedOn: 'data-cy',
    });
  }
  
  if (field.dataTest) {
    selectors.push({
      value: `[data-test="${field.dataTest}"]`,
      rank: rank++,
      stability: 'highest',
      basedOn: 'data-test',
    });
  }
  
  // High priority: name and id
  if (field.name) {
    selectors.push({
      value: `[name="${field.name}"]`,
      rank: rank++,
      stability: 'high',
      basedOn: 'name',
    });
  }
  
  if (field.id) {
    selectors.push({
      value: `#${field.id}`,
      rank: rank++,
      stability: 'medium',
      basedOn: 'id',
    });
  }
  
  // Medium priority: type
  if (field.type && field.type !== 'text') {
    selectors.push({
      value: `input[type="${field.type}"]`,
      rank: rank++,
      stability: 'medium',
      basedOn: 'type',
    });
  }
  
  // Fallback
  if (selectors.length === 0) {
    selectors.push({
      value: `input`,
      rank: rank++,
      stability: 'low',
      basedOn: 'tagName',
    });
  }
  
  return selectors;
}

function buildButtonSelectors(button: any): ScannerPayload['elements'][0]['selectors'] {
  const selectors: ScannerPayload['elements'][0]['selectors'] = [];
  let rank = 1;
  
  if (button.selector) {
    selectors.push({
      value: button.selector,
      rank: rank++,
      stability: 'high',
      basedOn: 'explicit',
    });
  }
  
  selectors.push({
    value: 'button[type="submit"]',
    rank: rank++,
    stability: 'high',
    basedOn: 'type',
  });
  
  if (button.text) {
    selectors.push({
      value: `button:contains("${button.text}")`,
      rank: rank++,
      stability: 'medium',
      basedOn: 'text',
    });
  }
  
  return selectors;
}

function convertConstraints(payload: any, elements: ScannerPayload['elements']): ScannerPayload['constraints'] {
  const constraints: ScannerPayload['constraints'] = [];
  
  for (const form of (payload.forms || [])) {
    for (const field of (form.fields || [])) {
      const element = elements.find(el => 
        el.attributes['name'] === field.name
      );
      
      if (!element) continue;
      
      const rules: ScannerPayload['constraints'][0]['rules'] = [];
      const validExamples: string[] = [];
      const invalidExamples: ScannerPayload['constraints'][0]['invalidExamples'] = [];
      
      // Convert validations to rules
      for (const validation of (field.validations || [])) {
        rules.push({
          type: validation.type,
          value: validation.value,
          description: validation.message,
        });
        
        // Generate invalid examples
        const invalid = generateInvalidExample(validation);
        if (invalid) {
          invalidExamples.push(invalid);
        }
      }
      
      // Add required rule from isRequired
      if (field.isRequired && !rules.some(r => r.type === 'required')) {
        rules.push({ type: 'required' });
        invalidExamples.push({
          value: '',
          violates: 'required',
          reason: 'Empty value violates required rule',
        });
      }
      
      // Generate valid example
      validExamples.push(generateValidExample(field, rules));
      
      if (rules.length > 0) {
        constraints.push({
          field: field.name,
          elementId: element.id,
          rules,
          validExamples,
          invalidExamples,
          source: 'form-validation',
        });
      }
    }
  }
  
  return constraints;
}

function generateInvalidExample(validation: any): ScannerPayload['constraints'][0]['invalidExamples'][0] | null {
  switch (validation.type) {
    case 'required':
      return { value: '', violates: 'required', reason: 'Empty value' };
    case 'minLength':
      const shortVal = 'a'.repeat(Math.max(0, (validation.value || 1) - 1));
      return { value: shortVal, violates: 'minLength', reason: `${shortVal.length} chars < ${validation.value}` };
    case 'maxLength':
      const longVal = 'a'.repeat((validation.value || 10) + 5);
      return { value: longVal, violates: 'maxLength', reason: `${longVal.length} chars > ${validation.value}` };
    case 'email':
      return { value: 'notanemail', violates: 'email', reason: 'Invalid email format' };
    case 'pattern':
      return { value: '!!!invalid!!!', violates: 'pattern', reason: 'Does not match pattern' };
    default:
      return null;
  }
}

function generateValidExample(field: any, rules: any[]): string {
  const type = field.type || 'text';
  const name = (field.name || '').toLowerCase();
  
  // Check for specific patterns
  if (type === 'email' || name.includes('email')) {
    return 'test@example.com';
  }
  if (type === 'password' || name.includes('password')) {
    // Generate password that satisfies common rules
    return 'TestPass123!';
  }
  if (name.includes('phone') || name.includes('tel')) {
    return '+1234567890';
  }
  if (name.includes('name')) {
    if (name.includes('first')) return 'John';
    if (name.includes('last')) return 'Doe';
    return 'John Doe';
  }
  if (type === 'number') {
    return '42';
  }
  if (type === 'url') {
    return 'https://example.com';
  }
  
  // Check minLength
  const minLengthRule = rules.find(r => r.type === 'minLength');
  if (minLengthRule && minLengthRule.value) {
    return 'a'.repeat(minLengthRule.value);
  }
  
  return 'test value';
}

function convertFlows(payload: any, pages: ScannerPayload['pages']): ScannerPayload['flows'] {
  const flows: ScannerPayload['flows'] = [];
  
  // Check for navigation links in relationships
  const navLinks = payload.relationships?.navigationLinks || [];
  
  // Group navigation links into flows
  const flowMap = new Map<string, string[]>();
  
  for (const link of navLinks) {
    const existing = flowMap.get(link.from) || [];
    if (!existing.includes(link.to)) {
      existing.push(link.to);
    }
    flowMap.set(link.from, existing);
  }
  
  // Convert to flow objects
  let flowIndex = 0;
  for (const [from, toList] of flowMap) {
    const fromPage = pages.find(p => p.url === from);
    
    for (const to of toList) {
      const toPage = pages.find(p => p.url === to);
      
      if (fromPage && toPage) {
        flows.push({
          id: `flow-${flowIndex++}`,
          name: `${from} to ${to}`,
          steps: [
            { pageId: fromPage.id, url: from, nextAction: 'navigate', nextPageId: toPage.id },
            { pageId: toPage.id, url: to, nextAction: null, nextPageId: null },
          ],
          detection: 'navigation-link',
        });
      }
    }
  }
  
  return flows;
}

function detectTestFramework(payload: any): string | null {
  // Look for test framework indicators in the payload
  const deps = payload.project?.dependencies || {};
  
  if (deps['cypress'] || deps['@cypress/react']) {
    return 'cypress';
  }
  if (deps['@playwright/test'] || deps['playwright']) {
    return 'playwright';
  }
  if (deps['@testing-library/react']) {
    return 'testing-library';
  }
  
  return null;
}

// =============================================================================
// LEGACY FORMAT CONVERSION
// =============================================================================

/**
 * Convert V5 output to legacy DiscoveryResponse format
 * For backward compatibility with existing frontend
 */
export function convertToLegacyFormat(result: V5DiscoveryResult): any {
  return {
    success: result.success,
    suites: result.suites.map(suite => ({
      id: suite.id,
      name: suite.name,
      description: `Tests for ${suite.domain}`,
      category: inferCategory(suite.domain),
      priority: 'medium',
      tags: [suite.domain],
      testCases: suite.cases.map(c => ({
        id: c.id,
        name: c.name,
        description: c.testedConstraint ? `Tests ${c.testedConstraint}` : 'Happy path test',
        type: c.type,
        priority: c.type === 'happy-path' ? 'high' : 'medium',
        steps: c.steps.map((step, idx) => ({
          index: idx,
          action: step.action,
          target: step.target,
          selector: step.action !== 'navigate' ? step.target : null,
          value: step.value,
          description: step.description,
        })),
        estimatedDuration: c.steps.length * 2,
      })),
      coverage: {
        routes: [],
        forms: [],
        entities: [],
      },
    })),
    summary: {
      totalSuites: result.suites.length,
      totalCases: result.suites.reduce((sum, s) => sum + s.cases.length, 0),
      totalSteps: result.suites.reduce((sum, s) => 
        sum + s.cases.reduce((cs, c) => cs + c.steps.length, 0), 0),
      coverage: {
        routes: result.coverage.pages,
        forms: { total: 0, covered: 0 },
        entities: { total: 0, covered: 0 },
      },
    },
    analysis: {
      detectedEntities: result.debug.analyzerDomains,
      detectedFlows: result.suites.map(s => s.name),
      processingTime: result.debug.processingTimeMs,
      aiModel: 'v5-discovery',
    },
  };
}

function inferCategory(domain: string): string {
  const domainLower = domain.toLowerCase();
  if (domainLower.includes('auth')) return 'authentication';
  if (domainLower.includes('dashboard')) return 'admin';
  if (domainLower.includes('settings')) return 'user-management';
  return 'general';
}
