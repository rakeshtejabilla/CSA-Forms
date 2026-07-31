import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import * as Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const client = new (Redis as any).default({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      connectTimeout: 3000,
      lazyConnect: true,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      await client.quit();

      if (pong === 'PONG') {
        return this.getStatus(key, true, { status: 'connected' });
      }
      throw new Error('Unexpected ping response');
    } catch (error: any) {
      try { await client.quit(); } catch (_) {}
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { error: error.message })
      );
    }
  }
}
