import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto, DiscoverProjectDto, ProjectConfig, TestSuite } from './types/project.types';
import { SmartJourneyDiscoveryService } from '../analysis/smart-journey-discovery.service';

@Controller('projects')
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly smartJourneyDiscovery: SmartJourneyDiscoveryService,
  ) {}

  /**
   * GET /projects
   * List all projects
   */
  @Get()
  async getAllProjects(): Promise<ProjectConfig[]> {
    this.logger.log('📋 GET /projects - Listing all projects');
    return this.projectService.getAllProjects();
  }

  /**
   * GET /projects/active
   * Get the last active project (for app startup)
   */
  @Get('active')
  async getActiveProject() {
    this.logger.log('📋 GET /projects/active - Getting active project');
    const project = await this.projectService.getActiveProject();
    if (!project) {
      return null;
    }
    return project;
  }

  /**
   * GET /projects/stats
   * Get database statistics
   */
  @Get('stats')
  async getStats() {
    this.logger.log('📊 GET /projects/stats - Getting statistics');
    return this.projectService.getStats();
  }

  /**
   * GET /projects/:projectPath
   * Get single project with suites
   * 
   * Note: projectPath is base64 encoded to handle special characters
   */
  @Get(':projectPath')
  async getProject(@Param('projectPath') encodedPath: string) {
    const projectPath = Buffer.from(encodedPath, 'base64').toString('utf-8');
    this.logger.log(`🔍 GET /projects/${encodedPath} - Getting project: ${projectPath}`);

    const project = await this.projectService.getProject(projectPath);

    if (!project) {
      throw new NotFoundException(`Project not found: ${projectPath}`);
    }

    return project;
  }

  /**
   * POST /projects
   * Create or update project configuration
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() dto: CreateProjectDto): Promise<ProjectConfig> {
    this.logger.log(`➕ POST /projects - Creating/updating: ${dto.projectName}`);
    return this.projectService.saveProject(dto);
  }

  /**
   * PATCH /projects/:projectPath
   * Update project configuration
   */
  @Patch(':projectPath')
  async updateProject(
    @Param('projectPath') encodedPath: string,
    @Body() dto: Partial<CreateProjectDto>,
  ): Promise<ProjectConfig> {
    const projectPath = Buffer.from(encodedPath, 'base64').toString('utf-8');
    this.logger.log(`🔄 PATCH /projects/${encodedPath} - Updating project`);

    const existing = await this.projectService.getProject(projectPath);
    if (!existing) {
      throw new NotFoundException(`Project not found: ${projectPath}`);
    }

    return this.projectService.saveProject({
      projectPath,
      projectName: dto.projectName || existing.config.projectName,
      framework: dto.framework || existing.config.framework,
      baseUrl: dto.baseUrl || existing.config.baseUrl,
      testDir: dto.testDir || existing.config.testDir,
      auth: dto.auth !== undefined ? dto.auth : existing.config.auth,
    });
  }

  /**
   * POST /projects/:projectPath/activate
   * Set this project as the active project
   */
  @Post(':projectPath/activate')
  @HttpCode(HttpStatus.OK)
  async activateProject(@Param('projectPath') encodedPath: string) {
    const projectPath = Buffer.from(encodedPath, 'base64').toString('utf-8');
    this.logger.log(`✅ POST /projects/${encodedPath}/activate - Activating project`);

    const exists = await this.projectService.hasProject(projectPath);
    if (!exists) {
      throw new NotFoundException(`Project not found: ${projectPath}`);
    }

    await this.projectService.activateProject(projectPath);
    return { success: true };
  }

  /**
   * POST /projects/:projectPath/discover
   * Run suite discovery and save results to database
   */
  @Post(':projectPath/discover')
  @HttpCode(HttpStatus.OK)
  async discoverSuites(
    @Param('projectPath') encodedPath: string,
    @Body() dto: DiscoverProjectDto,
  ): Promise<{ suites: TestSuite[]; metadata: any }> {
    const projectPath = Buffer.from(encodedPath, 'base64').toString('utf-8');
    this.logger.log(`🔍 POST /projects/${encodedPath}/discover - Discovering suites for: ${projectPath}`);

    // Check if project exists
    const exists = await this.projectService.hasProject(projectPath);
    if (!exists) {
      throw new NotFoundException(
        `Project not found: ${projectPath}. Create project first via POST /projects`,
      );
    }

    // Run AI-powered discovery using DSA + LLM synthesis
    const result = await this.smartJourneyDiscovery. discoverTestSuitesWithAI(dto.projectPath);
    const suites = result.suites;
    const analysisTime = result.analysisTime;

    const totalCases = result.totalCases;
    const totalSteps = result.totalSteps;

    // Save the results to database
    await this.projectService.saveSuites(projectPath, suites, {
      totalCases,
      totalSteps,
      analysisTime,
    });

    this.logger.log(`✅ Saved ${suites.length} suites for: ${projectPath}`);

    return { suites, metadata: { totalCases, totalSteps, analysisTime } };
  }

  /**
   * GET /projects/:projectPath/suites
   * Get suites for a project
   */
  @Get(':projectPath/suites')
  async getSuites(@Param('projectPath') encodedPath: string): Promise<TestSuite[]> {
    const projectPath = Buffer.from(encodedPath, 'base64').toString('utf-8');
    this.logger.log(`📦 GET /projects/${encodedPath}/suites - Getting suites: ${projectPath}`);

    return this.projectService.getSuites(projectPath);
  }

  /**
   * DELETE /projects/:projectPath
   * Remove project and all related data
   */
  @Delete(':projectPath')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProject(@Param('projectPath') encodedPath: string): Promise<void> {
    const projectPath = Buffer.from(encodedPath, 'base64').toString('utf-8');
    this.logger.log(`🗑️  DELETE /projects/${encodedPath} - Deleting: ${projectPath}`);

    const deleted = await this.projectService.deleteProject(projectPath);

    if (!deleted) {
      throw new NotFoundException(`Project not found: ${projectPath}`);
    }
  }

  /**
   * POST /projects/clear
   * Clear all data (for testing/development)
   */
  @Post('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAll(): Promise<void> {
    this.logger.warn('🧹 POST /projects/clear - Clearing all data');
    await this.projectService.clearAll();
  }

  /**
   * PATCH /projects/cases/:caseId
   * Update a test case (status, generated code, file path)
   */
  @Patch('cases/:caseId')
  async updateCase(
    @Param('caseId') caseId: string,
    @Body() dto: {
      status?: 'NOT_GENERATED' | 'GENERATED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
      generatedCode?: string;
      generatedFilePath?: string;
    },
  ) {
    this.logger.log(`🔄 PATCH /projects/cases/${caseId} - Updating case`);
    
    const existingCase = await this.projectService.getCaseById(caseId);
    if (!existingCase) {
      throw new NotFoundException(`Case not found: ${caseId}`);
    }

    await this.projectService.updateCaseStatus(
      caseId,
      dto.status as any || existingCase.status,
      dto.generatedCode,
      dto.generatedFilePath,
    );

    return { success: true, caseId };
  }
}
