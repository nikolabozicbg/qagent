/**
 * V4 Discovery - Graph Builder
 * 
 * Converts scanner payload into universal graph representation.
 * No interpretation - just structural mapping.
 */

import {
  AppGraph,
  GraphNode,
  GraphEdge,
  RouteNode,
  FormNode,
  FieldNode,
  ButtonNode,
  LinkNode,
  ApiNode,
  EdgeType,
  FieldSignals,
} from './types';

// Scanner payload types (what we receive)
interface ScannerPayload {
  project: {
    name: string;
    framework: { name: string };
  };
  routes: ScannerRoute[];
  forms: ScannerForm[];
  apis: ScannerApi[];
  components: ScannerComponent[];
  relationships: {
    navigationLinks: NavigationLink[];
    routeToComponent: Record<string, string>;
  };
}

interface ScannerRoute {
  path: string;
  component: string | null;
  filePath: string;
  isDynamic: boolean;
  params: string[];
}

interface ScannerForm {
  id: string;
  name: string;
  route: string | null;
  componentName: string;
  filePath: string;
  fields: ScannerField[];
  submitButton: { text: string | null; selector: string | null } | null;
  successRedirect?: string | null;
}

interface ScannerField {
  name: string;
  id?: string | null;
  type: string;
  label: string | null;
  placeholder?: string | null;
  isRequired: boolean;
  selector: string | null;
  autocomplete?: string | null;
  ariaLabel?: string | null;
  dataTestId?: string | null;
  dataTest?: string | null;
  dataCy?: string | null;
}

interface ScannerApi {
  method: string;
  path: string;
  hasAuth: boolean;
  calledFrom: { component: string }[];
}

interface ScannerComponent {
  name: string;
  filePath: string;
}

interface NavigationLink {
  from: string;
  to: string;
  linkText: string | null;
  selector: string | null;
}

/**
 * Build application graph from scanner payload
 */
export function buildGraph(payload: ScannerPayload): AppGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Track IDs to avoid duplicates
  const nodeIds = new Set<string>();
  
  // 1. Create route nodes
  for (const route of payload.routes) {
    const nodeId = `route:${route.path}`;
    if (nodeIds.has(nodeId)) continue;
    nodeIds.add(nodeId);
    
    const routeNode: RouteNode = {
      id: nodeId,
      type: 'route',
      path: route.path,
      isDynamic: route.isDynamic,
      params: route.params,
      filePath: route.filePath,
      metadata: {
        component: route.component,
      },
    };
    nodes.push(routeNode);
  }
  
  // 2. Create form nodes and their fields
  for (const form of payload.forms) {
    const formNodeId = `form:${form.id}`;
    if (nodeIds.has(formNodeId)) continue;
    nodeIds.add(formNodeId);
    
    const formNode: FormNode = {
      id: formNodeId,
      type: 'form',
      name: form.name,
      submitSelector: form.submitButton?.selector || 'button[type="submit"]',
      submitText: form.submitButton?.text || null,
      metadata: {
        componentName: form.componentName,
        filePath: form.filePath,
      },
    };
    nodes.push(formNode);
    
    // Create field nodes
    for (let i = 0; i < form.fields.length; i++) {
      const field = form.fields[i];
      const fieldNodeId = `field:${form.id}:${field.name || i}`;
      
      if (nodeIds.has(fieldNodeId)) continue;
      nodeIds.add(fieldNodeId);
      
      // Build selector - use what we have, no guessing
      const selector = buildFieldSelector(field);
      
      const fieldNode: FieldNode = {
        id: fieldNodeId,
        type: 'field',
        name: field.name || null,
        htmlType: field.type || 'text',
        selector,
        label: field.label || null,
        placeholder: field.placeholder || null,
        isRequired: field.isRequired,
        signals: {
          name: field.name || null,
          id: field.id || null,
          htmlType: field.type || 'text',
          placeholder: field.placeholder || null,
          label: field.label || null,
          ariaLabel: field.ariaLabel || null,
          autocomplete: field.autocomplete || null,
          pattern: null,
          minLength: null,
          maxLength: null,
        },
        metadata: {},
      };
      nodes.push(fieldNode);
      
      // Edge: form -> field
      edges.push({
        id: `edge:${formNodeId}:${fieldNodeId}`,
        type: 'form_has_field',
        source: formNodeId,
        target: fieldNodeId,
      });
    }
    
    // Edge: route -> form (if form has route)
    let formRouteId: string | null = null;
    if (form.route) {
      const routeNodeId = `route:${form.route}`;
      if (nodeIds.has(routeNodeId)) {
        edges.push({
          id: `edge:${routeNodeId}:${formNodeId}`,
          type: 'route_contains_form',
          source: routeNodeId,
          target: formNodeId,
        });
        formRouteId = routeNodeId;
      }
    } else {
      // Try to find route by file path
      const matchingRoute = payload.routes.find(r => 
        r.filePath === form.filePath || 
        r.component === form.componentName
      );
      if (matchingRoute) {
        const routeNodeId = `route:${matchingRoute.path}`;
        edges.push({
          id: `edge:${routeNodeId}:${formNodeId}`,
          type: 'route_contains_form',
          source: routeNodeId,
          target: formNodeId,
        });
        formRouteId = routeNodeId;
      }
    }

    // Edge: route redirects to success page (if known)
    if (form.successRedirect && formRouteId) {
      const targetRouteId = `route:${form.successRedirect}`;
      if (nodeIds.has(targetRouteId)) {
        edges.push({
          id: `edge:${formRouteId}:${targetRouteId}:redirect`,
          type: 'route_redirects_to',
          source: formRouteId,
          target: targetRouteId,
        });
      }
    }
    
    // Create submit button node
    if (form.submitButton) {
      const buttonNodeId = `button:${form.id}:submit`;
      if (!nodeIds.has(buttonNodeId)) {
        nodeIds.add(buttonNodeId);
        
        const buttonNode: ButtonNode = {
          id: buttonNodeId,
          type: 'button',
          text: form.submitButton.text,
          selector: form.submitButton.selector || 'button[type="submit"]',
          buttonType: 'submit',
          metadata: {},
        };
        nodes.push(buttonNode);
        
        edges.push({
          id: `edge:${formNodeId}:${buttonNodeId}`,
          type: 'form_has_submit',
          source: formNodeId,
          target: buttonNodeId,
        });
      }
    }
  }
  
  // 3. Create API nodes
  for (const api of payload.apis) {
    const apiNodeId = `api:${api.method}:${api.path}`;
    if (nodeIds.has(apiNodeId)) continue;
    nodeIds.add(apiNodeId);
    
    const apiNode: ApiNode = {
      id: apiNodeId,
      type: 'api',
      method: api.method,
      endpoint: api.path,
      hasAuth: api.hasAuth,
      metadata: {
        calledFrom: api.calledFrom.map(c => c.component),
      },
    };
    nodes.push(apiNode);
  }
  
  // 4. Create link nodes and navigation edges
  for (const link of payload.relationships.navigationLinks) {
    const linkNodeId = `link:${link.from}:${link.to}`;
    if (nodeIds.has(linkNodeId)) continue;
    nodeIds.add(linkNodeId);
    
    const linkNode: LinkNode = {
      id: linkNodeId,
      type: 'link',
      text: link.linkText,
      href: link.to,
      selector: link.selector || `a[href="${link.to}"]`,
      metadata: {},
    };
    nodes.push(linkNode);
    
    // Edge: source route -> link
    const sourceRouteId = `route:${link.from}`;
    if (nodeIds.has(sourceRouteId)) {
      edges.push({
        id: `edge:${sourceRouteId}:${linkNodeId}`,
        type: 'route_contains_link',
        source: sourceRouteId,
        target: linkNodeId,
      });
    }
    
    // Edge: link -> target route
    const targetRouteId = `route:${link.to}`;
    if (nodeIds.has(targetRouteId)) {
      edges.push({
        id: `edge:${linkNodeId}:${targetRouteId}`,
        type: 'link_navigates_to',
        source: linkNodeId,
        target: targetRouteId,
      });
    }
  }
  
  return { nodes, edges };
}

/**
 * Build the best selector for a field based on available data
 * Priority: data-testid > data-test > data-cy > name (non-generic) > id > aria-label > placeholder > type
 */
function buildFieldSelector(field: ScannerField): string {
  // 1. Explicit selector from scanner
  if (field.selector) {
    return field.selector;
  }

  // 2. Testing attributes
  if (field.dataTestId) {
    return `[data-testid="${field.dataTestId}"]`;
  }
  if (field.dataTest) {
    return `[data-test="${field.dataTest}"]`;
  }
  if (field.dataCy) {
    return `[data-cy="${field.dataCy}"]`;
  }
  
  // 3. Name attribute (avoid generic placeholders like field-1)
  if (field.name && !/^((field|input)-\d+)$/.test(field.name)) {
    return `[name="${field.name}"]`;
  }
  
  // 4. ID attribute
  if (field.id) {
    return `#${field.id}`;
  }

  // 5. aria-label
  if (field.ariaLabel) {
    return `[aria-label="${field.ariaLabel}"]`;
  }
  
  // 6. Placeholder (less reliable but usable)
  if (field.placeholder) {
    return `[placeholder="${field.placeholder}"]`;
  }
  
  // 7. Type-based (fallback)
  return `input[type="${field.type || 'text'}"]`;
}

/**
 * Get graph statistics
 */
export function getGraphStats(graph: AppGraph): Record<string, number> {
  const stats: Record<string, number> = {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    routes: 0,
    forms: 0,
    fields: 0,
    buttons: 0,
    links: 0,
    apis: 0,
  };
  
  for (const node of graph.nodes) {
    switch (node.type) {
      case 'route': stats.routes++; break;
      case 'form': stats.forms++; break;
      case 'field': stats.fields++; break;
      case 'button': stats.buttons++; break;
      case 'link': stats.links++; break;
      case 'api': stats.apis++; break;
    }
  }
  
  return stats;
}
