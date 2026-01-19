/**
 * V9 Runtime Observation Graph Explorer
 * 
 * Uses Playwright to explore the running application and build ROG.
 * Captures interactive elements, selectors, and runtime observations.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import type {
  RuntimeObservationGraphV9,
  RuntimePageV9,
  RuntimeInteractiveElementV9,
  RuntimeObservationV9,
  ProjectInfo,
  StaticBehaviorGraphV9,
} from './types';

export interface ExplorationConfig {
  baseUrl: string;
  maxPages: number;
  maxInteractionsPerPage: number;
  timeoutMs: number;
  headless: boolean;
}

const DEFAULT_CONFIG: ExplorationConfig = {
  baseUrl: 'http://localhost:3000',
  maxPages: 20,
  maxInteractionsPerPage: 10,
  timeoutMs: 60000,
  headless: true,
};

/**
 * Explore the application and build Runtime Observation Graph
 */
export async function buildRuntimeObservationGraph(
  project: ProjectInfo,
  sbg: StaticBehaviorGraphV9,
  config: Partial<ExplorationConfig> = {},
  onProgress?: (msg: string, pagesExplored: number, elementsFound: number) => void
): Promise<RuntimeObservationGraphV9> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = new Date().toISOString();
  
  const pages: RuntimePageV9[] = [];
  const allObservations: RuntimeObservationV9[] = [];
  let interactionsPerformed = 0;
  let errorsEncountered = 0;

  // Extract routes to visit from SBG
  const routesToVisit = extractRoutesFromSBG(sbg);
  onProgress?.(`Found ${routesToVisit.length} routes to explore`, 0, 0);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: cfg.headless });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // Set up network observation
    const networkObservations: RuntimeObservationV9[] = [];
    await context.route('**/*', async (route, request) => {
      const url = request.url();
      
      // Only track API calls
      if (url.includes('/api/') || url.includes('/graphql')) {
        networkObservations.push({
          id: `obs:network:${Date.now()}:${Math.random().toString(36).slice(2)}`,
          type: 'network',
          timestamp: new Date().toISOString(),
          url: url,
          data: {
            method: request.method(),
            resourceType: request.resourceType(),
          },
        });
      }

      await route.continue();
    });

    const page = await context.newPage();

    // Explore each route
    for (let i = 0; i < Math.min(routesToVisit.length, cfg.maxPages); i++) {
      const route = routesToVisit[i];
      const fullUrl = `${cfg.baseUrl}${route}`;

      onProgress?.(`Exploring ${route}`, i + 1, pages.reduce((s, p) => s + p.elements.length, 0));

      try {
        // Navigate to page
        await page.goto(fullUrl, { 
          waitUntil: 'networkidle',
          timeout: cfg.timeoutMs / routesToVisit.length,
        });

        // Wait for any dynamic content
        await page.waitForTimeout(500);

        // Capture page data
        const pageData = await capturePageData(page, route, networkObservations);
        pages.push(pageData);

        // Clear network observations for next page
        networkObservations.length = 0;

        interactionsPerformed += pageData.elements.length;

      } catch (error) {
        console.error(`Error exploring ${route}:`, error);
        errorsEncountered++;
        
        allObservations.push({
          id: `obs:error:${Date.now()}`,
          type: 'error',
          timestamp: new Date().toISOString(),
          url: fullUrl,
          data: {
            message: (error as Error).message,
            route,
          },
        });
      }
    }

    await browser.close();

  } catch (error) {
    console.error('Browser exploration failed:', error);
    errorsEncountered++;
    
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  const endTime = new Date().toISOString();

  return {
    version: 'v9-rog',
    project,
    pages,
    observations: allObservations,
    exploration: {
      startTime,
      endTime,
      pagesVisited: pages.length,
      interactionsPerformed,
      errorsEncountered,
    },
  };
}

/**
 * Extract unique routes from Static Behavior Graph
 */
function extractRoutesFromSBG(sbg: StaticBehaviorGraphV9): string[] {
  const routes = new Set<string>();

  for (const node of sbg.nodes) {
    if (node.route) {
      routes.add(normalizeRoute(node.route));
    }
    if (node.metadata.href && typeof node.metadata.href === 'string') {
      routes.add(normalizeRoute(node.metadata.href));
    }
  }

  // Sort routes - prioritize auth pages first, then alphabetically
  const routeList = Array.from(routes);
  return routeList.sort((a, b) => {
    const aIsAuth = a.includes('login') || a.includes('signin') || a.includes('signup');
    const bIsAuth = b.includes('login') || b.includes('signin') || b.includes('signup');
    
    if (aIsAuth && !bIsAuth) return -1;
    if (bIsAuth && !aIsAuth) return 1;
    
    // Home page first
    if (a === '/') return -1;
    if (b === '/') return 1;
    
    return a.localeCompare(b);
  });
}

function normalizeRoute(route: string): string {
  // Remove trailing slashes
  let normalized = route.replace(/\/+$/, '') || '/';
  
  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  // Skip dynamic segments for now
  if (normalized.includes(':') || normalized.includes('[')) {
    return normalized.replace(/:[^/]+/g, 'test').replace(/\[[^\]]+\]/g, 'test');
  }

  return normalized;
}

/**
 * Capture all interactive elements and observations on a page
 */
async function capturePageData(
  page: Page,
  route: string,
  networkObservations: RuntimeObservationV9[]
): Promise<RuntimePageV9> {
  const elements: RuntimeInteractiveElementV9[] = [];
  const observations: RuntimeObservationV9[] = [...networkObservations];

  const url = normalizeRoute(new URL(page.url()).pathname);
  const title = await page.title();

  // Capture forms
  const forms = await page.locator('form').all();
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    try {
      const selector = await generateStableSelector(page, form, 'form', i);
      elements.push({
        id: `rog:${url}:form:${i}`,
        selector: selector.best,
        selectorStability: selector.stability,
        selectorCandidates: selector.candidates,
        type: 'form',
        text: null,
        pageUrl: url,
      });
    } catch {
      // Skip if we can't get selector
    }
  }

  // Capture inputs
  const inputs = await page.locator('input:not([type="hidden"]), textarea, select').all();
  for (let i = 0; i < Math.min(inputs.length, 20); i++) {
    const input = inputs[i];
    try {
      const selector = await generateStableSelector(page, input, 'input', i);
      const placeholder = await input.getAttribute('placeholder');
      const name = await input.getAttribute('name');
      
      elements.push({
        id: `rog:${url}:input:${i}`,
        selector: selector.best,
        selectorStability: selector.stability,
        selectorCandidates: selector.candidates,
        type: 'input',
        text: placeholder || name || null,
        pageUrl: url,
      });
    } catch {
      // Skip if we can't get selector
    }
  }

  // Capture buttons
  const buttons = await page.locator('button, [role="button"], input[type="submit"]').all();
  for (let i = 0; i < Math.min(buttons.length, 10); i++) {
    const button = buttons[i];
    try {
      const selector = await generateStableSelector(page, button, 'button', i);
      const text = await button.textContent();
      
      elements.push({
        id: `rog:${url}:button:${i}`,
        selector: selector.best,
        selectorStability: selector.stability,
        selectorCandidates: selector.candidates,
        type: 'button',
        text: text?.trim() || null,
        pageUrl: url,
      });
    } catch {
      // Skip if we can't get selector
    }
  }

  // Capture links
  const links = await page.locator('a[href]').all();
  for (let i = 0; i < Math.min(links.length, 15); i++) {
    const link = links[i];
    try {
      const href = await link.getAttribute('href');
      // Only capture internal links
      if (!href || href.startsWith('http') || href.startsWith('mailto')) continue;
      
      const selector = await generateStableSelector(page, link, 'link', i);
      const text = await link.textContent();
      
      elements.push({
        id: `rog:${url}:link:${i}`,
        selector: selector.best,
        selectorStability: selector.stability,
        selectorCandidates: selector.candidates,
        type: 'link',
        text: text?.trim() || null,
        pageUrl: url,
      });
    } catch {
      // Skip if we can't get selector
    }
  }

  return {
    url,
    title,
    elements,
    observations,
  };
}

interface SelectorResult {
  best: string;
  stability: number;
  candidates: Array<{ selector: string; stability: number; strategy: string }>;
}

/**
 * Generate stable selector with multiple fallback strategies
 */
async function generateStableSelector(
  page: Page,
  locator: any,
  elementType: string,
  index: number
): Promise<SelectorResult> {
  const candidates: Array<{ selector: string; stability: number; strategy: string }> = [];

  // Strategy 1: data-testid (most stable)
  try {
    const testId = await locator.getAttribute('data-testid');
    if (testId) {
      const selector = `[data-testid="${testId}"]`;
      if (await isUniqueSelector(page, selector)) {
        candidates.push({ selector, stability: 1.0, strategy: 'data-testid' });
      }
    }
  } catch {}

  // Strategy 2: id attribute
  try {
    const id = await locator.getAttribute('id');
    if (id && !id.includes(':') && !id.includes('r')) { // Skip React auto-generated IDs
      const selector = `#${id}`;
      if (await isUniqueSelector(page, selector)) {
        candidates.push({ selector, stability: 0.9, strategy: 'id' });
      }
    }
  } catch {}

  // Strategy 3: name attribute (for inputs)
  try {
    const name = await locator.getAttribute('name');
    if (name) {
      const selector = `[name="${name}"]`;
      if (await isUniqueSelector(page, selector)) {
        candidates.push({ selector, stability: 0.85, strategy: 'name' });
      }
    }
  } catch {}

  // Strategy 4: aria-label
  try {
    const ariaLabel = await locator.getAttribute('aria-label');
    if (ariaLabel) {
      const selector = `[aria-label="${ariaLabel}"]`;
      if (await isUniqueSelector(page, selector)) {
        candidates.push({ selector, stability: 0.8, strategy: 'aria-label' });
      }
    }
  } catch {}

  // Strategy 5: type + role combination
  try {
    const type = await locator.getAttribute('type');
    const role = await locator.getAttribute('role');
    if (type || role) {
      const parts: string[] = [];
      if (elementType === 'button') parts.push('button');
      if (type) parts.push(`[type="${type}"]`);
      if (role) parts.push(`[role="${role}"]`);
      
      const selector = parts.join('');
      if (selector && await isUniqueSelector(page, selector)) {
        candidates.push({ selector, stability: 0.7, strategy: 'type-role' });
      }
    }
  } catch {}

  // Strategy 6: nth-child fallback (least stable)
  if (candidates.length === 0) {
    const selector = `${elementType}:nth-of-type(${index + 1})`;
    candidates.push({ selector, stability: 0.3, strategy: 'nth-of-type' });
  }

  // Sort by stability and return best
  candidates.sort((a, b) => b.stability - a.stability);
  
  return {
    best: candidates[0].selector,
    stability: candidates[0].stability,
    candidates,
  };
}

async function isUniqueSelector(page: Page, selector: string): Promise<boolean> {
  try {
    const count = await page.locator(selector).count();
    return count === 1;
  } catch {
    return false;
  }
}
