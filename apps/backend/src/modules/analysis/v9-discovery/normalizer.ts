/**
 * V9 Discovery Normalizer
 * 
 * Canonicalizes IDs, routes, and deduplicates data from SBG and ROG.
 */

import {
  StaticBehaviorGraphV9,
  RuntimeObservationGraphV9,
  StaticBehaviorNodeV9,
  RuntimePageV9,
} from './types';

export interface NormalizedData {
  sbg: StaticBehaviorGraphV9;
  rog: RuntimeObservationGraphV9;
  /** Mapping from original IDs to normalized IDs */
  idMapping: Map<string, string>;
  /** All unique routes found */
  routes: string[];
  /** All unique API endpoints */
  apiEndpoints: string[];
  /** Warnings generated during normalization */
  warnings: string[];
}

/**
 * Normalize and deduplicate data from SBG and ROG
 */
export function normalizeDiscoveryData(
  sbg: StaticBehaviorGraphV9,
  rog: RuntimeObservationGraphV9
): NormalizedData {
  const warnings: string[] = [];
  const idMapping = new Map<string, string>();

  // Normalize SBG
  const normalizedSbg = normalizeSBG(sbg, idMapping, warnings);

  // Normalize ROG
  const normalizedRog = normalizeROG(rog, idMapping, warnings);

  // Extract unique routes
  const routes = extractUniqueRoutes(normalizedSbg, normalizedRog);

  // Extract unique API endpoints
  const apiEndpoints = extractUniqueApiEndpoints(normalizedSbg, normalizedRog);

  return {
    sbg: normalizedSbg,
    rog: normalizedRog,
    idMapping,
    routes,
    apiEndpoints,
    warnings,
  };
}

function normalizeSBG(
  sbg: StaticBehaviorGraphV9,
  idMapping: Map<string, string>,
  warnings: string[]
): StaticBehaviorGraphV9 {
  const seenIds = new Set<string>();
  const normalizedNodes: StaticBehaviorNodeV9[] = [];

  for (const node of sbg.nodes) {
    // Normalize ID to be deterministic
    const normalizedId = normalizeNodeId(node);
    
    // Check for duplicates
    if (seenIds.has(normalizedId)) {
      warnings.push(`Duplicate node ID detected and skipped: ${node.id}`);
      continue;
    }

    seenIds.add(normalizedId);
    idMapping.set(node.id, normalizedId);

    // Normalize route
    const normalizedRoute = node.route ? normalizeRoute(node.route) : null;

    normalizedNodes.push({
      ...node,
      id: normalizedId,
      route: normalizedRoute,
      // Normalize file path (remove leading slashes, normalize separators)
      filePath: normalizeFilePath(node.filePath),
    });
  }

  // Update edge references
  const normalizedEdges = sbg.edges.map(edge => ({
    ...edge,
    id: `edge:${idMapping.get(edge.sourceId) || edge.sourceId}:${idMapping.get(edge.targetId) || edge.targetId}`,
    sourceId: idMapping.get(edge.sourceId) || edge.sourceId,
    targetId: idMapping.get(edge.targetId) || edge.targetId,
  }));

  return {
    ...sbg,
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };
}

function normalizeROG(
  rog: RuntimeObservationGraphV9,
  idMapping: Map<string, string>,
  warnings: string[]
): RuntimeObservationGraphV9 {
  const normalizedPages: RuntimePageV9[] = [];
  const seenUrls = new Set<string>();

  for (const page of rog.pages) {
    const normalizedUrl = normalizeUrl(page.url);
    
    // Merge pages with same URL
    if (seenUrls.has(normalizedUrl)) {
      const existingPage = normalizedPages.find(p => p.url === normalizedUrl);
      if (existingPage) {
        // Merge elements (dedupe by selector)
        const existingSelectors = new Set(existingPage.elements.map(e => e.selector));
        for (const element of page.elements) {
          if (!existingSelectors.has(element.selector)) {
            existingPage.elements.push(element);
            existingSelectors.add(element.selector);
          }
        }
        // Merge observations
        existingPage.observations.push(...page.observations);
      }
      continue;
    }

    seenUrls.add(normalizedUrl);

    // Normalize element IDs
    const normalizedElements = page.elements.map((element, idx) => {
      const normalizedId = `rog:${normalizedUrl}:element:${idx}`;
      idMapping.set(element.id, normalizedId);
      return {
        ...element,
        id: normalizedId,
        pageUrl: normalizedUrl,
      };
    });

    // Normalize observation IDs
    const normalizedObservations = page.observations.map((obs, idx) => {
      const normalizedId = `rog:${normalizedUrl}:obs:${idx}`;
      idMapping.set(obs.id, normalizedId);
      return {
        ...obs,
        id: normalizedId,
        url: normalizedUrl,
      };
    });

    normalizedPages.push({
      ...page,
      url: normalizedUrl,
      elements: normalizedElements,
      observations: normalizedObservations,
    });
  }

  return {
    ...rog,
    pages: normalizedPages,
    observations: rog.observations.map((obs, idx) => ({
      ...obs,
      id: idMapping.get(obs.id) || `rog:global:obs:${idx}`,
      url: normalizeUrl(obs.url),
    })),
  };
}

function normalizeNodeId(node: StaticBehaviorNodeV9): string {
  // Create deterministic ID from type + filePath + line
  const parts = [
    'sbg',
    node.type,
    normalizeFilePath(node.filePath).replace(/[^a-zA-Z0-9]/g, '_'),
    node.lineNumber?.toString() || '0',
  ];
  return parts.join(':');
}

function normalizeRoute(route: string): string {
  // Remove trailing slashes (except for root)
  let normalized = route.replace(/\/+$/, '') || '/';
  
  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  // Normalize dynamic segments: [id] -> :id, {id} -> :id
  normalized = normalized.replace(/\[([^\]]+)\]/g, ':$1');
  normalized = normalized.replace(/\{([^}]+)\}/g, ':$1');

  return normalized;
}

function normalizeFilePath(filePath: string): string {
  // Remove leading ./ or /
  let normalized = filePath.replace(/^\.?\//, '');
  
  // Normalize path separators
  normalized = normalized.replace(/\\/g, '/');

  return normalized;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Return just the pathname, normalized
    return normalizeRoute(parsed.pathname);
  } catch {
    // If not a valid URL, treat as route
    return normalizeRoute(url);
  }
}

function extractUniqueRoutes(
  sbg: StaticBehaviorGraphV9,
  rog: RuntimeObservationGraphV9
): string[] {
  const routes = new Set<string>();

  // From static graph
  for (const node of sbg.nodes) {
    if (node.route) {
      routes.add(node.route);
    }
  }

  // From runtime graph
  for (const page of rog.pages) {
    routes.add(page.url);
  }

  return Array.from(routes).sort();
}

function extractUniqueApiEndpoints(
  sbg: StaticBehaviorGraphV9,
  rog: RuntimeObservationGraphV9
): string[] {
  const endpoints = new Set<string>();

  // From static graph - api-call nodes
  for (const node of sbg.nodes) {
    if (node.type === 'api-call' && node.metadata.endpoint) {
      endpoints.add(node.metadata.endpoint as string);
    }
  }

  // From runtime graph - network observations
  for (const obs of rog.observations) {
    if (obs.type === 'network' && obs.data.url) {
      try {
        const url = new URL(obs.data.url as string);
        if (url.pathname.includes('/api/') || url.pathname.includes('/graphql')) {
          endpoints.add(url.pathname);
        }
      } catch {
        // Ignore invalid URLs
      }
    }
  }

  return Array.from(endpoints).sort();
}
