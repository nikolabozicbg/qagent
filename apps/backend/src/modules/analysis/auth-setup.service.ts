import { Injectable } from '@nestjs/common';
import { SeedDataParserService } from './seed-data-parser.service';

export interface AuthSetup {
  required: boolean;
  method: 'ui' | 'api';
  setupCode: string[];
}

/**
 * AuthSetupService
 * 
 * Determines if a route requires authentication and generates appropriate setup code.
 * Uses both heuristics and metadata to detect protected routes.
 * 
 * Goal: Auto-inject login setup for /bankaccounts, /transaction/new, etc.
 */
@Injectable()
export class AuthSetupService {
  constructor(
    private readonly seedDataParser: SeedDataParserService
  ) {}
  
  /**
   * Determine if route requires auth and generate setup
   */
  getAuthSetup(route: string, journey: any, projectRoot?: string): AuthSetup {
    const requiresAuth = this.requiresAuthentication(route, journey);
    
    if (!requiresAuth) {
      return {
        required: false,
        method: 'ui',
        setupCode: []
      };
    }
    
    // Get seed user for auth
    const seedUser = projectRoot 
      ? this.seedDataParser.getLoginUser(projectRoot)
      : null;
    
    const username = seedUser?.username || 'testuser';
    const password = seedUser?.password || 'password';
    
    // Generate auth setup code
    const setupCode = this.generateAuthSetup(username, password, 'ui');
    
    return {
      required: true,
      method: 'ui',
      setupCode
    };
  }
  
  /**
   * Detect if route requires authentication
   * Uses multiple strategies:
   * 1. Metadata from journey (requiresAuth flag)
   * 2. Route pattern matching (protected routes)
   * 3. Component analysis (auth checks in code)
   */
  private requiresAuthentication(route: string, journey: any): boolean {
    // Strategy 1: Check journey metadata
    if (journey.metadata?.requiresAuth === true) {
      return true;
    }
    if (journey.requiresAuth === true) {
      return true;
    }
    
    // Strategy 2: Known protected route patterns
    const protectedPatterns = [
      '/account', '/accounts', '/bankaccounts',
      '/transaction', '/transactions',
      '/payment', '/payments',
      '/profile', '/settings',
      '/admin', '/dashboard',
      '/user', '/users',
    ];
    
    for (const pattern of protectedPatterns) {
      if (route.toLowerCase().includes(pattern)) {
        return true;
      }
    }
    
    // Strategy 3: Exclude public routes
    const publicRoutes = [
      '/', '/home', '/about',
      '/signin', '/login',
      '/signup', '/register',
      '/forgot-password', '/reset-password'
    ];
    
    if (publicRoutes.includes(route.toLowerCase())) {
      return false;
    }
    
    // Default: assume protected if not explicitly public
    return false;
  }
  
  /**
   * Generate authentication setup code
   */
  private generateAuthSetup(username: string, password: string, method: 'ui' | 'api'): string[] {
    if (method === 'api') {
      return this.generateAPIAuthSetup(username, password);
    } else {
      return this.generateUIAuthSetup(username, password);
    }
  }
  
  /**
   * Generate UI-based auth setup (login via /signin page)
   * Simple but slower - requires navigating to login page
   */
  private generateUIAuthSetup(username: string, password: string): string[] {
    return [
      `  test.beforeEach(async ({ page }) => {`,
      `    // Auto-login before each test (protected route)`,
      `    await page.goto('/signin');`,
      `    await page.locator('[name="username"]').fill('${username}');`,
      `    await page.locator('[name="password"]').fill('${password}');`,
      `    await page.click('button[type="submit"]');`,
      `    `,
      `    // Wait for login to complete`,
      `    await page.waitForURL(/\\/(dashboard|home|$)/, { timeout: 5000 });`,
      `  });`,
      ``
    ];
  }
  
  /**
   * Generate API-based auth setup (login via direct API call)
   * Faster and more reliable - bypasses UI completely
   */
  private generateAPIAuthSetup(username: string, password: string): string[] {
    return [
      `  test.beforeEach(async ({ page }) => {`,
      `    // Fast API-based login (protected route)`,
      `    const response = await page.request.post('/api/login', {`,
      `      data: { username: '${username}', password: '${password}' }`,
      `    });`,
      `    `,
      `    // Playwright automatically saves cookies/session`,
      `    expect(response.ok()).toBeTruthy();`,
      `  });`,
      ``
    ];
  }
  
  /**
   * Generate storage state setup (most efficient for multiple tests)
   * Login once, reuse session across all tests
   */
  generateStorageStateSetup(username: string, password: string): string[] {
    return [
      `// Global auth setup - run once, reuse for all tests`,
      `import { test as setup } from '@playwright/test';`,
      ``,
      `const authFile = 'playwright/.auth/user.json';`,
      ``,
      `setup('authenticate', async ({ page }) => {`,
      `  await page.goto('/signin');`,
      `  await page.locator('[name="username"]').fill('${username}');`,
      `  await page.locator('[name="password"]').fill('${password}');`,
      `  await page.click('button[type="submit"]');`,
      `  `,
      `  await page.waitForURL(/\\/(dashboard|home|$)/);`,
      `  `,
      `  // Save signed-in state`,
      `  await page.context().storageState({ path: authFile });`,
      `});`
    ];
  }
}
