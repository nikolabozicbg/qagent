import type { BrowserContext, Page, Response, Request } from 'playwright';
import type {
  V8ObservedApiCall,
  V8ObservedNavigation,
  V8ObservedStateChanges,
  V8ObservedUiSignals,
} from './types';

export type V8ObservationSession = {
  getNavigation: () => V8ObservedNavigation | undefined;
  getApiCalls: () => V8ObservedApiCall[];
  getUiSignals: () => V8ObservedUiSignals;
  getStateChanges: () => Promise<V8ObservedStateChanges | undefined>;
};

type StorageSnapshot = {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
};

type CookiesSnapshot = Array<{ name: string; value: string }>;

async function snapshotStorage(page: Page): Promise<StorageSnapshot> {
  const localStorage = await page.evaluate(() => {
    const out: Record<string, string> = {};
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (!k) continue;
      const v = ls.getItem(k);
      out[k] = v ?? '';
    }
    return out;
  });

  const sessionStorage = await page.evaluate(() => {
    const out: Record<string, string> = {};
    const ss = window.sessionStorage;
    for (let i = 0; i < ss.length; i++) {
      const k = ss.key(i);
      if (!k) continue;
      const v = ss.getItem(k);
      out[k] = v ?? '';
    }
    return out;
  });

  return { localStorage, sessionStorage };
}

function diffStorage(before: Record<string, string>, after: Record<string, string>) {
  const added: Record<string, string> = {};
  const removed: string[] = [];
  const changed: Array<{ key: string; from: string; to: string }> = [];

  for (const k of Object.keys(before)) {
    if (!(k in after)) removed.push(k);
    else if (before[k] !== after[k]) changed.push({ key: k, from: before[k], to: after[k] });
  }
  for (const k of Object.keys(after)) {
    if (!(k in before)) added[k] = after[k];
  }

  return { added, removed, changed };
}

function diffCookies(before: CookiesSnapshot, after: CookiesSnapshot) {
  const b = new Map(before.map(x => [x.name, x.value] as const));
  const a = new Map(after.map(x => [x.name, x.value] as const));

  const added: Array<{ name: string; value: string }> = [];
  const removed: Array<{ name: string; value: string }> = [];
  const changed: Array<{ name: string; from: string; to: string }> = [];

  for (const [name, value] of b.entries()) {
    if (!a.has(name)) removed.push({ name, value });
    else if (a.get(name) !== value) changed.push({ name, from: value, to: a.get(name)! });
  }
  for (const [name, value] of a.entries()) {
    if (!b.has(name)) added.push({ name, value });
  }

  return { added, removed, changed };
}

export async function createObservationSession(
  page: Page,
  context: BrowserContext
): Promise<{ session: V8ObservationSession; baseline: { url: string } }> {
  const baselineUrl = page.url();
  const baselineStorage = await snapshotStorage(page);
  const baselineCookies: CookiesSnapshot = (await context.cookies()).map(c => ({ name: c.name, value: c.value }));

  let lastNavigation: V8ObservedNavigation | undefined;

  const apiCalls: V8ObservedApiCall[] = [];
  const responseStatusByUrl = new Map<string, number>();

  const uiSignals: V8ObservedUiSignals = {
    pageErrors: [],
    consoleErrors: [],
  };

  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      const toUrl = frame.url();
      if (toUrl && toUrl !== baselineUrl) {
        lastNavigation = { fromUrl: baselineUrl, toUrl };
      }
    }
  });

  page.on('pageerror', err => {
    uiSignals.pageErrors.push(String(err?.message || err));
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      uiSignals.consoleErrors.push(msg.text());
    }
  });

  page.on('request', (req: Request) => {
    // capture only http(s)
    const url = req.url();
    if (!url.startsWith('http://') && !url.startsWith('https://')) return;
    apiCalls.push({ method: req.method(), url });
  });

  page.on('response', (res: Response) => {
    const url = res.url();
    if (!url.startsWith('http://') && !url.startsWith('https://')) return;
    responseStatusByUrl.set(url, res.status());
  });

  const getStateChanges = async (): Promise<V8ObservedStateChanges | undefined> => {
    const afterStorage = await snapshotStorage(page);
    const afterCookies: CookiesSnapshot = (await context.cookies()).map(c => ({ name: c.name, value: c.value }));

    const localStorageDelta = diffStorage(baselineStorage.localStorage, afterStorage.localStorage);
    const sessionStorageDelta = diffStorage(baselineStorage.sessionStorage, afterStorage.sessionStorage);
    const cookiesDelta = diffCookies(baselineCookies, afterCookies);

    const hasAny =
      Object.keys(localStorageDelta.added).length > 0 ||
      localStorageDelta.removed.length > 0 ||
      localStorageDelta.changed.length > 0 ||
      Object.keys(sessionStorageDelta.added).length > 0 ||
      sessionStorageDelta.removed.length > 0 ||
      sessionStorageDelta.changed.length > 0 ||
      cookiesDelta.added.length > 0 ||
      cookiesDelta.removed.length > 0 ||
      cookiesDelta.changed.length > 0;

    if (!hasAny) return undefined;

    return {
      cookiesDelta,
      localStorageDelta,
      sessionStorageDelta,
    };
  };

  const session: V8ObservationSession = {
    getNavigation: () => lastNavigation,
    getApiCalls: () => {
      // attach statuses when available
      return apiCalls.map(c => ({ ...c, status: responseStatusByUrl.get(c.url) }));
    },
    getUiSignals: () => uiSignals,
    getStateChanges,
  };

  return { session, baseline: { url: baselineUrl } };
}
