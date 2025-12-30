/**
 * TestHealthService - Calculate project test health score
 * 
 * SOLID Principles:
 * - Single Responsibility: Only calculates health metrics
 * - Open/Closed: Extensible via strategy pattern
 * - Dependency Inversion: Depends on abstractions (interfaces)
 * 
 * Health Score Formula (0-100):
 * - Pass Rate: 40 points
 * - Coverage: 30 points  
 * - Freshness: 15 points (last run recency)
 * - Critical Path Coverage: 15 points
 */

export interface TestRun {
  timestamp: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
}

export interface TestMetrics {
  totalJourneys: number;
  passingJourneys: number;
  failingJourneys: number;
  coverage: number; // 0-100
  criticalPathsCovered: number; // 0-100
  lastRunTimestamp: number | null;
}

export interface HealthScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'up' | 'down' | 'stable';
  breakdown: {
    passRate: number;
    coverage: number;
    freshness: number;
    criticalPaths: number;
  };
}

/**
 * Health score calculator strategy
 */
export interface IHealthCalculator {
  calculate(metrics: TestMetrics, history: TestRun[]): HealthScore;
}

/**
 * Default health calculator implementation
 */
export class DefaultHealthCalculator implements IHealthCalculator {
  calculate(metrics: TestMetrics, history: TestRun[]): HealthScore {
    // 1. Pass Rate Score (40 points max)
    const passRate = metrics.totalJourneys > 0
      ? (metrics.passingJourneys / metrics.totalJourneys) * 40
      : 0;

    // 2. Coverage Score (30 points max)
    const coverageScore = (metrics.coverage / 100) * 30;

    // 3. Freshness Score (15 points max)
    const freshnessScore = this.calculateFreshnessScore(metrics.lastRunTimestamp);

    // 4. Critical Path Coverage (15 points max)
    const criticalScore = (metrics.criticalPathsCovered / 100) * 15;

    // Total score
    const totalScore = Math.round(passRate + coverageScore + freshnessScore + criticalScore);

    // Calculate trend
    const trend = this.calculateTrend(totalScore, history);

    return {
      score: totalScore,
      grade: this.getGrade(totalScore),
      trend,
      breakdown: {
        passRate: Math.round(passRate),
        coverage: Math.round(coverageScore),
        freshness: Math.round(freshnessScore),
        criticalPaths: Math.round(criticalScore),
      },
    };
  }

  private calculateFreshnessScore(lastRunTimestamp: number | null): number {
    if (!lastRunTimestamp) return 0;

    const now = Date.now();
    const hoursSinceLastRun = (now - lastRunTimestamp) / (1000 * 60 * 60);

    if (hoursSinceLastRun < 24) return 15; // Within 24h = full points
    if (hoursSinceLastRun < 168) return 10; // Within 7 days = 10 points
    if (hoursSinceLastRun < 720) return 5; // Within 30 days = 5 points
    return 0; // Over 30 days = 0 points
  }

  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private calculateTrend(currentScore: number, history: TestRun[]): 'up' | 'down' | 'stable' {
    if (history.length < 2) return 'stable';

    // Get last 2 runs
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const previousRun = sorted[1];

    if (!previousRun) return 'stable';

    // Calculate previous score
    const previousPassRate = previousRun.totalTests > 0
      ? (previousRun.passedTests / previousRun.totalTests) * 40
      : 0;
    const previousScore = Math.round(previousPassRate); // Simplified for trend

    const diff = currentScore - previousScore;

    if (diff > 3) return 'up';
    if (diff < -3) return 'down';
    return 'stable';
  }
}

/**
 * TestHealthService - Main service for health calculations
 * 
 * Best Practices:
 * - Dependency injection (calculator can be swapped)
 * - Immutable data (doesn't modify inputs)
 * - Pure functions (same input = same output)
 * - Clear separation of concerns
 */
export class TestHealthService {
  constructor(
    private readonly calculator: IHealthCalculator = new DefaultHealthCalculator()
  ) {}

  /**
   * Calculate current health score
   */
  calculateHealth(metrics: TestMetrics, history: TestRun[] = []): HealthScore {
    return this.calculator.calculate(metrics, history);
  }

  /**
   * Get health score trend over time
   */
  getHealthTrend(history: TestRun[], windowSize: number = 7): number[] {
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    const recent = sorted.slice(-windowSize);

    return recent.map(run => {
      const passRate = run.totalTests > 0
        ? (run.passedTests / run.totalTests) * 100
        : 0;
      return Math.round(passRate);
    });
  }

  /**
   * Check if health is declining
   */
  isHealthDeclining(history: TestRun[]): boolean {
    if (history.length < 3) return false;

    const trend = this.getHealthTrend(history, 3);
    
    // Check if consistently declining
    return trend[0] > trend[1] && trend[1] > trend[2];
  }

  /**
   * Get recommended actions based on health score
   */
  getRecommendations(health: HealthScore, metrics: TestMetrics): string[] {
    const recommendations: string[] = [];

    // Low pass rate
    if (health.breakdown.passRate < 25) {
      recommendations.push('Fix failing tests - pass rate is critically low');
    }

    // Low coverage
    if (health.breakdown.coverage < 20) {
      recommendations.push('Generate more tests - coverage is below 70%');
    }

    // Stale tests
    if (health.breakdown.freshness < 5) {
      recommendations.push('Run tests recently - last run was over 30 days ago');
    }

    // Critical paths not covered
    if (health.breakdown.criticalPaths < 10) {
      recommendations.push('Add tests for critical user journeys');
    }

    // Failing tests
    if (metrics.failingJourneys > 0) {
      recommendations.push(`Fix ${metrics.failingJourneys} failing test(s)`);
    }

    return recommendations;
  }
}
