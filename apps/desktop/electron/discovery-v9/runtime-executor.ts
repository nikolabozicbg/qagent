/**
 * V9 Runtime Action Executor
 * 
 * Executes candidate actions in Playwright and observes their effects.
 * This is the CORE of runtime-first verification.
 * 
 * For each candidate action:
 * 1. Navigate to source page
 * 2. Set up observers (network, DOM, storage)
 * 3. Execute the action
 * 4. Capture all observable effects
 * 5. Return observation for verification
 */

import { chromium, Browser, Page, BrowserContext, Request, Response } from 'playwright';
import type {
  CandidateAction,
  ActionObservation,
  ProjectInfo,
} from './types';

export interface ExecutionConfig {
  baseUrl: string;
  timeoutMs: number;
  headless: boolean;
}

const DEFAULT_CONFIG: ExecutionConfig = {
  baseUrl: 'http://localhost:3000',
  timeoutMs: 10000,
  headless: true,
};

export type ProgressCallback = (
  msg: string,
  candidatesExecuted: number,
  totalCandidates: number
) => void;

/**
 * Execute all candidate actions and observe their effects.
 */
export async function executeAndObserveCandidates(
  candidates: CandidateAction[],
  config: Partial<ExecutionConfig> = {},
  onProgress?: ProgressCallback
): Promise<ActionObservation[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const observations: ActionObservation[] = [];

  // Group candidates by source URL for efficient execution
  const candidatesBySourceUrl = groupBySourceUrl(candidates);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: cfg.headless });

    let candidatesExecuted = 0;
    const totalCandidates = candidates.length;

    for (const [sourceUrl, sourceCandidates] of candidatesBySourceUrl) {
      onProgress?.(
        `Executing actions on ${sourceUrl}`,
        candidatesExecuted,
        totalCandidates
      );

      // Execute each candidate on this page
      for (const candidate of sourceCandidates) {
        const observation = await executeCandidate(
          browser,
          candidate,
          cfg
        );
        observations.push(observation);
        candidatesExecuted++;

        onProgress?.(
          `Executed: ${candidate.type} "${candidate.text || candidate.href || 'unknown'}"`,
          candidatesExecuted,
          totalCandidates
        );
      }
    }

    onProgress?.('Execution complete', totalCandidates, totalCandidates);

  } catch (error) {
    console.error('Runtime execution failed:', error);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return observations;
}

/**
 * Execute a single candidate action and observe effects.
 * Each candidate gets a fresh browser context to isolate effects.
 */
async function executeCandidate(
  browser: Browser,
  candidate: CandidateAction,
  config: ExecutionConfig
): Promise<ActionObservation> {
  const observation: ActionObservation = {
    candidateId: candidate.id,
    executed: false,
    executionError: null,
    urlBefore: '',
    urlAfter: null,
    networkCalls: [],
    domMutations: [],
    storageChanges: [],
    screenshotPath: null,
  };

  let context: BrowserContext | null = null;

  try {
    // Create fresh context for isolation
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // Set up network observer
    const networkCalls: ActionObservation['networkCalls'] = [];
    page.on('request', (request: Request) => {
      // Only track API calls, not static assets
      const url = request.url();
      if (isApiCall(url)) {
        networkCalls.push({
          url,
          method: request.method(),
          status: null,
        });
      }
    });

    page.on('response', (response: Response) => {
      const url = response.url();
      if (isApiCall(url)) {
        // Update status for matching request
        const call = networkCalls.find(c => c.url === url && c.status === null);
        if (call) {
          call.status = response.status();
        }
      }
    });

    // Navigate to source page
    const sourceUrl = `${config.baseUrl}${candidate.sourceUrl}`;
    await page.goto(sourceUrl, {
      waitUntil: 'networkidle',
      timeout: config.timeoutMs,
    });

    observation.urlBefore = page.url();

    // Set up storage observer
    const storageBefore = await captureStorage(page);

    // Set up DOM mutation observer
    await page.evaluate(() => {
      (window as any).__domMutations = [];
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node instanceof Element) {
                (window as any).__domMutations.push({
                  type: 'added',
                  selector: getSelector(node),
                  description: `Added ${node.tagName.toLowerCase()}`,
                });
              }
            });
            mutation.removedNodes.forEach((node) => {
              if (node instanceof Element) {
                (window as any).__domMutations.push({
                  type: 'removed',
                  selector: getSelector(node),
                  description: `Removed ${node.tagName.toLowerCase()}`,
                });
              }
            });
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      
      function getSelector(el: Element): string {
        if (el.id) return `#${el.id}`;
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        return el.tagName.toLowerCase();
      }
    });

    // Execute the action based on type
    await executeAction(page, candidate, config.timeoutMs);
    observation.executed = true;

    // Wait for effects to settle
    await page.waitForTimeout(500);

    // Capture URL change
    const currentUrl = page.url();
    if (currentUrl !== observation.urlBefore) {
      observation.urlAfter = currentUrl;
    }

    // Capture network calls
    observation.networkCalls = networkCalls.filter(c => c.status !== null);

    // Capture DOM mutations
    const domMutations = await page.evaluate(() => (window as any).__domMutations || []);
    observation.domMutations = domMutations.slice(0, 10); // Limit to significant mutations

    // Capture storage changes
    const storageAfter = await captureStorage(page);
    observation.storageChanges = diffStorage(storageBefore, storageAfter);

  } catch (error) {
    observation.executionError = (error as Error).message;
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }

  return observation;
}

/**
 * Execute an action based on candidate type.
 */
async function executeAction(
  page: Page,
  candidate: CandidateAction,
  timeoutMs: number
): Promise<void> {
  const timeout = timeoutMs / 2;

  if (candidate.type === 'link') {
    // For links, prefer href-based navigation if available
    if (candidate.href) {
      // Try to find and click the link
      const selector = buildSelector(candidate);
      if (selector) {
        try {
          await page.click(selector, { timeout });
          await page.waitForLoadState('networkidle', { timeout });
          return;
        } catch {
          // Fallback: navigate directly
        }
      }
      // Direct navigation as fallback
      await page.goto(candidate.href, { waitUntil: 'networkidle', timeout });
    }
    return;
  }

  if (candidate.type === 'button') {
    const selector = buildSelector(candidate);
    if (!selector) {
      throw new Error('No selector available for button');
    }
    await page.click(selector, { timeout });
    return;
  }

  if (candidate.type === 'form-submit') {
    const selector = buildSelector(candidate);
    if (!selector) {
      throw new Error('No selector available for form');
    }
    
    // Fill any visible inputs with test data first
    const inputs = await page.locator(`${selector} input:visible`).all();
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      
      if (type === 'email') {
        await input.fill('test@example.com');
      } else if (type === 'password') {
        await input.fill('TestPassword123!');
      } else if (type !== 'hidden' && type !== 'submit') {
        await input.fill(`test_${name || 'value'}`);
      }
    }

    // Submit the form
    const submitButton = page.locator(`${selector} [type="submit"], ${selector} button`).first();
    await submitButton.click({ timeout });
    return;
  }
}

/**
 * Build a selector from candidate, preferring stable selectors.
 */
function buildSelector(candidate: CandidateAction): string | null {
  // Prefer data-testid
  if (candidate.testId) {
    return `[data-testid="${candidate.testId}"]`;
  }

  // Use explicit selector if available
  if (candidate.selector) {
    return candidate.selector;
  }

  // For links with href, use href selector
  if (candidate.type === 'link' && candidate.href) {
    return `a[href="${candidate.href}"]`;
  }

  // For buttons with text, use text selector
  if (candidate.type === 'button' && candidate.text) {
    return `button:has-text("${candidate.text}"), [role="button"]:has-text("${candidate.text}")`;
  }

  return null;
}

function isApiCall(url: string): boolean {
  return url.includes('/api/') || 
         url.includes('/graphql') ||
         url.includes('/_next/data/');
}

async function captureStorage(page: Page): Promise<Record<string, Record<string, string>>> {
  return page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
}

function diffStorage(
  before: Record<string, Record<string, string>>,
  after: Record<string, Record<string, string>>
): ActionObservation['storageChanges'] {
  const changes: ActionObservation['storageChanges'] = [];

  // Check localStorage changes
  for (const key of Object.keys(after.local || {})) {
    if (!before.local?.[key]) {
      changes.push({ storage: 'local', key, action: 'set' });
    }
  }
  for (const key of Object.keys(before.local || {})) {
    if (!after.local?.[key]) {
      changes.push({ storage: 'local', key, action: 'remove' });
    }
  }

  // Check sessionStorage changes
  for (const key of Object.keys(after.session || {})) {
    if (!before.session?.[key]) {
      changes.push({ storage: 'session', key, action: 'set' });
    }
  }
  for (const key of Object.keys(before.session || {})) {
    if (!after.session?.[key]) {
      changes.push({ storage: 'session', key, action: 'remove' });
    }
  }

  return changes;
}

function groupBySourceUrl(candidates: CandidateAction[]): Map<string, CandidateAction[]> {
  const map = new Map<string, CandidateAction[]>();
  
  for (const candidate of candidates) {
    const url = candidate.sourceUrl;
    if (!map.has(url)) {
      map.set(url, []);
    }
    map.get(url)!.push(candidate);
  }

  return map;
}
