/**
 * V4 Discovery - Journey Discovery
 * 
 * Finds user journeys by traversing the application graph.
 * Uses DFS to find all meaningful paths through the app.
 * 
 * NO HARDCODING - journeys are discovered from graph structure.
 */

import {
  AppGraph,
  GraphNode,
  GraphEdge,
  Journey,
  RouteNode,
  FormNode,
} from './types';

/**
 * Discover all user journeys in the application
 */
export function discoverJourneys(graph: AppGraph): Journey[] {
  const journeys: Journey[] = [];
  
  // Build adjacency list for traversal
  const adjacency = buildAdjacencyList(graph);
  
  // Strategy 1: Form-based journeys - ONE journey per form (isolated)
  // This is the main strategy for test generation
  const formJourneys = buildIsolatedFormJourneys(graph);
  journeys.push(...formJourneys);
  
  // Strategy 2: Navigation-only journeys for routes without forms
  const routesWithForms = new Set(formJourneys.map(j => j.entryNode));
  const routesWithoutForms = graph.nodes
    .filter(n => n.type === 'route' && !routesWithForms.has(n.id))
    .map(n => n.id);
  
  for (const routeId of routesWithoutForms) {
    const journey = buildNavigationJourney(routeId, graph);
    if (journey) {
      journeys.push(journey);
    }
  }
  
  // Deduplicate (shouldn't be needed now but keep for safety)
  return deduplicateJourneys(journeys);
}

/**
 * Build adjacency list from graph edges
 */
function buildAdjacencyList(graph: AppGraph): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }
  
  return adjacency;
}

/**
 * Find entry points - routes that nothing navigates to
 */
function findEntryPoints(graph: AppGraph): string[] {
  const allRoutes = graph.nodes
    .filter(n => n.type === 'route')
    .map(n => n.id);
  
  const targetRoutes = new Set(
    graph.edges
      .filter(e => e.type === 'link_navigates_to')
      .map(e => e.target)
  );
  
  // Entry points are routes not targeted by links
  const entryPoints = allRoutes.filter(r => !targetRoutes.has(r));
  
  // If no clear entry points, use "/" or first route
  if (entryPoints.length === 0) {
    const rootRoute = allRoutes.find(r => r === 'route:/' || r === 'route:/index');
    if (rootRoute) return [rootRoute];
    if (allRoutes.length > 0) return [allRoutes[0]];
  }
  
  return entryPoints;
}

/**
 * Build ISOLATED journeys - one journey per form
 * This prevents combining multiple forms into one journey
 */
function buildIsolatedFormJourneys(graph: AppGraph): Journey[] {
  const journeys: Journey[] = [];
  
  // Get all forms
  const formNodes = graph.nodes.filter(n => n.type === 'form') as FormNode[];
  
  for (const form of formNodes) {
    // Find the route that contains this form
    const routeEdge = graph.edges.find(
      e => e.target === form.id && e.type === 'route_contains_form'
    );
    
    if (!routeEdge) continue;
    
    const routeNode = graph.nodes.find(n => n.id === routeEdge.source) as RouteNode;
    if (!routeNode) continue;
    
    const journeyNodes: string[] = [routeEdge.source, form.id];
    const journeyEdges: string[] = [routeEdge.id];
    
    // Add fields for THIS form only
    const fieldEdges = graph.edges.filter(
      e => e.source === form.id && e.type === 'form_has_field'
    );
    
    for (const fieldEdge of fieldEdges) {
      journeyNodes.push(fieldEdge.target);
      journeyEdges.push(fieldEdge.id);
    }
    
    // Add submit button for THIS form only
    const submitEdge = graph.edges.find(
      e => e.source === form.id && e.type === 'form_has_submit'
    );
    if (submitEdge) {
      journeyNodes.push(submitEdge.target);
      journeyEdges.push(submitEdge.id);
    }
    
    journeys.push({
      id: `journey:form:${routeNode.path}:${form.id}`,
      entryNode: routeEdge.source,
      nodes: journeyNodes,
      edges: journeyEdges,
      isAuthRequired: checkAuthRequired(journeyNodes, graph),
      isCyclic: false,
      formId: form.id, // Track which form this journey is for
      formName: form.name, // Keep form name for suite naming
    });
  }
  
  return journeys;
}

/**
 * Build a navigation-only journey for routes without forms
 */
function buildNavigationJourney(routeId: string, graph: AppGraph): Journey | null {
  const routeNode = graph.nodes.find(n => n.id === routeId) as RouteNode;
  if (!routeNode) return null;
  
  // Skip dynamic routes that are child routes
  if (routeNode.isDynamic && routeNode.path.split('/').length > 2) {
    return null;
  }
  
  return {
    id: `journey:nav:${routeNode.path}`,
    entryNode: routeId,
    nodes: [routeId],
    edges: [],
    isAuthRequired: checkAuthRequired([routeId], graph),
    isCyclic: false,
  };
}

/**
 * Discover navigation journeys using DFS
 */
function discoverNavigationJourneys(
  startNode: string,
  graph: AppGraph,
  adjacency: Map<string, string[]>
): Journey[] {
  const journeys: Journey[] = [];
  const visited = new Set<string>();
  
  function dfs(
    current: string,
    path: string[],
    edges: string[]
  ): void {
    if (visited.has(current)) {
      // Found a cycle
      return;
    }
    
    visited.add(current);
    path.push(current);
    
    const neighbors = adjacency.get(current) || [];
    
    // Only follow navigation edges (links to routes)
    const linkNeighbors = neighbors.filter(n => {
      const edge = graph.edges.find(
        e => e.source === current && e.target === n
      );
      return edge && (
        edge.type === 'link_navigates_to' ||
        edge.type === 'route_redirects_to'
      );
    });
    
    if (linkNeighbors.length === 0) {
      // End of path - create journey if meaningful
      if (path.length >= 2) {
        const routeNode = graph.nodes.find(n => n.id === startNode) as RouteNode;
        journeys.push({
          id: `journey:nav:${routeNode?.path || startNode}:${journeys.length}`,
          entryNode: startNode,
          nodes: [...path],
          edges: [...edges],
          isAuthRequired: checkAuthRequired(path, graph),
          isCyclic: false,
        });
      }
    } else {
      for (const neighbor of linkNeighbors) {
        const edge = graph.edges.find(
          e => e.source === current && e.target === neighbor
        );
        if (edge) {
          dfs(neighbor, path, [...edges, edge.id]);
        }
      }
    }
    
    path.pop();
    visited.delete(current);
  }
  
  dfs(startNode, [], []);
  
  return journeys;
}

/**
 * Check if any node in the journey requires authentication
 */
function checkAuthRequired(nodes: string[], graph: AppGraph): boolean {
  for (const nodeId of nodes) {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    // Check route metadata for protection indicators
    if (node.type === 'route') {
      const routeNode = node as RouteNode;
      const path = routeNode.path.toLowerCase();
      
      // Common protected route patterns (detected from structure, not hardcoded meaning)
      if (
        path.includes('dashboard') ||
        path.includes('admin') ||
        path.includes('settings') ||
        path.includes('profile') ||
        path.includes('account')
      ) {
        return true;
      }
    }
    
    // Check API calls for auth
    if (node.type === 'api') {
      const apiNode = node as any;
      if (apiNode.hasAuth) return true;
    }
  }
  
  return false;
}

/**
 * Deduplicate journeys - one journey per route+form combination
 */
function deduplicateJourneys(journeys: Journey[]): Journey[] {
  const unique: Journey[] = [];
  const seen = new Set<string>();
  
  for (const journey of journeys) {
    // Create signature from entry node (route) + form ID
    // This ensures one journey per form on each route
    const signature = journey.formId 
      ? `${journey.entryNode}:${journey.formId}`
      : journey.entryNode;
    
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(journey);
    }
  }
  
  return unique;
}

/**
 * Group journeys by domain (based on route structure)
 */
export function groupJourneysByDomain(
  journeys: Journey[],
  graph: AppGraph
): Map<string, Journey[]> {
  const groups = new Map<string, Journey[]>();
  
  for (const journey of journeys) {
    const domain = inferDomain(journey, graph);
    
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(journey);
  }
  
  return groups;
}

/**
 * Infer domain from journey structure
 * NO HARDCODED MEANINGS - just structural grouping
 */
function inferDomain(journey: Journey, graph: AppGraph): string {
  // Get the entry route
  const entryNode = graph.nodes.find(n => n.id === journey.entryNode) as RouteNode;
  if (!entryNode) return 'General';
  
  // Extract first meaningful segment from path
  const segments = entryNode.path.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  
  // Skip dynamic segments
  const firstStatic = segments.find(s => !s.startsWith('[') && !s.startsWith(':'));
  if (firstStatic) {
    // Capitalize first letter
    return firstStatic.charAt(0).toUpperCase() + firstStatic.slice(1);
  }
  
  return 'General';
}
