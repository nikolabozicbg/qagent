import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { CreateFlowDto, UpdateFlowDto } from './flows.types';

@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  /**
   * Get all flows for a project
   * GET /flows?projectPath=/path/to/project
   */
  @Get()
  getFlows(@Query('projectPath') projectPath: string) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required',
        flows: []
      };
    }

    console.log(`📋 GET /flows - Project: ${projectPath}`);
    const flows = this.flowsService.getFlows(projectPath);
    console.log(`   Found ${flows.length} flows`);

    return {
      projectPath,
      total: flows.length,
      flows
    };
  }

  /**
   * Get a single flow by ID
   * GET /flows/:flowId?projectPath=/path/to/project
   */
  @Get(':flowId')
  getFlow(
    @Param('flowId') flowId: string,
    @Query('projectPath') projectPath: string
  ) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required'
      };
    }

    console.log(`📋 GET /flows/${flowId} - Project: ${projectPath}`);
    const flow = this.flowsService.getFlow(flowId, projectPath);

    return flow;
  }

  /**
   * Create a new flow
   * POST /flows
   */
  @Post()
  createFlow(@Body() dto: CreateFlowDto) {
    console.log(`➕ POST /flows - Creating flow: ${dto.name}`);
    const flow = this.flowsService.createFlow(dto);

    return {
      success: true,
      flow
    };
  }

  /**
   * Update a flow
   * PUT /flows/:flowId
   */
  @Put(':flowId')
  updateFlow(
    @Param('flowId') flowId: string,
    @Query('projectPath') projectPath: string,
    @Body() dto: UpdateFlowDto
  ) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required'
      };
    }

    console.log(`✏️  PUT /flows/${flowId} - Project: ${projectPath}`);
    const flow = this.flowsService.updateFlow(flowId, projectPath, dto);

    return {
      success: true,
      flow
    };
  }

  /**
   * Delete a flow
   * DELETE /flows/:flowId?projectPath=/path/to/project
   */
  @Delete(':flowId')
  deleteFlow(
    @Param('flowId') flowId: string,
    @Query('projectPath') projectPath: string
  ) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required'
      };
    }

    console.log(`🗑️  DELETE /flows/${flowId} - Project: ${projectPath}`);
    this.flowsService.deleteFlow(flowId, projectPath);

    return {
      success: true,
      message: `Flow ${flowId} deleted successfully`
    };
  }

  /**
   * Import journeys from discovery
   * POST /flows/import
   */
  @Post('import')
  importJourneys(@Body() body: { journeys: any[]; projectPath: string }) {
    console.log(`📥 POST /flows/import - ${body.journeys.length} journeys for ${body.projectPath}`);
    
    const flows = this.flowsService.importJourneys(body.journeys, body.projectPath);

    return {
      success: true,
      imported: flows.length,
      flows
    };
  }

  /**
   * Get flow statistics
   * GET /flows/stats?projectPath=/path/to/project
   */
  @Get('stats/summary')
  getFlowStats(@Query('projectPath') projectPath: string) {
    if (!projectPath) {
      return {
        error: 'projectPath query parameter is required'
      };
    }

    console.log(`📊 GET /flows/stats/summary - Project: ${projectPath}`);
    const stats = this.flowsService.getFlowStats(projectPath);

    return {
      projectPath,
      stats
    };
  }
}
