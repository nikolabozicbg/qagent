/**
 * Test Execution Module
 */

import { Module } from '@nestjs/common';
import { TestExecutionService } from './test-execution.service';
import { TestExecutionController } from './test-execution.controller';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [AnalysisModule],
  controllers: [TestExecutionController],
  providers: [TestExecutionService],
  exports: [TestExecutionService],
})
export class TestExecutionModule {}
