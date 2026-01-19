"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAndObserveCandidates = executeAndObserveCandidates;
const playwright_1 = require("playwright");
const DEFAULT_CONFIG = {
    baseUrl: 'http://localhost:3000',
    timeoutMs: 10000,
    headless: true,
};
/**
 * Execute all candidate actions and observe their effects.
 */
async function executeAndObserveCandidates(candidates, config = {}, onProgress) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const observations = [];
    // Filter out candidates with dynamic routes (can't navigate to :id, [slug], etc.)
    const executableCandidates = candidates.filter(c => isExecutableRoute(c.sourceUrl));
    console.log(`[Runtime Executor] ${candidates.length} total candidates, ${executableCandidates.length} executable (after filtering dynamic routes)`);
    // Create failure observations for filtered candidates
    for (const candidate of candidates) {
        if (!isExecutableRoute(candidate.sourceUrl)) {
            observations.push({
                candidateId: candidate.id,
                executed: false,
                executionError: `Dynamic route cannot be executed: ${candidate.sourceUrl}`,
                urlBefore: '',
                urlAfter: null,
                networkCalls: [],
                domMutations: [],
                storageChanges: [],
                screenshotPath: null,
            });
        }
    }
    if (executableCandidates.length === 0) {
        console.log('[Runtime Executor] No executable candidates after filtering');
        return observations;
    }
    // Group candidates by source URL for efficient execution
    const candidatesBySourceUrl = groupBySourceUrl(executableCandidates);
    let browser = null;
    try {
        console.log('[Runtime Executor] Launching browser...');
        browser = await playwright_1.chromium.launch({
            headless: cfg.headless,
            // Additional options for better Electron compatibility
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        console.log('[Runtime Executor] Browser launched successfully');
        let candidatesExecuted = 0;
        const totalCandidates = executableCandidates.length;
        for (const [sourceUrl, sourceCandidates] of candidatesBySourceUrl) {
            console.log(`[Runtime Executor] Processing ${sourceCandidates.length} candidates for ${sourceUrl}`);
            onProgress?.(`Executing actions on ${sourceUrl}`, candidatesExecuted, totalCandidates);
            // Execute each candidate on this page
            for (const candidate of sourceCandidates) {
                try {
                    const observation = await executeCandidate(browser, candidate, cfg);
                    observations.push(observation);
                    if (observation.executed) {
                        console.log(`[Runtime Executor] ✓ Executed: ${candidate.type} "${candidate.text || candidate.href || 'unknown'}"`);
                    }
                    else {
                        console.log(`[Runtime Executor] ✗ Failed: ${candidate.type} - ${observation.executionError}`);
                    }
                }
                catch (error) {
                    console.error(`[Runtime Executor] Exception executing candidate:`, error);
                    observations.push({
                        candidateId: candidate.id,
                        executed: false,
                        executionError: error.message,
                        urlBefore: '',
                        urlAfter: null,
                        networkCalls: [],
                        domMutations: [],
                        storageChanges: [],
                        screenshotPath: null,
                    });
                }
                candidatesExecuted++;
                onProgress?.(`Executed: ${candidate.type} "${candidate.text || candidate.href || 'unknown'}"`, candidatesExecuted, totalCandidates);
            }
        }
        onProgress?.('Execution complete', totalCandidates, totalCandidates);
    }
    catch (error) {
        console.error('[Runtime Executor] Runtime execution failed:', error);
        // Create failure observations for all remaining candidates
        for (const candidate of executableCandidates) {
            if (!observations.find(o => o.candidateId === candidate.id)) {
                observations.push({
                    candidateId: candidate.id,
                    executed: false,
                    executionError: `Browser launch failed: ${error.message}`,
                    urlBefore: '',
                    urlAfter: null,
                    networkCalls: [],
                    domMutations: [],
                    storageChanges: [],
                    screenshotPath: null,
                });
            }
        }
    }
    finally {
        if (browser) {
            await browser.close().catch(() => { });
            console.log('[Runtime Executor] Browser closed');
        }
    }
    return observations;
}
/**
 * Check if a route is executable (a valid page route, not a component path).
 */
function isExecutableRoute(route) {
    // Skip dynamic route segments
    if (route.includes(':'))
        return false; // Next.js/Express style :id
    if (route.includes('['))
        return false; // Next.js style [id]
    if (route.includes('*'))
        return false; // Wildcard routes
    // Skip component paths (not actual routes)
    if (route.includes('components/'))
        return false;
    if (route.includes('Components/'))
        return false;
    if (route.includes('hooks/'))
        return false;
    if (route.includes('utils/'))
        return false;
    if (route.includes('lib/'))
        return false;
    if (route.includes('services/'))
        return false;
    if (route.includes('context/'))
        return false;
    if (route.includes('Context'))
        return false; // e.g., LogContext, CartContext
    // Skip paths that look like component names (PascalCase at end)
    const lastSegment = route.split('/').pop() || '';
    // If it contains uppercase letters after first char, it's likely a component
    if (lastSegment.length > 1 && /[A-Z]/.test(lastSegment.slice(1))) {
        // Exception: allow common page names like Dashboard, Profile, etc.
        const allowedPages = ['Dashboard', 'Profile', 'Settings', 'Admin', 'Login', 'Register', 'Checkout'];
        if (!allowedPages.some(p => lastSegment.startsWith(p) && lastSegment.length <= p.length + 3)) {
            return false;
        }
    }
    // Must start with / and be a reasonable route
    const normalized = route.startsWith('/') ? route : `/${route}`;
    // Skip very long paths (likely component paths, not routes)
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length > 4)
        return false;
    return true;
}
/**
 * Execute a single candidate action and observe effects.
 * Each candidate gets a fresh browser context to isolate effects.
 */
async function executeCandidate(browser, candidate, config) {
    const observation = {
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
    let context = null;
    try {
        // Create fresh context for isolation
        context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
        });
        const page = await context.newPage();
        // Set up network observer
        const networkCalls = [];
        page.on('request', (request) => {
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
        page.on('response', (response) => {
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
        const normalizedSourceUrl = candidate.sourceUrl.startsWith('/')
            ? candidate.sourceUrl
            : `/${candidate.sourceUrl}`;
        const sourceUrl = `${config.baseUrl}${normalizedSourceUrl}`;
        await page.goto(sourceUrl, {
            waitUntil: 'networkidle',
            timeout: config.timeoutMs,
        });
        observation.urlBefore = page.url();
        // Set up storage observer
        const storageBefore = await captureStorage(page);
        // Set up DOM mutation observer
        await page.evaluate(() => {
            window.__domMutations = [];
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node instanceof Element) {
                                window.__domMutations.push({
                                    type: 'added',
                                    selector: getSelector(node),
                                    description: `Added ${node.tagName.toLowerCase()}`,
                                });
                            }
                        });
                        mutation.removedNodes.forEach((node) => {
                            if (node instanceof Element) {
                                window.__domMutations.push({
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
            function getSelector(el) {
                if (el.id)
                    return `#${el.id}`;
                if (el.getAttribute('data-testid'))
                    return `[data-testid="${el.getAttribute('data-testid')}"]`;
                return el.tagName.toLowerCase();
            }
        });
        // Execute the action based on type
        await executeAction(page, candidate, config.timeoutMs, config.baseUrl);
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
        const domMutations = await page.evaluate(() => window.__domMutations || []);
        observation.domMutations = domMutations.slice(0, 10); // Limit to significant mutations
        // Capture storage changes
        const storageAfter = await captureStorage(page);
        observation.storageChanges = diffStorage(storageBefore, storageAfter);
    }
    catch (error) {
        observation.executionError = error.message;
    }
    finally {
        if (context) {
            await context.close().catch(() => { });
        }
    }
    return observation;
}
/**
 * Execute an action based on candidate type.
 */
async function executeAction(page, candidate, timeoutMs, baseUrl) {
    const timeout = timeoutMs / 2;
    if (candidate.type === 'link') {
        // For links, prefer clicking the actual link element
        if (candidate.href) {
            const selector = buildSelector(candidate);
            if (selector) {
                try {
                    await page.click(selector, { timeout });
                    await page.waitForLoadState('networkidle', { timeout });
                    return;
                }
                catch {
                    // Fallback: navigate directly with full URL
                }
            }
            // Direct navigation as fallback - build full URL
            const href = candidate.href.startsWith('/') ? candidate.href : `/${candidate.href}`;
            const fullUrl = `${baseUrl}${href}`;
            await page.goto(fullUrl, { waitUntil: 'networkidle', timeout });
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
            }
            else if (type === 'password') {
                await input.fill('TestPassword123!');
            }
            else if (type !== 'hidden' && type !== 'submit') {
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
function buildSelector(candidate) {
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
function isApiCall(url) {
    return url.includes('/api/') ||
        url.includes('/graphql') ||
        url.includes('/_next/data/');
}
async function captureStorage(page) {
    return page.evaluate(() => ({
        local: { ...localStorage },
        session: { ...sessionStorage },
    }));
}
function diffStorage(before, after) {
    const changes = [];
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
function groupBySourceUrl(candidates) {
    const map = new Map();
    for (const candidate of candidates) {
        const url = candidate.sourceUrl;
        if (!map.has(url)) {
            map.set(url, []);
        }
        map.get(url).push(candidate);
    }
    return map;
}
