import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return { 
      ok: true, 
      token: 'mock-token-' + Date.now(), 
      isPro: false,
      user: { email: body.email }
    };
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return { 
      ok: true, 
      message: 'Registration successful',
      user: { email: body.email }
    };
  }
}
