import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async validate(token: string) {
    // Mock validation
    return token?.startsWith('mock-token');
  }

  async getUserFromToken(token: string) {
    return {
      id: 1,
      email: 'demo@example.com',
      isPro: false,
    };
  }
}
