import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

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
