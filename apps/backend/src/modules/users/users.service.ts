import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  async getCurrentUser() {
    return {
      id: 1,
      email: 'demo@example.com',
      isPro: false,
      createdAt: new Date().toISOString(),
    };
  }

  async updateSubscription(userId: number, isPro: boolean) {
    // Mock update
    return { ok: true };
  }
}
