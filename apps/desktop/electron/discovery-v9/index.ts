/**
 * V9 Discovery Module
 * 
 * Exports the main orchestrator and types for use in Electron main process.
 */

export { runDiscoveryV9, listDiscoveryRuns, loadDiscoveryResult } from './orchestrator';
export type { ProgressCallback } from './orchestrator';

export { buildStaticBehaviorGraph, expandFormInputs } from './sbg-scanner';
export { buildRuntimeObservationGraph } from './rog-explorer';
export type { ExplorationConfig } from './rog-explorer';

export type {
  // Config types
  DiscoveryV9Config,
  DiscoveryV9Progress,
  DiscoveryV9Artifacts,
  
  // Request/Response types
  DiscoveryV9Request,
  DiscoveryResultV9,
  
  // SBG types
  StaticBehaviorGraphV9,
  StaticBehaviorNodeV9,
  StaticBehaviorEdgeV9,
  
  // ROG types
  RuntimeObservationGraphV9,
  RuntimePageV9,
  RuntimeInteractiveElementV9,
  RuntimeObservationV9,
  
  // Result types
  SuiteV9,
  CaseV9,
  StepV9,
  StepProvenance,
  
  // Common types
  ProjectInfo,
} from './types';
