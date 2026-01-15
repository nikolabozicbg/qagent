import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import openaiConfig from './config/openai.config';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';
import { GenerationModule } from './modules/generation/generation.module';
import { SystemModule } from './modules/system/system.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { TestExecutionModule } from './modules/test-execution/test-execution.module';
import { FlowsModule } from './modules/flows/flows.module';
import { ConfigModule as ProjectConfigModule } from './modules/config/config.module';
import { ActivityModule } from './modules/activity/activity.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ProjectModule } from './modules/project/project.module';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, openaiConfig],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    UploadModule,
    GenerationModule,
    SystemModule,
    AnalysisModule,
    TestExecutionModule,
    FlowsModule,
    ProjectConfigModule,
    ActivityModule,
    MetricsModule,
    ProjectModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes(
        { path: 'generate/test-suite', method: RequestMethod.POST },
        { path: 'generate/refine', method: RequestMethod.POST },
      );
  }
}
