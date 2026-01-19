"use strict";
/**
 * V9 Discovery Orchestrator
 *
 * Main entry point for the Discovery V9 pipeline in Electron.
 * Coordinates: SBG scanning → ROG exploration → Backend call → Artifact persistence
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDiscoveryV9 = runDiscoveryV9;
exports.listDiscoveryRuns = listDiscoveryRuns;
exports.loadDiscoveryResult = loadDiscoveryResult;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const electron_1 = require("electron");
const sbg_scanner_1 = require("./sbg-scanner");
const rog_explorer_1 = require("./rog-explorer");
const DEFAULT_BACKEND_URL = 'http://localhost:3001';
/**
 * Run the complete V9 Discovery pipeline
 */
async function runDiscoveryV9(config, onProgress) {
    const startTime = Date.now();
    // Stage 1: Build Static Behavior Graph
    onProgress?.({
        stage: 'scanning',
        message: 'Scanning project code...',
        percent: 5,
    });
    let sbg;
    try {
        sbg = await (0, sbg_scanner_1.buildStaticBehaviorGraph)(config.projectPath, (msg, filesScanned) => {
            onProgress?.({
                stage: 'scanning',
                message: msg,
                percent: Math.min(25, 5 + (filesScanned / 10)),
                details: { filesScanned },
            });
        });
        // Expand form inputs for more granular model
        sbg = (0, sbg_scanner_1.expandFormInputs)(sbg);
        onProgress?.({
            stage: 'scanning',
            message: `Code scan complete: ${sbg.nodes.length} nodes`,
            percent: 30,
            details: { filesScanned: sbg.nodes.length },
        });
    }
    catch (error) {
        onProgress?.({
            stage: 'error',
            message: `Code scan failed: ${error.message}`,
            percent: 30,
        });
        throw error;
    }
    // Stage 2: Build Runtime Observation Graph
    onProgress?.({
        stage: 'exploring',
        message: 'Launching browser for runtime exploration...',
        percent: 35,
    });
    let rog;
    try {
        rog = await (0, rog_explorer_1.buildRuntimeObservationGraph)(sbg.project, sbg, {
            baseUrl: config.baseUrl,
            maxPages: config.maxPages || 20,
            maxInteractionsPerPage: config.maxInteractionsPerPage || 10,
            timeoutMs: config.explorationTimeoutMs || 60000,
            headless: true,
        }, (msg, pagesExplored, elementsFound) => {
            onProgress?.({
                stage: 'exploring',
                message: msg,
                percent: Math.min(65, 35 + (pagesExplored * 2)),
                details: { pagesExplored, elementsFound },
            });
        });
        onProgress?.({
            stage: 'exploring',
            message: `Exploration complete: ${rog.pages.length} pages, ${rog.pages.reduce((s, p) => s + p.elements.length, 0)} elements`,
            percent: 70,
            details: {
                pagesExplored: rog.pages.length,
                elementsFound: rog.pages.reduce((s, p) => s + p.elements.length, 0),
            },
        });
    }
    catch (error) {
        onProgress?.({
            stage: 'error',
            message: `Runtime exploration failed: ${error.message}`,
            percent: 70,
        });
        throw error;
    }
    // Stage 3: Call Backend
    onProgress?.({
        stage: 'calling-backend',
        message: 'Sending data to backend for analysis...',
        percent: 75,
    });
    const backendUrl = config.backendUrl || DEFAULT_BACKEND_URL;
    let result;
    try {
        const request = {
            project: sbg.project,
            staticGraph: sbg,
            runtimeGraph: rog,
            options: {
                quality: 'max',
                timeBudgetMs: 30000,
            },
        };
        const response = await fetch(`${backendUrl}/analyze/discovery/v9`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
        }
        const backendResult = await response.json();
        if (!backendResult.ok) {
            throw new Error(backendResult.error || 'Backend processing failed');
        }
        result = backendResult.result;
        onProgress?.({
            stage: 'calling-backend',
            message: `Analysis complete: ${result.suites.length} suites, ${result.summary.totalCases} cases`,
            percent: 90,
        });
    }
    catch (error) {
        onProgress?.({
            stage: 'error',
            message: `Backend call failed: ${error.message}`,
            percent: 90,
        });
        throw error;
    }
    // Stage 4: Persist Artifacts
    let artifactsPath = '';
    if (config.persistArtifacts !== false) {
        onProgress?.({
            stage: 'persisting',
            message: 'Saving discovery artifacts...',
            percent: 92,
        });
        try {
            artifactsPath = await persistArtifacts(sbg, rog, result);
            onProgress?.({
                stage: 'persisting',
                message: `Artifacts saved to ${artifactsPath}`,
                percent: 98,
            });
        }
        catch (error) {
            console.error('Failed to persist artifacts:', error);
            // Non-fatal - continue with result
        }
    }
    // Complete
    onProgress?.({
        stage: 'complete',
        message: `Discovery complete in ${Date.now() - startTime}ms`,
        percent: 100,
        details: {
            filesScanned: sbg.nodes.length,
            pagesExplored: rog.pages.length,
            elementsFound: rog.pages.reduce((s, p) => s + p.elements.length, 0),
        },
    });
    return {
        sbg,
        rog,
        result,
        artifactsPath,
    };
}
/**
 * Persist artifacts to user data directory
 */
async function persistArtifacts(sbg, rog, result) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const artifactsDir = path.join(electron_1.app.getPath('userData'), 'discovery-runs', timestamp);
    await fs.mkdir(artifactsDir, { recursive: true });
    // Save SBG
    await fs.writeFile(path.join(artifactsDir, 'static-behavior-graph.json'), JSON.stringify(sbg, null, 2));
    // Save ROG
    await fs.writeFile(path.join(artifactsDir, 'runtime-observation-graph.json'), JSON.stringify(rog, null, 2));
    // Save Result
    await fs.writeFile(path.join(artifactsDir, 'discovery-result.json'), JSON.stringify(result, null, 2));
    // Save Summary
    const summary = `
Discovery V9 Summary
====================
Timestamp: ${result.timestamp}
Duration: ${result.diagnostics.processingTimeMs}ms

Input Stats:
- SBG Nodes: ${result.diagnostics.inputStats.sbgNodes}
- ROG Pages: ${result.diagnostics.inputStats.rogPages}

Output Stats:
- Suites: ${result.summary.totalSuites}
- Cases: ${result.summary.totalCases}
- Steps: ${result.summary.totalSteps}
- Avg Confidence: ${(result.summary.averageConfidence * 100).toFixed(1)}%

Provenance Breakdown:
- Pure Static: ${result.summary.provenanceBreakdown.pureStatic}
- Pure Runtime: ${result.summary.provenanceBreakdown.pureRuntime}
- Merged: ${result.summary.provenanceBreakdown.merged}

Quality Indicators:
- Has High Confidence Cases: ${result.summary.qualityIndicators.hasHighConfidenceCases}
- Has Critical Path Coverage: ${result.summary.qualityIndicators.hasCriticalPathCoverage}
- Has Form Interaction Coverage: ${result.summary.qualityIndicators.hasFormInteractionCoverage}
- Completeness Score: ${(result.summary.qualityIndicators.completenessScore * 100).toFixed(1)}%

Merge Stats:
- Matched Nodes: ${result.diagnostics.mergeStats.matchedNodes}
- Unmatched Static: ${result.diagnostics.mergeStats.unmatchedStatic}
- Unmatched Runtime: ${result.diagnostics.mergeStats.unmatchedRuntime}
`.trim();
    await fs.writeFile(path.join(artifactsDir, 'summary.txt'), summary);
    return artifactsDir;
}
/**
 * Get list of previous discovery runs
 */
async function listDiscoveryRuns() {
    const runsDir = path.join(electron_1.app.getPath('userData'), 'discovery-runs');
    try {
        const entries = await fs.readdir(runsDir, { withFileTypes: true });
        return entries
            .filter(e => e.isDirectory())
            .map(e => ({
            timestamp: e.name,
            path: path.join(runsDir, e.name),
        }))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    catch {
        return [];
    }
}
/**
 * Load a previous discovery result
 */
async function loadDiscoveryResult(artifactsPath) {
    try {
        const content = await fs.readFile(path.join(artifactsPath, 'discovery-result.json'), 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
