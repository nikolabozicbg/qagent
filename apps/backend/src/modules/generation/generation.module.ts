import { Module } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { AgentService } from './agent.service';
import { TestEnforcementService } from './test-enforcement.service';
import { AIProviderService } from '../../services/ai-provider.service';

@Module({
  providers: [GenerationService, AgentService, TestEnforcementService, AIProviderService],
  controllers: [GenerationController],
  exports: [TestEnforcementService, AIProviderService],
})
export class GenerationModule {}
