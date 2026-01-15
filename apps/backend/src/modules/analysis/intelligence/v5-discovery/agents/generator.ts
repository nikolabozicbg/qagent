/**
 * V5 Discovery - Generator Agent (FEATURE-BASED)
 * 
 * Groups tests by FEATURE/MODULE, not by generic domain:
 * - /sign-in → "Sign In" suite (not "Authentication" mega-suite)
 * - /dashboard/products → "Products Management" suite
 * - /dashboard/categories → "Categories Management" suite
 * 
 * Each suite has 3-6 focused test cases.
 */

import {
  ScannerPayload,
  ScannerElement,
  ScannerConstraint,
  ScannerPage,
  AnalyzerOutput,
  GeneratorOutput,
  GeneratedSuite,
  GeneratedCase,
  GeneratedStep,
  GeneratedAssertion,
} from '../types';
import { LLMClient } from '../llm-client';

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

export async function generate(
  analyzerOutput: AnalyzerOutput,
  scannerPayload: ScannerPayload,
  llmClient?: LLMClient
): Promise<GeneratorOutput> {
  console.log('   🔧 Generating feature-based test suites...');
  const baselineOutput = generateFeatureBased(scannerPayload);
  
  // If LLM available, enhance with creative edge cases
  if (llmClient && llmClient.isAvailable()) {
    console.log('   🧠 Enhancing with LLM-generated edge cases...');
    try {
      const enhancedOutput = await enhanceWithLLMEdgeCases(
        baselineOutput,
        analyzerOutput,
        scannerPayload,
        llmClient
      );
      return enhancedOutput;
    } catch (error) {
      console.error('   ⚠️ LLM enhancement failed, using baseline:', error);
      return baselineOutput;
    }
  }
  
  return baselineOutput;
}

// =============================================================================
// FEATURE-BASED GENERATION (NEW APPROACH)
// =============================================================================

interface FeatureGroup {
  id: string;
  name: string;
  pages: ScannerPage[];
  forms: Array<{ formId: string; pageId: string; elements: ScannerElement[] }>;
}

function generateFeatureBased(scannerPayload: ScannerPayload): GeneratorOutput {
  // Build lookup maps
  const elementsByPage = buildElementsByPage(scannerPayload);
  const constraintsByElementId = buildConstraintsByElementId(scannerPayload);
  const pageById = new Map(scannerPayload.pages.map(p => [p.id, p]));
  
  // Step 1: Group pages into FEATURES (not domains)
  const features = groupPagesIntoFeatures(scannerPayload);
  
  console.log(`   📊 Detected ${features.length} features: ${features.map(f => f.name).join(', ')}`);
  
  // Step 2: Generate suite for each feature
  const suites: GeneratedSuite[] = [];
  const generatedFormIds = new Set<string>();
  
  for (const feature of features) {
    const cases: GeneratedCase[] = [];
    
    // Generate tests for each form in this feature
    for (const form of feature.forms) {
      if (generatedFormIds.has(form.formId)) continue;
      generatedFormIds.add(form.formId);
      
      const page = pageById.get(form.pageId);
      if (!page) continue;
      
      const formCases = generateFormTests(
        page,
        form.formId,
        form.elements,
        constraintsByElementId,
        scannerPayload,
        feature.name // Pass feature name for better naming
      );
      cases.push(...formCases);
    }
    
    // Add navigation tests for form-less pages in this feature
    for (const page of feature.pages) {
      const hasForms = feature.forms.some(f => f.pageId === page.id);
      if (!hasForms && isImportantPage(page)) {
        cases.push(generateNavigationTest(page, feature.name));
      }
    }
    
    if (cases.length > 0) {
      suites.push({
        id: `suite-${feature.id}`,
        name: `${feature.name} Tests`,
        domain: feature.name,
        cases,
      });
    }
  }
  
  return { suites };
}

/**
 * GENERIC Feature Grouping System
 * 
 * Works for ANY web application without hardcoded patterns.
 * Uses 3 strategies:
 *   1. URL Structure Analysis - groups by dynamic URL segments
 *   2. Semantic Form Analysis - detects form purpose from field names
 *   3. Intelligent Naming - generates human-readable names from URL/form context
 * 
 * Examples (auto-detected, not hardcoded):
 *   Ecommerce: /dashboard/products → "Products Management"
 *   Blog: /admin/posts → "Posts Management"
 *   SaaS: /app/billing → "Billing"
 *   Banking: /accounts/transfers → "Transfers"
 */
function groupPagesIntoFeatures(scannerPayload: ScannerPayload): FeatureGroup[] {
  const elementsByPage = buildElementsByPage(scannerPayload);
  const formsByPage = buildFormsByPage(scannerPayload);
  
  // Helper to create feature from pages
  const createFeature = (id: string, name: string, pages: ScannerPage[]): FeatureGroup => {
    const forms: FeatureGroup['forms'] = [];
    for (const page of pages) {
      const pageForms = formsByPage.get(page.id) || [];
      const pageElements = elementsByPage.get(page.id) || [];
      for (const formId of pageForms) {
        forms.push({
          formId,
          pageId: page.id,
          elements: pageElements.filter(el => el.formId === formId),
        });
      }
    }
    return { id, name, pages, forms };
  };
  
  // Step 1: Analyze URL structure to find optimal grouping depth
  const urlAnalysis = analyzeUrlStructure(scannerPayload.pages);
  
  // Step 2: Group pages by their feature key (derived from URL structure)
  const pagesByFeatureKey = new Map<string, ScannerPage[]>();
  
  for (const page of scannerPayload.pages) {
    const featureKey = getFeatureKey(page.url, urlAnalysis);
    const existing = pagesByFeatureKey.get(featureKey) || [];
    existing.push(page);
    pagesByFeatureKey.set(featureKey, existing);
  }
  
  // Step 3: Create features with intelligent names
  const features: FeatureGroup[] = [];
  
  for (const [featureKey, pages] of pagesByFeatureKey) {
    if (pages.length === 0) continue;
    
    // Get semantic info from forms on these pages
    const formSemantics = detectFormSemantics(pages, elementsByPage, formsByPage);
    
    // Generate intelligent name
    const featureName = generateFeatureName(featureKey, formSemantics, pages);
    const featureId = generateFeatureId(featureKey);
    
    features.push(createFeature(featureId, featureName, pages));
  }
  
  // Sort features: auth-related first, then admin/dashboard, then public pages
  return sortFeatures(features);
}

/**
 * Analyzes URL structure to determine optimal grouping strategy
 */
interface UrlAnalysis {
  // Common root segments (e.g., 'dashboard', 'admin', 'app')
  adminRoots: Set<string>;
  // Depth at which to group for each root
  groupingDepth: Map<string, number>;
  // Whether URLs have dynamic segments
  hasDynamicSegments: boolean;
}

function analyzeUrlStructure(pages: ScannerPage[]): UrlAnalysis {
  const segmentCounts = new Map<string, Map<string, number>>(); // depth -> segment -> count
  const rootChildCounts = new Map<string, Set<string>>(); // root -> unique children
  
  for (const page of pages) {
    const segments = parseUrlSegments(page.url);
    
    // Count segments at each depth
    segments.forEach((segment, depth) => {
      if (!segmentCounts.has(String(depth))) {
        segmentCounts.set(String(depth), new Map());
      }
      const depthMap = segmentCounts.get(String(depth))!;
      depthMap.set(segment, (depthMap.get(segment) || 0) + 1);
    });
    
    // Track unique children per root
    if (segments.length >= 2) {
      const root = segments[0];
      if (!rootChildCounts.has(root)) {
        rootChildCounts.set(root, new Set());
      }
      rootChildCounts.get(root)!.add(segments[1]);
    }
  }
  
  // Identify admin-like roots (roots that have many unique children → likely admin sections)
  const adminRoots = new Set<string>();
  const groupingDepth = new Map<string, number>();
  
  for (const [root, children] of rootChildCounts) {
    // If a root has 3+ unique sub-paths, it's likely an admin/dashboard section
    // that should be grouped at depth 2 (by second segment)
    if (children.size >= 3) {
      adminRoots.add(root);
      groupingDepth.set(root, 2); // Group by second segment (e.g., /dashboard/products)
    } else {
      groupingDepth.set(root, 1); // Group by first segment
    }
  }
  
  // Check for dynamic segments
  const hasDynamicSegments = pages.some(p => 
    p.url.includes('[') || p.url.includes(':') || /\/\d+/.test(p.url)
  );
  
  return { adminRoots, groupingDepth, hasDynamicSegments };
}

/**
 * Parse URL into normalized segments (removes dynamic params)
 */
function parseUrlSegments(url: string): string[] {
  return url
    .split('/')
    .filter(Boolean)
    .map(segment => {
      // Normalize dynamic segments: [id], :id, actual numbers → $param
      if (segment.startsWith('[') || segment.startsWith(':') || /^\d+$/.test(segment)) {
        return '$param';
      }
      return segment.toLowerCase();
    });
}

/**
 * Get the feature key for a URL based on analysis
 */
function getFeatureKey(url: string, analysis: UrlAnalysis): string {
  const segments = parseUrlSegments(url);
  
  if (segments.length === 0) {
    return 'home';
  }
  
  const root = segments[0];
  const depth = analysis.groupingDepth.get(root) || 1;
  
  // For admin roots, group by first N segments (excluding dynamic ones)
  const keySegments = segments
    .slice(0, depth)
    .filter(s => s !== '$param');
  
  return keySegments.join('/') || root;
}

/**
 * Detect semantic purpose of forms on pages
 */
interface FormSemantics {
  hasAuthFields: boolean;      // email + password
  hasRegistration: boolean;    // email + password + confirmPassword/name
  hasPasswordReset: boolean;   // email only, or password + confirmPassword
  hasSearch: boolean;          // search/query field
  hasCRUD: boolean;           // typical CRUD fields (name, description, etc.)
  hasPayment: boolean;         // credit card, payment fields
  hasContact: boolean;         // message, subject fields
  fieldSignatures: string[];   // unique field patterns found
}

function detectFormSemantics(
  pages: ScannerPage[],
  elementsByPage: Map<string, ScannerElement[]>,
  formsByPage: Map<string, string[]>
): FormSemantics {
  const allFields: string[] = [];
  
  for (const page of pages) {
    const elements = elementsByPage.get(page.id) || [];
    for (const el of elements) {
      if (el.tagName === 'input' || el.tagName === 'select' || el.tagName === 'textarea') {
        const name = (el.attributes['name'] as string || '').toLowerCase();
        const type = (el.attributes['type'] as string || '').toLowerCase();
        const id = (el.attributes['id'] as string || '').toLowerCase();
        allFields.push(name, type, id);
      }
    }
  }
  
  const fieldSet = new Set(allFields.filter(Boolean));
  const fieldStr = allFields.join(' ');
  
  const hasEmail = fieldSet.has('email') || fieldStr.includes('email');
  const hasPassword = fieldSet.has('password') || fieldStr.includes('password');
  const hasConfirmPwd = fieldStr.includes('confirm') || fieldStr.includes('repeat');
  const hasName = fieldSet.has('name') || fieldStr.includes('firstname') || fieldStr.includes('lastname');
  
  return {
    hasAuthFields: hasEmail && hasPassword && !hasConfirmPwd && !hasName,
    hasRegistration: hasEmail && hasPassword && (hasConfirmPwd || hasName),
    hasPasswordReset: (hasEmail && !hasPassword) || (hasPassword && hasConfirmPwd && !hasEmail),
    hasSearch: fieldStr.includes('search') || fieldStr.includes('query') || fieldStr.includes('q'),
    hasCRUD: fieldStr.includes('title') || fieldStr.includes('description') || 
             fieldStr.includes('content') || fieldStr.includes('price'),
    hasPayment: fieldStr.includes('card') || fieldStr.includes('cvv') || 
                fieldStr.includes('payment') || fieldStr.includes('billing'),
    hasContact: fieldStr.includes('message') || fieldStr.includes('subject'),
    fieldSignatures: [...fieldSet].slice(0, 10), // Keep first 10 for context
  };
}

/**
 * Generate human-readable feature name from URL key and form semantics
 * 
 * IMPORTANT: Semantic override only applies to:
 *   1. Root-level auth pages (not admin/dashboard pages)
 *   2. Small features (1-2 pages max) that look like auth
 * 
 * Admin pages (/dashboard/*, /admin/*) always use URL-based naming
 */
function generateFeatureName(featureKey: string, semantics: FormSemantics, pages: ScannerPage[]): string {
  // Admin routes - ALWAYS use URL-based naming, never semantic override
  // Uses PATTERN-based detection, not hardcoded list
  const isAdminFeature = isAdminRoot(featureKey.split('/')[0] || '');
  
  if (isAdminFeature) {
    return urlKeyToName(featureKey);
  }
  
  // For non-admin pages, check semantic patterns
  const urls = pages.map(p => p.url.toLowerCase()).join(' ');
  
  // Sign In detection (email + password, no confirmPassword, URL contains sign-in/login)
  if (semantics.hasAuthFields && pages.length <= 2) {
    if (urls.includes('sign-in') || urls.includes('signin') || urls.includes('login')) {
      return 'Sign In';
    }
  }
  
  // Sign Up detection (email + password + name/confirmPassword, URL contains sign-up/register)
  if (semantics.hasRegistration && pages.length <= 2) {
    if (urls.includes('sign-up') || urls.includes('signup') || urls.includes('register')) {
      return 'Sign Up';
    }
  }
  
  // Password Reset detection - ONLY for password-reset URLs
  if (urls.includes('password-reset') || urls.includes('forgot-password') || urls.includes('reset-password')) {
    return 'Password Reset';
  }
  
  // Payment pages
  if (semantics.hasPayment) {
    const name = urlKeyToName(featureKey);
    return name.includes('Checkout') ? name : `${name} (Payment)`;
  }
  
  // Default: convert URL key to readable name
  return urlKeyToName(featureKey);
}

/**
 * Detect if a URL segment is an admin/management root
 * Uses PATTERN-based detection for future-proofing
 */
function isAdminRoot(segment: string): boolean {
  const normalized = segment.toLowerCase();
  
  // Common admin root patterns (regex for flexibility)
  const adminPatterns = [
    /^(admin|dashboard|panel|console|portal|backoffice|backend)$/,
    /^(manage|management|manager)$/,
    /^(control|cms|crm|erp)$/,
    /^(app|application)$/,  // SaaS apps often use /app/*
    /^(internal|staff|employee)$/,
    /^(settings|config|configuration)$/,
  ];
  
  return adminPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Detect if a word is plural (ends with common plural suffixes)
 * Works for ANY English noun, not just a hardcoded list
 */
function isLikelyPluralNoun(word: string): boolean {
  const normalized = word.toLowerCase();
  
  // Common English plural endings
  // - Regular: -s, -es
  // - Irregular common ones we care about: -ies (categories), -ves (leaves)
  return (
    normalized.endsWith('s') &&
    !normalized.endsWith('ss') &&  // 'access', 'progress' are not plural
    !normalized.endsWith('us') &&  // 'status', 'radius' are not plural
    normalized.length > 3          // Avoid short words like 'is', 'as'
  );
}

/**
 * Convert URL key to human-readable name
 * Examples:
 *   'dashboard/products' → 'Products Management'
 *   'admin/posts' → 'Posts Management'
 *   'app/settings' → 'Settings'
 *   'sign-in' → 'Sign In'
 */
function urlKeyToName(key: string): string {
  const segments = key.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return 'Home';
  }
  
  let nameSegment: string;
  const firstSegment = segments[0];
  const isFirstAdmin = isAdminRoot(firstSegment);
  
  if (segments.length >= 2 && isFirstAdmin) {
    // Use child segment: /dashboard/products → 'products'
    nameSegment = segments[1];
  } else if (segments.length === 1 && isFirstAdmin) {
    // Root admin page: /dashboard → 'Dashboard Overview'
    return `${capitalize(firstSegment)} Overview`;
  } else {
    // Use last meaningful segment
    nameSegment = segments[segments.length - 1];
  }
  
  // Convert to readable name
  let name = nameSegment
    .replace(/[-_]/g, ' ')  // kebab-case/snake_case to spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase to spaces
    .split(' ')
    .map(capitalize)
    .join(' ');
  
  // Add "Management" suffix for plural nouns in admin context
  // Uses GENERIC plural detection, not hardcoded list
  if (segments.length >= 2 && isFirstAdmin && isLikelyPluralNoun(nameSegment)) {
    name += ' Management';
  }
  
  return name;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Generate URL-safe feature ID from key
 */
function generateFeatureId(featureKey: string): string {
  return featureKey
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase() || 'home';
}

/**
 * Sort features in logical order: auth → admin → public → misc
 * Uses PATTERN-based detection for admin roots
 */
function sortFeatures(features: FeatureGroup[]): FeatureGroup[] {
  const priority = (f: FeatureGroup): number => {
    const name = f.name.toLowerCase();
    const id = f.id.toLowerCase();
    const firstSegment = id.split('-')[0] || '';
    
    // Auth features first (pattern-based)
    if (/sign.?in|log.?in|auth/i.test(name)) return 0;
    if (/sign.?up|regist/i.test(name)) return 1;
    if (/password|reset|forgot/i.test(name)) return 2;
    
    // Admin/dashboard features (using isAdminRoot)
    if (isAdminRoot(firstSegment)) return 10;
    
    // Public features (pattern-based)
    if (name.includes('home') || id === 'home') return 20;
    if (/shop|store|product|catalog/i.test(name)) return 21;
    if (/cart|checkout|payment|order/i.test(name)) return 22;
    if (/profile|account|settings|preferences/i.test(name)) return 23;
    
    // Everything else
    return 50;
  };
  
  return features.sort((a, b) => priority(a) - priority(b));
}

// =============================================================================
// FORM TEST GENERATION
// =============================================================================

function generateFormTests(
  page: ScannerPage,
  formId: string,
  elements: ScannerElement[],
  constraintsByElementId: Map<string, ScannerConstraint[]>,
  scannerPayload: ScannerPayload,
  featureName?: string
): GeneratedCase[] {
  const cases: GeneratedCase[] = [];
  
  // Filter actual input elements (not buttons, not hidden)
  const inputs = elements.filter(el => {
    if (el.tagName !== 'input' && el.tagName !== 'select' && el.tagName !== 'textarea') return false;
    const type = el.attributes['type'] as string;
    if (type === 'hidden' || type === 'submit') return false;
    return true;
  });
  
  // Find submit button - try multiple strategies
  const submitButton = findSubmitButton(elements);
  
  if (inputs.length === 0) return cases;
  
  // Derive form name - prefer feature name, fallback to URL-based
  const formName = featureName || deriveFormName(page.url, formId);
  
  // 1. HAPPY PATH TEST
  const happyPath = generateHappyPathTest(
    page, formId, formName, inputs, submitButton, constraintsByElementId, scannerPayload
  );
  cases.push(happyPath);
  
  // 2. EMPTY SUBMISSION TEST (if any field is required)
  const hasRequired = inputs.some(el => {
    const constraints = constraintsByElementId.get(el.id) || [];
    return constraints.some(c => c.rules.some(r => r.type === 'required'));
  });
  
  if (hasRequired) {
    cases.push(generateEmptySubmissionTest(page, formId, formName, submitButton));
  }
  
  // 3. VALIDATION TESTS (max 2 per form to keep suites focused)
  const validationTests = generateValidationTests(
    page, formId, formName, inputs, submitButton, constraintsByElementId
  );
  cases.push(...validationTests.slice(0, 2));
  
  return cases;
}

/**
 * Find submit button with multiple fallback strategies
 */
function findSubmitButton(elements: ScannerElement[]): ScannerElement | undefined {
  // Strategy 1: button[type="submit"]
  const typeSubmit = elements.find(el => 
    el.tagName === 'button' && el.attributes['type'] === 'submit'
  );
  if (typeSubmit) return typeSubmit;
  
  // Strategy 2: button with submit-like text
  const submitTextButton = elements.find(el => {
    if (el.tagName !== 'button') return false;
    const text = (el.textContent || '').toLowerCase();
    return /^(submit|sign in|sign up|login|register|create|save|send|confirm)$/i.test(text);
  });
  if (submitTextButton) return submitTextButton;
  
  // Strategy 3: input[type="submit"]
  const inputSubmit = elements.find(el => 
    el.tagName === 'input' && el.attributes['type'] === 'submit'
  );
  if (inputSubmit) return inputSubmit;
  
  // Strategy 4: Any button (last resort)
  return elements.find(el => el.tagName === 'button');
}

function generateHappyPathTest(
  page: ScannerPage,
  formId: string,
  formName: string,
  inputs: ScannerElement[],
  submitButton: ScannerElement | undefined,
  constraintsByElementId: Map<string, ScannerConstraint[]>,
  scannerPayload: ScannerPayload
): GeneratedCase {
  const steps: GeneratedStep[] = [];
  
  // Step 1: Navigate
  steps.push(createNavigateStep(page));
  
  // Step 2-N: Fill each input (or click for checkbox/radio)
  for (const input of inputs) {
    const inputType = (input.attributes['type'] as string || 'text').toLowerCase();
    
    // Checkbox/radio - click instead of fill
    if (inputType === 'checkbox' || inputType === 'radio') {
      steps.push(createClickStep(input, page.id));
      continue;
    }
    
    const constraints = constraintsByElementId.get(input.id) || [];
    const value = getValidValue(input, constraints);
    
    // Skip if value is null (shouldn't happen after checkbox check, but safety)
    if (value === null) continue;
    
    steps.push(createFillStep(input, value, page.id));
  }
  
  // Step N+1: Submit
  if (submitButton) {
    steps.push(createClickStep(submitButton, page.id));
  }
  
  // Assertions
  const assertions: GeneratedAssertion[] = [];
  
  // Find expected redirect
  const successRedirect = findSuccessRedirect(page, scannerPayload);
  if (successRedirect) {
    assertions.push({
      type: 'url',
      expected: successRedirect,
      target: null,
      confidence: 0.85,
      source: 'flow-analysis',
      reason: 'Expected redirect after successful form submission',
    });
  } else {
    // No redirect known - assert no error message visible
    assertions.push({
      type: 'not-visible',
      expected: 'Error message should not be visible',
      target: '[role="alert"], .error, .error-message',
      confidence: 0.7,
      source: 'convention',
      reason: 'Form should submit without errors',
    });
  }
  
  return {
    id: `case-${formId}-happy-path`,
    name: `${formName} - Successful submission`,
    type: 'happy-path',
    testedConstraint: null,
    steps,
    assertions,
  };
}

function generateEmptySubmissionTest(
  page: ScannerPage,
  formId: string,
  formName: string,
  submitButton: ScannerElement | undefined
): GeneratedCase {
  const steps: GeneratedStep[] = [];
  
  // Step 1: Navigate
  steps.push(createNavigateStep(page));
  
  // Step 2: Submit without filling anything
  if (submitButton) {
    steps.push(createClickStep(submitButton, page.id));
  }
  
  return {
    id: `case-${formId}-empty-submission`,
    name: `${formName} - Cannot submit empty form`,
    type: 'validation',
    testedConstraint: 'required-fields',
    steps,
    assertions: [
      {
        type: 'url',
        expected: page.url,
        target: null,
        confidence: 0.95,
        source: 'validation-expectation',
        reason: 'Should stay on page when required fields are empty',
      },
      {
        type: 'visible',
        expected: 'Validation error should be visible',
        target: '[role="alert"], .error, .error-message, [data-error]',
        confidence: 0.8,
        source: 'convention',
        reason: 'Form should show validation error',
      },
    ],
  };
}

function generateValidationTests(
  page: ScannerPage,
  formId: string,
  formName: string,
  inputs: ScannerElement[],
  submitButton: ScannerElement | undefined,
  constraintsByElementId: Map<string, ScannerConstraint[]>
): GeneratedCase[] {
  const cases: GeneratedCase[] = [];
  
  for (const input of inputs) {
    const constraints = constraintsByElementId.get(input.id) || [];
    const fieldName = getFieldName(input);
    
    for (const constraint of constraints) {
      for (const rule of constraint.rules) {
        // Skip 'required' - covered by empty submission test
        if (rule.type === 'required') continue;
        
        // Find invalid example for this rule
        const invalidExample = constraint.invalidExamples.find(
          inv => inv.violates === rule.type
        );
        
        if (!invalidExample) continue;
        
        const steps: GeneratedStep[] = [];
        steps.push(createNavigateStep(page));
        
        // Fill all fields with valid values, except the one we're testing
        for (const otherInput of inputs) {
          if (otherInput.id === input.id) {
            // Use invalid value for this field
            steps.push(createFillStep(
              otherInput, 
              invalidExample.value, 
              page.id,
              `scanner.constraints.${constraint.field}.invalidExamples`
            ));
          } else {
            // Use valid value
            const otherConstraints = constraintsByElementId.get(otherInput.id) || [];
            const validValue = getValidValue(otherInput, otherConstraints);
            steps.push(createFillStep(otherInput, validValue, page.id));
          }
        }
        
        if (submitButton) {
          steps.push(createClickStep(submitButton, page.id));
        }
        
        cases.push({
          id: `case-${formId}-invalid-${fieldName}-${rule.type}`,
          name: `${formName} - Invalid ${fieldName} (${rule.type})`,
          type: 'validation',
          testedConstraint: `${constraint.field}.${rule.type}`,
          steps,
          assertions: [
            {
              type: 'url',
              expected: page.url,
              target: null,
              confidence: 0.95,
              source: 'validation-expectation',
              reason: `Should stay on page due to ${rule.type} validation error`,
            },
          ],
        });
      }
    }
  }
  
  return cases;
}

// NOTE: Shopping suite is now handled by feature-based grouping in groupPagesIntoFeatures()

// =============================================================================
// NAVIGATION TEST
// =============================================================================

function generateNavigationTest(page: ScannerPage, domainName: string): GeneratedCase {
  return {
    id: `case-nav-${page.id}`,
    name: `Navigate to ${page.url}`,
    type: 'navigation',
    testedConstraint: null,
    steps: [createNavigateStep(page)],
    assertions: [
      {
        type: 'url',
        expected: page.url,
        target: null,
        confidence: 1.0,
        source: `scanner.pages.${page.id}`,
        reason: 'Page should load successfully',
      },
    ],
  };
}

// =============================================================================
// STEP CREATION HELPERS
// =============================================================================

function createNavigateStep(page: ScannerPage): GeneratedStep {
  // Resolve dynamic URL params to test values
  const resolvedUrl = resolveDynamicUrl(page.url);
  
  return {
    id: `step-navigate-${page.id}`,
    description: `Navigate to ${resolvedUrl}`,
    action: 'navigate',
    target: resolvedUrl,
    value: null,
    confidence: resolvedUrl === page.url ? 1.0 : 0.8, // Lower confidence if we had to resolve params
    source: {
      url: `scanner.pages.${page.id}.url`,
    },
  };
}

/**
 * Resolve dynamic URL parameters to test values
 * /password-reset/[token] -> /password-reset/test-token-123
 * /products/[id] -> /products/1
 * /users/:userId -> /users/1
 */
function resolveDynamicUrl(url: string): string {
  return url
    // Next.js style: [param]
    .replace(/\[token\]/gi, 'test-token-123')
    .replace(/\[id\]/gi, '1')
    .replace(/\[slug\]/gi, 'test-slug')
    .replace(/\[\w*id\]/gi, '1')  // [userId], [orderId], [productId], etc.
    .replace(/\[\w+\]/g, 'test-param')  // Any other [param]
    // Express style: :param
    .replace(/:token/gi, 'test-token-123')
    .replace(/:id/gi, '1')
    .replace(/:slug/gi, 'test-slug')
    .replace(/:\w*id/gi, '1')  // :userId, :orderId, etc.
    .replace(/:\w+/g, 'test-param');  // Any other :param
}

function createFillStep(
  element: ScannerElement,
  value: string,
  pageId: string,
  valueSource?: string
): GeneratedStep {
  const fieldName = getFieldName(element);
  
  // Use page-scoped selector if bestSelector is too generic
  const selector = getScopedSelector(element, pageId);
  
  return {
    id: `step-fill-${element.id}`,
    description: `Fill ${fieldName} with "${value}"`,
    action: 'fill',
    target: selector,
    value,
    confidence: 0.95,
    source: {
      selector: `scanner.elements.${element.id}.bestSelector`,
      value: valueSource || 'generated-default',
      pageId,
    },
  };
}

function createClickStep(element: ScannerElement, pageId: string): GeneratedStep {
  const buttonText = element.textContent || 'submit button';
  const selector = getScopedSelector(element, pageId);
  
  return {
    id: `step-click-${element.id}`,
    description: `Click ${buttonText}`,
    action: 'click',
    target: selector,
    value: null,
    confidence: 0.95,
    source: {
      selector: `scanner.elements.${element.id}.bestSelector`,
      pageId,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildElementsByPage(payload: ScannerPayload): Map<string, ScannerElement[]> {
  const map = new Map<string, ScannerElement[]>();
  for (const el of payload.elements) {
    const existing = map.get(el.pageId) || [];
    existing.push(el);
    map.set(el.pageId, existing);
  }
  return map;
}

function buildConstraintsByElementId(payload: ScannerPayload): Map<string, ScannerConstraint[]> {
  const map = new Map<string, ScannerConstraint[]>();
  for (const c of payload.constraints) {
    const existing = map.get(c.elementId) || [];
    existing.push(c);
    map.set(c.elementId, existing);
  }
  return map;
}

function buildFormsByPage(payload: ScannerPayload): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const el of payload.elements) {
    if (el.formId) {
      const pageId = el.pageId;
      const existing = map.get(pageId) || [];
      if (!existing.includes(el.formId)) {
        existing.push(el.formId);
      }
      map.set(pageId, existing);
    }
  }
  return map;
}

function deriveFormName(pageUrl: string, formId: string): string {
  // Extract meaningful name from URL
  const segments = pageUrl.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'Form';
  
  // Clean up
  const cleaned = lastSegment
    .replace(/[\[\]]/g, '') // Remove [id] brackets
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Special cases
  if (pageUrl.includes('sign-in') || pageUrl.includes('login')) return 'Sign In';
  if (pageUrl.includes('sign-up') || pageUrl.includes('register')) return 'Sign Up';
  if (pageUrl.includes('password-reset')) {
    if (pageUrl.includes('token') || pageUrl.includes('[')) return 'Set New Password';
    return 'Request Password Reset';
  }
  if (pageUrl.includes('checkout')) return 'Checkout';
  if (pageUrl.includes('profile')) return 'Profile';
  if (pageUrl.includes('contact')) return 'Contact';
  
  return cleaned || 'Form';
}

function getFieldName(element: ScannerElement): string {
  const name = element.attributes['name'] as string;
  const label = element.nearbyText?.[0];
  const placeholder = element.attributes['placeholder'] as string;
  
  return label || name || placeholder || element.id;
}

function getValidValue(element: ScannerElement, constraints: ScannerConstraint[]): string | null {
  const type = (element.attributes['type'] as string || 'text').toLowerCase();
  const name = ((element.attributes['name'] as string) || '').toLowerCase();
  const placeholder = ((element.attributes['placeholder'] as string) || '').toLowerCase();
  
  // CHECKBOX/RADIO - return null (these should be clicked, not filled)
  if (type === 'checkbox' || type === 'radio') {
    return null;
  }
  
  // SMART DEFAULTS FIRST - override poor scanner examples for known field types
  // These take precedence because scanner often provides "test" as validExample
  
  // EMAIL fields - always use proper email format
  if (type === 'email' || name.includes('email') || placeholder.includes('email')) {
    return 'testuser@example.com';
  }
  
  // PASSWORD fields - ensure meets common requirements (min 8, upper, lower, number, special)
  if (type === 'password' || name.includes('password')) {
    return 'SecurePass123!';
  }
  if (name.includes('confirm')) {
    return 'SecurePass123!'; // Match password
  }
  
  // Check scanner examples ONLY for non-critical fields
  // (email/password already handled above with proper values)
  for (const c of constraints) {
    if (c.validExamples.length > 0) {
      const example = c.validExamples[0];
      // Only use scanner example if it's not a generic placeholder like "test"
      if (example !== 'test' && example !== 'Test' && example.length > 3) {
        return example;
      }
    }
  }
  
  // NAME fields
  if (name === 'name' || name === 'fullname' || name === 'full_name') {
    return 'Test User';
  }
  if (name.includes('first') && name.includes('name')) return 'John';
  if (name.includes('last') && name.includes('name')) return 'Doe';
  if (name === 'username') return 'testuser123';
  
  // PHONE fields
  if (type === 'tel' || name.includes('phone') || name.includes('mobile')) {
    return '+1234567890';
  }
  
  // NUMBER fields
  if (type === 'number') {
    // Check for min constraint
    const minRule = constraints.flatMap(c => c.rules).find(r => r.type === 'min');
    if (minRule?.value) return String(Number(minRule.value) + 1);
    return '10';
  }
  
  // PRICE/AMOUNT fields
  if (name.includes('price') || name.includes('amount') || name.includes('cost')) {
    return '99.99';
  }
  
  // QUANTITY fields
  if (name.includes('quantity') || name.includes('qty')) {
    return '5';
  }
  
  // URL fields
  if (type === 'url' || name.includes('url') || name.includes('website')) {
    return 'https://example.com';
  }
  
  // DATE fields - check both type AND name
  if (type === 'date' || name.includes('date') || name === 'startdate' || name === 'enddate') {
    return '2025-01-15';
  }
  if (type === 'datetime-local') return '2025-01-15T10:30';
  if (type === 'time' || name.includes('time')) return '10:30';
  if (name.includes('year')) return '2025';
  
  // BOOLEAN-like fields (often sent as text but behave like booleans)
  // Detect by common boolean naming PATTERNS, not hardcoded list:
  //   - Starts with: is, has, can, should, enable, disable, show, hide, allow, use
  //   - Ends with: enabled, disabled, active, visible, hidden, required, optional
  //   - Common standalone: remember, subscribe, agree, accept, confirm (without password)
  const normalizedName = name.replace(/[-_]/g, '').toLowerCase();
  
  // Pattern-based detection (works for ANY boolean field)
  const booleanPrefixes = /^(is|has|can|should|enable|disable|show|hide|allow|use|with)/;
  const booleanSuffixes = /(enabled|disabled|active|inactive|visible|hidden|required|optional|checked|selected)$/;
  const booleanStandalone = /^(remember|subscribe|agree|accept|terms|newsletter|marketing|notify|public|private|draft|published|archived|deleted|verified|approved|featured|promoted|pinned|sticky|locked|readonly)$/;
  
  if (booleanPrefixes.test(normalizedName) || 
      booleanSuffixes.test(normalizedName) || 
      booleanStandalone.test(normalizedName)) {
    return null; // Should be clicked, not filled
  }
  
  // SEARCH fields
  if (type === 'search' || name.includes('search') || name.includes('query')) {
    return 'test search query';
  }
  
  // DESCRIPTION/TEXT AREA fields
  if (name.includes('description') || name.includes('message') || name.includes('comment')) {
    return 'This is a test description for automated testing.';
  }
  
  // SELECT/DROPDOWN - try to use first option or common value
  if (element.tagName === 'select') {
    return 'option-1'; // Will need actual option value from scanner
  }
  
  // ID reference fields (categoryId, productId, etc.)
  if (name.includes('id') && !name.includes('email')) {
    return '1';
  }
  
  // Default fallback - use something more descriptive than "test"
  return 'Valid Test Input';
}

function getScopedSelector(element: ScannerElement, pageId: string): string {
  const bestSelector = element.bestSelector;
  const tagName = element.tagName;
  const name = element.attributes['name'] as string;
  const type = element.attributes['type'] as string;
  
  // Priority 1: data-testid or data-cy (most stable)
  if (bestSelector.includes('data-testid') || bestSelector.includes('data-cy')) {
    return bestSelector;
  }
  
  // Priority 2: For inputs, use [name="..."] which is stable
  if ((tagName === 'input' || tagName === 'select' || tagName === 'textarea') && name) {
    // Don't use name if it looks like button text (contains spaces or is too long)
    if (!name.includes(' ') && name.length < 30) {
      return `${tagName}[name="${name}"]`;
    }
  }
  
  // Priority 3: For buttons, prefer type="submit" or role-based selectors
  if (tagName === 'button') {
    if (type === 'submit') {
      return 'button[type="submit"]';
    }
    // If name looks like button text (has spaces), use text-based selector
    if (name && name.includes(' ')) {
      // Use Playwright's text selector which is more robust
      return `button:has-text("${name}")`;
    }
    // Fallback to role + text if we have textContent
    if (element.textContent) {
      return `button:has-text("${element.textContent}")`;
    }
  }
  
  // Priority 4: input[type="submit"]
  if (tagName === 'input' && type === 'submit') {
    return 'input[type="submit"]';
  }
  
  // Priority 5: Use bestSelector if it's reasonable
  if (bestSelector && !bestSelector.includes(' ') && bestSelector.length < 50) {
    return bestSelector;
  }
  
  // Fallback: construct basic selector
  if (name && !name.includes(' ')) {
    return `[name="${name}"]`;
  }
  
  return bestSelector || tagName;
}

function findSuccessRedirect(page: ScannerPage, scannerPayload: ScannerPayload): string | null {
  // Look for flow that starts from this page
  for (const flow of scannerPayload.flows) {
    const pageStep = flow.steps.find(s => s.pageId === page.id);
    if (pageStep?.nextPageId) {
      const nextPage = scannerPayload.pages.find(p => p.id === pageStep.nextPageId);
      if (nextPage) return nextPage.url;
    }
  }
  
  // Common redirects
  const url = page.url.toLowerCase();
  if (url.includes('sign-in') || url.includes('login')) return '/';
  if (url.includes('sign-up') || url.includes('register')) return '/';
  if (url.includes('password-reset')) {
    if (url.includes('token') || url.includes('[')) return '/sign-in';
    return null; // Stay on page (show confirmation message)
  }
  
  return null;
}

function isImportantPage(page: ScannerPage): boolean {
  const url = page.url.toLowerCase();
  
  // Important pages worth testing navigation
  return (
    url === '/' ||
    url === '/shop' ||
    url === '/cart' ||
    url.includes('/dashboard') ||
    url.includes('/profile') ||
    url.includes('/orders')
  );
}

// =============================================================================
// LLM-ENHANCED EDGE CASE GENERATION
// =============================================================================

interface LLMEdgeCaseResponse {
  edgeCases: Array<{
    formContext: string;
    testName: string;
    testType: 'boundary' | 'security' | 'usability' | 'error-recovery';
    description: string;
    inputValues: Array<{
      fieldName: string;
      value: string;
      reason: string;
    }>;
    expectedBehavior: string;
  }>;
}

const GENERATOR_SYSTEM_PROMPT = `You are a senior QA engineer specializing in edge case discovery.
Your task is to generate creative test scenarios that rule-based systems would miss.

Focus on:
1. BOUNDARY values (min-1, max+1, exact limits)
2. SECURITY scenarios (SQL injection, XSS, path traversal)
3. USABILITY issues (copy-paste, autofill, keyboard navigation)
4. ERROR RECOVERY (network failures, timeouts, retry behavior)

ONLY use field names that exist in the provided form data.
DO NOT invent field names that don't exist.`;

async function enhanceWithLLMEdgeCases(
  baselineOutput: GeneratorOutput,
  analyzerOutput: AnalyzerOutput,
  scannerPayload: ScannerPayload,
  llmClient: LLMClient
): Promise<GeneratorOutput> {
  // Collect all forms for context
  const formContexts = collectFormContexts(scannerPayload);
  
  if (formContexts.length === 0) {
    return baselineOutput;
  }
  
  const prompt = buildEdgeCasePrompt(formContexts, analyzerOutput);
  
  try {
    const response = await llmClient.completeJSON<LLMEdgeCaseResponse>(prompt, {
      systemPrompt: GENERATOR_SYSTEM_PROMPT,
      temperature: 0.7, // Higher temperature for creativity
      maxTokens: 4096,
    });
    
    // Convert LLM edge cases to GeneratedCases
    const edgeCases = convertLLMEdgeCases(
      response.edgeCases || [],
      scannerPayload,
      formContexts
    );
    
    // Add edge cases to appropriate suites
    return mergeEdgeCasesIntoSuites(baselineOutput, edgeCases);
  } catch (error) {
    console.error('   ⚠️ LLM edge case generation failed:', error);
    return baselineOutput;
  }
}

interface FormContext {
  formId: string;
  pageUrl: string;
  pageId: string;
  formName: string;
  fields: Array<{
    name: string;
    type: string;
    constraints: Array<{ type: string; value?: string | number }>;
  }>;
}

function collectFormContexts(scannerPayload: ScannerPayload): FormContext[] {
  const contexts: FormContext[] = [];
  const pageById = new Map(scannerPayload.pages.map(p => [p.id, p]));
  const constraintsByElementId = buildConstraintsByElementId(scannerPayload);
  
  // Group elements by formId
  const elementsByForm = new Map<string, ScannerElement[]>();
  for (const el of scannerPayload.elements) {
    if (el.formId) {
      const existing = elementsByForm.get(el.formId) || [];
      existing.push(el);
      elementsByForm.set(el.formId, existing);
    }
  }
  
  for (const [formId, elements] of elementsByForm) {
    const firstElement = elements[0];
    const page = pageById.get(firstElement.pageId);
    if (!page) continue;
    
    const fields = elements
      .filter(el => el.tagName === 'input' || el.tagName === 'select' || el.tagName === 'textarea')
      .map(el => {
        const constraints = constraintsByElementId.get(el.id) || [];
        return {
          name: (el.attributes['name'] as string) || el.id,
          type: (el.attributes['type'] as string) || 'text',
          constraints: constraints.flatMap(c => 
            c.rules.map(r => ({ type: r.type, value: r.value }))
          ),
        };
      });
    
    contexts.push({
      formId,
      pageUrl: page.url,
      pageId: page.id,
      formName: deriveFormName(page.url, formId),
      fields,
    });
  }
  
  return contexts;
}

function buildEdgeCasePrompt(
  formContexts: FormContext[],
  analyzerOutput: AnalyzerOutput
): string {
  const formsDescription = formContexts.map(fc => 
    `## ${fc.formName} (${fc.pageUrl})
Fields:
${fc.fields.map(f => 
  `- ${f.name} (${f.type})${f.constraints.length > 0 ? ` [${f.constraints.map(c => `${c.type}${c.value !== undefined ? ':' + c.value : ''}`).join(', ')}]` : ''}`
).join('\n')}`
  ).join('\n\n');
  
  const domains = analyzerOutput.domains.map(d => d.name).join(', ');
  
  return `Analyze these forms and generate creative edge case test scenarios.

# Application Context
Domains: ${domains}

# Forms
${formsDescription}

# Instructions
For EACH form, generate 1-3 edge case tests that:
1. Test BOUNDARY values (if constraints exist)
2. Test SECURITY concerns (injection, XSS)
3. Test USABILITY issues (unusual but valid inputs)

# Rules
- ONLY use field names from the forms above
- Be specific about input values
- Explain expected behavior
- Max 10 total edge cases across all forms

Respond with JSON:
{
  "edgeCases": [
    {
      "formContext": "form name from above",
      "testName": "descriptive test name",
      "testType": "boundary|security|usability|error-recovery",
      "description": "what this test checks",
      "inputValues": [
        { "fieldName": "exact field name from form", "value": "test value", "reason": "why this value" }
      ],
      "expectedBehavior": "what should happen"
    }
  ]
}`;
}

function convertLLMEdgeCases(
  llmCases: LLMEdgeCaseResponse['edgeCases'],
  scannerPayload: ScannerPayload,
  formContexts: FormContext[]
): GeneratedCase[] {
  const cases: GeneratedCase[] = [];
  const pageById = new Map(scannerPayload.pages.map(p => [p.id, p]));
  const elementsByFormAndName = buildElementLookup(scannerPayload);
  
  for (const llmCase of llmCases) {
    // Find matching form context
    const formContext = formContexts.find(fc => 
      fc.formName.toLowerCase() === llmCase.formContext.toLowerCase() ||
      fc.formId.includes(llmCase.formContext.toLowerCase())
    );
    
    if (!formContext) continue;
    
    const page = pageById.get(formContext.pageId);
    if (!page) continue;
    
    const steps: GeneratedStep[] = [];
    
    // Step 1: Navigate
    steps.push(createNavigateStep(page));
    
    // Step 2+: Fill fields with edge case values
    for (const inputVal of llmCase.inputValues) {
      const element = elementsByFormAndName.get(`${formContext.formId}:${inputVal.fieldName}`);
      if (element) {
        steps.push(createFillStep(
          element,
          inputVal.value,
          formContext.pageId,
          `llm-edge-case: ${inputVal.reason}`
        ));
      }
    }
    
    // Find submit button
    const submitButton = scannerPayload.elements.find(el => 
      el.formId === formContext.formId && 
      el.tagName === 'button' && 
      el.attributes['type'] === 'submit'
    );
    
    if (submitButton) {
      steps.push(createClickStep(submitButton, formContext.pageId));
    }
    
    // Only add if we have meaningful steps (navigate + at least one fill)
    if (steps.length < 2) continue;
    
    cases.push({
      id: `case-llm-${formContext.formId}-${llmCase.testType}-${cases.length}`,
      name: `${formContext.formName} - ${llmCase.testName}`,
      type: llmCase.testType,
      testedConstraint: `llm-${llmCase.testType}`,
      steps,
      assertions: [
        {
          type: llmCase.expectedBehavior.includes('reject') || llmCase.expectedBehavior.includes('error') 
            ? 'visible' 
            : 'url',
          expected: llmCase.expectedBehavior,
          target: llmCase.expectedBehavior.includes('reject') || llmCase.expectedBehavior.includes('error')
            ? '[role="alert"], .error, .error-message'
            : page.url,
          confidence: 0.6,
          source: 'llm-generated',
          reason: llmCase.description,
        },
      ],
    });
  }
  
  return cases;
}

function buildElementLookup(scannerPayload: ScannerPayload): Map<string, ScannerElement> {
  const map = new Map<string, ScannerElement>();
  for (const el of scannerPayload.elements) {
    if (el.formId) {
      const name = (el.attributes['name'] as string) || el.id;
      map.set(`${el.formId}:${name}`, el);
    }
  }
  return map;
}

function mergeEdgeCasesIntoSuites(
  baselineOutput: GeneratorOutput,
  edgeCases: GeneratedCase[]
): GeneratorOutput {
  if (edgeCases.length === 0) {
    return baselineOutput;
  }
  
  // Build a map of suite -> primary URLs (from navigate steps)
  const suiteUrlMap = new Map<string, Set<string>>();
  for (const suite of baselineOutput.suites) {
    const urls = new Set<string>();
    for (const c of suite.cases) {
      const navStep = c.steps.find(s => s.action === 'navigate');
      if (navStep?.target) {
        urls.add(getUrlFeatureKey(navStep.target));
      }
    }
    suiteUrlMap.set(suite.id, urls);
  }
  
  // Group edge cases by their target URL (extracted from navigate step)
  const edgeCasesBySuite = new Map<string, GeneratedCase[]>();
  
  for (const edgeCase of edgeCases) {
    // Extract target URL from navigate step
    const navigateStep = edgeCase.steps.find(s => s.action === 'navigate');
    const targetUrl = navigateStep?.target || '';
    const targetFeatureKey = getUrlFeatureKey(targetUrl);
    
    // Strategy 1: Find suite with EXACT same feature key
    let matchingSuite = baselineOutput.suites.find(suite => {
      const suiteUrls = suiteUrlMap.get(suite.id);
      return suiteUrls?.has(targetFeatureKey);
    });
    
    // Strategy 2: Match by suite ID containing the feature key
    if (!matchingSuite) {
      const targetSegments = targetFeatureKey.split('/');
      matchingSuite = baselineOutput.suites.find(suite => {
        // suite-dashboard-users should match targetFeatureKey 'dashboard/users'
        const suiteKeyFromId = suite.id.replace('suite-', '').replace(/-/g, '/');
        return suiteKeyFromId === targetFeatureKey ||
               targetSegments.every(seg => suite.id.includes(seg));
      });
    }
    
    // Strategy 3: Fallback to formId matching in edge case ID
    if (!matchingSuite) {
      // Edge case ID format: case-llm-{formId}-{type}-{index}
      const parts = edgeCase.id.split('-');
      const formIdPart = parts.slice(2, -2).join('-'); // Extract formId
      
      // Find suite whose cases have the same formId
      matchingSuite = baselineOutput.suites.find(suite =>
        suite.cases.some(c => c.id.includes(formIdPart))
      );
    }
    
    const suiteId = matchingSuite?.id || 'suite-edge-cases';
    const existing = edgeCasesBySuite.get(suiteId) || [];
    existing.push(edgeCase);
    edgeCasesBySuite.set(suiteId, existing);
  }
  
  // Merge into existing suites
  const updatedSuites = baselineOutput.suites.map(suite => {
    const additionalCases = edgeCasesBySuite.get(suite.id) || [];
    if (additionalCases.length > 0) {
      return {
        ...suite,
        cases: [...suite.cases, ...additionalCases],
      };
    }
    return suite;
  });
  
  // Add standalone edge cases suite if any don't match
  const unmatchedCases = edgeCasesBySuite.get('suite-edge-cases');
  if (unmatchedCases && unmatchedCases.length > 0) {
    updatedSuites.push({
      id: 'suite-edge-cases',
      name: 'Edge Case Tests (LLM-Generated)',
      domain: 'Edge Cases',
      cases: unmatchedCases,
    });
  }
  
  return { suites: updatedSuites };
}

/**
 * Extract feature key from URL for matching
 * /dashboard/products/[id] -> dashboard/products
 * /sign-in -> sign-in
 */
function getUrlFeatureKey(url: string): string {
  const segments = url.split('/').filter(Boolean);
  // Remove dynamic segments
  const staticSegments = segments.filter(s => !s.startsWith('[') && !s.startsWith(':') && !/^\d+$/.test(s));
  // Take first 2 segments or all if less
  return staticSegments.slice(0, 2).join('/').toLowerCase();
}
