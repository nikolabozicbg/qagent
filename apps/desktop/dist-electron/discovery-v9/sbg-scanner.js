"use strict";
/**
 * V9 Static Behavior Graph Scanner
 *
 * Converts existing behavior graph v7 output to V9 SBG format.
 * Leverages the existing scanner.ts for heavy lifting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStaticBehaviorGraph = buildStaticBehaviorGraph;
exports.expandFormInputs = expandFormInputs;
const scanner_1 = require("../behavior-graph/scanner");
/**
 * Scan project and build Static Behavior Graph V9
 */
async function buildStaticBehaviorGraph(projectPath, onProgress) {
    onProgress?.('Starting code scan...', 0);
    // Use existing v7 scanner
    const v7Payload = await (0, scanner_1.scanProjectV7)(projectPath);
    onProgress?.(`Scanned ${v7Payload.graph.nodes.length} nodes`, v7Payload.graph.nodes.length);
    // Convert to V9 format
    const nodes = v7Payload.graph.nodes.map(n => convertNodeToV9(n));
    const edges = v7Payload.graph.edges.map(e => convertEdgeToV9(e));
    const project = {
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
function convertNodeToV9(node) {
    // Map v7 node types to v9 types
    const typeMap = {
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
    let route = null;
    if (node.route) {
        route = node.route;
    }
    else if (node.to && typeof node.to === 'string') {
        route = node.to;
    }
    // Build metadata
    const metadata = {};
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
function convertEdgeToV9(edge) {
    // Map v7 edge types to v9 types
    const typeMap = {
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
function expandFormInputs(sbg) {
    const newNodes = [];
    const newEdges = [];
    for (const node of sbg.nodes) {
        newNodes.push(node);
        // If this is a form with fields, create input nodes
        if (node.type === 'form' && node.metadata.fields && Array.isArray(node.metadata.fields)) {
            for (const field of node.metadata.fields) {
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
