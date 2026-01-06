import { Injectable } from '@nestjs/common';

export interface Activity {
  id: string;
  type: 'test-passed' | 'test-failed' | 'test-generated' | 'test-rerun' | 'flaky-detected' | 'flow-discovered' | 'config-updated';
  message: string;
  timestamp: string;
  testFile?: string;
  flowId?: string;
  projectPath: string;
}

@Injectable()
export class ActivityService {
  private readonly MAX_ACTIVITIES = 100;
  // Map<projectPath, Activity[]>
  private activities: Map<string, Activity[]> = new Map();

  /**
   * Get recent activities for a project
   */
  getRecentActivities(projectPath: string, limit: number = 10): Activity[] {
    const projectActivities = this.activities.get(projectPath) || [];
    return projectActivities.slice(0, limit);
  }

  /**
   * Log a new activity
   */
  logActivity(activity: Omit<Activity, 'id' | 'timestamp'>): Activity {
    const newActivity: Activity = {
      ...activity,
      id: this.generateActivityId(),
      timestamp: new Date().toISOString(),
    };

    // Ensure project activities array exists
    if (!this.activities.has(activity.projectPath)) {
      this.activities.set(activity.projectPath, []);
    }

    const projectActivities = this.activities.get(activity.projectPath)!;

    // Add to beginning (most recent first)
    projectActivities.unshift(newActivity);

    // Keep only last MAX_ACTIVITIES (circular buffer)
    if (projectActivities.length > this.MAX_ACTIVITIES) {
      projectActivities.pop();
    }

    console.log(`📝 Activity logged: ${activity.type} for project: ${activity.projectPath}`);

    return newActivity;
  }

  /**
   * Log multiple activities at once
   */
  logBulkActivities(activities: Array<Omit<Activity, 'id' | 'timestamp'>>): Activity[] {
    return activities.map(activity => this.logActivity(activity));
  }

  /**
   * Clear activities for a project
   */
  clearActivities(projectPath: string): void {
    this.activities.delete(projectPath);
    console.log(`🗑️  Cleared activities for project: ${projectPath}`);
  }

  /**
   * Get activity statistics
   */
  getActivityStats(projectPath: string) {
    const projectActivities = this.activities.get(projectPath) || [];

    const byType = projectActivities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: projectActivities.length,
      byType,
      recent: projectActivities.slice(0, 5),
    };
  }

  private generateActivityId(): string {
    return `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
