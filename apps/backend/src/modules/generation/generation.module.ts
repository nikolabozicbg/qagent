import { Module } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { AgentService } from './agent.service';
import { TestEnforcementService } from './test-enforcement.service';
import { RuntimeInspectorService } from './runtime-inspector.service';
import { AIProviderService } from '../../services/ai-provider.service';

@Module({
  providers: [
    GenerationService,
    AgentService,
    TestEnforcementService,
    RuntimeInspectorService,
    AIProviderService,
  ],
  controllers: [GenerationController],
  exports: [TestEnforcementService, RuntimeInspectorService, AIProviderService],
})
export class GenerationModule {}
