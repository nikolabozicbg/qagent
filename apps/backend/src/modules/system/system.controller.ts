import { Body, Controller, Post, Get } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get('health')
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('feedback')
  async sendFeedback(@Body() body: { email: string; message: string }) {
    return this.system.sendFeedback(body);
  }
}
