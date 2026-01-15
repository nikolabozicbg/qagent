/**
 * V6 LLM Analyzer - App Understanding
 * 
 * THE BRAIN OF THE SYSTEM
 * 
 * This module uses LLM to UNDERSTAND the application, not just parse it.
 * Key responsibilities:
 * 1. Understand what the app DOES (not just what URLs it has)
 * 2. Identify user FEATURES (not just pages)
 * 3. Understand DATA DEPENDENCIES between features
 * 4. Determine test PRIORITIES based on risk
 * 5. Figure out test ORDERING based on dependencies
 */

import { LLMClient } from '../v5-discovery/llm-client';
import { ScannerPayload, ScannerPage, ScannerElement, ScannerConstraint } from '../v5-discovery/types';
import { 
  EnhancedScannerPayload, 
  AppUnderstanding, 
  AppFeature, 
  DataEntity,
  FeaturePrecondition 
} from './types';

// =============================================================================
// MAIN ANALYZER FUNCTION
// =============================================================================

export async function analyzeApp(
  scannerPayload: ScannerPayload | EnhancedScannerPayload,
  llmClient: LLMClient
): Promise<AppUnderstanding> {
  console.log('   🧠 V6 Analyzer: Understanding application...');
  
  // DEBUG: Log what we receive from scanner
  console.log('   📥 Scanner Data Received:');
  console.log(`      - Pages: ${scannerPayload.pages.length}`);
  console.log(`      - Elements: ${scannerPayload.elements.length}`);
  console.log(`      - Constraints: ${scannerPayload.constraints.length}`);
  console.log(`      - Flows: ${scannerPayload.flows.length}`);
  console.log('   📄 All page URLs:');
  for (const page of scannerPayload.pages) {
    console.log(`      ${page.isProtected ? '🔒' : '🔓'} ${page.url}`);
  }
  
  if (!llmClient.isAvailable()) {
    console.log('   ⚠️ LLM not available, using fallback analysis');
    return createFallbackUnderstanding(scannerPayload);
  }
  
  // Step 1: Prepare context for LLM
  const context = prepareAppContext(scannerPayload);
  
  // Step 2: Get LLM's understanding of the app
  const understanding = await getLLMUnderstanding(context, llmClient);
  
  // Step 3: Validate and enrich with scanner data
  const validated = validateAndEnrich(understanding, scannerPayload);
  
  console.log(`   ✅ Identified ${validated.features.length} features, ${validated.dataEntities.length} entities`);
  
  return validated;
}

// =============================================================================
// CONTEXT PREPARATION
// =============================================================================

interface AppContext {
  /** Summary of pages - NO CATEGORIZATION, let LLM decide */
  pages: Array<{
    url: string;
    isProtected: boolean;
    formCount: number;
    fieldNames: string[];
    buttonTexts: string[];
    linkTexts: string[];
  }>;
  
  /** All forms with their fields and constraints */
  forms: Array<{
    id: string;
    pageUrl: string;
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      constraints: string[];
    }>;
    submitButtonText: string | null;
  }>;
  
  /** Detected flows */
  flows: Array<{
    name: string;
    pages: string[];
  }>;
  
  /** Project info */
  project: {
    name: string;
    framework: string;
  };
  
  /** Statistics */
  stats: {
    pageCount: number;
    formCount: number;
    protectedPageCount: number;
    totalFields: number;
  };
}

function prepareAppContext(scannerPayload: ScannerPayload): AppContext {
  const elementsByPage = buildElementsByPage(scannerPayload);
  const constraintsByElementId = buildConstraintsByElementId(scannerPayload);
  const formsByPage = buildFormsByPage(scannerPayload);
  
  // Prepare pages summary - NO HARDCODED CATEGORIZATION
  // Let LLM see raw data and decide what's important
  const pages = scannerPayload.pages.map(page => {
    const elements = elementsByPage.get(page.id) || [];
    const formIds = formsByPage.get(page.id) || [];
    
    const inputElements = elements.filter(el => 
      el.tagName === 'input' || el.tagName === 'select' || el.tagName === 'textarea'
    );
    
    const buttonElements = elements.filter(el => el.tagName === 'button');
    const linkElements = elements.filter(el => el.tagName === 'a');
    
    const fieldNames = inputElements.map(el => 
      (el.attributes['name'] as string) || (el.attributes['id'] as string) || ''
    ).filter(Boolean);
    
    const buttonTexts = buttonElements
      .map(el => el.textContent?.trim())
      .filter((t): t is string => !!t && t.length < 50);
    
    const linkTexts = linkElements
      .map(el => el.textContent?.trim())
      .filter((t): t is string => !!t && t.length < 50)
      .slice(0, 10);
    
    return {
      url: page.url,
      isProtected: page.isProtected,
      formCount: formIds.length,
      fieldNames,
      buttonTexts,
      linkTexts,
    };
  });
  
  // Prepare forms summary
  const forms: AppContext['forms'] = [];
  const processedForms = new Set<string>();
  
  for (const element of scannerPayload.elements) {
    if (!element.formId || processedForms.has(element.formId)) continue;
    
    processedForms.add(element.formId);
    
    const page = scannerPayload.pages.find(p => p.id === element.pageId);
    const formElements = scannerPayload.elements.filter(el => el.formId === element.formId);
    
    const fields = formElements
      .filter(el => el.tagName === 'input' || el.tagName === 'select' || el.tagName === 'textarea')
      .filter(el => {
        const type = (el.attributes['type'] as string || '').toLowerCase();
        return type !== 'hidden' && type !== 'submit';
      })
      .map(el => {
        const constraints = constraintsByElementId.get(el.id) || [];
        const rules = constraints.flatMap(c => c.rules);
        
        return {
          name: (el.attributes['name'] as string) || el.id,
          type: (el.attributes['type'] as string) || 'text',
          required: rules.some(r => r.type === 'required'),
          constraints: rules.map(r => r.type + (r.value !== undefined ? `:${r.value}` : '')),
        };
      });
    
    const submitButton = formElements.find(el => 
      el.tagName === 'button' && el.attributes['type'] === 'submit'
    );
    
    forms.push({
      id: element.formId,
      pageUrl: page?.url || '',
      fields,
      submitButtonText: submitButton?.textContent?.trim() || null,
    });
  }
  
  // Prepare flows
  const flows = scannerPayload.flows.map(flow => ({
    name: flow.name,
    pages: flow.steps.map(s => s.url),
  }));
  
  return {
    pages,
    forms,
    flows,
    project: {
      name: scannerPayload.project.name,
      framework: scannerPayload.project.framework,
    },
    stats: {
      pageCount: pages.length,
      formCount: forms.length,
      protectedPageCount: pages.filter(p => p.isProtected).length,
      totalFields: forms.reduce((sum, f) => sum + f.fields.length, 0),
    },
  };
}

// =============================================================================
// LLM UNDERSTANDING
// =============================================================================

const ANALYZER_SYSTEM_PROMPT = `You are a QA architect analyzing a web application.

Your task: Identify ALL testable user features from the provided pages.

For EACH significant page, create a feature. Output valid JSON with this SIMPLE structure:

{
  "appDescription": "What this app does",
  "features": [
    {
      "id": "feature-id",
      "name": "User-facing feature name",
      "description": "What user can do",
      "pages": ["/page1", "/page2"],
      "priority": "critical|high|medium|low",
      "category": "auth|shopping|account|admin|content|support",
      "requiresAuth": true/false,
      "hasForm": true/false
    }
  ]
}

Rules:
- Create a feature for EVERY page that has user interaction
- Name features from USER perspective ("Login" not "/sign-in page")
- Priority: critical=auth/payment, high=main flows, medium=secondary, low=static
- Output as MANY features as there are significant pages`;

// Simplified LLM output - just features, code derives everything else
interface LLMFeature {
  id: string;
  name: string;
  description: string;
  pages: string[];  // URLs
  priority: string;
  category: string;
  requiresAuth: boolean;
  hasForm: boolean;
}

interface LLMAppUnderstanding {
  appDescription: string;
  features: LLMFeature[];
}

async function getLLMUnderstanding(
  context: AppContext,
  llmClient: LLMClient
): Promise<LLMAppUnderstanding> {
  const prompt = buildAnalyzerPrompt(context);
  
  // DEBUG: Log prompt stats
  console.log('   📝 LLM Prompt Stats:');
  console.log(`      - Prompt length: ${prompt.length} chars`);
  console.log(`      - Pages in prompt: ${context.pages.length}`);
  console.log(`      - Forms in prompt: ${context.forms.length}`);
  
  try {
    const response = await llmClient.completeJSON<LLMAppUnderstanding>(prompt, {
      systemPrompt: ANALYZER_SYSTEM_PROMPT,
      temperature: 0.2,  // Lower temperature for more consistent output
      maxTokens: 4096,   // Max allowed by model
    });
    
    // DEBUG: Log LLM response
    console.log('   🤖 LLM Response:');
    console.log(`      - Features returned: ${response.features.length}`);
    console.log(`      - Features: ${response.features.map(f => f.name).join(', ')}`);
    
    return response;
  } catch (error) {
    console.error('   ❌ LLM understanding failed:', error);
    throw error;
  }
}

function buildAnalyzerPrompt(context: AppContext): string {
  // Simple page list - let LLM understand and categorize
  const pagesInfo = context.pages.map(p => {
    const parts = [p.url];
    if (p.isProtected) parts.push('(protected)');
    if (p.formCount > 0) parts.push(`(form: ${p.fieldNames.join(', ')})`);
    if (p.buttonTexts.length > 0) parts.push(`[${p.buttonTexts.slice(0, 3).join(', ')}]`);
    return parts.join(' ');
  }).join('\n');
  
  const formsInfo = context.forms.map(f => 
    `${f.pageUrl}: ${f.fields.map(field => field.name).join(', ')} -> "${f.submitButtonText}"`
  ).join('\n');
  
  return `Application: ${context.project.name} (${context.project.framework})
Pages: ${context.stats.pageCount}, Forms: ${context.stats.formCount}

All pages:
${pagesInfo}

Forms:
${formsInfo}

Create a feature for each significant page. Return JSON with appDescription and features array.`;
}

// =============================================================================
// VALIDATION & ENRICHMENT
// =============================================================================

function validateAndEnrich(
  llmOutput: LLMAppUnderstanding,
  scannerPayload: ScannerPayload
): AppUnderstanding {
  // Build lookup maps from scanner data
  const pageByUrl = new Map(scannerPayload.pages.map(p => [p.url, p]));
  const formsByPageId = buildFormsByPage(scannerPayload);
  
  // Convert simple LLM features to full AppFeatures
  // Code derives everything LLM didn't provide from scanner data
  const features: AppFeature[] = llmOutput.features.map(f => {
    // Find matching pages
    const matchedPages = f.pages
      .map(url => pageByUrl.get(url))
      .filter((p): p is ScannerPage => p !== undefined);
    
    // Get forms for these pages
    const forms = matchedPages.flatMap(p => formsByPageId.get(p.id) || []);
    
    // Derive preconditions from feature properties
    const preconditions: FeaturePrecondition[] = [];
    if (f.requiresAuth) {
      preconditions.push({ type: 'auth', description: 'User must be authenticated' });
    }
    
    // Derive success indicator from feature type
    const successIndicator = deriveSuccessIndicator(f, matchedPages);
    const failureIndicator = deriveFailureIndicator(f);
    
    return {
      id: f.id,
      name: f.name,
      description: f.description,
      priority: normalizePriority(f.priority),
      riskLevel: normalizePriority(f.priority),
      category: f.category,
      pages: matchedPages.map(p => p.id),
      forms,
      actions: [],
      preconditions,
      dependsOn: [],
      successIndicator,
      failureIndicator,
    };
  });
  
  // Derive execution order - auth features first, then by priority
  const authFeatures = features.filter(f => f.category === 'auth');
  const otherFeatures = features.filter(f => f.category !== 'auth');
  const testExecutionOrder = [...authFeatures, ...otherFeatures].map(f => f.id);
  
  // Critical paths = critical priority features
  const criticalPaths = features.filter(f => f.priority === 'critical').map(f => f.id);
  
  // Detect auth features
  const loginFeature = features.find(f => 
    f.name.toLowerCase().includes('login') || f.name.toLowerCase().includes('sign in')
  );
  const registrationFeature = features.find(f => 
    f.name.toLowerCase().includes('register') || f.name.toLowerCase().includes('sign up')
  );
  
  return {
    description: llmOutput.appDescription,
    appType: deriveAppType(features),
    features,
    dataEntities: [],
    testExecutionOrder,
    criticalPaths,
    auth: {
      hasAuth: authFeatures.length > 0,
      loginFeatureId: loginFeature?.id,
      registrationFeatureId: registrationFeature?.id,
      protectedFeatureIds: features.filter(f => f.preconditions.some(p => p.type === 'auth')).map(f => f.id),
    },
  };
}

// Helper functions - derive from data, no hardcoding
function normalizePriority(p: string): 'critical' | 'high' | 'medium' | 'low' {
  const normalized = p.toLowerCase();
  const priorities = ['critical', 'high', 'medium', 'low'] as const;
  return priorities.find(pr => normalized.includes(pr)) || 'medium';
}

function deriveAppType(features: AppFeature[]): string {
  const categories = features.map(f => f.category.toLowerCase());
  if (categories.some(c => c.includes('shopping') || c.includes('cart') || c.includes('checkout'))) return 'e-commerce';
  if (categories.some(c => c.includes('financial') || c.includes('payment') || c.includes('banking'))) return 'financial';
  if (categories.some(c => c.includes('admin'))) return 'admin';
  if (categories.some(c => c.includes('content') || c.includes('blog'))) return 'content';
  return 'application';
}

function deriveSuccessIndicator(feature: LLMFeature, pages: ScannerPage[]): AppFeature['successIndicator'] {
  // For forms, success usually means redirect or success message
  if (feature.hasForm) {
    return {
      type: 'redirect',
      target: 'success page or dashboard',
      description: 'Form submitted successfully',
    };
  }
  // For view pages, success means page loads
  return {
    type: 'element-visible',
    target: 'page content',
    description: 'Page content is visible',
  };
}

function deriveFailureIndicator(feature: LLMFeature): AppFeature['failureIndicator'] | undefined {
  if (feature.hasForm) {
    return {
      type: 'element-visible',
      target: 'error message',
      description: 'Validation or submission error shown',
    };
  }
  return undefined;
}

// =============================================================================
// FALLBACK (No LLM)
// =============================================================================

function createFallbackUnderstanding(scannerPayload: ScannerPayload): AppUnderstanding {
  console.log('   📊 Creating fallback understanding from scanner data...');
  
  const features: AppFeature[] = [];
  const formsByPage = buildFormsByPage(scannerPayload);
  const constraintsByElementId = buildConstraintsByElementId(scannerPayload);
  const elementsByPage = buildElementsByPage(scannerPayload);
  
  for (const page of scannerPayload.pages) {
    const formIds = formsByPage.get(page.id) || [];
    const elements = elementsByPage.get(page.id) || [];
    
    if (formIds.length === 0) {
      // Navigation-only page
      features.push({
        id: `nav-${page.id}`,
        name: `Navigate to ${page.url}`,
        description: `View ${page.url} page`,
        priority: 'low',
        riskLevel: 'low',
        category: 'navigation',
        pages: [page.id],
        forms: [],
        actions: [],
        preconditions: page.isProtected ? [{
          type: 'auth',
          description: 'User must be logged in',
        }] : [],
        dependsOn: [],
        successIndicator: {
          type: 'redirect',
          target: page.url,
          description: `Page loads at ${page.url}`,
        },
      });
    } else {
      // Form page - create feature per form
      for (const formId of formIds) {
        const formElements = elements.filter(el => el.formId === formId);
        const fieldNames = formElements
          .filter(el => el.tagName === 'input' || el.tagName === 'select' || el.tagName === 'textarea')
          .map(el => (el.attributes['name'] as string) || '')
          .filter(Boolean);
        
        const fieldStr = fieldNames.join(' ').toLowerCase();
        
        // Detect form type
        let featureName = deriveFeatureName(page.url, fieldNames);
        let category = 'content';
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        
        if (fieldStr.includes('email') && fieldStr.includes('password')) {
          if (fieldStr.includes('confirm') || fieldStr.includes('name')) {
            featureName = 'User Registration';
            category = 'auth';
            priority = 'critical';
          } else {
            featureName = 'User Login';
            category = 'auth';
            priority = 'critical';
          }
        }
        
        features.push({
          id: `form-${formId}`,
          name: featureName,
          description: `Submit form on ${page.url}`,
          priority,
          riskLevel: priority,
          category,
          pages: [page.id],
          forms: [formId],
          actions: [],
          preconditions: page.isProtected ? [{
            type: 'auth',
            description: 'User must be logged in',
          }] : [],
          dependsOn: [],
          successIndicator: {
            type: 'redirect',
            target: '/',
            description: 'Redirects after successful submission',
          },
          failureIndicator: {
            type: 'message',
            target: 'error message',
            description: 'Shows validation error',
          },
        });
      }
    }
  }
  
  // Determine auth features
  const loginFeature = features.find(f => f.name.toLowerCase().includes('login'));
  const registrationFeature = features.find(f => f.name.toLowerCase().includes('registration'));
  
  // Build execution order (auth features first)
  const authFeatures = features.filter(f => f.category === 'auth');
  const otherFeatures = features.filter(f => f.category !== 'auth');
  
  return {
    description: `${scannerPayload.project.framework} application with ${features.length} features`,
    appType: 'other',
    features,
    dataEntities: [],
    testExecutionOrder: [...authFeatures.map(f => f.id), ...otherFeatures.map(f => f.id)],
    criticalPaths: features.filter(f => f.priority === 'critical').map(f => f.id),
    auth: {
      hasAuth: authFeatures.length > 0,
      loginFeatureId: loginFeature?.id,
      registrationFeatureId: registrationFeature?.id,
      protectedFeatureIds: features.filter(f => f.preconditions.some(p => p.type === 'auth')).map(f => f.id),
    },
  };
}

function deriveFeatureName(url: string, fieldNames: string[]): string {
  const urlSegments = url.split('/').filter(Boolean);
  const lastSegment = urlSegments[urlSegments.length - 1] || 'Home';
  
  // Clean up URL segment
  const cleanName = lastSegment
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  
  return cleanName;
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
      const existing = map.get(el.pageId) || [];
      if (!existing.includes(el.formId)) {
        existing.push(el.formId);
      }
      map.set(el.pageId, existing);
    }
  }
  return map;
}
