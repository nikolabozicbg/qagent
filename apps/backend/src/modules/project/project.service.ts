import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CachedProject, ProjectConfig, CreateProjectDto, TestSuite } from './types/project.types';
import { Project } from '../../database/entities/project.entity';
import { Suite } from '../../database/entities/suite.entity';
import { Case, CaseStatus } from '../../database/entities/case.entity';
import { CaseExecution } from '../../database/entities/case-execution.entity';

/**
 * ProjectService - Database-backed Storage for Projects
 * 
 * Uses PostgreSQL via TypeORM for persistence.
 * Falls back to in-memory storage if database is not available.
 */
@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  
  // In-memory fallback when DB is not available
  private readonly memoryProjects = new Map<string, CachedProject>();
  private useDatabase = false;

  constructor(
    @Optional() @InjectRepository(Project)
    private readonly projectRepo?: Repository<Project>,
    @Optional() @InjectRepository(Suite)
    private readonly suiteRepo?: Repository<Suite>,
    @Optional() @InjectRepository(Case)
    private readonly caseRepo?: Repository<Case>,
    @Optional() @InjectRepository(CaseExecution)
    private readonly executionRepo?: Repository<CaseExecution>,
    @Optional() private readonly dataSource?: DataSource,
  ) {
    this.checkDatabaseConnection();
  }

  private async checkDatabaseConnection(): Promise<void> {
    try {
      if (this.dataSource?.isInitialized) {
        this.useDatabase = true;
        this.logger.log('✅ Database connection established - using PostgreSQL');
      } else {
        this.logger.warn('⚠️  Database not available - using in-memory storage');
      }
    } catch (error) {
      this.logger.warn('⚠️  Database connection failed - using in-memory storage');
    }
  }

  // ============================================
  // PROJECT OPERATIONS
  // ============================================

  async getAllProjects(): Promise<ProjectConfig[]> {
    if (this.useDatabase && this.projectRepo) {
      const projects = await this.projectRepo.find({
        order: { updatedAt: 'DESC' },
      });
      this.logger.log(`📂 Retrieved ${projects.length} projects from database`);
      return projects.map(p => this.entityToConfig(p));
    }

    // Fallback to memory
    const projects = Array.from(this.memoryProjects.values()).map(p => p.config);
    this.logger.log(`📂 Retrieved ${projects.length} projects from memory`);
    return projects;
  }

  async getActiveProject(): Promise<Project | null> {
    if (this.useDatabase && this.projectRepo) {
      return this.projectRepo.findOne({
        where: { isActive: true },
        relations: ['suites'],
      });
    }
    return null;
  }

  async getProject(projectPath: string): Promise<CachedProject | null> {
    if (this.useDatabase && this.projectRepo) {
      const project = await this.projectRepo.findOne({
        where: { projectPath },
        relations: ['suites', 'suites.cases'],
      });
      
      if (!project) {
        this.logger.warn(`❌ Project not found in database: ${projectPath}`);
        return null;
      }

      this.logger.log(`✅ Retrieved project from database: ${project.projectName}`);
      return this.entityToCached(project);
    }

    // Fallback to memory
    const project = this.memoryProjects.get(projectPath);
    if (!project) {
      this.logger.warn(`❌ Project not found in memory: ${projectPath}`);
      return null;
    }
    this.logger.log(`✅ Retrieved project from memory: ${project.config.projectName}`);
    return project;
  }

  async getProjectById(id: string): Promise<Project | null> {
    if (this.useDatabase && this.projectRepo) {
      return this.projectRepo.findOne({
        where: { id },
        relations: ['suites', 'suites.cases'],
      });
    }
    return null;
  }

  async hasProject(projectPath: string): Promise<boolean> {
    if (this.useDatabase && this.projectRepo) {
      const count = await this.projectRepo.count({ where: { projectPath } });
      return count > 0;
    }
    return this.memoryProjects.has(projectPath);
  }

  async saveProject(dto: CreateProjectDto): Promise<ProjectConfig> {
    if (this.useDatabase && this.projectRepo) {
      // Upsert: find existing or create new
      let project = await this.projectRepo.findOne({
        where: { projectPath: dto.projectPath },
      });

      if (project) {
        this.logger.log(`🔄 Updating project in database: ${dto.projectName}`);
        project.projectName = dto.projectName;
        project.framework = dto.framework;
        project.baseUrl = dto.baseUrl;
        project.testDir = dto.testDir || 'tests/e2e';
        project.auth = dto.auth || null;
      } else {
        this.logger.log(`➕ Creating new project in database: ${dto.projectName}`);
        project = this.projectRepo.create({
          projectPath: dto.projectPath,
          projectName: dto.projectName,
          framework: dto.framework,
          baseUrl: dto.baseUrl,
          testDir: dto.testDir || 'tests/e2e',
          auth: dto.auth || null,
        });
      }

      const saved = await this.projectRepo.save(project);
      return this.entityToConfig(saved);
    }

    // Fallback to memory
    const config: ProjectConfig = {
      projectPath: dto.projectPath,
      projectName: dto.projectName,
      framework: dto.framework,
      baseUrl: dto.baseUrl,
      testDir: dto.testDir || './e2e',
      auth: dto.auth,
    };

    const existing = this.memoryProjects.get(dto.projectPath);
    if (existing) {
      this.logger.log(`🔄 Updating project in memory: ${config.projectName}`);
      this.memoryProjects.set(dto.projectPath, { ...existing, config });
    } else {
      this.logger.log(`➕ Creating new project in memory: ${config.projectName}`);
      this.memoryProjects.set(dto.projectPath, {
        config,
        suites: [],
        lastScan: new Date(),
        metadata: { totalCases: 0, totalSteps: 0, analysisTime: 0 },
      });
    }
    return config;
  }

  async activateProject(projectPath: string): Promise<void> {
    if (this.useDatabase && this.projectRepo) {
      // Deactivate all other projects using query builder
      await this.projectRepo
        .createQueryBuilder()
        .update()
        .set({ isActive: false })
        .execute();
      // Activate this project
      await this.projectRepo
        .createQueryBuilder()
        .update()
        .set({ isActive: true })
        .where('projectPath = :projectPath', { projectPath })
        .execute();
      this.logger.log(`✅ Activated project: ${projectPath}`);
    }
  }

  // ============================================
  // SUITE OPERATIONS
  // ============================================

  async saveSuites(
    projectPath: string,
    suites: TestSuite[],
    metadata?: { totalCases: number; totalSteps: number; analysisTime: number }
  ): Promise<void> {
    if (this.useDatabase && this.projectRepo && this.suiteRepo && this.caseRepo) {
      const project = await this.projectRepo.findOne({ where: { projectPath } });
      if (!project) {
        throw new NotFoundException(`Project not found: ${projectPath}`);
      }

      this.logger.log(`💾 Saving ${suites.length} suites to database for project: ${project.projectName}`);

      // Delete existing suites (CASCADE will delete cases too)
      await this.suiteRepo.delete({ projectId: project.id });

      // Save new suites with cases
      for (const suiteData of suites) {
        const suite = this.suiteRepo.create({
          projectId: project.id,
          name: suiteData.name,
          description: suiteData.description || null,
          category: suiteData.category || null,
          priority: suiteData.priority.toUpperCase() as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
          tags: suiteData.tags || [],
          metadata: suiteData.metadata || null,
        });

        const savedSuite = await this.suiteRepo.save(suite);

        // Save cases for this suite
        for (const caseData of suiteData.testCases || []) {
          const testCase = this.caseRepo.create({
            suiteId: savedSuite.id,
            projectId: project.id,
            name: caseData.name,
            description: caseData.description || null,
            priority: (caseData.priority?.toUpperCase() || 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
            tags: caseData.tags || [],
            steps: caseData.steps || [],
            testData: caseData.testData || null,
            status: CaseStatus.NOT_GENERATED,
          });

          await this.caseRepo.save(testCase);
        }
      }

      return;
    }

    // Fallback to memory
    const project = this.memoryProjects.get(projectPath);
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectPath}`);
    }

    this.logger.log(`💾 Caching ${suites.length} suites in memory for project: ${project.config.projectName}`);
    this.memoryProjects.set(projectPath, {
      ...project,
      suites,
      lastScan: new Date(),
      metadata: metadata || {
        totalCases: suites.reduce((sum, s) => sum + (s.testCases?.length || 0), 0),
        totalSteps: suites.reduce((sum, s) => 
          sum + (s.testCases?.reduce((cSum, c) => cSum + (c.steps?.length || 0), 0) || 0), 0),
        analysisTime: 0,
      },
    });
  }

  async getSuites(projectPath: string): Promise<TestSuite[]> {
    if (this.useDatabase && this.projectRepo && this.suiteRepo) {
      const project = await this.projectRepo.findOne({ where: { projectPath } });
      if (!project) {
        throw new NotFoundException(`Project not found: ${projectPath}`);
      }

      const suites = await this.suiteRepo.find({
        where: { projectId: project.id },
        relations: ['cases'],
      });

      this.logger.log(`📦 Retrieved ${suites.length} suites from database for: ${project.projectName}`);
      return suites.map(s => this.suiteEntityToTestSuite(s));
    }

    // Fallback to memory
    const project = this.memoryProjects.get(projectPath);
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectPath}`);
    }

    this.logger.log(`📦 Retrieved ${project.suites.length} cached suites from memory`);
    return project.suites;
  }

  async getSuiteById(suiteId: string): Promise<Suite | null> {
    if (this.useDatabase && this.suiteRepo) {
      return this.suiteRepo.findOne({
        where: { id: suiteId },
        relations: ['cases', 'project'],
      });
    }
    return null;
  }

  // ============================================
  // CASE OPERATIONS
  // ============================================

  async getCaseById(caseId: string): Promise<Case | null> {
    if (this.useDatabase && this.caseRepo) {
      return this.caseRepo.findOne({
        where: { id: caseId },
        relations: ['suite', 'project'],
      });
    }
    return null;
  }

  async updateCaseStatus(caseId: string, status: CaseStatus, generatedCode?: string, filePath?: string): Promise<void> {
    if (this.useDatabase && this.caseRepo) {
      await this.caseRepo.update(caseId, {
        status,
        ...(generatedCode && { generatedCode }),
        ...(filePath && { generatedFilePath: filePath }),
      });
      this.logger.log(`📝 Updated case ${caseId} status to ${status}`);
    }
  }

  async getCasesByProjectId(projectId: string): Promise<Case[]> {
    if (this.useDatabase && this.caseRepo) {
      return this.caseRepo.find({
        where: { projectId },
        relations: ['suite'],
      });
    }
    return [];
  }

  // ============================================
  // DELETE / ADMIN OPERATIONS
  // ============================================

  async deleteProject(projectPath: string): Promise<boolean> {
    if (this.useDatabase && this.projectRepo) {
      const result = await this.projectRepo.delete({ projectPath });
      if (result.affected && result.affected > 0) {
        this.logger.log(`🗑️  Deleted project from database: ${projectPath}`);
        return true;
      }
      this.logger.warn(`❌ Cannot delete - project not found in database: ${projectPath}`);
      return false;
    }

    // Fallback to memory
    const project = this.memoryProjects.get(projectPath);
    if (!project) {
      this.logger.warn(`❌ Cannot delete - project not found in memory: ${projectPath}`);
      return false;
    }
    this.memoryProjects.delete(projectPath);
    this.logger.log(`🗑️  Deleted project from memory: ${projectPath}`);
    return true;
  }

  async clearAll(): Promise<void> {
    if (this.useDatabase && this.executionRepo && this.caseRepo && this.suiteRepo && this.projectRepo) {
      // Use query builder to truncate tables in order due to foreign keys
      await this.executionRepo.createQueryBuilder().delete().execute();
      await this.caseRepo.createQueryBuilder().delete().execute();
      await this.suiteRepo.createQueryBuilder().delete().execute();
      await this.projectRepo.createQueryBuilder().delete().execute();
      this.logger.log('🧹 Cleared all data from database');
      return;
    }

    const count = this.memoryProjects.size;
    this.memoryProjects.clear();
    this.logger.log(`🧹 Cleared all projects from memory (${count} removed)`);
  }

  async getStats(): Promise<{
    totalProjects: number;
    totalSuites: number;
    totalCases: number;
    totalSteps: number;
  }> {
    if (this.useDatabase && this.projectRepo && this.suiteRepo && this.caseRepo) {
      const [totalProjects, totalSuites, cases] = await Promise.all([
        this.projectRepo.count(),
        this.suiteRepo.count(),
        this.caseRepo.find({ select: ['steps'] }),
      ]);

      const totalCases = cases.length;
      const totalSteps = cases.reduce((sum, c) => sum + (c.steps?.length || 0), 0);

      return { totalProjects, totalSuites, totalCases, totalSteps };
    }

    // Fallback to memory
    const projects = Array.from(this.memoryProjects.values());
    return {
      totalProjects: projects.length,
      totalSuites: projects.reduce((sum, p) => sum + p.suites.length, 0),
      totalCases: projects.reduce((sum, p) => sum + (p.metadata?.totalCases || 0), 0),
      totalSteps: projects.reduce((sum, p) => sum + (p.metadata?.totalSteps || 0), 0),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private entityToConfig(entity: Project): ProjectConfig {
    return {
      projectPath: entity.projectPath,
      projectName: entity.projectName,
      framework: entity.framework,
      baseUrl: entity.baseUrl,
      testDir: entity.testDir,
      auth: entity.auth || undefined,
    };
  }

  private entityToCached(entity: Project): CachedProject {
    return {
      config: this.entityToConfig(entity),
      suites: entity.suites?.map(s => this.suiteEntityToTestSuite(s)) || [],
      lastScan: entity.updatedAt,
      metadata: {
        totalCases: entity.suites?.reduce((sum, s) => sum + (s.cases?.length || 0), 0) || 0,
        totalSteps: entity.suites?.reduce((sum, s) => 
          sum + (s.cases?.reduce((cSum, c) => cSum + (c.steps?.length || 0), 0) || 0), 0) || 0,
        analysisTime: 0,
      },
    };
  }

  private suiteEntityToTestSuite(entity: Suite): TestSuite {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description || '',
      category: entity.category || '',
      priority: entity.priority,
      tags: entity.tags || [],
      testCases: entity.cases?.map(c => ({
        id: c.id,
        suiteId: entity.id,
        name: c.name,
        description: c.description || '',
        priority: c.priority,
        tags: c.tags || [],
        steps: (c.steps || []).map((step, index) => ({
          id: step.id,
          caseId: c.id,
          index,
          action: step.action,
          target: step.target,
          value: step.value,
          description: step.description,
          selector: step.selector,
          assertions: step.assertions,
          expectedOutcome: step.expectedResult,
          api: step.api ? {
            method: step.api.method,
            endpoint: step.api.endpoint,
            expectedStatus: step.api.expectedStatus || 200,
          } : undefined,
        })),
        status: c.status,
        testFilePath: c.generatedFilePath || undefined,
        generatedCode: c.generatedCode || undefined,
        testData: c.testData,
        metadata: {
          components: [],
          apis: [],
          selectors: [],
          estimatedDuration: 0,
        },
      })) || [],
      stats: {
        totalCases: entity.cases?.length || 0,
        totalSteps: entity.cases?.reduce((sum, c) => sum + (c.steps?.length || 0), 0) || 0,
        estimatedDuration: 0,
        complexity: 'medium',
      },
      metadata: {
        components: entity.metadata?.components || [],
        routes: entity.metadata?.routes || [],
        apis: [],
        generatedFrom: 'database',
        characteristics: entity.metadata?.characteristics || [],
      },
    };
  }
}
