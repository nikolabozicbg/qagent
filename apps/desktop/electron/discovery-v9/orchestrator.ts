/**
 * V9 Discovery Orchestrator
 * 
 * Main entry point for the Discovery V9 pipeline in Electron.
 * 
 * RUNTIME-FIRST FLOW:
 * 1. Extract candidate actions from static code (SBG)
 * 2. Execute candidates at runtime and observe effects
 * 3. Filter to only verified actions (with observable effects)
 * 4. Build flows and send to backend
 * 5. Persist artifacts
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { app } from 'electron';
import { extractCandidateActions, buildStaticBehaviorGraph, expandFormInputs } from './sbg-scanner';
import { buildRuntimeObservationGraph } from './rog-explorer';
import { executeAndObserveCandidates } from './runtime-executor';
import { verifyAndFilter, buildVerifiedFlows } from './verifier';
import type {
  DiscoveryV9Config,
  DiscoveryV9Progress,
  DiscoveryV9Artifacts,
  DiscoveryV9Request,
  DiscoveryResultV9,
  StaticBehaviorGraphV9,
  RuntimeObservationGraphV9,
  CandidateAction,
  VerifiedStep,
  VerifiedFlow,
  VerificationStats,
} from './types';

const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export type ProgressCallback = (progress: DiscoveryV9Progress) => void;

/**
 * Run the complete V9 Discovery pipeline with RUNTIME-FIRST verification.
 * 
 * Only runtime-verified actions become steps.
 * Static-only nodes are NEVER converted to steps directly.
 */
export async function runDiscoveryV9(
  config: DiscoveryV9Config,
  onProgress?: ProgressCallback
): Promise<DiscoveryV9Artifacts> {
  const startTime = Date.now();

  // ==========================================================================
  // Stage 1: Extract Candidate Actions from Static Code
  // ==========================================================================
  onProgress?.({
    stage: 'scanning',
    message: 'Extracting candidate actions from code...',
    percent: 5,
  });

  let candidates: CandidateAction[];
  let sbg: StaticBehaviorGraphV9;
  
  try {
    // Extract candidates (new runtime-first approach)
    const extracted = await extractCandidateActions(
      config.projectPath,
      (msg, count) => {
        onProgress?.({
          stage: 'scanning',
          message: msg,
          percent: Math.min(20, 5 + (count / 20)),
          details: { filesScanned: count },
        });
      }
    );
    candidates = extracted.candidates;

    // Also build legacy SBG for backward compatibility
    sbg = await buildStaticBehaviorGraph(config.projectPath);
    sbg = expandFormInputs(sbg);

    onProgress?.({
      stage: 'scanning',
      message: `Found ${candidates.length} candidate actions`,
      percent: 25,
      details: { filesScanned: sbg.nodes.length },
    });
  } catch (error) {
    onProgress?.({
      stage: 'error',
      message: `Code scan failed: ${(error as Error).message}`,
      percent: 25,
    });
    throw error;
  }

  // ==========================================================================
  // Stage 2: Execute Candidates at Runtime and Observe Effects
  // ==========================================================================
  onProgress?.({
    stage: 'exploring',
    message: 'Executing candidates and observing effects...',
    percent: 30,
  });

  let verifiedSteps: VerifiedStep[];
  let verificationStats: VerificationStats;
  let rog: RuntimeObservationGraphV9;

  try {
    // Execute candidates and capture observations
    const observations = await executeAndObserveCandidates(
      candidates,
      {
        baseUrl: config.baseUrl,
        timeoutMs: config.explorationTimeoutMs || 60000,
        headless: true,
      },
      (msg, executed, total) => {
        onProgress?.({
          stage: 'exploring',
          message: msg,
          percent: Math.min(60, 30 + ((executed / Math.max(total, 1)) * 30)),
          details: { 
            pagesExplored: executed, 
            elementsFound: total 
          },
        });
      }
    );

    // Verify and filter - CRITICAL: only verified actions become steps
    const verified = verifyAndFilter(candidates, observations);
    verifiedSteps = verified.verifiedSteps;
    verificationStats = verified.stats;

    // Build legacy ROG for backward compatibility
    rog = await buildRuntimeObservationGraph(
      sbg.project,
      sbg,
      {
        baseUrl: config.baseUrl,
        maxPages: config.maxPages || 20,
        maxInteractionsPerPage: config.maxInteractionsPerPage || 10,
        timeoutMs: config.explorationTimeoutMs || 60000,
        headless: true,
      }
    );

    onProgress?.({
      stage: 'exploring',
      message: `Verified ${verifiedSteps.length} actions (${verificationStats.candidatesDiscarded} discarded)`,
      percent: 65,
      details: {
        pagesExplored: verificationStats.candidatesExecuted,
        elementsFound: verifiedSteps.length,
      },
    });

    console.log('[Discovery V9] Verification stats:', verificationStats);

  } catch (error) {
    onProgress?.({
      stage: 'error',
      message: `Runtime verification failed: ${(error as Error).message}`,
      percent: 65,
    });
    throw error;
  }

  // ==========================================================================
  // Stage 3: Build Verified Flows and Call Backend
  // ==========================================================================
  onProgress?.({
    stage: 'calling-backend',
    message: 'Building verified flows...',
    percent: 70,
  });

  const backendUrl = config.backendUrl || DEFAULT_BACKEND_URL;
  let result: DiscoveryResultV9;

  try {
    // Build verified flows from verified steps
    const verifiedFlows = buildVerifiedFlows(verifiedSteps);

    console.log('[Discovery V9] Built', verifiedFlows.length, 'verified flows');

    // If no verified flows, return empty result
    if (verifiedFlows.length === 0) {
      result = buildEmptyResult(verificationStats, sbg, rog, Date.now() - startTime);
      
      onProgress?.({
        stage: 'calling-backend',
        message: 'No verified user flows found',
        percent: 90,
      });
    } else {
      // Send verified flows to backend for final processing
      const request: DiscoveryV9Request = {
        project: sbg.project,
        staticGraph: sbg,
        runtimeGraph: rog,
        options: {
          quality: 'max',
          timeBudgetMs: 30000,
        },
        // Runtime-verified flows
        verifiedFlows,
        verificationStats,
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
  } catch (error) {
    onProgress?.({
      stage: 'error',
      message: `Backend call failed: ${(error as Error).message}`,
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
    } catch (error) {
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
 * Build an empty result when no flows are verified.
 * This is the correct empty state for runtime-first discovery.
 */
function buildEmptyResult(
  stats: VerificationStats,
  sbg: StaticBehaviorGraphV9,
  rog: RuntimeObservationGraphV9,
  durationMs: number
): DiscoveryResultV9 {
  return {
    success: true,
    suites: [],
    summary: {
      totalSuites: 0,
      totalCases: 0,
      totalSteps: 0,
      averageConfidence: 0,
      provenanceBreakdown: {
        pureStatic: 0,
        pureRuntime: 0,
        merged: 0,
      },
      qualityIndicators: {
        hasHighConfidenceCases: false,
        hasCriticalPathCoverage: false,
        hasFormInteractionCoverage: false,
        completenessScore: 0,
      },
    },
    diagnostics: {
      processingTimeMs: durationMs,
      inputStats: {
        sbgNodes: sbg.nodes.length,
        rogPages: rog.pages.length,
      },
      mergeStats: {
        matchedNodes: 0,
        unmatchedStatic: stats.candidatesDiscarded,
        unmatchedRuntime: 0,
      },
      // Include verification stats in diagnostics
      verificationStats: {
        totalCandidates: stats.totalCandidates,
        candidatesExecuted: stats.candidatesExecuted,
        candidatesVerified: stats.candidatesVerified,
        candidatesDiscarded: stats.candidatesDiscarded,
        discardReasons: stats.discardReasons,
      },
    },
    timestamp: new Date().toISOString(),
    version: 'v9',
  };
}

/**
 * Persist artifacts to user data directory
 */
async function persistArtifacts(
  sbg: StaticBehaviorGraphV9,
  rog: RuntimeObservationGraphV9,
  result: DiscoveryResultV9
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactsDir = path.join(
    app.getPath('userData'),
    'discovery-runs',
    timestamp
  );

  await fs.mkdir(artifactsDir, { recursive: true });

  // Save SBG
  await fs.writeFile(
    path.join(artifactsDir, 'static-behavior-graph.json'),
    JSON.stringify(sbg, null, 2)
  );

  // Save ROG
  await fs.writeFile(
    path.join(artifactsDir, 'runtime-observation-graph.json'),
    JSON.stringify(rog, null, 2)
  );

  // Save Result
  await fs.writeFile(
    path.join(artifactsDir, 'discovery-result.json'),
    JSON.stringify(result, null, 2)
  );

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
export async function listDiscoveryRuns(): Promise<Array<{
  timestamp: string;
  path: string;
}>> {
  const runsDir = path.join(app.getPath('userData'), 'discovery-runs');
  
  try {
    const entries = await fs.readdir(runsDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => ({
        timestamp: e.name,
        path: path.join(runsDir, e.name),
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

/**
 * Load a previous discovery result
 */
export async function loadDiscoveryResult(artifactsPath: string): Promise<DiscoveryResultV9 | null> {
  try {
    const content = await fs.readFile(
      path.join(artifactsPath, 'discovery-result.json'),
      'utf-8'
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}
