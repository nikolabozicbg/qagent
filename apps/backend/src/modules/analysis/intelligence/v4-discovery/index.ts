/**
 * V4 Discovery - Main Orchestrator
 * 
 * Graph-based test discovery with LLM enhancement.
 * 
 * Flow:
 * 1. Build graph from scanner payload
 * 2. Discover journeys via graph traversal
 * 3. Group journeys into logical suites
 * 4. Generate test cases (LLM or rule-based)
 * 5. Output structured suites/cases/steps
 */

export * from './types';
export * from './graph-builder';
export * from './journey-discovery';
export * from './llm-generator';

import { AppGraph, Suite, QualityMetrics } from './types';
import { buildGraph, getGraphStats } from './graph-builder';
import { discoverJourneys, groupJourneysByDomain } from './journey-discovery';
import { generateSuites, LLMClient } from './llm-generator';

export interface V4DiscoveryOptions {
  useLLM?: boolean;
  llmClient?: LLMClient;
}

export interface V4DiscoveryResult {
  suites: Suite[];
  graph: AppGraph;
  metrics: QualityMetrics;
  debug: {
    graphStats: Record<string, number>;
    journeyCount: number;
    domainGroups: string[];
  };
}

/**
 * Run V4 Discovery pipeline
 */
export async function runV4Discovery(
  payload: any,
  options: V4DiscoveryOptions = {}
): Promise<V4DiscoveryResult> {
  console.log('\n🚀 V4 Discovery - Graph-based Test Generation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Step 1: Build graph
  console.log('📊 Step 1: Building application graph...');
  const graph = buildGraph(payload);
  const graphStats = getGraphStats(graph);
  console.log(`   Nodes: ${graphStats.totalNodes} (${graphStats.routes} routes, ${graphStats.forms} forms, ${graphStats.fields} fields)`);
  console.log(`   Edges: ${graphStats.totalEdges}`);
  
  // Step 2: Discover journeys
  console.log('🔍 Step 2: Discovering user journeys...');
  const journeys = discoverJourneys(graph);
  console.log(`   Found ${journeys.length} journeys`);
  
  // Step 3: Group journeys
  console.log('📁 Step 3: Grouping journeys by domain...');
  const domainGroups = groupJourneysByDomain(journeys, graph);
  console.log(`   ${domainGroups.size} domain groups: ${Array.from(domainGroups.keys()).join(', ')}`);
  
  // Step 4: Generate test suites
  console.log('🧪 Step 4: Generating test suites...');
  const context = {
    appName: payload.project?.name || 'Unknown App',
    framework: payload.project?.framework?.name || 'Unknown',
  };
  const suites = await generateSuites(
    journeys,
    graph,
    context,
    options.useLLM ? options.llmClient : undefined
  );
  console.log(`   Generated ${suites.length} suites`);
  
  // Calculate metrics
  const metrics = calculateMetrics(suites, graph, journeys);
  
  // Summary
  const totalCases = suites.reduce((sum, s) => sum + s.cases.length, 0);
  const totalSteps = suites.reduce((sum, s) => 
    sum + s.cases.reduce((cs, c) => cs + c.steps.length, 0), 0);
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ V4 Discovery complete:`);
  console.log(`   ${suites.length} suites, ${totalCases} cases, ${totalSteps} steps`);
  console.log(`   Graph coverage: ${Math.round(metrics.graphCompleteness * 100)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return {
    suites,
    graph,
    metrics,
    debug: {
      graphStats,
      journeyCount: journeys.length,
      domainGroups: Array.from(domainGroups.keys()),
    },
  };
}

/**
 * Calculate quality metrics
 */
function calculateMetrics(
  suites: Suite[],
  graph: AppGraph,
  journeys: any[]
): QualityMetrics {
  // Graph completeness: % of routes covered by journeys
  const routeNodes = graph.nodes.filter(n => n.type === 'route');
  const coveredRoutes = new Set(journeys.map(j => j.entryNode));
  const graphCompleteness = routeNodes.length > 0 
    ? coveredRoutes.size / routeNodes.length 
    : 0;
  
  // Edge coverage
  const usedEdges = new Set(journeys.flatMap(j => j.edges));
  const edgeCoverage = graph.edges.length > 0
    ? usedEdges.size / graph.edges.length
    : 0;
  
  // Case type distribution
  const caseTypeDistribution: Record<string, number> = {
    'happy-path': 0,
    'validation': 0,
    'error': 0,
    'edge': 0,
    'security': 0,
  };
  for (const suite of suites) {
    for (const c of suite.cases) {
      caseTypeDistribution[c.type] = (caseTypeDistribution[c.type] || 0) + 1;
    }
  }
  
  // Average journey length
  const avgJourneyLength = journeys.length > 0
    ? journeys.reduce((sum, j) => sum + j.nodes.length, 0) / journeys.length
    : 0;
  
  return {
    graphCompleteness,
    edgeCoverage,
    journeyCount: journeys.length,
    avgJourneyLength,
    caseTypeDistribution: caseTypeDistribution as any,
    selectorValidity: 1, // Would need runtime validation
    nameClarity: 1,      // Would need LLM evaluation
    dataRealism: 1,      // Would need LLM evaluation
  };
}

/**
 * Convert V4 output to legacy format (for backward compatibility)
 */
export function convertToLegacyFormat(result: V4DiscoveryResult): any {
  return {
    success: true,
    suites: result.suites.map(suite => ({
      id: suite.id,
      name: suite.name,
      description: suite.description,
      category: inferCategory(suite),
      priority: 'medium',
      tags: [suite.name.split(' ')[0]],
      testCases: suite.cases.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        priority: c.type === 'happy-path' ? 'high' : 'medium',
        steps: c.steps.map((step, idx) => ({
          index: idx,
          action: step.action,
          target: step.target,
          selector: step.action === 'fill' || step.action === 'click' ? step.target : null,
          value: step.value || null,
          description: `${step.action} ${step.target}`,
        })),
        estimatedDuration: c.steps.length * 2,
      })),
      coverage: {
        routes: [suite.journey.entryNode.replace('route:', '')],
        forms: suite.journey.nodes
          .filter(n => n.startsWith('form:'))
          .map(n => n.replace('form:', '')),
        entities: [],
      },
    })),
    summary: {
      totalSuites: result.suites.length,
      totalCases: result.suites.reduce((sum, s) => sum + s.cases.length, 0),
      totalSteps: result.suites.reduce((sum, s) => 
        sum + s.cases.reduce((cs, c) => cs + c.steps.length, 0), 0),
      coverage: {
        routes: { 
          total: result.debug.graphStats.routes, 
          covered: result.suites.length 
        },
        forms: { 
          total: result.debug.graphStats.forms, 
          covered: result.debug.graphStats.forms 
        },
        entities: { total: 0, covered: 0 },
      },
    },
    analysis: {
      detectedEntities: result.debug.domainGroups,
      detectedFlows: result.suites.map(s => s.name),
      processingTime: 0,
      aiModel: 'v4-graph',
    },
  };
}

function inferCategory(suite: Suite): string {
  const name = suite.name.toLowerCase();
  if (name.includes('sign') || name.includes('login') || name.includes('auth')) {
    return 'authentication';
  }
  if (name.includes('dashboard') || name.includes('admin')) {
    return 'admin';
  }
  if (name.includes('product') || name.includes('cart') || name.includes('checkout')) {
    return 'ecommerce';
  }
  return 'general';
}
