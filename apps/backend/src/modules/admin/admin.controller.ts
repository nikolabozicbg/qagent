import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ProjectService } from '../project/project.service';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly projectService: ProjectService) {}

  /**
   * POST /admin/reset
   * Clear all database tables (for testing/development)
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDatabase() {
    this.logger.warn('🚨 POST /admin/reset - Resetting all database tables');
    await this.projectService.clearAll();
    return {
      success: true,
      message: 'All data has been cleared',
    };
  }

  /**
   * GET /admin/stats
   * Get database statistics
   */
  @Get('stats')
  async getStats() {
    this.logger.log('📊 GET /admin/stats - Getting database statistics');
    return this.projectService.getStats();
  }
}
