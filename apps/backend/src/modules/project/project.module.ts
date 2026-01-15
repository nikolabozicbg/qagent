import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { AnalysisModule } from '../analysis/analysis.module';
import { Project, Suite, Case, CaseExecution } from '../../database/entities';

/**
 * ProjectModule - Database-backed Project & Suite Storage
 * 
 * Provides REST API endpoints for:
 * - Project CRUD operations
 * - Suite discovery and persistence
 * - Case management
 * - Admin operations
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Suite, Case, CaseExecution]),
    AnalysisModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
