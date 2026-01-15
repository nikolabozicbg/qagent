import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Increase payload limits for file uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  
  // DEBUG: Log all incoming requests
  app.use((req: any, res: any, next: any) => {
    if (req.path.includes('/analyze/generate-test')) {
      console.log('\n🔍 INCOMING REQUEST:', req.method, req.path);
      console.log('📦 Body keys:', Object.keys(req.body || {}));
      if (req.body?.journey) {
        console.log('  Journey name:', req.body.journey.name);
        console.log('  Has enrichedData:', !!req.body.journey.enrichedData);
        console.log('  Components count:', req.body.journey.enrichedData?.components?.length || 0);
        if (req.body.journey.enrichedData?.components?.[0]) {
          const comp = req.body.journey.enrichedData.components[0];
          console.log('  First component keys:', Object.keys(comp).join(', '));
          console.log('  Elements count:', comp.elements?.length || 0);
          console.log('  Validations count:', comp.validations?.length || 0);
          console.log('  ApiCalls count:', comp.apiCalls?.length || 0);
        }
      }
    }
    next();
  });

  // Swagger setup (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('QAgent API')
      .setDescription('AI-powered test generation backend')
      .setVersion('1.0')
      .addTag('projects', 'Project management')
      .addTag('admin', 'Admin/Dev operations')
      .addTag('analysis', 'Code analysis and discovery')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const hasOpenAIKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-api-key-here';
  const hasDB = !!process.env.DATABASE_URL;

  console.log('\n' + '='.repeat(60));
  console.log('🚀 QAgent Backend Started');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api`);
  console.log(`📡 Health: http://localhost:${port}/system/health`);
  console.log(`🔑 OpenAI: ${hasOpenAIKey ? '✅ Configured' : '⚠️  Mock Mode (no API key)'}`);
  console.log(`🗄️  Database: ${hasDB ? '✅ PostgreSQL' : '⚠️  In-Memory'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60) + '\n');
}
bootstrap();
