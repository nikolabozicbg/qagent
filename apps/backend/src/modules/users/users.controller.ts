import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe() {
    return this.usersService.getCurrentUser();
  }

  @Get('usage')
  async getUsage() {
    return {
      daily: { used: 2, limit: 3 },
      monthly: { used: 45, limit: 100 },
    };
  }
}
