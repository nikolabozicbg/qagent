import * as vscode from 'vscode';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

/**
 * Discovered route information
 */
export interface DiscoveredRoute {
  path: string;
  title: string;
  sourceFile?: string;
  screenshot?: string; // Base64 encoded
  elements: DiscoveredElement[];
  forms: DiscoveredForm[];
  apiCalls: DiscoveredApiCall[];
  depth: number;
  parentRoute?: string;
}

/**
 * Interactive element on a page
 */
export interface DiscoveredElement {
  type: 'button' | 'link' | 'input' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'other';
  selector: string;
  text?: string;
  role?: string;
  href?: string;
  name?: string;
  id?: string;
  testId?: string;
  ariaLabel?: string;
}

/**
 * Form on a page
 */
export interface DiscoveredForm {
  selector: string;
  action?: string;
  method?: string;
  fields: DiscoveredElement[];
  submitButton?: DiscoveredElement;
}

/**
 * API call made by the page
 */
export interface DiscoveredApiCall {
  url: string;
  method: string;
  status?: number;
  timestamp: number;
}

/**
 * Crawl result
 */
export interface CrawlResult {
  baseUrl: string;
  routes: DiscoveredRoute[];
  totalElements: number;
  totalForms: number;
  totalApiCalls: number;
  crawlDuration: number;
  timestamp: number;
}

/**
 * Crawl options
 */
export interface CrawlOptions {
  maxDepth: number;
  maxRoutes: number;
  timeout: number;
  captureScreenshots: boolean;
  followExternalLinks: boolean;
}

const DEFAULT_OPTIONS: CrawlOptions = {
  maxDepth: 3,
  maxRoutes: 50,
  timeout: 30000,
  captureScreenshots: true,
  followExternalLinks: false
};

/**
 * RouteCrawlerService
 * 
 * Uses Playwright to crawl a running web application and discover:
 * - All accessible routes
 * - Interactive elements (buttons, links, forms)
 * - API calls made by each page
 * - Page screenshots for visual reference
 */
export class RouteCrawlerService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private visitedUrls: Set<string> = new Set();
  private routes: Map<string, DiscoveredRoute> = new Map();
  private apiCalls: DiscoveredApiCall[] = [];
  private outputChannel: vscode.OutputChannel;
  
  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('QAgenAI Route Crawler');
  }
  
  /**
   * Crawl the application starting from base URL
   */
  async crawl(baseUrl: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    
    this.outputChannel.show(true);
    this.outputChannel.appendLine(`🔍 Starting route discovery at ${baseUrl}`);
    this.outputChannel.appendLine(`   Options: maxDepth=${opts.maxDepth}, maxRoutes=${opts.maxRoutes}`);
    this.outputChannel.appendLine('');
    
    // Reset state
    this.visitedUrls.clear();
    this.routes.clear();
    this.apiCalls = [];
    
    try {
      // Launch browser
      this.browser = await chromium.launch({ headless: true });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'QAgenAI Route Crawler'
      });
      
      // Start crawling from root
      await this.crawlRoute(baseUrl, '/', 0, opts);
      
      const routes = Array.from(this.routes.values());
      const result: CrawlResult = {
        baseUrl,
        routes,
        totalElements: routes.reduce((sum, r) => sum + r.elements.length, 0),
        totalForms: routes.reduce((sum, r) => sum + r.forms.length, 0),
        totalApiCalls: this.apiCalls.length,
        crawlDuration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
      this.outputChannel.appendLine('');
      this.outputChannel.appendLine(`✅ Crawl complete!`);
      this.outputChannel.appendLine(`   📍 Routes discovered: ${routes.length}`);
      this.outputChannel.appendLine(`   🎯 Elements found: ${result.totalElements}`);
      this.outputChannel.appendLine(`   📝 Forms found: ${result.totalForms}`);
      this.outputChannel.appendLine(`   📡 API calls tracked: ${result.totalApiCalls}`);
      this.outputChannel.appendLine(`   ⏱️ Duration: ${result.crawlDuration}ms`);
      
      return result;
      
    } finally {
      await this.cleanup();
    }
  }
  
  /**
   * Crawl a single route
   */
  private async crawlRoute(
    baseUrl: string, 
    path: string, 
    depth: number, 
    options: CrawlOptions,
    parentRoute?: string
  ): Promise<void> {
    const fullUrl = this.normalizeUrl(baseUrl, path);
    
    // Check limits
    if (depth > options.maxDepth) return;
    if (this.routes.size >= options.maxRoutes) return;
    if (this.visitedUrls.has(fullUrl)) return;
    
    // Mark as visited
    this.visitedUrls.add(fullUrl);
    
    this.outputChannel.appendLine(`  ├─ Crawling: ${path} (depth: ${depth})`);
    
    const page = await this.context!.newPage();
    const routeApiCalls: DiscoveredApiCall[] = [];
    
    try {
      // Track API calls
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/') || url.includes('/graphql')) {
          routeApiCalls.push({
            url,
            method: request.method(),
            timestamp: Date.now()
          });
        }
      });
      
      page.on('response', (response) => {
        const url = response.url();
        const call = routeApiCalls.find(c => c.url === url && !c.status);
        if (call) {
          call.status = response.status();
        }
      });
      
      // Navigate to page
      await page.goto(fullUrl, { 
        waitUntil: 'networkidle',
        timeout: options.timeout 
      });
      
      // Get page title
      const title = await page.title();
      
      // Discover elements
      const elements = await this.discoverElements(page);
      
      // Discover forms
      const forms = await this.discoverForms(page);
      
      // Capture screenshot
      let screenshot: string | undefined;
      if (options.captureScreenshots) {
        const buffer = await page.screenshot({ type: 'png', fullPage: false });
        screenshot = buffer.toString('base64');
      }
      
      // Create route entry
      const route: DiscoveredRoute = {
        path,
        title,
        elements,
        forms,
        apiCalls: routeApiCalls,
        screenshot,
        depth,
        parentRoute
      };
      
      this.routes.set(path, route);
      this.apiCalls.push(...routeApiCalls);
      
      // Find links to other pages
      const links = await this.discoverLinks(page, baseUrl, options.followExternalLinks);
      
      // Close current page before crawling children
      await page.close();
      
      // Crawl discovered links
      for (const link of links) {
        if (this.routes.size >= options.maxRoutes) break;
        await this.crawlRoute(baseUrl, link, depth + 1, options, path);
      }
      
    } catch (error) {
      this.outputChannel.appendLine(`  │  ⚠️ Error crawling ${path}: ${error}`);
      await page.close();
    }
  }
  
  /**
   * Discover interactive elements on page
   */
  private async discoverElements(page: Page): Promise<DiscoveredElement[]> {
    const elements: DiscoveredElement[] = [];
    
    // Buttons
    const buttons = await page.locator('button, [role="button"], input[type="submit"], input[type="button"]').all();
    for (const btn of buttons) {
      try {
        const element = await this.extractElementInfo(btn, 'button');
        if (element) elements.push(element);
      } catch {}
    }
    
    // Links (non-navigation)
    const links = await page.locator('a[href]:not([href^="http"]):not([href^="/"])').all();
    for (const link of links) {
      try {
        const element = await this.extractElementInfo(link, 'link');
        if (element) elements.push(element);
      } catch {}
    }
    
    // Inputs
    const inputs = await page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"])').all();
    for (const input of inputs) {
      try {
        const type = await input.getAttribute('type');
        const elementType = type === 'checkbox' ? 'checkbox' : 
                          type === 'radio' ? 'radio' : 'input';
        const element = await this.extractElementInfo(input, elementType);
        if (element) elements.push(element);
      } catch {}
    }
    
    // Selects
    const selects = await page.locator('select').all();
    for (const select of selects) {
      try {
        const element = await this.extractElementInfo(select, 'select');
        if (element) elements.push(element);
      } catch {}
    }
    
    // Textareas
    const textareas = await page.locator('textarea').all();
    for (const textarea of textareas) {
      try {
        const element = await this.extractElementInfo(textarea, 'textarea');
        if (element) elements.push(element);
      } catch {}
    }
    
    return elements;
  }
  
  /**
   * Extract element information
   */
  private async extractElementInfo(
    locator: any, 
    type: DiscoveredElement['type']
  ): Promise<DiscoveredElement | null> {
    try {
      const isVisible = await locator.isVisible();
      if (!isVisible) return null;
      
      const text = await locator.innerText().catch(() => '');
      const id = await locator.getAttribute('id');
      const name = await locator.getAttribute('name');
      const testId = await locator.getAttribute('data-testid') || 
                     await locator.getAttribute('data-test-id');
      const ariaLabel = await locator.getAttribute('aria-label');
      const href = await locator.getAttribute('href');
      const role = await locator.getAttribute('role');
      
      // Build best selector
      let selector = '';
      if (testId) {
        selector = `[data-testid="${testId}"]`;
      } else if (id) {
        selector = `#${id}`;
      } else if (name) {
        selector = `[name="${name}"]`;
      } else if (ariaLabel) {
        selector = `[aria-label="${ariaLabel}"]`;
      } else if (text && text.length < 50) {
        selector = `text="${text.trim()}"`;
      }
      
      return {
        type,
        selector,
        text: text?.substring(0, 100),
        role,
        href,
        name,
        id,
        testId,
        ariaLabel
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Discover forms on page
   */
  private async discoverForms(page: Page): Promise<DiscoveredForm[]> {
    const forms: DiscoveredForm[] = [];
    const formLocators = await page.locator('form').all();
    
    for (const formLocator of formLocators) {
      try {
        const isVisible = await formLocator.isVisible();
        if (!isVisible) continue;
        
        const action = await formLocator.getAttribute('action');
        const method = await formLocator.getAttribute('method');
        const id = await formLocator.getAttribute('id');
        
        // Get form fields
        const fields: DiscoveredElement[] = [];
        const fieldLocators = await formLocator.locator('input, select, textarea').all();
        
        for (const field of fieldLocators) {
          const element = await this.extractElementInfo(field, 'input');
          if (element) fields.push(element);
        }
        
        // Find submit button
        let submitButton: DiscoveredElement | undefined;
        const submitLocator = formLocator.locator('button[type="submit"], input[type="submit"]').first();
        if (await submitLocator.count() > 0) {
          submitButton = await this.extractElementInfo(submitLocator, 'button') || undefined;
        }
        
        forms.push({
          selector: id ? `#${id}` : 'form',
          action: action || undefined,
          method: method || undefined,
          fields,
          submitButton
        });
        
      } catch {}
    }
    
    return forms;
  }
  
  /**
   * Discover navigation links
   */
  private async discoverLinks(
    page: Page, 
    baseUrl: string, 
    followExternal: boolean
  ): Promise<string[]> {
    const links: string[] = [];
    const baseUrlObj = new URL(baseUrl);
    
    const anchors = await page.locator('a[href]').all();
    
    for (const anchor of anchors) {
      try {
        const href = await anchor.getAttribute('href');
        if (!href) continue;
        
        // Skip non-navigation links
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
          continue;
        }
        
        // Parse URL
        let url: URL;
        try {
          url = new URL(href, baseUrl);
        } catch {
          continue;
        }
        
        // Check if external
        const isExternal = url.hostname !== baseUrlObj.hostname;
        if (isExternal && !followExternal) continue;
        
        // Get path
        const path = url.pathname;
        
        // Skip if already visited
        if (this.visitedUrls.has(this.normalizeUrl(baseUrl, path))) continue;
        
        // Skip common non-page routes
        if (this.isNonPageRoute(path)) continue;
        
        links.push(path);
        
      } catch {}
    }
    
    // Deduplicate and return
    return [...new Set(links)];
  }
  
  /**
   * Check if path is a non-page route (assets, etc.)
   */
  private isNonPageRoute(path: string): boolean {
    const nonPagePatterns = [
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
      /^\/api\//,
      /^\/_next\//,
      /^\/static\//,
      /^\/assets\//
    ];
    
    return nonPagePatterns.some(pattern => pattern.test(path));
  }
  
  /**
   * Normalize URL
   */
  private normalizeUrl(base: string, path: string): string {
    try {
      const url = new URL(path, base);
      // Remove trailing slash and query string for comparison
      return url.origin + url.pathname.replace(/\/$/, '');
    } catch {
      return base + path;
    }
  }
  
  /**
   * Cleanup browser resources
   */
  private async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.cleanup();
    this.outputChannel.dispose();
  }
}
