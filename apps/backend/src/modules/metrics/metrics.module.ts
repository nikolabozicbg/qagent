import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { FlowsModule } from '../flows/flows.module';

@Module({
  imports: [FlowsModule], // Import to use FlowsService
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
