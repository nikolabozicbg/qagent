/**
 * V9 Discovery Module
 * 
 * Exports the main orchestrator and types for use in Electron main process.
 * 
 * RUNTIME-FIRST VERIFICATION:
 * - extractCandidateActions: Get candidates from static code
 * - executeAndObserveCandidates: Run at runtime and observe effects
 * - verifyAndFilter: Filter to only verified actions
 * - buildVerifiedFlows: Create meaningful test flows
 */

export { runDiscoveryV9, listDiscoveryRuns, loadDiscoveryResult } from './orchestrator';
export type { ProgressCallback } from './orchestrator';

// New runtime-first exports
export { extractCandidateActions, buildStaticBehaviorGraph, expandFormInputs } from './sbg-scanner';
export { executeAndObserveCandidates } from './runtime-executor';
export type { ExecutionConfig, ProgressCallback as ExecutionProgressCallback } from './runtime-executor';
export { verifyAndFilter, buildVerifiedFlows } from './verifier';

// Legacy exports (kept for backward compatibility)
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
