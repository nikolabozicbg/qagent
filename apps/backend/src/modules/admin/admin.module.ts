import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [ProjectModule],
  controllers: [AdminController],
})
export class AdminModule {}
