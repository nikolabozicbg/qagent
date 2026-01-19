"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRuntimeObservationGraph = exports.buildVerifiedFlows = exports.verifyAndFilter = exports.executeAndObserveCandidates = exports.expandFormInputs = exports.buildStaticBehaviorGraph = exports.extractCandidateActions = exports.loadDiscoveryResult = exports.listDiscoveryRuns = exports.runDiscoveryV9 = void 0;
var orchestrator_1 = require("./orchestrator");
Object.defineProperty(exports, "runDiscoveryV9", { enumerable: true, get: function () { return orchestrator_1.runDiscoveryV9; } });
Object.defineProperty(exports, "listDiscoveryRuns", { enumerable: true, get: function () { return orchestrator_1.listDiscoveryRuns; } });
Object.defineProperty(exports, "loadDiscoveryResult", { enumerable: true, get: function () { return orchestrator_1.loadDiscoveryResult; } });
// New runtime-first exports
var sbg_scanner_1 = require("./sbg-scanner");
Object.defineProperty(exports, "extractCandidateActions", { enumerable: true, get: function () { return sbg_scanner_1.extractCandidateActions; } });
Object.defineProperty(exports, "buildStaticBehaviorGraph", { enumerable: true, get: function () { return sbg_scanner_1.buildStaticBehaviorGraph; } });
Object.defineProperty(exports, "expandFormInputs", { enumerable: true, get: function () { return sbg_scanner_1.expandFormInputs; } });
var runtime_executor_1 = require("./runtime-executor");
Object.defineProperty(exports, "executeAndObserveCandidates", { enumerable: true, get: function () { return runtime_executor_1.executeAndObserveCandidates; } });
var verifier_1 = require("./verifier");
Object.defineProperty(exports, "verifyAndFilter", { enumerable: true, get: function () { return verifier_1.verifyAndFilter; } });
Object.defineProperty(exports, "buildVerifiedFlows", { enumerable: true, get: function () { return verifier_1.buildVerifiedFlows; } });
// Legacy exports (kept for backward compatibility)
var rog_explorer_1 = require("./rog-explorer");
Object.defineProperty(exports, "buildRuntimeObservationGraph", { enumerable: true, get: function () { return rog_explorer_1.buildRuntimeObservationGraph; } });
