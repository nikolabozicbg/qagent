import { Body, Controller, Post, Get } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get('health')
  async health() {
    console.log(`💚 Health check requested`);
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      mode: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-api-key-here' ? 'production' : 'mock'
    };
  }

  @Post('feedback')
  async sendFeedback(@Body() body: { email: string; message: string }) {
    return this.system.sendFeedback(body);
  }
}
