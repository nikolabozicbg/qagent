import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ActivityService, Activity } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get recent activities
   * GET /activity/recent?projectPath=/path/to/project&limit=10
   */
  @Get('recent')
  getRecentActivities(
    @Query('projectPath') projectPath: string,
    @Query('limit') limit?: string
  ) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required',
        activities: []
      };
    }

    const limitNum = limit ? parseInt(limit, 10) : 10;
    console.log(`📋 GET /activity/recent - Project: ${projectPath}, Limit: ${limitNum}`);

    const activities = this.activityService.getRecentActivities(projectPath, limitNum);

    return {
      projectPath,
      total: activities.length,
      activities
    };
  }

  /**
   * Log a new activity
   * POST /activity/log
   */
  @Post('log')
  logActivity(@Body() body: Omit<Activity, 'id' | 'timestamp'>) {
    console.log(`📝 POST /activity/log - Type: ${body.type} for project: ${body.projectPath}`);

    const activity = this.activityService.logActivity(body);

    return {
      success: true,
      activity
    };
  }

  /**
   * Get activity statistics
   * GET /activity/stats?projectPath=/path/to/project
   */
  @Get('stats')
  getActivityStats(@Query('projectPath') projectPath: string) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required'
      };
    }

    console.log(`📊 GET /activity/stats - Project: ${projectPath}`);

    const stats = this.activityService.getActivityStats(projectPath);

    return {
      projectPath,
      stats
    };
  }
}
