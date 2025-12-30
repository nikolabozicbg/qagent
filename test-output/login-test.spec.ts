import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should successfully complete login flow', async ({ page }) => {
    // Navigate to /login
    await page.goto('http://localhost:3002/login');

    // Fill form fields
    await page.fill('[placeholder="Email"]', 'test.user@example.com');
    await page.fill('[placeholder="Password"]', 'SecurePassword123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for API call and verify
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/auth/login') && resp.request().method() === 'POST'
    );

    const response = await responsePromise;
    expect(response.status()).toBeLessThan(400);
  });
});
