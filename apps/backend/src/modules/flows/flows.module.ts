import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';

@Module({
  controllers: [FlowsController],
  providers: [FlowsService],
  exports: [FlowsService], // Export for use in other modules (like Metrics)
})
export class FlowsModule {}
