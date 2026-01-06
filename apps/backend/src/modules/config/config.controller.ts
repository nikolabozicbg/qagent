import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ConfigService, ProjectConfig } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get project configuration
   * GET /config?projectPath=/path/to/project
   */
  @Get()
  async getConfig(@Query('projectPath') projectPath: string) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required'
      };
    }

    console.log(`⚙️  GET /config - Project: ${projectPath}`);
    const config = await this.configService.getConfig(projectPath);

    if (!config) {
      return {
        projectPath,
        config: null,
        message: 'No configuration found for this project'
      };
    }

    return {
      projectPath,
      config
    };
  }

  /**
   * Save project configuration
   * POST /config/save
   */
  @Post('save')
  async saveConfig(@Body() config: ProjectConfig) {
    console.log(`💾 POST /config/save - Project: ${config.projectPath}`);
    
    await this.configService.saveConfig(config);

    return {
      success: true,
      message: 'Configuration saved successfully',
      config
    };
  }
}
