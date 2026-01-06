import { Injectable } from '@nestjs/common';
import { FlowsService } from '../flows/flows.service';

export interface DashboardMetrics {
  totalFlows: number;
  testsGenerated: number;
  testsPassing: number;
  coverage: number;
  passRate: number;
  avgTime: number;
  flakiness: number;
  healthScore: number;
}

@Injectable()
export class MetricsService {
  // Cache with TTL
  private cache: Map<string, { metrics: DashboardMetrics; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly flowsService: FlowsService) {}

  /**
   * Get dashboard metrics for a project
   */
  getDashboardMetrics(projectPath: string): DashboardMetrics {
    // Check cache
    const cached = this.cache.get(projectPath);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`📊 Metrics (cached) for: ${projectPath}`);
      return cached.metrics;
    }

    // Calculate fresh metrics
    console.log(`📊 Calculating metrics for: ${projectPath}`);
    const metrics = this.calculateMetrics(projectPath);

    // Update cache
    this.cache.set(projectPath, {
      metrics,
      timestamp: Date.now(),
    });

    return metrics;
  }

  /**
   * Invalidate cache for a project
   */
  invalidateCache(projectPath: string): void {
    this.cache.delete(projectPath);
    console.log(`🗑️  Cache invalidated for: ${projectPath}`);
  }

  /**
   * Calculate metrics from current state
   */
  private calculateMetrics(projectPath: string): DashboardMetrics {
    const flows = this.flowsService.getFlows(projectPath);

    if (flows.length === 0) {
      return this.getDefaultMetrics();
    }

    // Total flows
    const totalFlows = flows.length;

    // Tests generated (flows with testFile = true)
    const testsGenerated = flows.filter(f => f.testFile).length;

    // Tests passing
    const testsPassingCount = flows
      .filter(f => f.status === 'passing' || f.status === 'partial')
      .reduce((sum, f) => sum + (f.passing || 0), 0);

    const testsTotalCount = flows
      .filter(f => f.total)
      .reduce((sum, f) => sum + (f.total || 0), 0);

    // Pass rate
    const passRate = testsTotalCount > 0
      ? Math.round((testsPassingCount / testsTotalCount) * 100)
      : 0;

    // Coverage (flows with tests / total flows)
    const coverage = totalFlows > 0
      ? Math.round((testsGenerated / totalFlows) * 100)
      : 0;

    // Average time (mock for now - would be from actual test runs)
    const avgTime = 8.2;

    // Flakiness score (mock - would be calculated from test history)
    const flakinessFlows = flows.filter(f => f.status === 'failing').length;
    const flakiness = Math.min(flakinessFlows, 5);

    // Health score (weighted combination of metrics)
    const healthScore = this.calculateHealthScore({
      coverage,
      passRate,
      flakiness: flakiness / 5, // Normalize to 0-1
      testsGenerated,
      totalFlows,
    });

    return {
      totalFlows,
      testsGenerated,
      testsPassing: testsPassingCount,
      coverage,
      passRate,
      avgTime,
      flakiness,
      healthScore,
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(params: {
    coverage: number;
    passRate: number;
    flakiness: number;
    testsGenerated: number;
    totalFlows: number;
  }): number {
    const { coverage, passRate, flakiness, testsGenerated, totalFlows } = params;

    // Weighted formula
    const coverageWeight = 0.3;
    const passRateWeight = 0.4;
    const flakinessWeight = 0.2;
    const completionWeight = 0.1;

    const completion = totalFlows > 0 ? (testsGenerated / totalFlows) * 100 : 0;
    const flakinessScore = (1 - flakiness) * 100; // Invert (lower is better)

    const score =
      coverage * coverageWeight +
      passRate * passRateWeight +
      flakinessScore * flakinessWeight +
      completion * completionWeight;

    return Math.round(score);
  }

  /**
   * Get default metrics when no flows exist
   */
  private getDefaultMetrics(): DashboardMetrics {
    return {
      totalFlows: 0,
      testsGenerated: 0,
      testsPassing: 0,
      coverage: 0,
      passRate: 0,
      avgTime: 0,
      flakiness: 0,
      healthScore: 0,
    };
  }

  /**
   * Get metrics for multiple projects
   */
  getBulkMetrics(projectPaths: string[]): Record<string, DashboardMetrics> {
    const result: Record<string, DashboardMetrics> = {};

    for (const projectPath of projectPaths) {
      result[projectPath] = this.getDashboardMetrics(projectPath);
    }

    return result;
  }
}
