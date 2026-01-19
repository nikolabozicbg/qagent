/**
 * V9 Discovery Validator
 * 
 * Validates request shapes for the discovery endpoint.
 */

import {
  DiscoveryV9Request,
  StaticBehaviorGraphV9,
  RuntimeObservationGraphV9,
  ProjectInfo,
} from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDiscoveryV9Request(request: unknown): ValidationResult {
  const errors: string[] = [];

  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['Request must be an object'] };
  }

  const req = request as Record<string, unknown>;

  // Validate project
  if (!req.project) {
    errors.push('Missing required field: project');
  } else {
    const projectErrors = validateProjectInfo(req.project);
    errors.push(...projectErrors);
  }

  // Validate staticGraph
  if (!req.staticGraph) {
    errors.push('Missing required field: staticGraph');
  } else {
    const sbgErrors = validateStaticBehaviorGraph(req.staticGraph);
    errors.push(...sbgErrors);
  }

  // Validate runtimeGraph
  if (!req.runtimeGraph) {
    errors.push('Missing required field: runtimeGraph');
  } else {
    const rogErrors = validateRuntimeObservationGraph(req.runtimeGraph);
    errors.push(...rogErrors);
  }

  // Validate options
  if (!req.options) {
    errors.push('Missing required field: options');
  } else {
    const optionsErrors = validateOptions(req.options);
    errors.push(...optionsErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateProjectInfo(project: unknown): string[] {
  const errors: string[] = [];
  
  if (!project || typeof project !== 'object') {
    return ['project must be an object'];
  }

  const p = project as Record<string, unknown>;

  if (typeof p.name !== 'string' || p.name.length === 0) {
    errors.push('project.name must be a non-empty string');
  }

  if (typeof p.framework !== 'string' || p.framework.length === 0) {
    errors.push('project.framework must be a non-empty string');
  }

  return errors;
}

function validateStaticBehaviorGraph(sbg: unknown): string[] {
  const errors: string[] = [];

  if (!sbg || typeof sbg !== 'object') {
    return ['staticGraph must be an object'];
  }

  const g = sbg as Record<string, unknown>;

  if (g.version !== 'v9-sbg') {
    errors.push('staticGraph.version must be "v9-sbg"');
  }

  if (!Array.isArray(g.nodes)) {
    errors.push('staticGraph.nodes must be an array');
  } else {
    for (let i = 0; i < g.nodes.length; i++) {
      const node = g.nodes[i] as Record<string, unknown>;
      if (!node.id || typeof node.id !== 'string') {
        errors.push(`staticGraph.nodes[${i}].id must be a string`);
      }
      if (!node.type || typeof node.type !== 'string') {
        errors.push(`staticGraph.nodes[${i}].type must be a string`);
      }
      if (!node.filePath || typeof node.filePath !== 'string') {
        errors.push(`staticGraph.nodes[${i}].filePath must be a string`);
      }
    }
  }

  if (!Array.isArray(g.edges)) {
    errors.push('staticGraph.edges must be an array');
  }

  return errors;
}

function validateRuntimeObservationGraph(rog: unknown): string[] {
  const errors: string[] = [];

  if (!rog || typeof rog !== 'object') {
    return ['runtimeGraph must be an object'];
  }

  const g = rog as Record<string, unknown>;

  if (g.version !== 'v9-rog') {
    errors.push('runtimeGraph.version must be "v9-rog"');
  }

  if (!Array.isArray(g.pages)) {
    errors.push('runtimeGraph.pages must be an array');
  }

  if (!Array.isArray(g.observations)) {
    errors.push('runtimeGraph.observations must be an array');
  }

  if (!g.exploration || typeof g.exploration !== 'object') {
    errors.push('runtimeGraph.exploration must be an object');
  }

  return errors;
}

function validateOptions(options: unknown): string[] {
  const errors: string[] = [];

  if (!options || typeof options !== 'object') {
    return ['options must be an object'];
  }

  const o = options as Record<string, unknown>;

  if (o.quality !== 'max' && o.quality !== 'fast') {
    errors.push('options.quality must be "max" or "fast"');
  }

  if (o.timeBudgetMs !== undefined && typeof o.timeBudgetMs !== 'number') {
    errors.push('options.timeBudgetMs must be a number if provided');
  }

  return errors;
}
