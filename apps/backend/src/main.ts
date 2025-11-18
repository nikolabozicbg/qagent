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

  const hasOpenAIKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-api-key-here';

  console.log('\n' + '='.repeat(60));
  console.log('🚀 QAgent Backend Started');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${port}`);
  console.log(`📡 Health: http://localhost:${port}/system/health`);
  console.log(`🔑 OpenAI: ${hasOpenAIKey ? '✅ Configured' : '⚠️  Mock Mode (no API key)'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60) + '\n');
}
bootstrap();
