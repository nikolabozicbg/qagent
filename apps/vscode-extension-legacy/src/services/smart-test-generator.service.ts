import * as path from 'path';
import { DetectedElement, AdditionalTestOption, SourceAnalysis } from '../webviews/test-preview.webview';

/**
 * SmartTestGeneratorService
 * 
 * Generates specific tests based on detected elements from source analysis.
 * Unlike generic test generation, this creates targeted tests for each
 * component, hook, event handler, etc. that was detected.
 */
export class SmartTestGeneratorService {
  
  /**
   * Generate test code based on selected elements and options
   */
  generateTestCode(
    sourceFilePath: string,
    framework: string,
    testType: string,
    selectedElements: DetectedElement[],
    selectedOptions: AdditionalTestOption[]
  ): string {
    const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
    const baseName = this.toTitleCase(fileName);
    
    // Route to framework-specific generator
    switch (framework.toLowerCase()) {
      case 'playwright':
        return this.generatePlaywrightTests(baseName, sourceFilePath, selectedElements, selectedOptions);
      case 'react testing library':
      case 'rtl':
        return this.generateRTLTests(baseName, sourceFilePath, selectedElements, selectedOptions);
      case 'jest':
        return this.generateJestTests(baseName, sourceFilePath, selectedElements, selectedOptions);
      default:
        return this.generatePlaywrightTests(baseName, sourceFilePath, selectedElements, selectedOptions);
    }
  }
  
  /**
   * Generate Playwright E2E tests
   */
  private generatePlaywrightTests(
    baseName: string,
    sourceFilePath: string,
    elements: DetectedElement[],
    options: AdditionalTestOption[]
  ): string {
    const tests: string[] = [];
    const imports = `import { test, expect } from '@playwright/test';`;
    
    // Determine page route from file path
    const route = this.inferRouteFromPath(sourceFilePath);
    
    // Generate tests for each selected element
    for (const element of elements) {
      const testCode = this.generatePlaywrightTestForElement(element, route);
      if (testCode) {
        tests.push(testCode);
      }
    }
    
    // Generate tests for additional options
    for (const option of options) {
      const testCode = this.generatePlaywrightTestForOption(option, route, baseName);
      if (testCode) {
        tests.push(testCode);
      }
    }
    
    // If no specific tests, add a basic render test
    if (tests.length === 0) {
      tests.push(`  test('should load ${baseName} page', async ({ page }) => {
    await page.goto('${route}');
    await expect(page).toHaveTitle(/.*/);
  });`);
    }
    
    return `${imports}

test.describe('${baseName} Page E2E', () => {
${tests.join('\n\n')}
});
`;
  }
  
  /**
   * Generate Playwright test for a specific element
   */
  private generatePlaywrightTestForElement(element: DetectedElement, route: string): string | null {
    switch (element.type) {
      case 'component':
        // Extract component name from "<ComponentName />"
        const componentMatch = element.name.match(/<(\w+)/);
        const componentName = componentMatch ? componentMatch[1] : element.name.replace(/[<>\/\s]/g, '');
        
        if (element.name.includes('(main)')) {
          return `  test('should render ${componentName} component', async ({ page }) => {
    await page.goto('${route}');
    // Main component should load without errors
    await expect(page.locator('body')).toBeVisible();
    // Check for main content area (use .first() to avoid strict mode with multiple main elements)
    await expect(page.locator('main, [role="main"], #root').first()).toBeVisible();
  });`;
        }
        
        // For child components, generate smarter locators based on likely content
        const sectionHints = this.getSectionHints(componentName);
        return `  test('should display ${componentName} section', async ({ page }) => {
    await page.goto('${route}');
    // Look for ${componentName} by its likely content
    ${sectionHints.locator}
    ${sectionHints.assertion}
  });`;
      
      case 'hook':
        if (element.name === 'useState') {
          return `  test('should handle state changes', async ({ page }) => {
    await page.goto('${route}');
    // Interact with stateful elements
    const interactiveElement = page.locator('button, [role="button"], input').first();
    if (await interactiveElement.isVisible()) {
      await interactiveElement.click();
      // State should update (verify visually or via assertions)
    }
  });`;
        }
        if (element.name === 'useEffect') {
          return `  test('should complete side effects on load', async ({ page }) => {
    await page.goto('${route}');
    // Wait for async effects to complete
    await page.waitForLoadState('networkidle');
    // Page should be fully rendered
    await expect(page.locator('body')).not.toBeEmpty();
  });`;
        }
        return null;
      
      case 'function':
        if (element.name.includes('Click') || element.name.includes('click')) {
          const handlerName = element.name.split('→')[1]?.trim().replace('()', '') || 'handler';
          return `  test('should handle click event (${handlerName})', async ({ page }) => {
    await page.goto('${route}');
    const clickableElement = page.locator('button, [role="button"], a[href]').first();
    await expect(clickableElement).toBeVisible();
    await clickableElement.click();
    // Verify click effect (navigation, state change, etc.)
  });`;
        }
        if (element.name.includes('Submit') || element.name.includes('submit')) {
          return `  test('should handle form submission', async ({ page }) => {
    await page.goto('${route}');
    const form = page.locator('form');
    if (await form.isVisible()) {
      // Fill form fields
      await form.locator('input').first().fill('test value');
      // Submit
      await form.locator('button[type="submit"], input[type="submit"]').click();
      // Verify submission effect
    }
  });`;
        }
        if (element.name.includes('Change') || element.name.includes('change')) {
          return `  test('should handle input changes', async ({ page }) => {
    await page.goto('${route}');
    const input = page.locator('input, textarea, select').first();
    if (await input.isVisible()) {
      await input.fill('test input');
      await expect(input).toHaveValue('test input');
    }
  });`;
        }
        return null;
      
      case 'element':
        if (element.name.includes('form')) {
          return `  test('should render form with validation', async ({ page }) => {
    await page.goto('${route}');
    const form = page.locator('form');
    await expect(form).toBeVisible();
    // Check for required fields
    const requiredFields = form.locator('[required], [aria-required="true"]');
    const count = await requiredFields.count();
    expect(count).toBeGreaterThan(0);
  });`;
        }
        if (element.name.includes('Navigation')) {
          return `  test('should have working navigation links', async ({ page }) => {
    await page.goto('${route}');
    const links = page.locator('a[href^="/"], nav a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    // Verify first link is clickable
    const firstLink = links.first();
    await expect(firstLink).toBeVisible();
  });`;
        }
        if (element.name.includes('Conditional')) {
          return `  test('should handle conditional rendering states', async ({ page }) => {
    await page.goto('${route}');
    // Page should render one of the conditional states
    await expect(page.locator('body')).not.toBeEmpty();
  });`;
        }
        return null;
      
      case 'effect':
        if (element.name.includes('API')) {
          return `  test('should handle API data loading', async ({ page }) => {
    await page.goto('${route}');
    // Wait for API calls to complete
    await page.waitForLoadState('networkidle');
    // Content should be loaded (no loading spinners)
    await expect(page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]')).toHaveCount(0);
  });`;
        }
        return null;
      
      default:
        return null;
    }
  }
  
  /**
   * Generate Playwright test for additional options
   */
  private generatePlaywrightTestForOption(
    option: AdditionalTestOption, 
    route: string,
    baseName: string
  ): string | null {
    switch (option.id) {
      case 'opt-0': // Mobile Responsive
        return `  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('${route}');
    await expect(page.locator('body')).toBeVisible();
    // Check mobile menu or responsive elements
    const mobileMenu = page.locator('[class*="mobile"], [class*="hamburger"], [aria-label*="menu"]');
    // Mobile-specific assertions can be added here
  });`;
      
      case 'opt-1': // Dark Mode
        return `  test('should support dark mode', async ({ page }) => {
    await page.goto('${route}');
    // Toggle dark mode if available
    const themeToggle = page.locator('[class*="theme"], [aria-label*="theme"], [aria-label*="dark"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      // Verify dark mode is applied
      await expect(page.locator('html, body')).toHaveAttribute('class', /dark/);
    }
  });`;
      
      case 'opt-2': // Accessibility
        return `  test('should be accessible', async ({ page }) => {
    await page.goto('${route}');
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
  });`;
      
      case 'opt-3': // Error Handling
        return `  test('should handle errors gracefully', async ({ page }) => {
    // Intercept and fail an API request to test error handling
    await page.route('**/api/**', route => route.abort());
    await page.goto('${route}');
    // Should show error state, not crash
    await expect(page.locator('body')).toBeVisible();
  });`;
      
      case 'opt-4': // Loading States
        return `  test('should show loading states', async ({ page }) => {
    // Slow down network to observe loading states
    await page.route('**/*', async route => {
      await new Promise(r => setTimeout(r, 100));
      await route.continue();
    });
    await page.goto('${route}');
    // Page should handle loading gracefully
    await page.waitForLoadState('domcontentloaded');
  });`;
      
      case 'opt-5': // Edge Cases
        return `  test('should handle edge cases', async ({ page }) => {
    await page.goto('${route}');
    // Test empty state
    await expect(page.locator('body')).not.toBeEmpty();
    // Test with different viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });`;
      
      default:
        // For dynamically generated options, try to match by label
        if (option.label.toLowerCase().includes('mobile')) {
          return this.generatePlaywrightTestForOption({ ...option, id: 'opt-0' }, route, baseName);
        }
        if (option.label.toLowerCase().includes('dark')) {
          return this.generatePlaywrightTestForOption({ ...option, id: 'opt-1' }, route, baseName);
        }
        if (option.label.toLowerCase().includes('access')) {
          return this.generatePlaywrightTestForOption({ ...option, id: 'opt-2' }, route, baseName);
        }
        if (option.label.toLowerCase().includes('error')) {
          return this.generatePlaywrightTestForOption({ ...option, id: 'opt-3' }, route, baseName);
        }
        if (option.label.toLowerCase().includes('loading')) {
          return this.generatePlaywrightTestForOption({ ...option, id: 'opt-4' }, route, baseName);
        }
        if (option.label.toLowerCase().includes('edge')) {
          return this.generatePlaywrightTestForOption({ ...option, id: 'opt-5' }, route, baseName);
        }
        return null;
    }
  }
  
  /**
   * Generate React Testing Library tests
   */
  private generateRTLTests(
    baseName: string,
    sourceFilePath: string,
    elements: DetectedElement[],
    options: AdditionalTestOption[]
  ): string {
    const componentName = baseName;
    const relativePath = this.getRelativeImportPath(sourceFilePath);
    
    const tests: string[] = [];
    
    // Import statement
    let imports = `import { render, screen, fireEvent } from '@testing-library/react';
import ${componentName} from '${relativePath}';`;
    
    // Generate tests for each element
    for (const element of elements) {
      if (element.type === 'component' && element.name.includes('(main)')) {
        tests.push(`  it('should render without crashing', () => {
    render(<${componentName} />);
    expect(document.body).toBeTruthy();
  });`);
      }
      
      if (element.type === 'function' && element.name.includes('Click')) {
        tests.push(`  it('should handle click events', () => {
    render(<${componentName} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Add assertion for expected behavior
  });`);
      }
    }
    
    if (tests.length === 0) {
      tests.push(`  it('should render ${componentName}', () => {
    render(<${componentName} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });`);
    }
    
    return `${imports}

describe('${componentName}', () => {
${tests.join('\n\n')}
});
`;
  }
  
  /**
   * Generate Jest unit tests
   */
  private generateJestTests(
    baseName: string,
    sourceFilePath: string,
    elements: DetectedElement[],
    options: AdditionalTestOption[]
  ): string {
    const tests: string[] = [];
    const isReactComponent = sourceFilePath.endsWith('.tsx') || sourceFilePath.endsWith('.jsx');
    const relativePath = this.getRelativeImportPath(sourceFilePath);
    
    let imports = '';
    
    if (isReactComponent) {
      imports = `import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ${baseName} from '${relativePath}';
`;
      
      // Add render test for main component
      const hasMainComponent = elements.some(e => e.type === 'component' && e.name.includes('(main)'));
      if (hasMainComponent || elements.length === 0) {
        tests.push(`  it('renders ${baseName} component', () => {
    render(<${baseName} />);
    expect(document.body).toBeInTheDocument();
  });`);
      }
      
      // Generate tests for detected elements
      for (const element of elements) {
        if (element.type === 'hook' && element.name === 'useState') {
          tests.push(`  it('handles state changes correctly', () => {
    render(<${baseName} />);
    // Find interactive element that triggers state change
    const button = screen.queryByRole('button');
    if (button) {
      fireEvent.click(button);
      // Assert state change effect
    }
  });`);
        }
        
        if (element.type === 'function' && element.name.includes('Click')) {
          tests.push(`  it('handles click events', () => {
    render(<${baseName} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Assert expected behavior after click
  });`);
        }
      }
      
      // Add accessibility test option
      const hasA11y = options.some(o => o.id === 'a11y');
      if (hasA11y) {
        tests.push(`  it('is accessible', () => {
    render(<${baseName} />);
    // Check for accessible elements
    const main = screen.queryByRole('main');
    expect(main || document.body).toBeInTheDocument();
  });`);
      }
    } else {
      // Non-React file - generate function tests
      for (const element of elements) {
        if (element.type === 'function') {
          const funcName = element.name.replace('()', '').split('→').pop()?.trim() || element.name;
          tests.push(`  it('${funcName} works correctly', () => {
    // Arrange
    const input = {};
    
    // Act  
    const result = ${funcName}(input);
    
    // Assert
    expect(result).toBeDefined();
  });`);
        }
      }
    }
    
    // Fallback if no tests generated
    if (tests.length === 0) {
      if (isReactComponent) {
        tests.push(`  it('renders without crashing', () => {
    render(<${baseName} />);
    expect(document.body).toBeInTheDocument();
  });`);
      } else {
        tests.push(`  it('module loads correctly', () => {
    // Add specific tests for your functions
    expect(true).toBe(true);
  });`);
      }
    }
    
    return `${imports}
describe('${baseName}', () => {
${tests.join('\n\n')}
});
`;
  }
  
  /**
   * Infer route from file path (for Next.js App Router)
   */
  private inferRouteFromPath(filePath: string): string {
    // Extract path after /app/ or /pages/
    const appMatch = filePath.match(/[/\\]app[/\\](.+)[/\\]page\.(tsx?|jsx?)$/);
    const pagesMatch = filePath.match(/[/\\]pages[/\\](.+)\.(tsx?|jsx?)$/);
    
    if (appMatch) {
      const routePath = appMatch[1]
        .replace(/\\/g, '/')
        .replace(/\([^)]+\)\/?/g, '') // Remove route groups like (marketing)
        .replace(/\[([^\]]+)\]/g, ':$1'); // Convert [id] to :id
      return '/' + routePath;
    }
    
    if (pagesMatch) {
      const routePath = pagesMatch[1]
        .replace(/\\/g, '/')
        .replace(/index$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1');
      return '/' + routePath;
    }
    
    // Default to root
    return '/';
  }
  
  /**
   * Get relative import path for component
   */
  private getRelativeImportPath(filePath: string): string {
    const ext = path.extname(filePath);
    return './' + path.basename(filePath, ext);
  }
  
  /**
   * Convert string to Title Case
   */
  private toTitleCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s/g, '');
  }
  
  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }
  
  /**
   * Get smarter locators based on component name patterns
   */
  private getSectionHints(componentName: string): { locator: string; assertion: string } {
    const name = componentName.toLowerCase();
    
    // Map common section names to likely text content or elements
    // IMPORTANT: Always use .first() and avoid .or() to prevent strict mode violations
    if (name.includes('hero')) {
      return {
        locator: `const heading = page.getByRole('heading', { level: 1 }).first();`,
        assertion: `await expect(heading).toBeVisible();`
      };
    }
    
    if (name.includes('faq')) {
      return {
        locator: `const faqHeading = page.getByRole('heading', { name: /FAQ|Frequently Asked|Questions/i }).first();`,
        assertion: `await expect(faqHeading).toBeVisible();`
      };
    }
    
    if (name.includes('cta') || name.includes('calltoaction')) {
      return {
        locator: `const ctaButton = page.getByRole('button', { name: /start|try|get|join|sign|access/i }).first();`,
        assertion: `await expect(ctaButton).toBeVisible();`
      };
    }
    
    if (name.includes('navigation') || name.includes('nav') || name.includes('header')) {
      return {
        locator: `const nav = page.locator('nav').first();`,
        assertion: `await expect(nav).toBeVisible();`
      };
    }
    
    if (name.includes('footer')) {
      return {
        locator: `const footer = page.locator('footer').first();`,
        assertion: `await expect(footer).toBeVisible();`
      };
    }
    
    if (name.includes('form') || name.includes('contact')) {
      return {
        locator: `const form = page.locator('form').first();`,
        assertion: `await expect(form).toBeVisible();`
      };
    }
    
    if (name.includes('metric') || name.includes('stats') || name.includes('counter')) {
      return {
        locator: `const metrics = page.locator('section').filter({ hasText: /[0-9]+/ }).first();`,
        assertion: `await expect(metrics).toBeVisible();`
      };
    }
    
    if (name.includes('pricing')) {
      return {
        locator: `const pricing = page.getByText(/pricing|\$|plan/i).first();`,
        assertion: `await expect(pricing).toBeVisible();`
      };
    }
    
    if (name.includes('testimonial') || name.includes('review')) {
      return {
        locator: `const testimonial = page.locator('blockquote').first();`,
        assertion: `await expect(testimonial).toBeVisible();`
      };
    }
    
    if (name.includes('feature') || name.includes('capabilities') || name.includes('benefit')) {
      return {
        locator: `const section = page.locator('section').nth(2);`,
        assertion: `await expect(section).toBeVisible();`
      };
    }
    
    if (name.includes('install') || name.includes('getting')) {
      return {
        locator: `const heading = page.getByRole('heading', { name: /install|getting started|ready|setup/i }).first();`,
        assertion: `await expect(heading).toBeVisible();`
      };
    }
    
    if (name.includes('value') || name.includes('core')) {
      return {
        locator: `const section = page.locator('section').nth(1);`,
        assertion: `await expect(section).toBeVisible();`
      };
    }
    
    // Default fallback - just check the section exists
    return {
      locator: `const section = page.locator('section').first();`,
      assertion: `await expect(section).toBeVisible();`
    };
  }
}
