/**
 * Suite Clustering
 * 
 * Groups forms and routes into logical test suites using hierarchical clustering
 * based on domain similarity and entity relationships.
 * 
 * PRINCIPLES:
 * - Domain-based primary grouping
 * - Entity extraction from URLs for secondary grouping
 * - MST-based clustering for optimal suite boundaries
 * - Dynamic suite naming from dominant entities/domains
 */

import {
  ClassifiedForm,
  TestSuite,
  TestCase,
  RouteInfo,
  SuiteCluster,
  DomainGroup,
} from './types';

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

/**
 * Extract entity from URL path
 * e.g., /users/123/profile → "users"
 *       /api/products/456 → "products"
 *       /signin → "auth"
 */
function extractEntityFromPath(path: string): string | null {
  // Remove leading/trailing slashes and split
  const segments = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  
  if (segments.length === 0) return null;
  
  // Skip common prefixes
  const skipPrefixes = ['api', 'v1', 'v2', 'v3', 'app', 'admin', 'public', 'private'];
  let entitySegment = segments[0];
  
  for (let i = 0; i < segments.length; i++) {
    if (!skipPrefixes.includes(segments[i].toLowerCase())) {
      entitySegment = segments[i];
      break;
    }
  }
  
  // Skip if it looks like an ID (numeric or UUID-like)
  if (/^\d+$/.test(entitySegment) || /^[a-f0-9-]{36}$/i.test(entitySegment)) {
    return segments.length > 1 ? segments[0] : null;
  }
  
  // Normalize: remove trailing 's' for plurals, convert to singular
  let normalized = entitySegment.toLowerCase();
  
  // Handle common plural forms
  if (normalized.endsWith('ies')) {
    normalized = normalized.slice(0, -3) + 'y';
  } else if (normalized.endsWith('es') && !normalized.endsWith('ses')) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith('s') && normalized.length > 3) {
    normalized = normalized.slice(0, -1);
  }
  
  // Capitalize first letter
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Extract action from URL path
 * e.g., /users/new → "create"
 *       /products/123/edit → "edit"
 */
function extractActionFromPath(path: string): string | null {
  const segments = path.toLowerCase().split('/');
  
  const actionMap: Record<string, string> = {
    'new': 'create',
    'create': 'create',
    'add': 'create',
    'edit': 'edit',
    'update': 'edit',
    'modify': 'edit',
    'delete': 'delete',
    'remove': 'delete',
    'view': 'view',
    'show': 'view',
    'list': 'list',
    'index': 'list',
    'signin': 'login',
    'login': 'login',
    'signup': 'register',
    'register': 'register',
  };
  
  for (const segment of segments) {
    if (actionMap[segment]) {
      return actionMap[segment];
    }
  }
  
  return null;
}

// ============================================================================
// SIMILARITY CALCULATION
// ============================================================================

interface SimilarityFeatures {
  domain: string;
  entity: string | null;
  purpose: string;
  fieldTypes: Set<string>;
}

/**
 * Calculate similarity between two forms (0-1)
 */
function calculateSimilarity(a: SimilarityFeatures, b: SimilarityFeatures): number {
  let similarity = 0;
  let weights = 0;
  
  // Domain match (weight: 0.4)
  if (a.domain === b.domain) {
    similarity += 0.4;
  }
  weights += 0.4;
  
  // Entity match (weight: 0.3)
  if (a.entity && b.entity && a.entity === b.entity) {
    similarity += 0.3;
  } else if (!a.entity && !b.entity) {
    similarity += 0.15; // Both unknown
  }
  weights += 0.3;
  
  // Purpose similarity (weight: 0.2)
  const purposeParts = {
    a: a.purpose.split('_'),
    b: b.purpose.split('_'),
  };
  const commonParts = purposeParts.a.filter(p => purposeParts.b.includes(p)).length;
  const maxParts = Math.max(purposeParts.a.length, purposeParts.b.length);
  similarity += 0.2 * (commonParts / maxParts);
  weights += 0.2;
  
  // Field type overlap (weight: 0.1)
  const aFields = Array.from(a.fieldTypes);
  const bFields = Array.from(b.fieldTypes);
  const intersection = aFields.filter(f => bFields.includes(f)).length;
  const union = new Set([...aFields, ...bFields]).size;
  if (union > 0) {
    similarity += 0.1 * (intersection / union);
  }
  weights += 0.1;
  
  return similarity / weights;
}

/**
 * Build distance matrix for MST
 */
function buildDistanceMatrix(features: SimilarityFeatures[]): number[][] {
  const n = features.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = 1 - calculateSimilarity(features[i], features[j]);
      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }
  
  return matrix;
}

// ============================================================================
// MST-BASED CLUSTERING
// ============================================================================

interface Edge {
  from: number;
  to: number;
  weight: number;
}

/**
 * Prim's algorithm for MST
 */
function buildMST(distances: number[][]): Edge[] {
  const n = distances.length;
  if (n <= 1) return [];
  
  const inMST = new Set<number>([0]);
  const edges: Edge[] = [];
  
  while (inMST.size < n) {
    let minEdge: Edge | null = null;
    let minWeight = Infinity;
    
    for (const from of inMST) {
      for (let to = 0; to < n; to++) {
        if (!inMST.has(to) && distances[from][to] < minWeight) {
          minWeight = distances[from][to];
          minEdge = { from, to, weight: minWeight };
        }
      }
    }
    
    if (minEdge) {
      edges.push(minEdge);
      inMST.add(minEdge.to);
    } else {
      break;
    }
  }
  
  return edges;
}

/**
 * Cut MST edges to form clusters
 * Uses threshold-based cutting
 */
function cutMSTIntoClusters(
  mstEdges: Edge[],
  n: number,
  threshold: number = 0.5
): number[][] {
  // Sort edges by weight descending
  const sortedEdges = [...mstEdges].sort((a, b) => b.weight - a.weight);
  
  // Remove edges above threshold
  const keepEdges = sortedEdges.filter(e => e.weight < threshold);
  
  // Build adjacency list from remaining edges
  const adj: Set<number>[] = Array(n).fill(null).map(() => new Set());
  for (const edge of keepEdges) {
    adj[edge.from].add(edge.to);
    adj[edge.to].add(edge.from);
  }
  
  // Find connected components (clusters)
  const visited = new Set<number>();
  const clusters: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      const cluster: number[] = [];
      const stack = [i];
      
      while (stack.length > 0) {
        const node = stack.pop()!;
        if (!visited.has(node)) {
          visited.add(node);
          cluster.push(node);
          for (const neighbor of adj[node]) {
            if (!visited.has(neighbor)) {
              stack.push(neighbor);
            }
          }
        }
      }
      
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

// ============================================================================
// SUITE GENERATION
// ============================================================================

/**
 * Generate suite name from cluster members
 */
function generateSuiteName(
  forms: ClassifiedForm[],
  clusterIndices: number[]
): { name: string; domain: string } {
  // Count domains and entities
  const domainCounts: Record<string, number> = {};
  const entityCounts: Record<string, number> = {};
  
  for (const idx of clusterIndices) {
    const form = forms[idx];
    const domain = form.domain.primary;
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    
    const entity = extractEntityFromPath(form.raw.route || form.raw.url || '');
    if (entity) {
      entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    }
  }
  
  // Find dominant domain
  const dominantDomain = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Find dominant entity
  const dominantEntity = Object.entries(entityCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  // Generate name
  if (dominantEntity && dominantDomain !== 'Generic') {
    return {
      name: `${dominantEntity} ${dominantDomain}`,
      domain: dominantDomain,
    };
  } else {
    return {
      name: dominantDomain,
      domain: dominantDomain,
    };
  }
}

/**
 * Calculate suite priority based on domain and content
 */
function calculateSuitePriority(domain: string, forms: ClassifiedForm[]): { level: string; score: number } {
  const priorityMap: Record<string, { level: string; baseScore: number }> = {
    'Authentication': { level: 'CRITICAL', baseScore: 95 },
    'Payment': { level: 'CRITICAL', baseScore: 95 },
    'Banking': { level: 'HIGH', baseScore: 85 },
    'Transaction': { level: 'HIGH', baseScore: 80 },
    'Checkout': { level: 'HIGH', baseScore: 80 },
    'User': { level: 'MEDIUM', baseScore: 70 },
    'Product': { level: 'MEDIUM', baseScore: 65 },
    'Contact': { level: 'LOW', baseScore: 50 },
    'Search': { level: 'LOW', baseScore: 45 },
    'Generic': { level: 'LOW', baseScore: 40 },
  };
  
  const config = priorityMap[domain] || { level: 'MEDIUM', baseScore: 60 };
  
  // Adjust score based on number of forms
  const formBonus = Math.min(forms.length * 2, 10);
  
  return {
    level: config.level,
    score: Math.min(config.baseScore + formBonus, 100),
  };
}

// ============================================================================
// MAIN CLUSTERING FUNCTION
// ============================================================================

/**
 * Cluster forms into test suites
 */
export function clusterIntoSuites(
  forms: ClassifiedForm[],
  options: {
    minClusterSize?: number;
    maxClusterSize?: number;
    similarityThreshold?: number;
  } = {}
): SuiteCluster[] {
  const {
    minClusterSize = 1,
    maxClusterSize = 10,
    similarityThreshold = 0.5,
  } = options;
  
  if (forms.length === 0) return [];
  
  // Extract features for each form
  const features: SimilarityFeatures[] = forms.map(form => ({
    domain: form.domain.primary,
    entity: extractEntityFromPath(form.raw.route || form.raw.url || ''),
    purpose: form.purpose.type,
    fieldTypes: new Set(form.fields.map(f => f.semantic.type)),
  }));
  
  // Build distance matrix
  const distances = buildDistanceMatrix(features);
  
  // Build MST
  const mstEdges = buildMST(distances);
  
  // Cut into clusters
  const clusterIndices = cutMSTIntoClusters(mstEdges, forms.length, similarityThreshold);
  
  // Build suite clusters
  const suites: SuiteCluster[] = [];
  
  for (const indices of clusterIndices) {
    // Skip too small or too large clusters (split large ones)
    if (indices.length < minClusterSize) continue;
    
    const clusterForms = indices.map(i => forms[i]);
    const { name, domain } = generateSuiteName(forms, indices);
    const priority = calculateSuitePriority(domain, clusterForms);
    
    // Calculate cluster confidence
    const avgConfidence = clusterForms.reduce((sum, f) => sum + f.domain.confidence, 0) / clusterForms.length;
    
    suites.push({
      id: `suite-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      domain: {
        primary: domain,
        confidence: avgConfidence,
      },
      priority,
      forms: clusterForms,
      routes: clusterForms.map(f => f.raw.route || f.raw.url || '').filter(Boolean),
      confidence: avgConfidence,
    });
  }
  
  // Sort by priority
  return suites.sort((a, b) => b.priority.score - a.priority.score);
}

/**
 * Group routes by domain without forms
 */
export function groupRoutesByDomain(routes: RouteInfo[]): DomainGroup[] {
  const groups: Record<string, RouteInfo[]> = {};
  
  for (const route of routes) {
    const entity = extractEntityFromPath(route.path);
    const domain = entity || 'Generic';
    
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(route);
  }
  
  return Object.entries(groups).map(([domain, routes]) => ({
    domain,
    routes,
    count: routes.length,
  }));
}

/**
 * Merge small clusters into larger ones based on domain
 */
export function mergeSmallClusters(
  clusters: SuiteCluster[],
  minSize: number = 2
): SuiteCluster[] {
  const small = clusters.filter(c => c.forms.length < minSize);
  const large = clusters.filter(c => c.forms.length >= minSize);
  
  // Group small clusters by domain
  const smallByDomain: Record<string, SuiteCluster[]> = {};
  for (const cluster of small) {
    const domain = cluster.domain.primary;
    if (!smallByDomain[domain]) {
      smallByDomain[domain] = [];
    }
    smallByDomain[domain].push(cluster);
  }
  
  // Merge small clusters of same domain
  for (const [domain, domainClusters] of Object.entries(smallByDomain)) {
    if (domainClusters.length > 1) {
      const mergedForms = domainClusters.flatMap(c => c.forms);
      const mergedRoutes = domainClusters.flatMap(c => c.routes);
      const avgConfidence = mergedForms.reduce((sum, f) => sum + f.domain.confidence, 0) / mergedForms.length;
      
      large.push({
        id: `suite-${domain.toLowerCase()}-misc`,
        name: `${domain} (Misc)`,
        domain: {
          primary: domain,
          confidence: avgConfidence,
        },
        priority: calculateSuitePriority(domain, mergedForms),
        forms: mergedForms,
        routes: mergedRoutes,
        confidence: avgConfidence,
      });
    } else {
      // Just add the single small cluster
      large.push(...domainClusters);
    }
  }
  
  return large.sort((a, b) => b.priority.score - a.priority.score);
}
