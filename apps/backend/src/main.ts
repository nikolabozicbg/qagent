import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Increase payload limits for file uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 QAgent Backend running at http://localhost:${port}`);
  console.log(`📡 Health check: http://localhost:${port}/system/health`);
}
bootstrap();
