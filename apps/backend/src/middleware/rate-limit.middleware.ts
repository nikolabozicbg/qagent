import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store = new Map<string, RateLimitEntry>();
  private readonly DAILY_LIMIT = 3;
  private readonly RESET_HOURS = 24;

  constructor() {
    // Clean up expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Check for admin key - bypass rate limit
    const adminKey = req.headers['x-admin-key'];
    if (adminKey && adminKey === process.env.ADMIN_API_KEY) {
      console.log('🔓 Admin key detected - bypassing rate limit');
      return next();
    }

    // Get client IP
    const ip = this.getClientIp(req);
    console.log(`📊 Rate limit check for IP: ${ip}`);

    // Get or create rate limit entry
    let entry = this.store.get(ip);
    const now = new Date();

    // Reset if expired
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: new Date(now.getTime() + this.RESET_HOURS * 60 * 60 * 1000),
      };
      this.store.set(ip, entry);
    }

    // Check limit
    if (entry.count >= this.DAILY_LIMIT) {
      const hoursUntilReset = Math.ceil((entry.resetAt.getTime() - now.getTime()) / (60 * 60 * 1000));
      
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Daily limit reached',
          error: `You've used all ${this.DAILY_LIMIT} free generations today. Try again in ${hoursUntilReset} hours or upgrade to Pro for unlimited access.`,
          resetAt: entry.resetAt.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    entry.count++;
    this.store.set(ip, entry);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', this.DAILY_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining', (this.DAILY_LIMIT - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', entry.resetAt.toISOString());

    console.log(`✅ Rate limit: ${entry.count}/${this.DAILY_LIMIT} for IP: ${ip}`);
    next();
  }

  private getClientIp(req: Request): string {
    // Try multiple sources for IP (Railway, proxies, etc.)
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private cleanup() {
    const now = new Date();
    for (const [ip, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(ip);
      }
    }
    console.log(`🧹 Rate limit cleanup: ${this.store.size} active IPs`);
  }
}
