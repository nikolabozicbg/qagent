import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import openaiConfig from './config/openai.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';
import { GenerationModule } from './modules/generation/generation.module';
import { SystemModule } from './modules/system/system.module';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, openaiConfig],
    }),
    AuthModule,
    UsersModule,
    UploadModule,
    GenerationModule,
    SystemModule,
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
