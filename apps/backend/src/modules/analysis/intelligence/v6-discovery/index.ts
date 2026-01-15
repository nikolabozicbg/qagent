/**
 * V6 Intelligent Test Generation Pipeline
 * 
 * LLM-FIRST ARCHITECTURE
 * 
 * Pipeline stages:
 * 1. LLM Analyzer - Understand the application
 * 2. Test Plan Generator - Generate test plans per feature
 * 3. Step Compiler - Translate to executable steps
 * 4. Quality Validator - Validate and fix issues
 * 
 * Key differences from V5:
 * - LLM makes decisions, code just translates
 * - No hardcoded heuristics
 * - Test ordering based on dependencies
 * - Proper deduplication and validation
 */

import { AIProviderService } from '../../../../services/ai-provider.service';
import { ScannerPayload } from '../v5-discovery/types';
import { createLLMClient, createMockLLMClient, LLMClient } from '../v5-discovery/llm-client';
import {
  V6Result,
  EnhancedScannerPayload,
  CompiledTestSuite,
  AppUnderstanding,
} from './types';
import { analyzeApp } from './analyzer';
import { generateTestPlans } from './test-plan-generator';
import { compileTestPlans } from './step-compiler';
import { validateSuites, autoFixIssues } from './validator';

// =============================================================================
// MAIN PIPELINE FUNCTION
// =============================================================================

export interface V6Options {
  /** Skip LLM and use fallback heuristics */
  noLLM?: boolean;
  
  /** Maximum test cases per feature */
  maxCasesPerFeature?: number;
  
  /** Only generate tests for critical features */
  criticalOnly?: boolean;
  
  /** Enable auto-fix for validation issues */
  autoFix?: boolean;
  
  /** Debug mode - log more details */
  debug?: boolean;
}

export async function runV6Pipeline(
  scannerPayload: ScannerPayload | EnhancedScannerPayload,
  aiProvider: AIProviderService,
  options: V6Options = {}
): Promise<V6Result> {
  const startTime = Date.now();
  let llmCallsCount = 0;
  
  console.log('\n🚀 V6 Intelligent Test Generation Pipeline');
  console.log('━'.repeat(50));
  
  // Create LLM client
  const llmClient = options.noLLM 
    ? createMockLLMClient() 
    : createLLMClientWithTracking(aiProvider, () => llmCallsCount++);
  
  try {
    // ==========================================================================
    // PHASE 1: LLM ANALYZER - Understand the application
    // ==========================================================================
    console.log('\n📊 Phase 1: App Understanding');
    console.log('─'.repeat(40));
    
    const appUnderstanding = await analyzeApp(scannerPayload, llmClient);
    
    if (options.debug) {
      console.log(`   App Type: ${appUnderstanding.appType}`);
      console.log(`   Features: ${appUnderstanding.features.length}`);
      console.log(`   Entities: ${appUnderstanding.dataEntities.length}`);
      console.log(`   Critical Paths: ${appUnderstanding.criticalPaths.length}`);
    }
    
    // Filter to critical only if requested
    let featuresToTest = appUnderstanding.features;
    if (options.criticalOnly) {
      featuresToTest = featuresToTest.filter(f => 
        f.priority === 'critical' || f.priority === 'high'
      );
      console.log(`   📌 Filtered to ${featuresToTest.length} critical/high priority features`);
    }
    
    // ==========================================================================
    // PHASE 2: TEST PLAN GENERATOR - Generate test plans per feature
    // ==========================================================================
    console.log('\n📝 Phase 2: Test Plan Generation');
    console.log('─'.repeat(40));
    
    // Create filtered app understanding for test plan generation
    const filteredUnderstanding: AppUnderstanding = {
      ...appUnderstanding,
      features: featuresToTest,
    };
    
    const testPlans = await generateTestPlans(
      filteredUnderstanding,
      scannerPayload,
      llmClient
    );
    
    if (options.debug) {
      for (const plan of testPlans) {
        console.log(`   📋 ${plan.featureName}: ${plan.cases.length} cases`);
      }
    }
    
    // ==========================================================================
    // PHASE 3: STEP COMPILER - Translate to executable steps
    // ==========================================================================
    console.log('\n🔧 Phase 3: Step Compilation');
    console.log('─'.repeat(40));
    
    const { suites, unresolved } = compileTestPlans(
      testPlans,
      filteredUnderstanding,
      scannerPayload
    );
    
    if (unresolved.length > 0 && options.debug) {
      console.log(`   ⚠️ ${unresolved.length} unresolved items:`);
      for (const item of unresolved.slice(0, 5)) {
        console.log(`      - ${item.type}: ${item.target} (${item.context})`);
      }
    }
    
    // ==========================================================================
    // PHASE 4: QUALITY VALIDATOR - Validate and fix issues
    // ==========================================================================
    console.log('\n✅ Phase 4: Quality Validation');
    console.log('─'.repeat(40));
    
    const validation = validateSuites(suites, filteredUnderstanding, scannerPayload);
    
    // Auto-fix if enabled and there are fixable issues
    let finalSuites = suites;
    if (options.autoFix && validation.issues.some(i => i.autoFixable)) {
      console.log('   🔧 Auto-fixing issues...');
      finalSuites = autoFixIssues(suites, validation.issues, filteredUnderstanding);
      
      // Re-validate after fix
      const postFixValidation = validateSuites(finalSuites, filteredUnderstanding, scannerPayload);
      console.log(`   📊 Post-fix score: ${Math.round(postFixValidation.score * 100)}%`);
    }
    
    // Order suites by dependencies
    finalSuites = orderSuitesByDependencies(finalSuites, filteredUnderstanding);
    
    // ==========================================================================
    // BUILD RESULT
    // ==========================================================================
    const processingTimeMs = Date.now() - startTime;
    
    const result: V6Result = {
      success: validation.valid || validation.score >= 0.5,
      score: validation.score,
      appUnderstanding: filteredUnderstanding,
      suites: finalSuites,
      validation,
      stats: {
        featuresDetected: filteredUnderstanding.features.length,
        testCasesGenerated: finalSuites.reduce((sum, s) => sum + s.cases.length, 0),
        constraintsCovered: validation.coverage.constraints.tested,
        processingTimeMs,
        llmCallsCount,
      },
      reviewNeeded: [
        ...unresolved.map(u => ({
          type: u.type,
          description: u.suggestion || `Unresolved ${u.type}: ${u.target}`,
          location: u.context,
        })),
        ...validation.issues
          .filter(i => i.severity === 'error')
          .map(i => ({
            type: i.type,
            description: i.description,
            location: i.location,
          })),
      ],
    };
    
    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log('\n' + '━'.repeat(50));
    console.log('📊 V6 Pipeline Summary');
    console.log('━'.repeat(50));
    console.log(`   Features: ${result.stats.featuresDetected}`);
    console.log(`   Test Suites: ${result.suites.length}`);
    console.log(`   Test Cases: ${result.stats.testCasesGenerated}`);
    console.log(`   Quality Score: ${Math.round(result.score * 100)}%`);
    console.log(`   LLM Calls: ${result.stats.llmCallsCount}`);
    console.log(`   Time: ${result.stats.processingTimeMs}ms`);
    
    if (result.reviewNeeded.length > 0) {
      console.log(`   ⚠️ Items needing review: ${result.reviewNeeded.length}`);
    }
    
    console.log('━'.repeat(50) + '\n');
    
    return result;
    
  } catch (error) {
    console.error('❌ V6 Pipeline failed:', error);
    
    // Return minimal result on error
    return {
      success: false,
      score: 0,
      appUnderstanding: {
        description: 'Pipeline failed',
        appType: 'unknown',
        features: [],
        dataEntities: [],
        testExecutionOrder: [],
        criticalPaths: [],
        auth: { hasAuth: false, protectedFeatureIds: [] },
      },
      suites: [],
      validation: {
        valid: false,
        score: 0,
        issues: [{
          id: 'pipeline-error',
          type: 'missing-selector',
          severity: 'error',
          location: 'Pipeline',
          description: `Pipeline error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestion: 'Check scanner data and LLM configuration',
          autoFixable: false,
        }],
        coverage: {
          features: { total: 0, tested: 0, coverage: 0 },
          constraints: { total: 0, tested: 0, coverage: 0 },
          criticalPaths: { total: 0, tested: 0, coverage: 0 },
        },
        duplicates: { found: false, count: 0, locations: [] },
        selectorQuality: { dataTestIdUsage: 0, stableSelectors: 0, riskySelectors: [] },
      },
      stats: {
        featuresDetected: 0,
        testCasesGenerated: 0,
        constraintsCovered: 0,
        processingTimeMs: Date.now() - startTime,
        llmCallsCount,
      },
      reviewNeeded: [{
        type: 'error',
        description: error instanceof Error ? error.message : 'Unknown error',
        location: 'Pipeline',
      }],
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create LLM client with call tracking
 */
function createLLMClientWithTracking(
  aiProvider: AIProviderService,
  onCall: () => void
): LLMClient {
  const baseClient = createLLMClient(aiProvider);
  
  return {
    async complete(prompt, options) {
      onCall();
      return baseClient.complete(prompt, options);
    },
    async completeJSON<T>(prompt, options) {
      onCall();
      return baseClient.completeJSON<T>(prompt, options);
    },
    isAvailable() {
      return baseClient.isAvailable();
    },
  };
}

/**
 * Order suites by dependencies (topological sort)
 */
function orderSuitesByDependencies(
  suites: CompiledTestSuite[],
  appUnderstanding: AppUnderstanding
): CompiledTestSuite[] {
  // Build dependency graph
  const graph = new Map<string, string[]>();
  for (const feature of appUnderstanding.features) {
    graph.set(feature.id, feature.dependsOn);
  }
  
  // Topological sort
  const sorted: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();
  
  function visit(id: string) {
    if (temp.has(id)) return; // Circular dependency
    if (visited.has(id)) return;
    
    temp.add(id);
    
    const deps = graph.get(id) || [];
    for (const dep of deps) {
      visit(dep);
    }
    
    temp.delete(id);
    visited.add(id);
    sorted.push(id);
  }
  
  // Visit based on testExecutionOrder
  for (const id of appUnderstanding.testExecutionOrder) {
    visit(id);
  }
  
  // Visit any remaining
  for (const feature of appUnderstanding.features) {
    if (!visited.has(feature.id)) {
      visit(feature.id);
    }
  }
  
  // Reorder suites
  const suiteById = new Map(suites.map(s => [s.featureId, s]));
  const reordered: CompiledTestSuite[] = [];
  
  for (const featureId of sorted) {
    const suite = suiteById.get(featureId);
    if (suite) {
      reordered.push(suite);
    }
  }
  
  // Add any suites not in sorted (shouldn't happen)
  for (const suite of suites) {
    if (!reordered.includes(suite)) {
      reordered.push(suite);
    }
  }
  
  return reordered;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  analyzeApp,
  generateTestPlans,
  compileTestPlans,
  validateSuites,
  autoFixIssues,
};

export * from './types';
