"use strict";
/**
 * V9 Discovery Module
 *
 * Exports the main orchestrator and types for use in Electron main process.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRuntimeObservationGraph = exports.expandFormInputs = exports.buildStaticBehaviorGraph = exports.loadDiscoveryResult = exports.listDiscoveryRuns = exports.runDiscoveryV9 = void 0;
var orchestrator_1 = require("./orchestrator");
Object.defineProperty(exports, "runDiscoveryV9", { enumerable: true, get: function () { return orchestrator_1.runDiscoveryV9; } });
Object.defineProperty(exports, "listDiscoveryRuns", { enumerable: true, get: function () { return orchestrator_1.listDiscoveryRuns; } });
Object.defineProperty(exports, "loadDiscoveryResult", { enumerable: true, get: function () { return orchestrator_1.loadDiscoveryResult; } });
var sbg_scanner_1 = require("./sbg-scanner");
Object.defineProperty(exports, "buildStaticBehaviorGraph", { enumerable: true, get: function () { return sbg_scanner_1.buildStaticBehaviorGraph; } });
Object.defineProperty(exports, "expandFormInputs", { enumerable: true, get: function () { return sbg_scanner_1.expandFormInputs; } });
var rog_explorer_1 = require("./rog-explorer");
Object.defineProperty(exports, "buildRuntimeObservationGraph", { enumerable: true, get: function () { return rog_explorer_1.buildRuntimeObservationGraph; } });
