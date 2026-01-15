import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { FormInfo, RouteInfo, APICall } from './types/intelligence.types';

/**
 * AI-Powered Test Synthesizer Service
 * 
 * Uses LLM to transform raw DSA data into meaningful, deduplicated test suites.
 * Eliminates navigation permutations and generates intent-based test scenarios.
 */

export interface DSAInput {
  projectName: string;
  forms: any[];  // FormInfo or v3 form format
  routes: any[];  // RouteInfo or v3 route format
  apis: any[];    // APICall or v3 API format
  components: string[];
  navigationPoints: any[];
  behaviors?: Array<{  // v3 behavior catalog
    tag: string;
    description: string;
    count: number;
  }>;
  rawFlowsCount: number;  // How many permutations DSA found
}

export interface AITestSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  testCases: AITestCase[];
}

export interface AITestCase {
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'validation' | 'error-handling' | 'edge-case' | 'security';
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: AITestStep[];
}

export interface AITestStep {
  action: 'navigate' | 'click' | 'fill' | 'select' | 'check' | 'verify' | 'wait' | 'assert';
  target: string;
  value?: string;
  description: string;
  selector?: string;
}

export interface AISynthesisResult {
  success: boolean;
  suites: AITestSuite[];
  summary: {
    totalSuites: number;
    totalCases: number;
    totalSteps: number;
    reductionRatio: number;  // How much we reduced from raw flows
  };
  aiModel: string;
  processingTime: number;
}

@Injectable()
export class AISynthesizerService {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private provider: 'anthropic' | 'openai' | 'none' = 'none';
  
  constructor() {
    // Try Anthropic first, then OpenAI
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
      this.provider = 'anthropic';
      console.log('✅ AI Synthesizer initialized with Anthropic Claude');
    } else if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.provider = 'openai';
      console.log('✅ AI Synthesizer initialized with OpenAI GPT-4');
    } else {
      console.warn('⚠️ No AI API key set - will use rule-based fallback');
    }
  }
  
  /**
   * Main entry point: Transform raw DSA data into meaningful test suites
   * @param input - DSA analysis data (forms, routes, APIs, etc.)
   * @param v3Context - Optional rich context from v3 discovery orchestrator
   */
  async synthesizeTestSuites(input: DSAInput, v3Context?: string): Promise<AISynthesisResult> {
    const startTime = Date.now();
    
    console.log(`🤖 AI Synthesis starting for ${input.projectName}...`);
    console.log(`   - ${input.forms.length} forms`);
    console.log(`   - ${input.routes.length} routes`);
    console.log(`   - ${input.apis.length} APIs`);
    if (input.behaviors?.length) {
      console.log(`   - ${input.behaviors.length} behavior patterns`);
    }
    console.log(`   - ${input.rawFlowsCount} raw flows to deduplicate`);
    if (v3Context) {
      console.log(`   - Using v3 enriched context (${(v3Context.length / 1024).toFixed(1)}KB)`);
    }
    
    try {
      if (this.provider === 'none') {
        console.log('⚠️ No API key, using rule-based fallback...');
        return this.fallbackSynthesis(input, startTime);
      }
      
      const suites = this.provider === 'openai' 
        ? await this.callOpenAI(input, v3Context)
        : await this.callClaude(input, v3Context);
      
      const processingTime = Date.now() - startTime;
      
      const totalCases = suites.reduce((sum, s) => sum + s.testCases.length, 0);
      const totalSteps = suites.reduce((sum, s) => 
        sum + s.testCases.reduce((cs, c) => cs + c.steps.length, 0), 0
      );
      
      const modelName = this.provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514';
      console.log(`✅ AI Synthesis complete: ${suites.length} suites, ${totalCases} cases (reduced from ${input.rawFlowsCount} flows)`);
      
      return {
        success: true,
        suites,
        summary: {
          totalSuites: suites.length,
          totalCases,
          totalSteps,
          reductionRatio: input.rawFlowsCount > 0 ? input.rawFlowsCount / totalCases : 1
        },
        aiModel: modelName,
        processingTime
      };
    } catch (error) {
      console.error('❌ AI Synthesis failed:', error);
      return this.fallbackSynthesis(input, startTime);
    }
  }
  
  /**
   * Call Claude to synthesize test suites
   */
  private async callClaude(input: DSAInput, v3Context?: string): Promise<AITestSuite[]> {
    const prompt = this.buildPrompt(input, v3Context);
    
    const response = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    return this.parseJSONResponse(content.text);
  }
  
  /**
   * Call OpenAI GPT-4 to synthesize test suites
   */
  private async callOpenAI(input: DSAInput, v3Context?: string): Promise<AITestSuite[]> {
    const prompt = this.buildPrompt(input, v3Context);
    
    console.log('📤 Sending request to OpenAI GPT-4o...');
    
    const response = await this.openai!.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 16000,
      messages: [
        {
          role: 'system',
          content: `You are a QA test architect focused on 100% ROUTE COVERAGE. Output a JSON object: {"suites": [...]}

CRITICAL RULES:
1. EVERY route in the context MUST appear in at least one test "navigate" step
2. Generate AT LEAST 2-3 test cases per suite
3. NEVER invent data-testid selectors - use input[name="fieldName"] for form fields
4. ALWAYS use button[type="submit"] for submit buttons
5. For dynamic routes like /product/[slug], use /product/example-product
6. Include: happy-path, validation, security, AND navigation tests
7. Protected routes need BOTH authenticated AND unauthenticated access tests
8. Each suite must have "entities" array listing related entities

Selector Rules:
- Form fields: input[name="email"], input[name="password"], etc.
- Submit buttons: button[type="submit"]
- Links: a[href="/path"]
- Text buttons: button:has-text("Button Text")

Output: {"suites": [{id, name, description, category, priority, tags, entities, testCases: [{id, name, description, type, priority, steps: [{action, target, selector, value, description}]}]}]}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    console.log('📥 OpenAI response received, parsing...');
    console.log('   Response preview:', content.substring(0, 200) + '...');
    
    // GPT with json_object mode returns JSON directly
    const parsed = JSON.parse(content);
    
    // Handle various response formats
    let suites: AITestSuite[] = [];
    if (Array.isArray(parsed)) {
      suites = parsed;
    } else if (parsed.suites && Array.isArray(parsed.suites)) {
      suites = parsed.suites;
    } else if (parsed.testSuites && Array.isArray(parsed.testSuites)) {
      suites = parsed.testSuites;
    } else {
      console.warn('⚠️ Unexpected response format from OpenAI:', Object.keys(parsed));
      // Try to find any array in the response
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
          console.log(`   Found array at key "${key}" with ${parsed[key].length} items`);
          suites = parsed[key];
          break;
        }
      }
    }
    
    console.log(`✅ Parsed ${suites.length} suites from OpenAI response`);
    return suites;
  }
  
  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  private parseJSONResponse(text: string): AITestSuite[] {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to parse the whole response as JSON
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : (parsed.suites || []);
    } catch {
      throw new Error('Could not parse AI response as JSON');
    }
  }
  
  /**
   * Build the prompt for Claude/OpenAI
   */
  private buildPrompt(input: DSAInput, v3Context?: string): string {
    // If we have v3 context, use a richer prompt
    if (v3Context) {
      return this.buildV3Prompt(input, v3Context);
    }
    
    // Legacy prompt for non-v3 mode
    return `You are a QA test architect. Analyze this application structure and generate meaningful, deduplicated test suites.

## Application: ${input.projectName}

## Discovered Forms:
${JSON.stringify(input.forms.map(f => ({
  route: f.onSubmitRoute,
  fields: f.fields?.map(field => ({
    name: field.name,
    type: field.type,
    required: field.required,
    validation: field.validation
  })) || [],
  submitButton: f.submitButton,
  validations: f.validations || []
})), null, 2)}

## Routes:
${JSON.stringify(input.routes.map(r => ({
  path: r.path,
  component: r.component,
  isProtected: r.isProtected,
  params: r.params
})), null, 2)}

## API Endpoints:
${JSON.stringify(input.apis.map(a => ({
  method: a.method,
  endpoint: a.endpoint || a.path,
  usedIn: a.usedIn || a.usedBy
})), null, 2)}

## Navigation Points:
${JSON.stringify(input.navigationPoints, null, 2)}

## Task:
Generate test suites that:
1. Group tests by FEATURE/INTENT, not by navigation path
2. Each form should have ONE happy path + validation/error scenarios
3. Use meaningful test names that describe WHAT is being tested
4. Eliminate redundant navigation - tests should start at the target page
5. Include realistic test steps with proper selectors

## Rules:
- Do NOT generate multiple tests for the same form with different navigation paths
- Authentication forms (login/signup) are CRITICAL priority
- CRUD operations should have Create, Read, Update, Delete scenarios
- Each test case should have 3-10 steps maximum
- Use data-testid or semantic selectors when possible

## Output Format:
Return ONLY a JSON array of test suites (no explanation):

\`\`\`json
[
  {
    "id": "suite-1",
    "name": "User Authentication",
    "description": "Tests for login, registration, and session management",
    "category": "authentication",
    "priority": "critical",
    "tags": ["auth", "security", "login", "signup"],
    "testCases": [
      {
        "id": "tc-1-1",
        "name": "Successful login with valid credentials",
        "description": "Verify user can login with correct email and password",
        "type": "happy-path",
        "priority": "critical",
        "steps": [
          {
            "action": "navigate",
            "target": "/signin",
            "description": "Go to login page"
          },
          {
            "action": "fill",
            "target": "username",
            "value": "{{validUsername}}",
            "description": "Enter username",
            "selector": "[data-test=signin-username]"
          },
          {
            "action": "fill",
            "target": "password",
            "value": "{{validPassword}}",
            "description": "Enter password",
            "selector": "[data-test=signin-password]"
          },
          {
            "action": "click",
            "target": "submit",
            "description": "Click sign in button",
            "selector": "[data-test=signin-submit]"
          },
          {
            "action": "verify",
            "target": "dashboard",
            "description": "Verify redirected to dashboard"
          }
        ]
      },
      {
        "id": "tc-1-2",
        "name": "Login fails with invalid password",
        "description": "Verify error message when password is incorrect",
        "type": "validation",
        "priority": "high",
        "steps": [...]
      }
    ]
  }
]
\`\`\``;
  }
  
  /**
   * Build prompt with rich v3 context - STRICT QUALITY ENFORCEMENT
   */
  private buildV3Prompt(input: DSAInput, v3Context: string): string {
    // Group routes by domain/feature
    const routesByDomain = this.groupRoutesByDomain(input.routes);
    
    // Extract forms with COMPLETE field info including selectors
    const formsWithRoutes = input.forms.map(f => {
      const fields = f.fields?.slice(0, 15).map(field => {
        const fieldName = field.name;
        const fieldType = field.type || 'text';
        // Generate reliable selector based on field type
        let selector = field.selector;
        if (!selector || selector === 'null') {
          if (fieldType === 'select' || fieldName.includes('category') || fieldName.includes('select')) {
            selector = `select[name="${fieldName}"]`;
          } else if (fieldType === 'textarea' || fieldName.includes('description') || fieldName.includes('content')) {
            selector = `textarea[name="${fieldName}"]`;
          } else {
            selector = `input[name="${fieldName}"]`;
          }
        }
        return {
          name: fieldName,
          type: fieldType,
          required: field.required ?? field.isRequired ?? false,
          selector: selector,
          label: field.label || fieldName,
          testValue: this.generateTestValue(fieldName, fieldType)
        };
      }) || [];
      
      return {
        name: f.name,
        route: (f as any).route || null,
        component: f.component || f.componentName,
        fields,
        submitButton: f.submitButton?.selector || 'button[type="submit"]',
        submitText: f.submitButton?.text || 'Submit',
        hasValidation: f.hasValidation ?? f.hasClientValidation ?? false,
        testData: (f as any).testData || null
      };
    });
    
    // Build per-route context with forms
    const routeContexts = Object.entries(routesByDomain).map(([domain, routes]) => {
      const domainForms = formsWithRoutes.filter(f => 
        routes.some(r => f.route === r.path) || 
        f.component?.toLowerCase().includes(domain.toLowerCase().replace(/s$/, ''))
      );
      
      return {
        domain,
        routes: routes.map(r => ({
          path: r.path,
          isDynamic: r.isDynamic,
          isProtected: r.isProtected,
          example: r.example,
          type: this.inferRouteType(r.path)
        })),
        forms: domainForms,
        suggestedTests: this.suggestTestsForDomain(domain, routes, domainForms)
      };
    });

    return `You are a senior QA automation engineer. Generate COMPLETE, RUNNABLE E2E test suites.

## STRICT STEP REQUIREMENTS - VIOLATIONS WILL BE REJECTED

### EVERY step MUST follow this exact schema:
\`\`\`typescript
interface TestStep {
  action: 'navigate' | 'fill' | 'click' | 'verify' | 'select' | 'wait';
  target: string;      // Route path OR element description
  selector: string;    // REQUIRED for fill, click, select. CSS selector.
  value: string | null; // REQUIRED for fill. Test value to enter.
  description: string; // What this step does
}
\`\`\`

### MANDATORY SELECTOR RULES:
1. **fill** action: selector MUST be \`input[name="fieldName"]\` or \`textarea[name="fieldName"]\`
2. **click** action: selector MUST be one of:
   - \`button[type="submit"]\` for form submit
   - \`button:has-text("Button Text")\` for action buttons  
   - \`a[href="/path"]\` for links
3. **select** action: selector MUST be \`select[name="fieldName"]\`
4. **verify** action: MUST have one of:
   - \`selector: "h1"\` + \`value: "Expected Text"\` for text verification
   - \`selector: ".success-toast"\` for success message
   - \`selector: ".error-message"\` for error verification
   - \`target: "url"\` + \`value: "/expected-path"\` for URL verification
5. **navigate** action: selector can be null, target is the URL

### FORBIDDEN:
- ❌ \`selector: null\` on fill, click, or select actions
- ❌ \`verify\` with only \`target: "page-load"\` - USELESS
- ❌ \`verify\` with \`target: "success-message"\` but no selector
- ❌ Made-up \`data-testid\` selectors that don't exist

## APPLICATION CONTEXT

${this.formatRouteContexts(routeContexts)}

## COMPLETE EXAMPLE - Authentication Suite
\`\`\`json
{
  "id": "suite-authentication",
  "name": "Authentication",
  "description": "User authentication workflows",
  "category": "authentication",
  "priority": "critical",
  "tags": ["auth", "login", "security"],
  "testCases": [
    {
      "id": "tc-auth-1",
      "name": "Successful login",
      "description": "User logs in with valid credentials",
      "type": "happy-path",
      "priority": "critical",
      "steps": [
        { "action": "navigate", "target": "/sign-in", "selector": null, "value": null, "description": "Go to login page" },
        { "action": "fill", "target": "email", "selector": "input[name=\\"email\\"]", "value": "user@example.com", "description": "Enter email" },
        { "action": "fill", "target": "password", "selector": "input[name=\\"password\\"]", "value": "password123", "description": "Enter password" },
        { "action": "click", "target": "submit", "selector": "button[type=\\"submit\\"]", "value": null, "description": "Submit login form" },
        { "action": "verify", "target": "url", "selector": null, "value": "/", "description": "Verify redirected to home" }
      ],
      "estimatedDuration": 15
    },
    {
      "id": "tc-auth-2",
      "name": "Login validation - empty email",
      "description": "Show error when email is empty",
      "type": "validation",
      "priority": "high",
      "steps": [
        { "action": "navigate", "target": "/sign-in", "selector": null, "value": null, "description": "Go to login page" },
        { "action": "fill", "target": "password", "selector": "input[name=\\"password\\"]", "value": "password123", "description": "Enter password only" },
        { "action": "click", "target": "submit", "selector": "button[type=\\"submit\\"]", "value": null, "description": "Submit form" },
        { "action": "verify", "target": "error", "selector": ".text-red-600, .error-message, [role=\\"alert\\"]", "value": null, "description": "Verify error message shown" }
      ],
      "estimatedDuration": 10
    },
    {
      "id": "tc-auth-3",
      "name": "Protected route redirect",
      "description": "Unauthenticated user is redirected to login",
      "type": "security",
      "priority": "critical",
      "steps": [
        { "action": "navigate", "target": "/dashboard", "selector": null, "value": null, "description": "Try to access protected route" },
        { "action": "verify", "target": "url", "selector": null, "value": "/sign-in", "description": "Verify redirected to login" }
      ],
      "estimatedDuration": 5
    }
  ],
  "coverage": {
    "routes": ["/sign-in", "/dashboard"],
    "forms": ["Login Form"],
    "entities": ["User"]
  }
}
\`\`\`

## COMPLETE EXAMPLE - Dashboard CRUD Suite
\`\`\`json
{
  "id": "suite-categories",
  "name": "Category Management",
  "description": "CRUD operations for categories",
  "category": "categories",
  "priority": "high",
  "tags": ["crud", "admin", "categories"],
  "testCases": [
    {
      "id": "tc-cat-1",
      "name": "Create new category",
      "description": "Admin creates a new product category",
      "type": "happy-path",
      "priority": "high",
      "steps": [
        { "action": "navigate", "target": "/dashboard/categories", "selector": null, "value": null, "description": "Go to categories page" },
        { "action": "click", "target": "add-button", "selector": "button:has-text('Add Category')", "value": null, "description": "Click Add Category button" },
        { "action": "verify", "target": "modal", "selector": ".fixed.inset-0, [role=\\"dialog\\"]", "value": null, "description": "Verify modal opened" },
        { "action": "fill", "target": "name", "selector": "input[name=\\"name\\"]", "value": "Electronics", "description": "Enter category name" },
        { "action": "fill", "target": "description", "selector": "textarea[name=\\"description\\"]", "value": "Electronic devices and gadgets", "description": "Enter description" },
        { "action": "click", "target": "submit", "selector": "button:has-text('Create')", "value": null, "description": "Submit form" },
        { "action": "verify", "target": "success", "selector": ".toast-success, .bg-green-50, [role=\\"status\\"]", "value": null, "description": "Verify success message" }
      ],
      "estimatedDuration": 20
    },
    {
      "id": "tc-cat-2",
      "name": "View categories list",
      "description": "View all categories in table",
      "type": "happy-path",
      "priority": "medium",
      "steps": [
        { "action": "navigate", "target": "/dashboard/categories", "selector": null, "value": null, "description": "Go to categories page" },
        { "action": "verify", "target": "table", "selector": "table, .rounded-xl", "value": null, "description": "Verify categories table displayed" },
        { "action": "verify", "target": "header", "selector": "h1", "value": "Categories", "description": "Verify page title" }
      ],
      "estimatedDuration": 10
    },
    {
      "id": "tc-cat-3",
      "name": "Delete category",
      "description": "Admin deletes a category",
      "type": "happy-path",
      "priority": "medium",
      "steps": [
        { "action": "navigate", "target": "/dashboard/categories", "selector": null, "value": null, "description": "Go to categories page" },
        { "action": "click", "target": "delete-button", "selector": "button.text-red-500, button:has-text('Delete')", "value": null, "description": "Click delete on first category" },
        { "action": "verify", "target": "confirm-modal", "selector": ".fixed.inset-0, [role=\\"alertdialog\\"]", "value": null, "description": "Verify confirmation modal" },
        { "action": "click", "target": "confirm", "selector": "button:has-text('Confirm'), button:has-text('Delete')", "value": null, "description": "Confirm deletion" },
        { "action": "verify", "target": "success", "selector": ".toast-success, .bg-green-50", "value": null, "description": "Verify deletion success" }
      ],
      "estimatedDuration": 15
    }
  ],
  "coverage": {
    "routes": ["/dashboard/categories"],
    "forms": ["Category Form"],
    "entities": ["Category"]
  }
}
\`\`\`

## MANDATORY ROUTE COVERAGE - ALL ROUTES MUST BE TESTED

${this.buildRouteCoverageChecklist(input.routes)}

## OUTPUT REQUIREMENTS
1. Generate test suites for ALL domains: ${Object.keys(routesByDomain).join(', ')}
2. **CRITICAL**: EVERY route in the checklist above MUST appear in at least one test's navigate step
3. EVERY form must have happy-path AND validation tests
4. EVERY step must have valid selector (except navigate)
5. Use realistic test values, not "test" or "example"
6. If a route has no forms, create at least a navigation + page verification test

## OUTPUT FORMAT
Respond with ONLY a JSON array of test suites. No markdown, no explanation.

[{...}, {...}, ...]`;
  }
  
  /**
   * Build explicit route checklist for AI prompt
   */
  private buildRouteCoverageChecklist(routes: any[]): string {
    const lines: string[] = ['The following routes MUST each have at least one test:', ''];
    
    for (const route of routes) {
      const path = route.path;
      const example = route.isDynamic ? this.generateExampleRoute(path, route.params) : path;
      const protection = route.isProtected ? ' [PROTECTED - requires auth]' : '';
      const dynamic = route.isDynamic ? ` (test with: ${example})` : '';
      
      lines.push(`- [ ] ${path}${dynamic}${protection}`);
    }
    
    lines.push('');
    lines.push('⚠️ DO NOT skip any route. Each checkbox above must be covered by a test.');
    
    return lines.join('\n');
  }
  
  /**
   * Generate example route from dynamic pattern
   */
  private generateExampleRoute(pattern: string, params?: string[]): string {
    let example = pattern;
    
    // Replace [param] patterns with example values
    const replacements: Record<string, string> = {
      'id': '123',
      'slug': 'example-item',
      'productId': 'prod-123',
      'userId': 'user-123',
      'orderId': 'order-123',
      'token': 'abc123token',
      'category': 'electronics',
    };
    
    if (params) {
      for (const param of params) {
        const value = replacements[param] || `test-${param}`;
        example = example.replace(`[${param}]`, value);
      }
    }
    
    // Handle any remaining [xxx] patterns
    example = example.replace(/\[([^\]]+)\]/g, (_, p) => replacements[p] || `test-${p}`);
    
    return example;
  }
  
  /**
   * Group routes by domain/feature - GENERIC algorithm based on route structure
   * No hardcoded patterns - learns from route paths
   */
  private groupRoutesByDomain(routes: any[]): Record<string, Array<any & { example?: string }>> {
    const domains: Record<string, Array<any & { example?: string }>> = {};
    
    for (const route of routes) {
      const path = route.path;
      const domain = this.inferDomainFromPath(path);
      
      if (!domains[domain]) {
        domains[domain] = [];
      }
      
      const routeWithExample: any & { example?: string } = { ...route };
      if (route.isDynamic) {
        routeWithExample.example = this.generateExampleRoute(route.path, route.params);
      }
      
      domains[domain].push(routeWithExample);
    }
    
    // DON'T merge domains - keep them separate for better coverage
    // Only consolidate truly tiny domains (0-1 routes) into their logical parent
    const consolidatedDomains: Record<string, Array<any & { example?: string }>> = {};
    
    // First pass: identify parent domains
    const parentDomains = new Set<string>();
    for (const domain of Object.keys(domains)) {
      // A parent domain is one that has child domains (e.g., "Dashboard" has "Dashboard-Products")
      const isParent = Object.keys(domains).some(d => d !== domain && d.startsWith(domain + '-'));
      if (isParent) parentDomains.add(domain);
    }
    
    // Second pass: consolidate only orphan single routes
    for (const [domain, domainRoutes] of Object.entries(domains)) {
      // Keep Authentication, Home, and any domain with 2+ routes as-is
      if (domain === 'Authentication' || domain === 'Home' || domainRoutes.length >= 2) {
        consolidatedDomains[domain] = domainRoutes;
        continue;
      }
      
      // For single-route domains, check if there's a logical parent
      const dashIndex = domain.lastIndexOf('-');
      if (dashIndex > 0) {
        // This is a child domain like "Dashboard-Inventory"
        const parent = domain.substring(0, dashIndex);
        if (domains[parent] || consolidatedDomains[parent]) {
          // Merge into parent
          const targetDomain = consolidatedDomains[parent] ? parent : domain;
          if (!consolidatedDomains[targetDomain]) {
            consolidatedDomains[targetDomain] = [];
          }
          if (targetDomain === parent) {
            consolidatedDomains[parent].push(...domainRoutes);
          } else {
            consolidatedDomains[domain] = domainRoutes;
          }
          continue;
        }
      }
      
      // Keep as separate domain
      consolidatedDomains[domain] = domainRoutes;
    }
    
    return consolidatedDomains;
  }
  
  /**
   * Infer domain from route path - GENERIC algorithm
   */
  private inferDomainFromPath(path: string): string {
    // Home page
    if (path === '/' || path === '') {
      return 'Home';
    }
    
    // Split path into segments
    const segments = path.split('/').filter(s => s && !s.startsWith('['));
    
    if (segments.length === 0) {
      return 'Home';
    }
    
    const firstSegment = segments[0].toLowerCase();
    const secondSegment = segments.length > 1 ? segments[1].toLowerCase() : null;
    
    // Authentication patterns (generic detection)
    const authPatterns = ['sign-in', 'signin', 'sign-up', 'signup', 'login', 'logout', 
                          'register', 'password', 'auth', 'forgot', 'reset-password'];
    if (authPatterns.some(p => firstSegment.includes(p) || path.includes(p))) {
      return 'Authentication';
    }
    
    // Nested routes under a parent (e.g., /dashboard/products, /admin/users)
    const adminPatterns = ['dashboard', 'admin', 'manage', 'cms', 'backoffice', 'panel'];
    if (adminPatterns.includes(firstSegment) && secondSegment) {
      // Return parent-child format: "Dashboard-Products"
      const parentName = this.capitalizeFirst(firstSegment);
      const childName = this.capitalizeFirst(secondSegment);
      return `${parentName}-${childName}`;
    }
    
    // Admin/dashboard root
    if (adminPatterns.includes(firstSegment)) {
      return this.capitalizeFirst(firstSegment);
    }
    
    // Regular top-level routes become their own domain
    return this.capitalizeFirst(firstSegment);
  }
  
  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    if (!str) return str;
    // Handle kebab-case: "sign-in" -> "SignIn"
    return str.split('-').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
  }
  
  /**
   * Format route contexts for AI prompt
   */
  private formatRouteContexts(routeContexts: any[]): string {
    return routeContexts.map(ctx => {
      const routesStr = ctx.routes.map((r: any) => {
        let str = r.path;
        if (r.isDynamic) str += ` (use: ${r.example})`;
        if (r.isProtected) str += ' [PROTECTED]';
        return str;
      }).join(', ');
      
      let formsStr = 'No forms';
      if (ctx.forms.length > 0) {
        formsStr = ctx.forms.map((f: any) => {
          const fieldsStr = f.fields.map((field: any) => `${field.name} [${field.selector}]`).join(', ');
          return `- ${f.name} (on ${f.route || 'modal'})\n  Fields: ${fieldsStr}\n  Submit: ${f.submitButton}`;
        }).join('\n');
      }
      
      const testsStr = ctx.suggestedTests.map((t: string) => `- ${t}`).join('\n');
      
      return `
### ${ctx.domain} Domain
**Routes:** ${routesStr}

**Forms:**
${formsStr}

**Required Tests:**
${testsStr}`;
    }).join('\n');
  }
  
  /**
   * Generate realistic test value based on field name and type
   */
  private generateTestValue(fieldName: string, fieldType: string): string {
    const name = fieldName.toLowerCase();
    
    // Email fields
    if (name.includes('email')) return 'john.doe@example.com';
    
    // Password fields
    if (name.includes('password') || name.includes('pwd')) return 'SecurePass123!';
    
    // Name fields
    if (name === 'name' || name.includes('firstname') || name.includes('first_name')) return 'John';
    if (name.includes('lastname') || name.includes('last_name')) return 'Doe';
    if (name.includes('username')) return 'johndoe';
    if (name.includes('fullname') || name.includes('full_name')) return 'John Doe';
    
    // Contact fields
    if (name.includes('phone') || name.includes('tel')) return '+1-555-123-4567';
    if (name.includes('address')) return '123 Main Street';
    if (name.includes('city')) return 'New York';
    if (name.includes('zip') || name.includes('postal')) return '10001';
    if (name.includes('country')) return 'United States';
    
    // Business fields
    if (name.includes('title')) return 'Product Title';
    if (name.includes('description') || name.includes('content') || name.includes('bio')) return 'This is a detailed description with relevant content.';
    if (name.includes('price') || name.includes('amount') || name.includes('cost')) return '99.99';
    if (name.includes('quantity') || name.includes('count') || name.includes('stock')) return '100';
    if (name.includes('sku') || name.includes('code')) return 'SKU-001-ABC';
    if (name.includes('category')) return 'electronics';
    if (name.includes('url') || name.includes('website') || name.includes('link')) return 'https://example.com';
    
    // Date/time fields
    if (fieldType === 'date' || name.includes('date')) return '2024-01-15';
    if (fieldType === 'time' || name.includes('time')) return '14:30';
    if (name.includes('year')) return '2024';
    
    // Numeric fields
    if (fieldType === 'number') return '42';
    
    // Textarea fields
    if (fieldType === 'textarea') return 'This is sample text content for the textarea field.';
    
    // Default
    return 'Test Value';
  }
  
  /**
   * Infer route type from path
   */
  private inferRouteType(path: string): string {
    if (path.includes('sign-in') || path.includes('login')) return 'auth-login';
    if (path.includes('sign-up') || path.includes('register')) return 'auth-register';
    if (path.includes('password')) return 'auth-password';
    if (path.includes('dashboard') && !path.includes('/dashboard/')) return 'dashboard-home';
    if (path.match(/\/dashboard\/[a-z]+$/i)) return 'list-page';
    if (path.match(/\/dashboard\/[a-z]+\/\[/i)) return 'detail-page';
    if (path.includes('/product/') || path.includes('/products/')) return 'product-detail';
    if (path.includes('cart')) return 'cart';
    if (path.includes('checkout')) return 'checkout';
    if (path.includes('order')) return 'order';
    if (path.includes('profile')) return 'profile';
    if (path.includes('settings')) return 'settings';
    if (path === '/' || path === '') return 'home';
    return 'page';
  }
  
  /**
   * Suggest tests for a domain based on routes and forms
   */
  private suggestTestsForDomain(domain: string, routes: any[], forms: any[]): string[] {
    const suggestions: string[] = [];
    const domainLower = domain.toLowerCase();
    
    // Authentication domain
    if (domainLower === 'authentication') {
      suggestions.push('Successful login with valid credentials');
      suggestions.push('Login validation - show error for invalid email');
      suggestions.push('Login validation - show error for wrong password');
      suggestions.push('Successful registration with valid data');
      suggestions.push('Registration validation - required fields');
      suggestions.push('Password reset request');
      suggestions.push('Protected route redirect to login');
      return suggestions;
    }
    
    // Check for CRUD patterns
    const hasListRoute = routes.some(r => r.path.match(/\/dashboard\/[a-z]+$/i));
    const hasDetailRoute = routes.some(r => r.path.includes('['));
    const hasForms = forms.length > 0;
    
    // List/index page
    if (hasListRoute) {
      suggestions.push(`View ${domain.toLowerCase()} list`);
    }
    
    // Detail page
    if (hasDetailRoute) {
      suggestions.push(`View ${domain.toLowerCase().replace(/s$/, '')} details`);
    }
    
    // Create operation
    if (hasForms) {
      suggestions.push(`Create new ${domain.toLowerCase().replace(/s$/, '')}`);
      suggestions.push(`Create ${domain.toLowerCase().replace(/s$/, '')} - validation errors`);
    }
    
    // Update operation (if we have detail route + forms)
    if (hasDetailRoute && hasForms) {
      suggestions.push(`Edit ${domain.toLowerCase().replace(/s$/, '')}`);
    }
    
    // Delete operation
    if (hasListRoute) {
      suggestions.push(`Delete ${domain.toLowerCase().replace(/s$/, '')}`);
    }
    
    // Cart specific
    if (domainLower === 'cart') {
      suggestions.push('View cart with items');
      suggestions.push('Update item quantity');
      suggestions.push('Remove item from cart');
      suggestions.push('Empty cart state');
      suggestions.push('Proceed to checkout');
    }
    
    // Orders specific
    if (domainLower === 'orders') {
      suggestions.push('View all orders');
      suggestions.push('View order details');
      suggestions.push('Order status tracking');
    }
    
    // Shop specific
    if (domainLower === 'shop') {
      suggestions.push('Browse products');
      suggestions.push('Filter products by category');
      suggestions.push('Search products');
      suggestions.push('View product details');
      suggestions.push('Add product to cart');
    }
    
    // If no specific suggestions, add generic ones
    if (suggestions.length === 0) {
      for (const route of routes) {
        suggestions.push(`Navigate to ${route.path}`);
      }
    }
    
    return suggestions;
  }
  
  /**
   * Fallback when AI is not available - rule-based synthesis
   */
  private fallbackSynthesis(input: DSAInput, startTime: number): AISynthesisResult {
    const suites: AITestSuite[] = [];
    
    // Group forms by type/purpose
    const authForms = input.forms.filter(f => 
      f.fields.some(field => 
        ['password', 'email', 'username', 'login', 'signin', 'signup'].some(k => 
          field.name.toLowerCase().includes(k)
        )
      )
    );
    
    const otherForms = input.forms.filter(f => !authForms.includes(f));
    
    // Generate authentication suite
    if (authForms.length > 0) {
      suites.push(this.generateAuthSuite(authForms));
    }
    
    // Generate form-based suites for other forms
    for (const form of otherForms) {
      suites.push(this.generateFormSuite(form, suites.length + 1));
    }
    
    // Generate navigation suite if we have routes
    if (input.routes.length > 0) {
      suites.push(this.generateNavigationSuite(input.routes, suites.length + 1));
    }
    
    const processingTime = Date.now() - startTime;
    const totalCases = suites.reduce((sum, s) => sum + s.testCases.length, 0);
    const totalSteps = suites.reduce((sum, s) => 
      sum + s.testCases.reduce((cs, c) => cs + c.steps.length, 0), 0
    );
    
    return {
      success: true,
      suites,
      summary: {
        totalSuites: suites.length,
        totalCases,
        totalSteps,
        reductionRatio: input.rawFlowsCount > 0 ? input.rawFlowsCount / totalCases : 1
      },
      aiModel: 'rule-based-fallback',
      processingTime
    };
  }
  
  /**
   * Generate authentication test suite
   */
  private generateAuthSuite(authForms: FormInfo[]): AITestSuite {
    const testCases: AITestCase[] = [];
    let caseIndex = 1;
    
    for (const form of authForms) {
      const isSignup = form.fields.some(f => 
        ['firstname', 'lastname', 'confirmpassword', 'confirm_password'].some(k =>
          f.name.toLowerCase().includes(k) || f.name.toLowerCase().replace(/[-_]/g, '').includes(k)
        )
      );
      
      const formType = isSignup ? 'Registration' : 'Login';
      
      // Happy path
      testCases.push({
        id: `tc-auth-${caseIndex++}`,
        name: `Successful ${formType.toLowerCase()} with valid credentials`,
        description: `Verify user can ${formType.toLowerCase()} with correct data`,
        type: 'happy-path',
        priority: 'critical',
        steps: this.generateFormSteps(form, true)
      });
      
      // Validation errors
      for (const field of form.fields.filter(f => f.required)) {
        testCases.push({
          id: `tc-auth-${caseIndex++}`,
          name: `${formType} fails when ${field.name} is empty`,
          description: `Verify error when required field ${field.name} is not filled`,
          type: 'validation',
          priority: 'high',
          steps: this.generateValidationSteps(form, field.name)
        });
      }
      
      // Email format validation
      const emailField = form.fields.find(f => f.type === 'email' || f.name.toLowerCase().includes('email'));
      if (emailField) {
        testCases.push({
          id: `tc-auth-${caseIndex++}`,
          name: `${formType} fails with invalid email format`,
          description: 'Verify error message for malformed email',
          type: 'validation',
          priority: 'high',
          steps: this.generateInvalidEmailSteps(form, emailField.name)
        });
      }
    }
    
    return {
      id: 'suite-auth',
      name: 'User Authentication',
      description: 'Tests for login, registration, and session management',
      category: 'authentication',
      priority: 'critical',
      tags: ['auth', 'security', 'login', 'signup'],
      testCases
    };
  }
  
  /**
   * Generate form-based test suite
   */
  private generateFormSuite(form: FormInfo, index: number): AITestSuite {
    const formName = this.inferFormName(form);
    const testCases: AITestCase[] = [];
    let caseIndex = 1;
    
    // Happy path
    testCases.push({
      id: `tc-${index}-${caseIndex++}`,
      name: `Successfully submit ${formName}`,
      description: `Verify ${formName} form submits with valid data`,
      type: 'happy-path',
      priority: 'high',
      steps: this.generateFormSteps(form, true)
    });
    
    // Required field validations
    for (const field of form.fields.filter(f => f.required).slice(0, 3)) {
      testCases.push({
        id: `tc-${index}-${caseIndex++}`,
        name: `${formName} fails when ${field.name} is empty`,
        description: `Verify validation error for required field ${field.name}`,
        type: 'validation',
        priority: 'medium',
        steps: this.generateValidationSteps(form, field.name)
      });
    }
    
    return {
      id: `suite-${index}`,
      name: formName,
      description: `Tests for ${formName} functionality`,
      category: this.inferCategory(form),
      priority: 'high',
      tags: this.extractFormTags(form),
      testCases
    };
  }
  
  /**
   * Generate navigation test suite
   */
  private generateNavigationSuite(routes: RouteInfo[], index: number): AITestSuite {
    const testCases: AITestCase[] = [];
    let caseIndex = 1;
    
    // Test protected routes redirect to login
    const protectedRoutes = routes.filter(r => r.isProtected).slice(0, 5);
    for (const route of protectedRoutes) {
      testCases.push({
        id: `tc-${index}-${caseIndex++}`,
        name: `Protected route ${route.path} redirects to login`,
        description: `Verify unauthenticated users are redirected from ${route.path}`,
        type: 'security',
        priority: 'high',
        steps: [
          {
            action: 'navigate',
            target: route.path,
            description: `Navigate to protected route ${route.path}`
          },
          {
            action: 'verify',
            target: '/signin',
            description: 'Verify redirected to login page'
          }
        ]
      });
    }
    
    // Test public routes are accessible
    const publicRoutes = routes.filter(r => !r.isProtected).slice(0, 5);
    for (const route of publicRoutes) {
      testCases.push({
        id: `tc-${index}-${caseIndex++}`,
        name: `Public route ${route.path} is accessible`,
        description: `Verify ${route.path} loads without authentication`,
        type: 'happy-path',
        priority: 'medium',
        steps: [
          {
            action: 'navigate',
            target: route.path,
            description: `Navigate to ${route.path}`
          },
          {
            action: 'verify',
            target: route.component,
            description: `Verify ${route.component} component renders`
          }
        ]
      });
    }
    
    return {
      id: `suite-${index}`,
      name: 'Navigation & Routing',
      description: 'Tests for route access and navigation',
      category: 'navigation',
      priority: 'medium',
      tags: ['routing', 'navigation', 'access-control'],
      testCases
    };
  }
  
  // Helper methods
  
  private generateFormSteps(form: FormInfo, isValid: boolean): AITestStep[] {
    const steps: AITestStep[] = [];
    
    // Navigate to form
    if (form.onSubmitRoute) {
      steps.push({
        action: 'navigate',
        target: form.onSubmitRoute,
        description: `Go to ${form.onSubmitRoute}`
      });
    }
    
    // Fill fields
    for (const field of form.fields) {
      steps.push({
        action: 'fill',
        target: field.name,
        value: isValid ? `{{valid${this.capitalize(field.name)}}}` : '',
        description: `Enter ${field.label || field.name}`,
        selector: field.selector
      });
    }
    
    // Submit
    steps.push({
      action: 'click',
      target: 'submit',
      description: 'Submit form',
      selector: form.submitButton || '[type="submit"]'
    });
    
    // Verify success
    steps.push({
      action: 'verify',
      target: 'success',
      description: isValid ? 'Verify form submitted successfully' : 'Verify error message displayed'
    });
    
    return steps;
  }
  
  private generateValidationSteps(form: FormInfo, skipFieldName: string): AITestStep[] {
    const steps: AITestStep[] = [];
    
    // Navigate
    if (form.onSubmitRoute) {
      steps.push({
        action: 'navigate',
        target: form.onSubmitRoute,
        description: `Go to ${form.onSubmitRoute}`
      });
    }
    
    // Fill all fields except the one we're testing
    for (const field of form.fields) {
      if (field.name !== skipFieldName) {
        steps.push({
          action: 'fill',
          target: field.name,
          value: `{{valid${this.capitalize(field.name)}}}`,
          description: `Enter ${field.label || field.name}`,
          selector: field.selector
        });
      }
    }
    
    // Submit
    steps.push({
      action: 'click',
      target: 'submit',
      description: 'Submit form',
      selector: form.submitButton || '[type="submit"]'
    });
    
    // Verify error
    steps.push({
      action: 'verify',
      target: 'error',
      description: `Verify ${skipFieldName} required error is shown`
    });
    
    return steps;
  }
  
  private generateInvalidEmailSteps(form: FormInfo, emailFieldName: string): AITestStep[] {
    const steps: AITestStep[] = [];
    
    // Navigate
    if (form.onSubmitRoute) {
      steps.push({
        action: 'navigate',
        target: form.onSubmitRoute,
        description: `Go to ${form.onSubmitRoute}`
      });
    }
    
    // Fill all fields, but use invalid email
    for (const field of form.fields) {
      const value = field.name === emailFieldName 
        ? 'invalid-email' 
        : `{{valid${this.capitalize(field.name)}}}`;
      
      steps.push({
        action: 'fill',
        target: field.name,
        value,
        description: field.name === emailFieldName 
          ? 'Enter invalid email format'
          : `Enter ${field.label || field.name}`,
        selector: field.selector
      });
    }
    
    // Submit
    steps.push({
      action: 'click',
      target: 'submit',
      description: 'Submit form',
      selector: form.submitButton || '[type="submit"]'
    });
    
    // Verify error
    steps.push({
      action: 'verify',
      target: 'error',
      description: 'Verify invalid email error is shown'
    });
    
    return steps;
  }
  
  private inferFormName(form: FormInfo): string {
    // Try to infer from route
    if (form.onSubmitRoute) {
      const routePart = form.onSubmitRoute.split('/').filter(Boolean).pop() || '';
      if (routePart) {
        return this.capitalize(routePart.replace(/[-_]/g, ' '));
      }
    }
    
    // Try to infer from fields
    if (form.fields.some(f => f.name.toLowerCase().includes('password'))) {
      if (form.fields.some(f => f.name.toLowerCase().includes('confirm'))) {
        return 'Registration';
      }
      return 'Login';
    }
    
    // Try submit button text
    if (form.submitButton) {
      const buttonText = form.submitButton.replace(/[[\]"']/g, '').trim();
      if (buttonText.length > 0 && buttonText.length < 30) {
        return buttonText;
      }
    }
    
    return 'Form Submission';
  }
  
  private inferCategory(form: FormInfo): string {
    if (form.onSubmitRoute) {
      return form.onSubmitRoute.split('/').filter(Boolean)[0] || 'general';
    }
    return 'general';
  }
  
  private extractFormTags(form: FormInfo): string[] {
    const tags: string[] = ['form'];
    
    if (form.fields.some(f => f.required)) tags.push('validation');
    if (form.fields.some(f => f.type === 'email')) tags.push('email');
    if (form.fields.some(f => f.type === 'password')) tags.push('password');
    if (form.validations.length > 0) tags.push('rules');
    
    return tags;
  }
  
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
