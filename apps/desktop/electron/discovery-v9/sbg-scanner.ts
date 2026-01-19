/**
 * V9 Static Behavior Graph Scanner
 * 
 * Extracts CANDIDATE ACTIONS from static code analysis.
 * These are NOT steps yet - they must be verified at runtime.
 * 
 * Only extracts:
 * - Links with href (deterministic navigation)
 * - Buttons with data-testid or unique text
 * - Form submits
 */

import * as path from 'path';
import { scanProjectV7 } from '../behavior-graph/scanner';
import type {
  StaticBehaviorGraphV9,
  StaticBehaviorNodeV9,
  StaticBehaviorEdgeV9,
  ProjectInfo,
  CandidateAction,
} from './types';

/**
 * Extract candidate actions from static code analysis.
 * These candidates must be verified at runtime before becoming steps.
 */
export async function extractCandidateActions(
  projectPath: string,
  onProgress?: (msg: string, filesScanned: number) => void
): Promise<{ project: ProjectInfo; candidates: CandidateAction[] }> {
  onProgress?.('Scanning code for candidate actions...', 0);

  // Use existing v7 scanner
  const v7Payload = await scanProjectV7(projectPath);

  onProgress?.(`Found ${v7Payload.graph.nodes.length} nodes`, v7Payload.graph.nodes.length);

  const project: ProjectInfo = {
    name: v7Payload.project.name,
    framework: v7Payload.project.framework.name,
    frameworkVersion: v7Payload.project.framework.version || null,
    router: v7Payload.project.framework.router || null,
  };

  // Extract only actionable candidates (links, buttons, form submits)
  const candidates: CandidateAction[] = [];

  for (const node of v7Payload.graph.nodes) {
    const candidate = extractCandidate(node);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  onProgress?.(`Extracted ${candidates.length} candidate actions`, candidates.length);

  return { project, candidates };
}

/**
 * Extract a candidate action from a v7 node if it's actionable.
 * Returns null if the node is not a valid candidate.
 */
function extractCandidate(node: any): CandidateAction | null {
  // Extract source URL from node route or file path
  const sourceUrl = node.route || deriveRouteFromFilePath(node.filePath) || '/';

  // LINKS: Must have href to be a candidate
  if (node.type === 'Navigation' || (node.type === 'UserAction' && node.to)) {
    const href = node.to || node.metadata?.href;
    if (!href || typeof href !== 'string') {
      return null; // No href = not a deterministic link
    }
    // Skip external links
    if (href.startsWith('http') || href.startsWith('mailto:')) {
      return null;
    }
    return {
      id: `candidate:link:${node.id}`,
      type: 'link',
      sourceUrl,
      selector: node.selector || null,
      href,
      text: node.label || node.metadata?.label || null,
      testId: extractTestId(node),
      filePath: node.filePath || '',
      lineNumber: node.line || null,
    };
  }

  // BUTTONS: Must have data-testid or unique text
  if (node.type === 'UserAction' && node.actionType === 'click') {
    const testId = extractTestId(node);
    const text = node.label || node.metadata?.label;
    
    // Must have either testId or meaningful text
    if (!testId && !text) {
      return null; // Can't deterministically identify this button
    }
    
    return {
      id: `candidate:button:${node.id}`,
      type: 'button',
      sourceUrl,
      selector: testId ? `[data-testid="${testId}"]` : node.selector || null,
      href: null,
      text: text || null,
      testId,
      filePath: node.filePath || '',
      lineNumber: node.line || null,
    };
  }

  // FORM SUBMITS: Forms with submit action
  if (node.type === 'Form') {
    const testId = extractTestId(node);
    return {
      id: `candidate:form:${node.id}`,
      type: 'form-submit',
      sourceUrl,
      selector: testId ? `[data-testid="${testId}"]` : node.selector || 'form',
      href: null,
      text: node.label || 'Submit',
      testId,
      filePath: node.filePath || '',
      lineNumber: node.line || null,
    };
  }

  return null; // Not an actionable candidate
}

function extractTestId(node: any): string | null {
  if (node.metadata?.['data-testid']) return node.metadata['data-testid'];
  if (node.metadata?.testId) return node.metadata.testId;
  if (node.selector?.includes('data-testid')) {
    const match = node.selector.match(/data-testid="([^"]+)"/);
    if (match) return match[1];
  }
  return null;
}

function deriveRouteFromFilePath(filePath: string): string {
  if (!filePath) return '/';
  
  let route = filePath
    .replace(/^app\//, '/')
    .replace(/^pages\//, '/')
    .replace(/\/page\.(tsx?|jsx?)$/, '')
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/\/index$/, '')
    .replace(/\([^)]+\)\//g, ''); // Remove route groups like (auth)

  route = route.replace(/\[([^\]]+)\]/g, ':$1');
  return route || '/';
}

// =============================================================================
// Legacy SBG functions (kept for backward compatibility during migration)
// =============================================================================

/**
 * @deprecated Use extractCandidateActions instead
 * Scan project and build Static Behavior Graph V9
 */
export async function buildStaticBehaviorGraph(
  projectPath: string,
  onProgress?: (msg: string, filesScanned: number) => void
): Promise<StaticBehaviorGraphV9> {
  onProgress?.('Starting code scan...', 0);

  const v7Payload = await scanProjectV7(projectPath);

  onProgress?.(`Scanned ${v7Payload.graph.nodes.length} nodes`, v7Payload.graph.nodes.length);

  const nodes: StaticBehaviorNodeV9[] = v7Payload.graph.nodes.map(n => convertNodeToV9(n));
  const edges: StaticBehaviorEdgeV9[] = v7Payload.graph.edges.map(e => convertEdgeToV9(e));

  const project: ProjectInfo = {
    name: v7Payload.project.name,
    framework: v7Payload.project.framework.name,
    frameworkVersion: v7Payload.project.framework.version || null,
    router: v7Payload.project.framework.router || null,
  };

  return {
    version: 'v9-sbg',
    project,
    nodes,
    edges,
    timestamp: new Date().toISOString(),
  };
}

function convertNodeToV9(node: any): StaticBehaviorNodeV9 {
  // Map v7 node types to v9 types
  const typeMap: Record<string, StaticBehaviorNodeV9['type']> = {
    'Page': 'page',
    'Form': 'form',
    'UserAction': 'button', // Most UserActions in v7 are button clicks
    'Navigation': 'navigation',
    'ApiCall': 'api-call',
    'StateMutation': 'state-mutation',
    'Conditional': 'navigation', // Conditionals that redirect
  };

  const type = typeMap[node.type] || 'button';

  // Determine if this is actually a link based on metadata
  let finalType = type;
  if (node.type === 'UserAction' && node.actionType === 'click' && node.label?.includes('link')) {
    finalType = 'link';
  }
  if (node.type === 'Navigation') {
    finalType = 'link';
  }

  // Extract route from node
  let route: string | null = null;
  if (node.route) {
    route = node.route;
  } else if (node.to && typeof node.to === 'string') {
    route = node.to;
  }

  // Build metadata
  const metadata: Record<string, unknown> = {};
  if (node.fields) {
    metadata.fields = node.fields;
  }
  if (node.actionType) {
    metadata.actionType = node.actionType;
  }
  if (node.label) {
    metadata.label = node.label;
  }
  if (node.to) {
    metadata.href = node.to;
    metadata.navigatesTo = node.to;
  }
  if (node.endpoint) {
    metadata.endpoint = node.endpoint;
    metadata.apiEndpoint = node.endpoint;
  }
  if (node.method) {
    metadata.method = node.method;
  }
  if (node.condition) {
    metadata.condition = node.condition;
  }

  // Extract input-specific metadata
  if (node.type === 'Form' && node.fields) {
    // Create input nodes will be done separately
  }

  return {
    id: node.id,
    type: finalType,
    filePath: node.filePath || '',
    lineNumber: node.line || null,
    route,
    selector: node.selector || null,
    selectorStability: node.selectorStability || null,
    metadata,
  };
}

function convertEdgeToV9(edge: any): StaticBehaviorEdgeV9 {
  // Map v7 edge types to v9 types
  const typeMap: Record<string, StaticBehaviorEdgeV9['type']> = {
    'triggers': 'triggers',
    'results_in': 'navigates-to',
    'redirects_to': 'navigates-to',
    'depends_on': 'triggers',
    'blocks': 'triggers',
  };

  return {
    id: edge.id,
    type: typeMap[edge.type] || 'triggers',
    sourceId: edge.source,
    targetId: edge.target,
  };
}

/**
 * Extract input nodes from form nodes for more granular V9 model
 */
export function expandFormInputs(sbg: StaticBehaviorGraphV9): StaticBehaviorGraphV9 {
  const newNodes: StaticBehaviorNodeV9[] = [];
  const newEdges: StaticBehaviorEdgeV9[] = [];

  for (const node of sbg.nodes) {
    newNodes.push(node);

    // If this is a form with fields, create input nodes
    if (node.type === 'form' && node.metadata.fields && Array.isArray(node.metadata.fields)) {
      for (const field of node.metadata.fields as Array<{ name: string }>) {
        const inputId = `${node.id}:input:${field.name}`;
        
        newNodes.push({
          id: inputId,
          type: 'input',
          filePath: node.filePath,
          lineNumber: node.lineNumber,
          route: node.route,
          selector: `[name="${field.name}"]`,
          selectorStability: 0.8,
          metadata: {
            name: field.name,
            formId: node.id,
          },
        });

        // Add edge from input to form
        newEdges.push({
          id: `edge:${inputId}:triggers:${node.id}`,
          type: 'submits',
          sourceId: inputId,
          targetId: node.id,
        });
      }
    }
  }

  return {
    ...sbg,
    nodes: newNodes,
    edges: [...sbg.edges, ...newEdges],
  };
}
