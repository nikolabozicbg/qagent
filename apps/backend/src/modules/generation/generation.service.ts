import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class GenerationService {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    
    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set. Using mock responses.');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey || 'sk-mock',
    });
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
      const response = await this.client.chat.completions.create({
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
  async generateTestsFromCode({ code, fileName, language }: { code: string; fileName: string; language: string }) {
    console.log(`🧪 Test generation request for ${fileName} (${language})`);
    console.log(`📝 Code length: ${code.length} characters`);
    
    const apiKey = this.configService.get<string>('openai.apiKey');
    const hasValidKey = apiKey && apiKey !== 'sk-your-api-key-here';
    
    // If no API key, return mock
    if (!hasValidKey) {
      console.log(`⚠️  Using mock mode (no valid OpenAI API key)`);
      return {
        tests: this.getMockTests(language),
        _meta: {
          mode: 'mock',
          reason: 'no_api_key'
        }
      };
    }
    
    const model = this.configService.get<string>('openai.model') || 'gpt-3.5-turbo';
    console.log(`🔑 Using OpenAI API (${model})`);
    const startTime = Date.now();

    const prompt = this.buildTestGenerationPrompt(code, fileName, language);

    try {
      const response = await this.client.chat.completions.create({
        model: model,
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
        max_tokens: 2000,
      });

      const elapsed = Date.now() - startTime;
      console.log(`✅ Test generation completed in ${(elapsed / 1000).toFixed(2)}s`);
      console.log(`📊 Tokens used: ${response.usage?.total_tokens || 'N/A'}`);

      let generatedTests = response.choices[0].message.content.trim();
      
      // Strip markdown code fences if present
      generatedTests = this.stripMarkdownFences(generatedTests);
      
      return {
        tests: generatedTests,
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
      return {
        tests: this.getMockTests(language),
        _meta: {
          mode: 'mock',
          reason: 'openai_error',
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
      const response = await this.client.chat.completions.create({
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
}
