import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Get dashboard metrics
   * GET /metrics/dashboard?projectPath=/path/to/project
   */
  @Get('dashboard')
  getDashboardMetrics(@Query('projectPath') projectPath: string) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required'
      };
    }

    console.log(`📊 GET /metrics/dashboard - Project: ${projectPath}`);
    const metrics = this.metricsService.getDashboardMetrics(projectPath);

    return {
      projectPath,
      metrics
    };
  }

  /**
   * Invalidate metrics cache
   * POST /metrics/invalidate
   */
  @Post('invalidate')
  invalidateCache(@Body() body: { projectPath: string }) {
    console.log(`🗑️  POST /metrics/invalidate - Project: ${body.projectPath}`);
    this.metricsService.invalidateCache(body.projectPath);

    return {
      success: true,
      message: 'Cache invalidated'
    };
  }

  /**
   * Get metrics for multiple projects
   * POST /metrics/bulk
   */
  @Post('bulk')
  getBulkMetrics(@Body() body: { projectPaths: string[] }) {
    console.log(`📊 POST /metrics/bulk - ${body.projectPaths.length} projects`);
    
    const metrics = this.metricsService.getBulkMetrics(body.projectPaths);

    return {
      success: true,
      metrics
    };
  }
}
