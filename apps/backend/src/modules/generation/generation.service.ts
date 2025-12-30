import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AgentService } from './agent.service';
import { TestEnforcementService } from './test-enforcement.service';
import { RuntimeInspectorService } from './runtime-inspector.service';
import { AIProviderService } from '../../services/ai-provider.service';

@Injectable()
export class GenerationService {
  private client: OpenAI;

  constructor(
    private configService: ConfigService,
    private agentService: AgentService,
    private enforcementService: TestEnforcementService,
    private runtimeInspector: RuntimeInspectorService,
    private aiProvider: AIProviderService
  ) {
    // Log which AI provider is being used
    const providerInfo = this.aiProvider.getProviderInfo();
    console.log(`🤖 AI Provider: ${providerInfo.provider} (${providerInfo.model})`);
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.configService.get<string>('openai.apiKey');
      
      if (!apiKey) {
        console.warn('⚠️  OPENAI_API_KEY not set. Using mock responses.');
      }
      
      this.client = new OpenAI({
        apiKey: apiKey || 'sk-mock',
      });
    }
    return this.client;
  }

  async generateSuite({ input, url = '', outputTypes = [] }: { input: string; url?: string; outputTypes?: string[] }) {
    console.log(`🤖 Generation request received`);
    console.log(`📝 Input length: ${input.length} characters`);
    if (url) console.log(`🌐 URL: ${url}`);
    
    const apiKey = this.configService.get<string>('openai.apiKey');
    const hasValidKey = apiKey && apiKey !== 'sk-your-api-key-here';
    
    // If no API key, return mock data
    if (!hasValidKey) {
      console.log(`⚠️  Using mock mode (no valid OpenAI API key)`);
      const mockData = this.getMockSuite();
      return {
        ...mockData,
        _meta: {
          mode: 'mock',
          reason: 'no_api_key'
        }
      };
    }
    
    const model = this.configService.get<string>('openai.model') || 'gpt-3.5-turbo';
    console.log(`🔑 Using OpenAI API (${model})`);
    const startTime = Date.now();

    const prompt = this.buildPrompt(input, url, outputTypes);

    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are QAgent, an expert QA test generation assistant. Generate comprehensive test suites in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const elapsed = Date.now() - startTime;
      console.log(`✅ Generation completed in ${(elapsed / 1000).toFixed(2)}s`);
      console.log(`📊 Tokens used: ${response.usage?.total_tokens || 'N/A'}`);

      const result = JSON.parse(response.choices[0].message.content);
      return {
        ...result,
        _meta: {
          mode: 'openai',
          model: model,
          duration: elapsed / 1000,
          tokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('❌ OpenAI API error:', error.message);
      console.log('⚠️  Falling back to mock mode');
      const mockData = this.getMockSuite();
      return {
        ...mockData,
        _meta: {
          mode: 'mock',
          reason: 'openai_error',
          error: error.message
        }
      };
    }
  }

  // New method for VS Code extension: generate tests from code
  // Now supports both OpenAI and Claude via AIProviderService
  async generateTestsFromCode({ code, fileName, language }: { code: string; fileName: string; language: string }) {
    console.log(`🧪 Test generation request for ${fileName} (${language})`);
    console.log(`📝 Code length: ${code.length} characters`);
    
    // Check if AI provider is configured
    if (!this.aiProvider.isConfigured()) {
      console.log(`⚠️  Using mock mode (no AI provider configured)`);
      return {
        tests: this.getMockTests(language),
        _meta: {
          mode: 'mock',
          reason: 'no_api_key'
        }
      };
    }
    
    const providerInfo = this.aiProvider.getProviderInfo();
    console.log(`🔑 Using ${providerInfo.provider} (${providerInfo.model})`);
    const startTime = Date.now();

    const prompt = this.buildTestGenerationPrompt(code, fileName, language);

    try {
      // Use unified AI provider instead of direct OpenAI call
      const response = await this.aiProvider.createCompletion({
        messages: [
          {
            role: 'system',
            content: `You are QAgenAI, an expert test generation assistant. Generate comprehensive unit tests for the provided code. Output ONLY the test code, no explanations.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 4000,
      });

      const elapsed = Date.now() - startTime;
      console.log(`✅ Test generation completed in ${(elapsed / 1000).toFixed(2)}s`);
      console.log(`📊 Tokens used: ${response.usage.totalTokens}`);

      let generatedTests = response.content.trim();
      
      // Strip markdown code fences if present
      generatedTests = this.stripMarkdownFences(generatedTests);
      
      // ENFORCEMENT LAYER: Auto-correct generated tests based on detected framework
      const framework = this.detectFrameworkFromFileName(fileName, language);
      if (framework) {
        console.log(`🛡️  Applying enforcement for ${framework}...`);
        const enforcement = this.enforcementService.enforce(
          generatedTests,
          framework,
          fileName
        );
        
        if (enforcement.enforcementApplied) {
          console.log(`⚠️  ENFORCEMENT APPLIED:`, enforcement.violations);
          console.log(`   Original preview (first 150 chars):`, generatedTests.substring(0, 150));
          console.log(`   Corrected preview (first 150 chars):`, enforcement.correctedCode.substring(0, 150));
          generatedTests = enforcement.correctedCode;
        } else {
          console.log(`✅ Generated code already valid for ${framework}`);
        }
      }
      
      return {
        tests: generatedTests,
        _meta: {
          mode: response.provider,
          model: response.model,
          duration: elapsed / 1000,
          tokens: response.usage.totalTokens,
          enforcementApplied: framework ? true : false
        }
      };
    } catch (error) {
      console.error('❌ AI API error:', error.message);
      console.log('⚠️  Falling back to mock mode');
      return {
        tests: this.getMockTests(language),
        _meta: {
          mode: 'mock',
          reason: 'api_error',
          error: error.message
        }
      };
    }
  }

  async refineOutput({ existingOutput, refinementPrompt }) {
    console.log(`🔄 Refine request received`);
    console.log(`💬 Prompt: "${refinementPrompt.substring(0, 100)}..."`);
    
    const apiKey = this.configService.get<string>('openai.apiKey');
    const hasValidKey = apiKey && apiKey !== 'sk-your-api-key-here';
    
    if (!hasValidKey) {
      console.log(`⚠️  Mock mode: returning unchanged output`);
      return existingOutput; // Return unchanged in mock mode
    }
    
    const model = this.configService.get<string>('openai.model') || 'gpt-3.5-turbo';
    console.log(`🔑 Using OpenAI API for refinement (${model})`);
    const startTime = Date.now();

    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are QAgent. Refine the existing test suite based on user feedback.',
          },
          {
            role: 'user',
            content: `Existing output:\n${JSON.stringify(existingOutput, null, 2)}\n\nRefinement request: ${refinementPrompt}\n\nProvide the improved output in JSON format.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const elapsed = Date.now() - startTime;
      console.log(`✅ Refinement completed in ${(elapsed / 1000).toFixed(2)}s`);
      console.log(`📊 Tokens used: ${response.usage?.total_tokens || 'N/A'}`);

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('❌ Refinement error:', error.message);
      console.log('⚠️  Returning original output');
      return existingOutput;
    }
  }

  private buildPrompt(input: string, url?: string, outputTypes: string[] = []): string {
    return `
Generate a comprehensive QA test suite based on the following specification:

INPUT:
${input}

${url ? `URL/APP: ${url}` : ''}

OUTPUT TYPES REQUESTED:
${outputTypes.length > 0 ? outputTypes.join(', ') : 'All available types'}

Please generate the following in JSON format:
{
  "scenarios": "High-level test scenarios",
  "test_cases": "Detailed step-by-step test cases",
  "gherkin": "Gherkin/BDD scenarios",
  "automation": "Automation code (Playwright/Selenium)",
  "selectors": "UI selectors detected",
  "pom": "Page Object Model class",
  "stepdefs": "Step definitions for BDD",
  "api": "API test cases",
  "testData": "Test data dictionary",
  "negatives": [
    { "test": "Test name", "desc": "Description", "severity": "high|medium|low|critical" }
  ],
  "security": [
    "Security recommendation 1",
    "Security recommendation 2"
  ],
  "risk": [
    "Risk item 1",
    "Risk item 2"
  ],
  "compatibility": [
    { "platform": "Browser/OS name", "status": "✔ Supported | ⚠ Partial", "notes": "Notes" }
  ],
  "rtm": [
    { "requirement_id": "RQ-001", "scenario": "Scenario description", "test_cases": "TC-001, TC-002", "coverage": "Full|Partial", "priority": "High|Medium|Low" }
  ],
  "bva": [
    { "field": "Field name", "type": "String|Integer|Date", "min": "Min value", "max": "Max value", "invalid_examples": "Invalid examples", "notes": "Test notes" }
  ],
  "api_suite": [
    { "endpoint": "/api/endpoint", "method": "GET|POST|PUT|DELETE", "auth": "Required|Optional", "scenarios": "Test scenarios", "status_codes": "200, 400, 401, 500" }
  ]
}

IMPORTANT:
- negatives MUST be array of objects with test, desc, severity (4-6 items)
- security MUST be array of strings (4-6 items)
- rtm array (optional): objects with requirement_id, scenario, test_cases, coverage, priority
- bva array (optional): objects with field, type, min, max, invalid_examples, notes
- api_suite array (optional): objects with endpoint, method, auth, scenarios, status_codes
- Include rtm if input contains requirements/user stories
- Include bva if input involves form fields or data validation
- Include api_suite if input involves API/backend testing
- Focus on quality, completeness, and real-world scenarios.
`;
  }

  private getMockSuite() {
    return {
      scenarios: `Test Scenario 1: User Authentication
- Verify login with valid credentials
- Verify login with invalid credentials
- Verify password reset flow

Test Scenario 2: Data Validation
- Verify required field validation
- Verify data type validation
- Verify boundary value handling`,

      test_cases: `TC-001: Login with Valid Credentials
Steps:
1. Navigate to login page
2. Enter valid email
3. Enter valid password
4. Click Login button
Expected: User successfully logged in

TC-002: Login with Invalid Credentials
Steps:
1. Navigate to login page
2. Enter invalid email
3. Click Login button
Expected: Error message displayed`,

      gherkin: `Feature: User Authentication

  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    And I click the login button
    Then I should be redirected to dashboard

  Scenario: Failed login
    Given I am on the login page
    When I enter invalid credentials
    And I click the login button
    Then I should see an error message`,

      automation: `// Playwright Test Suite
import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test('successful login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('failed login shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });
});`,

      selectors: {
        url: 'https://example.com/login',
        elements: {
          emailField: '#email',
          passwordField: '#password',
          submitButton: 'button[type="submit"]',
          errorMessage: '.error-message',
        },
      },

      pom: `class LoginPage {
  email() { return '#email'; }
  password() { return '#password'; }
  submitButton() { return 'button[type="submit"]'; }
  errorMessage() { return '.error-message'; }
  
  async login(email: string, password: string) {
    await page.fill(this.email(), email);
    await page.fill(this.password(), password);
    await page.click(this.submitButton());
  }
}

export default new LoginPage();`,

      stepdefs: `import { Given, When, Then } from '@cucumber/cucumber';
import LoginPage from '../pages/LoginPage';

Given('I am on the login page', async () => {
  await page.goto('/login');
});

When('I enter valid credentials', async () => {
  await LoginPage.login('user@example.com', 'password123');
});

Then('I should be redirected to dashboard', async () => {
  await expect(page.url()).toContain('/dashboard');
});`,

      api: `POST /api/auth/login
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "token": "eyJhbGc...",
  "user": { "id": 1, "email": "user@example.com" }
}

Response 401:
{
  "error": "Invalid credentials"
}`,

      testData: {
        validEmail: 'user@example.com',
        invalidEmail: 'invalid@.com',
        validPassword: 'SecurePass123!',
        weakPassword: '123',
        boundaryAge: [17, 18, 99, 100],
      },

      negatives: [
        { test: 'Empty email field', severity: 'high' },
        { test: 'SQL injection attempt', severity: 'critical' },
        { test: 'XSS attack payload', severity: 'critical' },
        { test: 'Rate limiting bypass', severity: 'medium' },
      ],

      security: [
        'Verify HTTPS is enforced',
        'Test session timeout',
        'Verify CSRF token validation',
        'Test authorization bypass attempts',
      ],

      risk: [
        '⚠ Missing negative test for empty password',
        '⚠ No rate-limit behavior test',
        '⚠ Missing session expiry handling',
      ],

      compatibility: [
        { platform: 'Chrome', status: '✔ Supported', notes: 'Fully tested' },
        { platform: 'Safari', status: '⚠ Partial', notes: 'Mobile issues possible' },
        { platform: 'Firefox', status: '✔ Supported', notes: 'Recommended' },
      ],
    };
  }

  // Helper for VS Code extension
  private buildTestGenerationPrompt(code: string, fileName: string, language: string): string {
    const frameworkMap = {
      'typescript': 'Jest',
      'javascript': 'Jest',
      'python': 'pytest',
      'go': 'Go testing package',
      'java': 'JUnit 5',
      'ruby': 'RSpec',
      'php': 'PHPUnit',
      'csharp': 'xUnit',
    };

    const framework = frameworkMap[language.toLowerCase()] || 'appropriate testing framework';

    return `You are an expert test engineer. Generate comprehensive unit tests for the following ${language} code.

SOURCE FILE: ${fileName}

SOURCE CODE:
\`\`\`${language}
${code}
\`\`\`

REQUIREMENTS:
1. Analyze the ACTUAL code structure (classes, functions, exports)
2. Use ${framework} framework with correct syntax
3. Import from the correct file path (use ./ for relative imports)
4. Test ONLY the functions/methods that exist in the code
5. Include edge cases, error handling, and boundary conditions
6. Mock external dependencies (DB, API calls, file system)
7. Use proper TypeScript types if applicable

IMPORTANT:
- Base imports on the ACTUAL exports from the source code
- Do NOT assume methods that don't exist
- Match the actual function signatures
- Use realistic test data based on the code logic

OUTPUT ONLY the complete test file code, no markdown code fences, no explanations.`;
  }

  // Strip markdown code fences from generated code
  private stripMarkdownFences(code: string): string {
    // Remove ```language at the start
    code = code.replace(/^```\w*\n/, '');
    // Remove ``` at the end
    code = code.replace(/\n```$/, '');
    // Remove ``` at the end without newline
    code = code.replace(/```$/, '');
    return code.trim();
  }

  // Chat method for conversational interaction
  async chatWithAI({ message, context, history = [] }: {
    message: string;
    context?: { code?: string; fileName?: string; language?: string };
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) {
    console.log(`💬 Chat request received: "${message.substring(0, 100)}..."`);
    if (context?.fileName) console.log(`📄 Context: ${context.fileName}`);
    
    // USE AGENT SYSTEM instead of old chat
    console.log(`🔄 Routing to agent system...`);
    
    const agentResult = await this.agentService.executeAgentLoop({
      userQuery: message,
      context: {
        currentFile: context?.fileName,
        code: context?.code,
        language: context?.language
      },
      maxIterations: 10
    });
    
    // Convert agent response to chat format for backward compatibility
    if (!agentResult.success && agentResult.error) {
      return {
        reply: `Error: ${agentResult.error}`,
        _meta: { mode: 'error', error: agentResult.error }
      };
    }
    
    // Extract reply from agent messages
    const lastAssistantMsg = agentResult.messages
      ?.filter((m: any) => m.role === 'assistant')
      ?.pop();
    
    return {
      reply: lastAssistantMsg?.content || 'Task completed',
      actions: agentResult.actions,
      _meta: {
        mode: 'agent',
        iterations: agentResult.iterations,
        success: agentResult.success
      }
    };
  }

  private getMockTests(language: string): string {
    const mockTemplates = {
      'typescript': `import { describe, it, expect } from '@jest/globals';
import { add, multiply } from './calculator';

describe('Calculator', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should add negative numbers', () => {
      expect(add(-1, -1)).toBe(-2);
    });

    it('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it('should handle zero', () => {
      expect(multiply(5, 0)).toBe(0);
    });
  });
});`,
      'javascript': `const { describe, it, expect } = require('@jest/globals');
const { add, multiply } = require('./calculator');

describe('Calculator', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
  });
});`,
      'python': `import pytest
from calculator import add, multiply

class TestCalculator:
    def test_add_positive_numbers(self):
        assert add(2, 3) == 5
    
    def test_add_negative_numbers(self):
        assert add(-1, -1) == -2
    
    def test_multiply(self):
        assert multiply(3, 4) == 12
    
    def test_multiply_by_zero(self):
        assert multiply(5, 0) == 0`,
    };

    return mockTemplates[language.toLowerCase()] || mockTemplates['typescript'];
  }
  
  // Agent execution method
  async executeAgent({ query, context, maxIterations }: {
    query: string;
    context?: any;
    maxIterations?: number;
  }) {
    console.log(`🤖 Executing agent for: "${query}"`);
    
    const result = await this.agentService.executeAgentLoop({
      userQuery: query,
      context,
      maxIterations
    });
    
    return result;
  }

  /**
   * Generate E2E Playwright test from flow data
   * Used by VS Code extension when user clicks ✨ on a flow
   */
  async generateE2EFromFlow({ flow, config, componentCode }: {
    flow: {
      name: string;
      description?: string;
      routes?: string[];
      components?: string[];
    };
    config: {
      baseUrl: string;
      selectorPolicy: string;
      framework: string;
    };
    componentCode?: string;
  }) {
    const slugName = flow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = `${slugName}.spec.ts`;
    const route = flow.routes?.[0] || '/';
    
    console.log(`🎭 E2E Generation: ${flow.name}`);
    console.log(`   Route: ${route}, BaseUrl: ${config.baseUrl}`);
    
    // Check if AI provider is configured
    if (!this.aiProvider.isConfigured()) {
      console.log(`⚠️  Using template mode (no AI provider configured)`);
      return {
        code: this.buildE2ETemplate(flow, config, route),
        filename,
        _meta: { mode: 'template', reason: 'no_api_key' }
      };
    }
    
    const providerInfo = this.aiProvider.getProviderInfo();
    console.log(`🔑 Using ${providerInfo.provider} (${providerInfo.model})`);
    const startTime = Date.now();
    
    // LEVEL 3: Try runtime page inspection for REAL selectors
    let pageStructure: string | undefined;
    try {
      const fullUrl = `${config.baseUrl}${route}`;
      console.log(`🔍 Attempting runtime inspection: ${fullUrl}`);
      const structure = await this.runtimeInspector.inspectPage(fullUrl, 15000);
      pageStructure = this.runtimeInspector.formatStructureForPrompt(structure);
      console.log(`✅ Runtime inspection successful!`);
    } catch (error) {
      console.log(`⚠️  Runtime inspection failed (${error.message}) - falling back to component code`);
      pageStructure = undefined;
    }
    
    const prompt = this.buildE2EPrompt(flow, config, route, componentCode, pageStructure);
    
    try {
      const response = await this.aiProvider.createCompletion({
        messages: [
          {
            role: 'system',
            content: `You are QAgenAI, an expert E2E test engineer. Generate production-ready Playwright tests. Output ONLY the test code, no explanations or markdown fences.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 4000,
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ E2E generation completed in ${(elapsed / 1000).toFixed(2)}s`);
      
      let code = response.content.trim();
      code = this.stripMarkdownFences(code);
      
      return {
        code,
        filename,
        _meta: {
          mode: response.provider,
          model: response.model,
          duration: elapsed / 1000,
          tokens: response.usage.totalTokens,
        }
      };
    } catch (error) {
      console.error('❌ AI API error:', error.message);
      console.log('⚠️  Falling back to template mode');
      return {
        code: this.buildE2ETemplate(flow, config, route),
        filename,
        _meta: { mode: 'template', reason: 'api_error', error: error.message }
      };
    }
  }
  
  private buildE2EPrompt(flow: { name: string; description?: string; routes?: string[]; components?: string[] }, config: { baseUrl: string; selectorPolicy: string }, route: string, componentCode?: string, pageStructure?: string): string {
    const selectorGuidance = {
      'testid': 'Use data-testid attributes: page.getByTestId("..."). This is the most stable approach.',
      'role': 'Use ARIA roles: page.getByRole("button", { name: "..." }). More accessible.',
      'css': 'Use CSS selectors: page.locator("..."). Use sparingly for complex cases.',
    };
    
    // Detect route params like :language, :id
    const hasRouteParams = route.includes(':');
    const routeParams = route.match(/:[a-zA-Z]+/g) || [];
    
    // If we have runtime page structure, add it (PRIORITY 1)
    const pageStructureSection = pageStructure ? `

${pageStructure}

CRITICAL: The above selectors are from LIVE PAGE INSPECTION.
These are the ONLY selectors that exist on the page.
You MUST use these exact selectors in your test.
DO NOT invent any other selectors!
` : '';
    
    // If we have component code, add it to the prompt for better selector generation (PRIORITY 2)
    const componentSection = componentCode ? `

ACTUAL COMPONENT CODE:
\`\`\`tsx
${componentCode.substring(0, 8000)}
\`\`\`

IMPORTANT: Analyze the component code above to find REAL selectors:
- Look for data-testid attributes and use them with getByTestId()
- Look for button/link text and use getByRole() with name
- Look for form labels and use getByLabel()
- Look for headings and use getByRole('heading')
- Look for placeholder text and use getByPlaceholder()
- DO NOT invent selectors that don't exist in the code!
` : '';
    
    return `Generate a comprehensive Playwright E2E test for the following flow:

FLOW NAME: ${flow.name}
DESCRIPTION: ${flow.description || 'User flow'}
ROUTE: ${route}
${Array.isArray(flow.components) && flow.components.length ? `COMPONENTS INVOLVED: ${flow.components.join(', ')}` : ''}
${Array.isArray(flow.routes) && flow.routes.length > 1 ? `ALL ROUTES IN FLOW: ${flow.routes.join(' → ')}` : ''}${pageStructureSection}${componentSection}

${hasRouteParams ? `DYNAMIC ROUTE PARAMETERS: ${routeParams.join(', ')}
IMPORTANT: This route has dynamic parameters. You MUST:
1. Define constants at the top of the file for each parameter with sensible defaults:
   const LANGUAGE = process.env.TEST_LANGUAGE || 'en';
   const USER_ID = process.env.TEST_USER_ID || '1';
2. Build the URL dynamically: \`\${BASE_URL}/\${LANGUAGE}/privacy-policy\`
3. Use regex in toHaveURL() to match dynamic segments: expect(page).toHaveURL(/\\/[a-z]{2}\\/privacy-policy/);
` : ''}

SELECTOR POLICY: ${config.selectorPolicy}
${selectorGuidance[config.selectorPolicy] || selectorGuidance['testid']}

CRITICAL REQUIREMENTS:

1. BASEURL CONFIGURATION:
   ⚠️  CRITICAL: User MUST configure baseURL in playwright.config.ts
   - Use ONLY relative paths: page.goto('/common/rules')
   - DO NOT use absolute URLs: page.goto('http://localhost:3000/common/rules')
   - Playwright will prepend baseURL from config automatically
   - If tests fail with "Cannot navigate to invalid URL", user needs to add:
     use: { baseURL: 'http://localhost:3002' } to playwright.config.ts

2. SELECTOR STRATEGY (CRITICAL - NO GENERIC SELECTORS!):
   ❌ NEVER invent generic selectors like:
      - page.getByTestId('email-form') // unless you see data-testid="email-form" in code
      - page.getByLabel('Email') // unless you see <label>Email</label> in code
      - page.getByPlaceholder('Enter your email') // unless you see placeholder="Enter your email" in code
   
   ✅ INSTEAD, use SAFE, GENERIC locators that work on any page:
      - page.locator('form').first() // First form on page
      - page.locator('input[type="email"]') // Email input by type
      - page.locator('input[type="password"]') // Password input
      - page.locator('button[type="submit"]') // Submit button
      - page.locator('h1') // Page heading
      - page.locator('main') // Main content area
      - page.getByRole('heading', { level: 1 }) // H1 via role
      - page.getByRole('button').first() // First button
   
   ✅ IF component code is provided, extract REAL selectors:
      - Search for data-testid="..." and use those
      - Search for aria-label="..." and use those
      - Search for button text and use getByRole('button', { name: 'actual text' })
   
   ✅ ADD HELPFUL COMMENTS:
      - // Note: Update selector if page has data-testid attributes
      - // Note: This uses generic CSS selector - customize for your page

3. TEST STRUCTURE:
   - Use test.describe for grouping
   - Use test.beforeEach for navigation
   - Include 3-5 REALISTIC tests (not fake form assertions)

4. REALISTIC TESTS (Examples):
   ✅ GOOD:
   test('page loads and displays content', async ({ page }) => {
     await expect(page).toHaveURL(/\/common\/rules/);
     await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible();
     await expect(page.locator('main, #root, .app-content').first()).toBeVisible();
   });
   
   test('page has interactive elements', async ({ page }) => {
     const buttons = page.locator('button, [role="button"]');
     await expect(buttons.first()).toBeVisible();
     // Note: Customize selectors based on actual page elements
   });
   
   ❌ BAD (inventing selectors):
   test('check if email form elements are visible', async ({ page }) => {
     await expect(page.getByTestId('email-form')).toBeVisible(); // ❌ May not exist!
     await expect(page.getByLabel('Email')).toBeVisible(); // ❌ May not exist!
   });

5. PLAYWRIGHT BEST PRACTICES:
   - Use modern locators (getByRole, locator)
   - Always use await with expect
   - Use .first() when multiple elements match
   - Add comments explaining selector choices

OUTPUT: Complete TypeScript Playwright test file with SAFE, GENERIC selectors. No markdown, no explanations.`;
  }
  
  private buildE2ETemplate(flow: { name: string; description?: string; routes?: string[] }, config: { baseUrl: string; selectorPolicy: string }, route: string): string {
    const escapeRoute = route.replace(/\//g, '\\/');
    
    return `import { test, expect } from '@playwright/test';

/**
 * E2E Test: ${flow.name}
 * ${flow.description || 'Generated by QAgenAI'}
 * 
 * Route: ${route}
 * 
 * NOTE: This is a TEMPLATE test using SAFE, GENERIC selectors.
 * Customize selectors based on your actual page structure.
 * 
 * IMPORTANT: Configure baseURL in playwright.config.ts:
 *   use: { baseURL: '${config.baseUrl}' }
 */
test.describe('${flow.name}', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate using relative path (baseURL configured in playwright.config.ts)
    await page.goto('${route}');
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/.*${escapeRoute}/);
  });

  test('page displays main content', async ({ page }) => {
    // Check for common page elements (customize based on your page)
    await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible();
    await expect(page.locator('main, #root, .app, .app-content').first()).toBeVisible();
  });

  test('page has interactive elements', async ({ page }) => {
    // Check for buttons or links (customize based on your page)
    const interactiveElements = page.locator('button, a, [role="button"], [role="link"]');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);
    
    // Note: Add specific interactions based on your flow requirements:
    // - Form submissions: page.locator('form').first()
    // - Button clicks: page.getByRole('button', { name: 'specific text' })
    // - Navigation: page.getByRole('link', { name: 'specific text' })
  });

  test('page structure is valid', async ({ page }) => {
    // Basic accessibility checks
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
    
    // Note: Add more specific assertions for your page:
    // - Check for forms: page.locator('form')
    // - Check for specific sections: page.locator('[data-testid="..."]')
    // - Check for error states: page.locator('.error, [role="alert"]')
  });
});
`;
  }

  /**
   * Detect framework from file name and language
   * Used by enforcement layer to determine which rules to apply
   */
  private detectFrameworkFromFileName(fileName: string, language: string): string | null {
    const lowerFileName = fileName.toLowerCase();
    const lowerLanguage = language.toLowerCase();
    
    // Detect E2E tests from Next.js App Router patterns
    // Next.js App Router files: page.tsx, layout.tsx, template.tsx, error.tsx in /app/ directory
    const isNextAppRouterFile = (
      lowerFileName.includes('/app/') && (
        lowerFileName.endsWith('page.tsx') || 
        lowerFileName.endsWith('page.ts') ||
        lowerFileName.endsWith('page.jsx') ||
        lowerFileName.endsWith('page.js') ||
        lowerFileName.endsWith('layout.tsx') ||
        lowerFileName.endsWith('layout.ts') ||
        lowerFileName.endsWith('layout.jsx') ||
        lowerFileName.endsWith('layout.js') ||
        lowerFileName.endsWith('template.tsx') ||
        lowerFileName.endsWith('error.tsx')
      )
    );
    
    // Detect E2E tests from other page patterns
    const isPageFile = (
      lowerFileName.includes('page.') || 
      lowerFileName.includes('/pages/') ||
      lowerFileName.includes('route.tsx') || // Next.js API routes
      isNextAppRouterFile
    );
    
    if (isPageFile) {
      // Page/Layout/Template files should use E2E framework
      if (lowerLanguage === 'typescript' || lowerLanguage === 'javascript') {
        return 'playwright';
      }
    }
    
    // Detect from file extension patterns
    if (lowerFileName.includes('.spec.')) {
      // .spec. typically means E2E (Playwright) or component tests (Vitest)
      if (lowerLanguage === 'typescript' || lowerLanguage === 'javascript') {
        return 'playwright'; // Assume Playwright for .spec files
      }
    }
    
    if (lowerFileName.includes('.test.')) {
      // .test. typically means unit tests
      if (lowerLanguage === 'typescript' || lowerLanguage === 'javascript') {
        return 'jest';
      }
    }
    
    // Language-specific defaults
    if (lowerLanguage === 'python') return 'pytest';
    if (lowerLanguage === 'go') return 'go_testing';
    if (lowerLanguage === 'java') return 'junit';
    if (lowerLanguage === 'csharp') return 'xunit';
    
    // Default for JS/TS: Jest
    if (lowerLanguage === 'typescript' || lowerLanguage === 'javascript') {
      return 'jest';
    }
    
    return null;
  }
}
