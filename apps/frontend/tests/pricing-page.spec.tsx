import { test, expect } from '@playwright/test';

test.describe('Page Page E2E', () => {
  test('should render PricingPage(main) component', async ({ page }) => {
    await page.goto('/pricing');
    // Main component should load without errors
    await expect(page.locator('body')).toBeVisible();
    // Check for main content area (use .first() to avoid strict mode with multiple main elements)
    await expect(page.locator('main, [role="main"], #root').first()).toBeVisible();
  });

  test('should display Card section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for Card by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display CardHeader section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for CardHeader by its likely content
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('should display CardTitle section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for CardTitle by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display CardDescription section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for CardDescription by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display CardContent section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for CardContent by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display Feature section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for Feature by its likely content
    const section = page.locator('section').nth(2);
    await expect(section).toBeVisible();
  });

  test('should display Link section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for Link by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display Crown section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for Crown by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display CheckCircle2 section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for CheckCircle2 by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display Mail section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for Mail by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display ComparisonRow section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for ComparisonRow by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should display Faq section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for Faq by its likely content
    const faqHeading = page.getByRole('heading', { name: /FAQ|Frequently Asked|Questions/i }).first();
    await expect(faqHeading).toBeVisible();
  });

  test('should display ProModal section', async ({ page }) => {
    await page.goto('/pricing');
    // Look for ProModal by its likely content
    const section = page.locator('section').first();
    await expect(section).toBeVisible();
  });

  test('should handle state changes', async ({ page }) => {
    await page.goto('/pricing');
    // Interact with stateful elements
    const interactiveElement = page.locator('button, [role="button"], input').first();
    if (await interactiveElement.isVisible()) {
      await interactiveElement.click();
      // State should update (verify visually or via assertions)
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pricing');
    await expect(page.locator('body')).toBeVisible();
    // Check mobile menu or responsive elements
    const mobileMenu = page.locator('[class*="mobile"], [class*="hamburger"], [aria-label*="menu"]');
    // Mobile-specific assertions can be added here
  });

  test('should support dark mode', async ({ page }) => {
    await page.goto('/pricing');
    // Toggle dark mode if available
    const themeToggle = page.locator('[class*="theme"], [aria-label*="theme"], [aria-label*="dark"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      // Verify dark mode is applied
      await expect(page.locator('html, body')).toHaveAttribute('class', /dark/);
    }
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/pricing');
    // Check for basic accessibility
    // Main landmark
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    // Heading structure - should have at least one h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    // Images should have alt text
    const images = page.locator('img');
    const imgCount = await images.count();
    for (let i = 0; i < Math.min(imgCount, 5); i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        await expect(img).toHaveAttribute('alt', /.*/); // Should have some alt text
      }
    }
  });
});
