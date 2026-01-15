/**
 * V5 Discovery - Analyzer Agent
 * 
 * LLM agent that extracts semantic understanding from scanner data:
 * - Domains (logical groupings)
 * - Journeys (user flows)
 * - Auth boundary (public vs protected)
 * 
 * INCLUDES: AnalyzerValidator to ensure LLM doesn't invent data
 */

import {
  ScannerPayload,
  AnalyzerOutput,
  Domain,
  Journey,
  AuthBoundary,
  AnalyzerValidation,
  ValidationIssue,
} from '../types';
import { LLMClient } from '../llm-client';

export { LLMClient };

// =============================================================================
// MAIN ANALYZER FUNCTION
// =============================================================================

/**
 * Analyze scanner payload and extract semantic understanding
 */
export async function analyze(
  scannerPayload: ScannerPayload,
  llmClient?: LLMClient
): Promise<AnalyzerOutput> {
  // If no LLM client or not available, use rule-based fallback
  if (!llmClient || !llmClient.isAvailable()) {
    console.log('   📝 Using rule-based analyzer (no LLM)');
    return analyzeRuleBased(scannerPayload);
  }
  
  console.log('   🧠 Using LLM-enhanced analyzer...');
  
  try {
    // Use LLM for semantic analysis
    const llmOutput = await analyzeLLM(scannerPayload, llmClient);
    
    // Validate LLM output against scanner data
    const validation = validateAnalyzerOutput(llmOutput, scannerPayload);
    
    // If validation fails, retry with feedback
    if (!validation.valid && validation.issues.length > 0) {
      console.log(`   ⚠️ Analyzer validation failed: ${validation.issues.length} issues`);
      console.log(`   🔄 Retrying with corrections...`);
      
      const correctedOutput = await retryWithFeedback(
        scannerPayload,
        llmClient,
        llmOutput,
        validation.issues
      );
      
      const retryValidation = validateAnalyzerOutput(correctedOutput, scannerPayload);
      
      return {
        ...correctedOutput,
        validation: retryValidation,
      };
    }
    
    return {
      ...llmOutput,
      validation,
    };
  } catch (error) {
    console.error('   ❌ LLM analyzer failed, using rule-based fallback:', error);
    return analyzeRuleBased(scannerPayload);
  }
}

// =============================================================================
// LLM ANALYSIS
// =============================================================================

interface LLMAnalyzerResponse {
  domains: Domain[];
  journeys: Journey[];
  authBoundary: AuthBoundary;
}

async function analyzeLLM(
  payload: ScannerPayload,
  llmClient: LLMClient
): Promise<Omit<AnalyzerOutput, 'validation'>> {
  // Build context from scanner data
  const pages = payload.pages.map(p => ({
    id: p.id,
    url: p.url,
    isProtected: p.isProtected,
    hasForms: p.elementIds.length > 0,
  }));
  
  const forms = extractFormsFromElements(payload);
  
  const flows = payload.flows.map(f => ({
    id: f.id,
    name: f.name,
    steps: f.steps.map(s => s.url),
  }));
  
  const prompt = buildAnalyzerPrompt(pages, forms, flows, payload);
  
  try {
    const response = await llmClient.completeJSON<LLMAnalyzerResponse>(prompt, {
      systemPrompt: ANALYZER_SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 4096,
    });
    
    return {
      domains: response.domains || [],
      journeys: response.journeys || [],
      authBoundary: response.authBoundary || { publicPageIds: [], protectedPageIds: [] },
    };
  } catch (error) {
    console.error('   ❌ LLM analysis failed, falling back to rule-based:', error);
    return analyzeRuleBased(payload);
  }
}

const ANALYZER_SYSTEM_PROMPT = `You are a senior QA engineer analyzing a web application structure.
Your task is to identify logical domains, user journeys, and authentication boundaries.

You must ONLY use the page IDs, form IDs, and URLs provided in the input data.
DO NOT invent or hallucinate any IDs or URLs that weren't given to you.

Be conservative - it's better to have fewer, accurate domains than many inaccurate ones.`;

function buildAnalyzerPrompt(
  pages: { id: string; url: string; isProtected: boolean; hasForms: boolean }[],
  forms: { id: string; name: string; route: string; fields: string[] }[],
  flows: { id: string; name: string; steps: string[] }[],
  payload: ScannerPayload
): string {
  // Get constraints summary for context
  const fieldConstraints = payload.constraints.slice(0, 20).map(c => 
    `${c.field}: ${c.rules.map(r => r.type).join(', ')}`
  );
  
  return `Analyze this web application and identify domains, user journeys, and auth boundaries.

## Pages (${pages.length} total)
${pages.slice(0, 30).map(p => `${p.id}: ${p.url}${p.hasForms ? ' [HAS FORMS]' : ''}${p.isProtected ? ' [PROTECTED]' : ''}`).join('\n')}
${pages.length > 30 ? `... and ${pages.length - 30} more pages` : ''}

## Forms (${forms.length} total)
${forms.slice(0, 15).map(f => `${f.id}: "${f.name}" at ${f.route} - fields: [${f.fields.slice(0, 5).join(', ')}${f.fields.length > 5 ? '...' : ''}]`).join('\n')}

## Detected Flows
${flows.length > 0 ? flows.map(f => `${f.name}: ${f.steps.join(' → ')}`).join('\n') : 'None detected'}

## Field Validations (sample)
${fieldConstraints.slice(0, 10).join('\n')}

## Instructions

Group pages into logical DOMAINS based on their purpose:
- Look at URL patterns (e.g., /dashboard/*, /auth/*, /shop/*)
- Consider form types (login forms → Auth domain, product forms → Shopping domain)
- Be semantic, not just syntactic (understand WHAT the pages do)

Identify USER JOURNEYS - complete user flows with a goal:
- "User Registration" (sign-up → verification → dashboard)
- "Password Reset" (request → email → set new password)
- "Checkout" (cart → shipping → payment → confirmation)

For each journey, list the FORMS involved and key FIELDS.

## CONSTRAINTS
- ONLY use page IDs from the list above
- ONLY use form IDs from the list above
- Create 3-6 domains maximum
- Create 2-8 journeys maximum
- Each page should belong to exactly ONE domain

Respond with JSON only:
{
  "domains": [
    { "name": "string", "pageIds": ["page-id-1", "page-id-2"], "purpose": "string" }
  ],
  "journeys": [
    { "id": "journey-1", "name": "string", "pageSequence": ["page-id-1"], "formIds": ["form-id-1"], "fields": ["email", "password"], "type": "authentication", "goal": "string" }
  ],
  "authBoundary": {
    "publicPageIds": ["page-ids that don't require login"],
    "protectedPageIds": ["page-ids that require login"]
  }
}`;
}

function parseAnalyzerResponse(response: string): Omit<AnalyzerOutput, 'validation'> {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      domains: parsed.domains || [],
      journeys: parsed.journeys || [],
      authBoundary: parsed.authBoundary || { publicPageIds: [], protectedPageIds: [] },
    };
  } catch (error) {
    console.error('   ❌ Failed to parse LLM response:', error);
    return {
      domains: [],
      journeys: [],
      authBoundary: { publicPageIds: [], protectedPageIds: [] },
    };
  }
}

async function retryWithFeedback(
  payload: ScannerPayload,
  llmClient: LLMClient,
  previousOutput: Omit<AnalyzerOutput, 'validation'>,
  issues: ValidationIssue[]
): Promise<Omit<AnalyzerOutput, 'validation'>> {
  const issuesList = issues.map(i => `- ${i.type}: "${i.notFound}" (referenced in ${i.referencedIn})`).join('\n');
  
  const prompt = `Your previous analysis had validation errors. Please fix them.

## Issues Found
${issuesList}

## Valid Page IDs
${payload.pages.map(p => p.id).join(', ')}

## Valid Form IDs
${extractFormsFromElements(payload).map(f => f.id).join(', ')}

## Your Previous Response
${JSON.stringify(previousOutput, null, 2)}

Please provide a CORRECTED response using ONLY the valid IDs listed above.
Remove any references to IDs that don't exist.

Corrected JSON:`;

  try {
    const response = await llmClient.complete(prompt);
    return parseAnalyzerResponse(response);
  } catch {
    return previousOutput;
  }
}

// =============================================================================
// RULE-BASED FALLBACK
// =============================================================================

function analyzeRuleBased(payload: ScannerPayload): AnalyzerOutput {
  const domains = inferDomains(payload);
  const journeys = inferJourneys(payload);
  const authBoundary = inferAuthBoundary(payload);
  
  return {
    domains,
    journeys,
    authBoundary,
    validation: { valid: true, issues: [] },
  };
}

function inferDomains(payload: ScannerPayload): Domain[] {
  const domains: Domain[] = [];
  const assignedPages = new Set<string>();
  
  // Authentication domain
  const authPages = payload.pages.filter(p => {
    const u = p.url.toLowerCase();
    return u.includes('login') || u.includes('sign-in') || u.includes('signin') || 
           u.includes('sign-up') || u.includes('signup') || 
           u.includes('register') || u.includes('forgot') || 
           u.includes('password-reset') || u.includes('reset-password');
  });
  
  if (authPages.length > 0) {
    domains.push({
      name: 'Authentication',
      pageIds: authPages.map(p => p.id),
      purpose: 'User authentication and account management',
    });
    authPages.forEach(p => assignedPages.add(p.id));
  }
  
  // Shopping domain (shop, products, cart, checkout)
  const shoppingPages = payload.pages.filter(p => {
    if (assignedPages.has(p.id)) return false;
    const u = p.url.toLowerCase();
    return u === '/shop' || u === '/store' || 
           u.includes('/product') || u.includes('/products') ||
           u.includes('/cart') || u.includes('/basket') ||
           u.includes('/checkout');
  });
  
  if (shoppingPages.length > 0) {
    domains.push({
      name: 'Shopping',
      pageIds: shoppingPages.map(p => p.id),
      purpose: 'Product browsing and purchasing',
    });
    shoppingPages.forEach(p => assignedPages.add(p.id));
  }
  
  // Dashboard/Admin domain
  const dashPages = payload.pages.filter(p => {
    if (assignedPages.has(p.id)) return false;
    const u = p.url.toLowerCase();
    return u.includes('/dashboard') || u.includes('/admin');
  });
  
  if (dashPages.length > 0) {
    domains.push({
      name: 'Dashboard',
      pageIds: dashPages.map(p => p.id),
      purpose: 'Administration and management',
    });
    dashPages.forEach(p => assignedPages.add(p.id));
  }
  
  // User/Profile domain
  const userPages = payload.pages.filter(p => {
    if (assignedPages.has(p.id)) return false;
    const u = p.url.toLowerCase();
    return u.includes('/profile') || u.includes('/account') ||
           u.includes('/settings') || u.includes('/orders') ||
           u.includes('/user');
  });
  
  if (userPages.length > 0) {
    domains.push({
      name: 'User',
      pageIds: userPages.map(p => p.id),
      purpose: 'User profile and account management',
    });
    userPages.forEach(p => assignedPages.add(p.id));
  }
  
  // Add remaining unassigned pages to General domain
  const unassigned = payload.pages.filter(p => !assignedPages.has(p.id));
  if (unassigned.length > 0) {
    domains.push({
      name: 'General',
      pageIds: unassigned.map(p => p.id),
      purpose: 'General application pages',
    });
  }
  
  return domains;
}

function inferJourneys(payload: ScannerPayload): Journey[] {
  const journeys: Journey[] = [];
  
  // Use detected flows
  for (const flow of payload.flows) {
    journeys.push({
      id: `journey-${flow.id}`,
      name: flow.name,
      pageSequence: flow.steps.map(s => {
        const page = payload.pages.find(p => p.url === s.url);
        return page?.id || s.pageId;
      }),
      formIds: [], // Would need to cross-reference
      fields: [],
      type: inferJourneyType(flow.name),
      goal: `Complete ${flow.name.toLowerCase()} flow`,
    });
  }
  
  // If no flows, create journeys from forms
  if (journeys.length === 0) {
    const forms = extractFormsFromElements(payload);
    
    for (const form of forms) {
      const page = payload.pages.find(p => p.url === form.route);
      if (page) {
        journeys.push({
          id: `journey-form-${form.id}`,
          name: `${form.name} Flow`,
          pageSequence: [page.id],
          formIds: [form.id],
          fields: form.fields,
          type: inferJourneyTypeFromForm(form.name),
          goal: `Submit ${form.name.toLowerCase()}`,
        });
      }
    }
  }
  
  return journeys;
}

function inferJourneyType(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('login') || nameLower.includes('signin') || nameLower.includes('auth')) {
    return 'authentication';
  }
  if (nameLower.includes('signup') || nameLower.includes('register')) {
    return 'registration';
  }
  if (nameLower.includes('checkout') || nameLower.includes('payment')) {
    return 'checkout';
  }
  if (nameLower.includes('password') || nameLower.includes('reset')) {
    return 'password-reset';
  }
  return 'general';
}

function inferJourneyTypeFromForm(formName: string): string {
  return inferJourneyType(formName);
}

function inferAuthBoundary(payload: ScannerPayload): AuthBoundary {
  const publicPageIds: string[] = [];
  const protectedPageIds: string[] = [];
  
  for (const page of payload.pages) {
    if (page.isProtected) {
      protectedPageIds.push(page.id);
    } else {
      // Heuristic: auth-related pages are public
      const url = page.url.toLowerCase();
      const isAuthPage = url.includes('login') || url.includes('signin') || 
                         url.includes('signup') || url.includes('register') ||
                         url.includes('forgot') || url.includes('reset');
      
      if (isAuthPage) {
        publicPageIds.push(page.id);
      } else {
        // Default to protected for unknown pages
        protectedPageIds.push(page.id);
      }
    }
  }
  
  return { publicPageIds, protectedPageIds };
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateAnalyzerOutput(
  output: Omit<AnalyzerOutput, 'validation'>,
  payload: ScannerPayload
): AnalyzerValidation {
  const issues: ValidationIssue[] = [];
  
  // Build lookup sets
  const validPageIds = new Set(payload.pages.map(p => p.id));
  const validFormIds = new Set(extractFormsFromElements(payload).map(f => f.id));
  
  // Validate domains
  for (const domain of output.domains) {
    for (const pageId of domain.pageIds) {
      if (!validPageIds.has(pageId)) {
        issues.push({
          type: 'invalid-page-id',
          notFound: pageId,
          referencedIn: `domain "${domain.name}"`,
        });
      }
    }
  }
  
  // Validate journeys
  for (const journey of output.journeys) {
    for (const pageId of journey.pageSequence) {
      if (!validPageIds.has(pageId)) {
        issues.push({
          type: 'invalid-page-id',
          notFound: pageId,
          referencedIn: `journey "${journey.name}"`,
        });
      }
    }
    
    for (const formId of journey.formIds) {
      if (!validFormIds.has(formId)) {
        issues.push({
          type: 'invalid-form-id',
          notFound: formId,
          referencedIn: `journey "${journey.name}"`,
        });
      }
    }
  }
  
  // Validate auth boundary
  for (const pageId of output.authBoundary.publicPageIds) {
    if (!validPageIds.has(pageId)) {
      issues.push({
        type: 'invalid-page-id',
        notFound: pageId,
        referencedIn: 'authBoundary.publicPageIds',
      });
    }
  }
  
  for (const pageId of output.authBoundary.protectedPageIds) {
    if (!validPageIds.has(pageId)) {
      issues.push({
        type: 'invalid-page-id',
        notFound: pageId,
        referencedIn: 'authBoundary.protectedPageIds',
      });
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function extractFormsFromElements(payload: ScannerPayload): Array<{
  id: string;
  name: string;
  route: string;
  fields: string[];
}> {
  // Group elements by formId
  const formElements = new Map<string, typeof payload.elements>();
  
  for (const el of payload.elements) {
    if (el.formId) {
      const existing = formElements.get(el.formId) || [];
      existing.push(el);
      formElements.set(el.formId, existing);
    }
  }
  
  const forms: Array<{ id: string; name: string; route: string; fields: string[] }> = [];
  
  for (const [formId, elements] of formElements) {
    const page = payload.pages.find(p => p.elementIds.includes(elements[0]?.id || ''));
    
    forms.push({
      id: formId,
      name: formId.replace('form-', '').replace(/-/g, ' '),
      route: page?.url || '/',
      fields: elements
        .filter(el => el.tagName === 'input' || el.tagName === 'select' || el.tagName === 'textarea')
        .map(el => (el.attributes['name'] as string) || el.id)
        .filter(Boolean),
    });
  }
  
  return forms;
}
