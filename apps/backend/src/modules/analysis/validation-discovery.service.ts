import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import type { FormField } from './types/journey.types';

export interface ValidationError {
  field: string;
  errorMessage: string;
  trigger: 'empty' | 'invalid' | 'format';
  selector: string;
}

@Injectable()
export class ValidationDiscoveryService {
  private readonly logger = new Logger(ValidationDiscoveryService.name);
  private browser: Browser | null = null;

  async discoverValidationErrors(
    route: string,
    fields: FormField[],
    baseUrl = 'http://localhost:5173'
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    let page: Page | undefined;

    try {
      // Launch browser if needed
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: true });
      }

      const context = await this.browser.newContext();
      page = await context.newPage();

      // Navigate to route
      const fullUrl = `${baseUrl}${route}`;
      this.logger.log(`Discovering validation errors on ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 10000 });

      // Wait for form to be ready
      await page.waitForTimeout(1000);

      // Strategy 1: Submit empty form
      const emptyErrors = await this.submitEmptyForm(page, fields);
      errors.push(...emptyErrors);

      // Strategy 2: Submit with invalid formats
      const formatErrors = await this.submitInvalidFormats(page, fields);
      errors.push(...formatErrors);

      await context.close();

      this.logger.log(`Discovered ${errors.length} validation errors on ${route}`);
      return errors;
    } catch (error) {
      this.logger.warn(`Failed to discover validation errors on ${route}: ${error.message}`);
      return [];
    }
  }

  private async submitEmptyForm(page: Page, fields: FormField[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // Clear all fields (in case they have default values)
      for (const field of fields) {
        const selector = this.buildSelector(field);
        try {
          await page.locator(selector).clear({ timeout: 2000 });
        } catch (e) {
          // Field might not be clearable (button, etc.)
        }
      }

      // Find and click submit button
      await this.clickSubmit(page);

      // Wait for errors to appear
      await page.waitForTimeout(1000);

      // Scrape error messages from common error selectors
      const errorSelectors = [
        '[role="alert"]',
        '.error-message',
        '.Mui-error',
        '.error',
        '.invalid-feedback',
        '[class*="error"]',
        '[class*="Error"]',
        '[data-test*="error"]',
        'p[color="error"]', // Material-UI
      ];

      for (const selector of errorSelectors) {
        const errorElements = await page.locator(selector).all();
        for (const element of errorElements) {
          const text = await element.textContent();
          if (text && text.trim()) {
            // Try to match error to field
            const field = this.matchErrorToField(text.trim(), fields);
            if (field) {
              errors.push({
                field: field.name,
                errorMessage: text.trim(),
                trigger: 'empty',
                selector: this.buildSelector(field),
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to submit empty form: ${error.message}`);
    }

    return errors;
  }

  private async submitInvalidFormats(page: Page, fields: FormField[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Map field types to invalid test values
    const invalidValues: Record<string, string> = {
      email: 'invalid-email',
      phone: 'abc123',
      number: 'not-a-number',
      url: 'not-a-url',
      date: '99/99/9999',
    };

    try {
      // Reload page to reset form
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Fill fields with invalid formats
      for (const field of fields) {
        const invalidValue = invalidValues[field.type] || invalidValues[field.name];
        if (invalidValue) {
          const selector = this.buildSelector(field);
          try {
            await page.locator(selector).fill(invalidValue, { timeout: 2000 });
          } catch (e) {
            // Skip if field not found
          }
        }
      }

      // Submit
      await this.clickSubmit(page);
      await page.waitForTimeout(1000);

      // Scrape errors (same as above)
      const errorSelectors = [
        '[role="alert"]',
        '.error-message',
        '.Mui-error',
        '.error',
        '.invalid-feedback',
      ];

      for (const selector of errorSelectors) {
        const errorElements = await page.locator(selector).all();
        for (const element of errorElements) {
          const text = await element.textContent();
          if (text && text.trim()) {
            const field = this.matchErrorToField(text.trim(), fields);
            if (field) {
              errors.push({
                field: field.name,
                errorMessage: text.trim(),
                trigger: 'format',
                selector: this.buildSelector(field),
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to submit invalid formats: ${error.message}`);
    }

    return errors;
  }

  private async clickSubmit(page: Page): Promise<void> {
    // Try multiple submit button patterns
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Sign In")',
      'button:has-text("Sign Up")',
      'button:has-text("Register")',
      'button:has-text("Login")',
      'button:has-text("Save")',
      'button:has-text("Create")',
      'button:has-text("Next")',
      '[data-test*="submit"]',
      'button[class*="submit"]',
    ];

    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        if ((await button.count()) > 0) {
          await button.click({ timeout: 2000 });
          return;
        }
      } catch (e) {
        // Try next selector
      }
    }

    this.logger.warn('Could not find submit button');
  }

  private buildSelector(field: FormField): string {
    // Prefer name attribute (most stable)
    if (field.name) {
      return `[name="${field.name}"]`;
    }
    // Fallback to id
    if (field.id) {
      return `#${field.id}`;
    }
    // Fallback to label
    if (field.label) {
      return `label:has-text("${field.label}") >> .. >> input, label:has-text("${field.label}") >> .. >> textarea`;
    }
    // Last resort: placeholder
    return `[placeholder="${field.placeholder || field.name}"]`;
  }

  private matchErrorToField(errorText: string, fields: FormField[]): FormField | null {
    const lowerError = errorText.toLowerCase();

    // Try exact field name match
    for (const field of fields) {
      if (lowerError.includes(field.name.toLowerCase())) {
        return field;
      }
      if (field.label && lowerError.includes(field.label.toLowerCase())) {
        return field;
      }
      if (field.placeholder && lowerError.includes(field.placeholder.toLowerCase())) {
        return field;
      }
    }

    // Try type-based matching
    if (lowerError.includes('email')) {
      return fields.find((f) => f.type === 'email' || f.name === 'email') || null;
    }
    if (lowerError.includes('password')) {
      return fields.find((f) => f.type === 'password' || f.name === 'password') || null;
    }
    if (lowerError.includes('username')) {
      return fields.find((f) => f.name === 'username') || null;
    }

    return null;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Graceful shutdown
  async onModuleDestroy() {
    await this.cleanup();
  }
}
