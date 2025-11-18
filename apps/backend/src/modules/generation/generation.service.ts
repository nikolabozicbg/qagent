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
    const apiKey = this.configService.get<string>('openai.apiKey');
    
    // If no API key, return mock data
    if (!apiKey) {
      return this.getMockSuite();
    }

    const prompt = this.buildPrompt(input, url, outputTypes);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
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

      const result = JSON.parse(response.choices[0].message.content);
      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getMockSuite();
    }
  }

  async refineOutput({ existingOutput, refinementPrompt }) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    
    if (!apiKey) {
      return existingOutput; // Return unchanged in mock mode
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
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

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error);
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
  "negatives": "Negative and edge case tests",
  "security": "Security test recommendations",
  "risk": "Risk and coverage analysis",
  "compatibility": "Browser/platform compatibility matrix"
}

Focus on quality, completeness, and real-world scenarios.
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
}
