import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemService {
  async sendFeedback(body: { email: string; message: string }) {
    console.log('📧 Feedback received:', body);
    // In production, integrate with email service (SendGrid, etc.)
    return { ok: true, message: 'Feedback received. Thank you!' };
  }

  async getSystemStats() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };
  }
}
