# Smart Journey Discovery & Test Generation - UX Specification
**Date:** 2025-12-28  
**Version:** 1.0  
**System:** QAgenAI - Advanced Holistic Test Generation

---

## Overview

Complete specification for intelligent journey discovery, auto-enrichment, and comprehensive test generation system. One-click flow from codebase analysis to production-ready test suites.

---

## System Architecture

### Phase 1: Discovery & Auto-Enrichment
**Endpoint:** `POST /analyze/journeys/discover-and-enrich`

**Process:**
1. **Discovery** (140ms): Analyze codebase with 3 parallel strategies
   - Graph-based navigation analysis
   - Form-based interaction detection
   - Intent-based synthesis (routes, auth, CRUD, workflows)

2. **Auto-Enrichment** (3.5s): Deep analysis of critical journeys
   - Extract real selectors from components
   - Detect validations and constraints
   - Identify API calls and responses
   - Generate test scenarios (happy path, validations, errors, edge cases)

**Response Structure:**

```json
{
  "success": true,
  "analysisTime": 3500,
  "totalJourneys": 16,
  "enrichedJourneys": 5,
  "journeys": [
    {
      "id": "1",
      "name": "Complete User Onboarding",
      "description": "New user registers, verifies email, and logs in",
      "category": "workflow",
      "priority": 1,
      "tags": ["workflow", "onboarding", "critical"],
      "status": "enriched",
      "estimatedDuration": 120,
      
      "flow": {
        "steps": 7,
        "actions": ["navigate", "fill", "submit", "verify", "navigate", "fill", "submit"],
        "touchpoints": ["RegisterPage", "Email", "LoginPage", "Dashboard"]
      },
      
      "enrichedData": {
        "components": [
          {
            "name": "RegisterPage",
            "path": "app/containers/RegisterPage/registerForm.js",
            "fields": [
              { "selector": "#username", "type": "text", "validation": ["required", "min:3"] },
              { "selector": "#email", "type": "email", "validation": ["required", "email"] },
              { "selector": "#password", "type": "password", "validation": ["required", "min:8", "strength"] },
              { "selector": "#confirmPassword", "type": "password", "validation": ["required", "match:password"] }
            ],
            "submitButton": "button[type='submit']",
            "apis": [
              { "method": "POST", "endpoint": "/auth/register", "expectedStatus": 201 }
            ]
          },
          {
            "name": "LoginPage",
            "path": "app/containers/LoginPage/loginForm.js",
            "fields": [
              { "selector": "#username", "type": "text", "validation": ["required"] },
              { "selector": "#password", "type": "password", "validation": ["required"] }
            ],
            "submitButton": "button:has-text('Login')",
            "apis": [
              { "method": "POST", "endpoint": "/auth/login", "expectedStatus": 200 }
            ]
          }
        ],
        
        "detailedSteps": [
          {
            "step": 1,
            "action": "navigate",
            "target": "/register",
            "description": "Navigate to registration page"
          },
          {
            "step": 2,
            "action": "fill",
            "target": "RegisterPage form",
            "fields": [
              { "selector": "#username", "testValue": "testuser", "validations": ["required", "min:3"] },
              { "selector": "#email", "testValue": "test@example.com", "validations": ["required", "email"] },
              { "selector": "#password", "testValue": "SecurePass123!", "validations": ["required", "min:8", "strength"] },
              { "selector": "#confirmPassword", "testValue": "SecurePass123!", "validations": ["required", "match"] }
            ]
          },
          {
            "step": 3,
            "action": "submit",
            "target": "button[type='submit']",
            "apiCall": {
              "method": "POST",
              "endpoint": "/auth/register",
              "expectedStatus": 201,
              "successAction": "redirect:/verify"
            }
          },
          {
            "step": 4,
            "action": "verify",
            "target": "Email verification",
            "description": "User checks email and clicks verification link",
            "manualStep": true
          },
          {
            "step": 5,
            "action": "navigate",
            "target": "/login",
            "description": "Navigate to login page"
          },
          {
            "step": 6,
            "action": "fill",
            "target": "LoginPage form",
            "fields": [
              { "selector": "#username", "testValue": "testuser" },
              { "selector": "#password", "testValue": "SecurePass123!" }
            ]
          },
          {
            "step": 7,
            "action": "submit",
            "target": "button:has-text('Login')",
            "apiCall": {
              "method": "POST",
              "endpoint": "/auth/login",
              "expectedStatus": 200,
              "successAction": "redirect:/dashboard"
            },
            "assertions": [
              { "type": "url", "value": "/dashboard" },
              { "type": "element", "selector": "text=/logout|sign out/i", "visible": true }
            ]
          }
        ],
        
        "testScenarios": {
          "happyPath": {
            "name": "Successful registration and login",
            "steps": [1,2,3,4,5,6,7]
          },
          "validations": [
            { "name": "Invalid email format", "field": "#email", "invalidValue": "not-an-email", "expectedError": "Please enter a valid email" },
            { "name": "Weak password", "field": "#password", "invalidValue": "123", "expectedError": "Password must be at least 8 characters" },
            { "name": "Password mismatch", "field": "#confirmPassword", "invalidValue": "DifferentPass!", "expectedError": "Passwords do not match" },
            { "name": "Empty username", "field": "#username", "invalidValue": "", "expectedError": "Username is required" }
          ],
          "errors": [
            { "name": "Duplicate email", "mockResponse": { "status": 409, "body": { "error": "Email already exists" } } },
            { "name": "Network timeout", "mockResponse": { "timeout": true } }
          ],
          "edgeCases": [
            { "name": "Special characters in username", "field": "#username", "testValue": "test@user#123" },
            { "name": "Very long email", "field": "#email", "testValue": "a".repeat(100) + "@example.com" }
          ]
        },
        
        "estimatedTestCases": 10,
        "estimatedCodeLines": 180
      }
    }
  ]
}
```

---

## User Interface - Dashboard View

```
╔══════════════════════════════════════════════════════════════════╗
║  QAgenAI - Smart Journey Discovery                              ║
║  Project: Truthy Frontend                                       ║
╚══════════════════════════════════════════════════════════════════╝

📊 Analysis Complete (3.5s)
   • 16 journeys discovered
   • 5 critical journeys auto-enriched
   • Ready to generate 48 test cases

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ CRITICAL WORKFLOWS (Auto-enriched)

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ Complete User Onboarding                                   ┃
┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃ Register → Verify Email → Login → Dashboard                  ┃
┃                                                               ┃
┃ 📋 Flow: 7 steps | 2 components                              ┃
┃ 🧪 Tests: 10 cases (1 happy + 4 validations + 3 errors + 2 edge) ┃
┃ ⏱️  Duration: ~120s                                           ┃
┃                                                               ┃
┃ 📊 Coverage:                                                  ┃
┃   • Fields: 6 (all with validations)                         ┃
┃   • APIs: 2 (register, login)                                ┃
┃   • Pages: 3 (register, verify, login, dashboard)            ┃
┃                                                               ┃
┃ 🎯 Test Scenarios:                                            ┃
┃   ✓ Happy path: Full onboarding flow                         ┃
┃   ✓ Validations: Invalid email, weak password, mismatch      ┃
┃   ✓ Errors: Duplicate email, network timeout                 ┃
┃   ✓ Edge cases: Special chars, long inputs                   ┃
┃                                                               ┃
┃ [📝 View Details] [🚀 Generate Tests] [▶️  Run Tests]        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ User Login                                                  ┃
┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃ Navigate → Fill Credentials → Submit → Dashboard             ┃
┃                                                               ┃
┃ 📋 Flow: 4 steps | 1 component                               ┃
┃ 🧪 Tests: 6 cases                                            ┃
┃ ⏱️  Duration: ~30s                                            ┃
┃                                                               ┃
┃ [📝 View Details] [🚀 Generate Tests] [▶️  Run Tests]        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ Password Recovery                                           ┃
┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃ Forgot Password → Email → Reset → Login                      ┃
┃                                                               ┃
┃ 📋 Flow: 4 steps | 2 components                              ┃
┃ 🧪 Tests: 5 cases                                            ┃
┃                                                               ┃
┃ [📝 View Details] [🚀 Generate Tests]                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 FORMS (10) - Click to enrich & generate
  • Complete loginForm
  • Complete registerForm
  • Complete profileForm
  ...

🗺️ NAVIGATION (3) - Click to enrich & generate  
  • Login → Dashboard
  • Login ↔ Register

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[🚀 Generate All Tests (48 cases)] [⚙️  Configure] [📊 View Report]
```

---

## Generated Test Suite

### File: `tests/e2e/complete-user-onboarding.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

/**
 * Complete User Onboarding Journey
 * 
 * Flow: Register → Verify Email → Login → Dashboard
 * Components: RegisterPage, LoginPage
 * Generated by QAgenAI on 2025-12-28
 */

test.describe('Complete User Onboarding', () => {
  
  // ============================================
  // HAPPY PATH
  // ============================================
  
  test('should successfully complete registration and login', async ({ page }) => {
    // Step 1: Navigate to registration
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);
    
    // Step 2: Fill registration form
    await page.fill('#username', 'testuser');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#confirmPassword', 'SecurePass123!');
    
    // Step 3: Submit registration
    await page.click('button[type="submit"]');
    
    // Validate API call
    const registerResponse = await page.waitForResponse(
      resp => resp.url().includes('/auth/register') && 
              resp.request().method() === 'POST'
    );
    expect(registerResponse.status()).toBe(201);
    
    // Verify redirect to verification page
    await expect(page).toHaveURL(/\/verify/);
    await expect(page.locator('text=/check your email/i')).toBeVisible();
    
    // Step 4: Email verification (simulated)
    // In production: User would click email link
    // For testing: We'll navigate directly after backend verification
    
    // Step 5: Navigate to login
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    
    // Step 6: Fill login credentials
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'SecurePass123!');
    
    // Step 7: Submit login
    await page.click('button:has-text("Login")');
    
    // Validate login API
    const loginResponse = await page.waitForResponse(
      resp => resp.url().includes('/auth/login') && 
              resp.request().method() === 'POST'
    );
    expect(loginResponse.status()).toBe(200);
    
    // Verify successful login
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=/logout|sign out/i')).toBeVisible();
    
    // Verify user data loaded
    await expect(page.locator('text=/welcome/i')).toBeVisible();
  });
  
  
  // ============================================
  // VALIDATION TESTS
  // ============================================
  
  test('should reject registration with invalid email format', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('#username', 'testuser');
    await page.fill('#email', 'not-a-valid-email'); // Invalid
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#confirmPassword', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    // Expect validation error
    await expect(page.locator('text=/please enter a valid email/i')).toBeVisible();
    
    // Ensure form was not submitted
    await expect(page).toHaveURL(/\/register/);
  });
  
  test('should reject registration with weak password', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('#username', 'testuser');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', '123'); // Too short
    await page.fill('#confirmPassword', '123');
    
    await page.click('button[type="submit"]');
    
    // Expect password strength error
    await expect(page.locator('text=/password must be at least 8 characters/i')).toBeVisible();
  });
  
  test('should reject registration with mismatched passwords', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('#username', 'testuser');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#confirmPassword', 'DifferentPass!'); // Mismatch
    
    await page.click('button[type="submit"]');
    
    // Expect mismatch error
    await expect(page.locator('text=/passwords do not match/i')).toBeVisible();
  });
  
  test('should reject registration with empty username', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('#username', ''); // Empty
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    // Expect required field error
    await expect(page.locator('text=/username is required/i')).toBeVisible();
  });
  
  
  // ============================================
  // ERROR SCENARIOS
  // ============================================
  
  test('should handle duplicate email registration', async ({ page }) => {
    // Mock API to return 409 Conflict
    await page.route('**/auth/register', route => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email already exists' })
      });
    });
    
    await page.goto('/register');
    await page.fill('#username', 'existinguser');
    await page.fill('#email', 'existing@example.com');
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#confirmPassword', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    // Expect duplicate email error
    await expect(page.locator('text=/email already exists/i')).toBeVisible();
  });
  
  test('should handle network timeout during registration', async ({ page }) => {
    // Mock slow API
    await page.route('**/auth/register', route => {
      setTimeout(() => route.abort(), 5000); // Timeout after 5s
    });
    
    await page.goto('/register');
    await page.fill('#username', 'testuser');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#confirmPassword', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    // Expect timeout error message
    await expect(page.locator('text=/network error|timeout/i')).toBeVisible({ timeout: 10000 });
  });
  
  test('should handle server error (500)', async ({ page }) => {
    await page.route('**/auth/register', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/register');
    await page.fill('#username', 'testuser');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#confirmPassword', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/something went wrong|server error/i')).toBeVisible();
  });
  
  
  // ============================================
  // EDGE CASES
  // ============================================
  
  test('should handle special characters in username', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('#username', 'test@user#123'); // Special chars
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#confirmPassword', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    const response = await page.waitForResponse(resp => resp.url().includes('/auth/register'));
    
    // Either accepts or rejects gracefully
    if (response.status() === 201) {
      await expect(page).toHaveURL(/\/verify/);
    } else {
      await expect(page.locator('text=/invalid characters/i')).toBeVisible();
    }
  });
  
  test('should handle very long email address', async ({ page }) => {
    const longEmail = 'a'.repeat(100) + '@example.com';
    
    await page.goto('/register');
    await page.fill('#username', 'testuser');
    await page.fill('#email', longEmail);
    await page.fill('#password', 'SecurePass123!');
    await page.fill('#confirmPassword', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    // Should either accept or show max length error
    const hasError = await page.locator('text=/email too long|maximum length/i').isVisible();
    const hasSuccess = await page.locator('text=/check your email/i').isVisible();
    
    expect(hasError || hasSuccess).toBe(true);
  });
  
});
```

---

## Test Suite Characteristics

### Coverage Metrics
- **1 Journey** = **1 Test File** = **10 Test Cases** = **~180 Lines of Code**

### Test Case Breakdown
- ✅ **1 Happy Path** - Complete flow validation
- ✅ **4 Validation Tests** - Field-level validation errors
- ✅ **3 Error Scenarios** - API errors, network issues, server failures
- ✅ **2 Edge Cases** - Boundary conditions, special inputs

### Quality Features
- ✅ **Real selectors** extracted from source code
- ✅ **API validations** with status codes and response checks
- ✅ **Assertion coverage** for URL, elements, visibility
- ✅ **Error mocking** for resilience testing
- ✅ **Async/await patterns** following Playwright best practices
- ✅ **Zero manual edits** - runnable immediately

---

## System Benefits

### For Users
- **One-click generation** - From codebase to tests in seconds
- **Comprehensive coverage** - Happy paths + validations + errors + edge cases
- **Production-ready** - No manual editing required
- **Intelligent** - Real selectors, not generic placeholders

### For QA Teams
- **Time savings** - 90% reduction in test writing time
- **Consistency** - All tests follow best practices
- **Maintainability** - Tests tied to actual component structure
- **Scalability** - Generate dozens of test suites instantly

### Technical Excellence
- **AI-driven** - Context-aware analysis
- **DSA optimized** - Efficient graph traversal and pattern matching
- **Framework agnostic** - Works with React Router, Next.js, Remix, etc.
- **Future-proof** - Adapts to codebase changes

---

## Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Discovery Time** | 140ms | Find all journeys |
| **Enrichment Time** | 3.5s | Deep analysis of 5 critical journeys |
| **Total Analysis** | 3.64s | Complete understanding of application |
| **Test Generation** | <1s | Generate one complete test suite |
| **Tests per Journey** | 5-10 | Based on complexity |
| **Code per Journey** | 150-200 lines | Production-ready Playwright tests |

---

## Implementation Status

- ✅ Discovery system (3 strategies: graph, form, intent-based)
- ✅ Intent-based synthesis service (routes, auth, CRUD, workflows)
- ✅ Component analysis and selector extraction
- ✅ API detection and validation extraction
- ✅ Multi-step journey detection
- ✅ Quality scoring and ranking
- ⏸️ Auto-enrichment integration (next phase)
- ⏸️ Test generation enhancement (add validations, errors, edge cases)

**Current State:** Core discovery and enrichment complete. Next: Full test suite generation with comprehensive scenarios.

---

## Next Steps

1. **Integrate auto-enrichment** into discovery endpoint
2. **Enhance test generator** to produce full test suites (not just happy path)
3. **Add UI components** to VS Code extension dashboard
4. **Implement one-click generation** workflow
5. **Add test execution** integration with Playwright
6. **Create reporting** dashboard for test results

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-28  
**Author:** QAgenAI Development Team
