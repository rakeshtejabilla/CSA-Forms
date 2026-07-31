import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';
import { QueueHealthIndicator } from './queue-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly queues: QueueHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  /**
   * Full health check - includes all sub-systems
   * GET /health
   */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.queues.isHealthy('queues'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),   // 512MB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),    // 1GB
    ]);
  }

  /**
   * Database-only health
   * GET /health/db
   */
  @Get('db')
  @HealthCheck()
  checkDatabase() {
    return this.health.check([() => this.db.isHealthy('database')]);
  }

  /**
   * Redis-only health
   * GET /health/redis
   */
  @Get('redis')
  @HealthCheck()
  checkRedis() {
    return this.health.check([() => this.redis.isHealthy('redis')]);
  }

  /**
   * Queue-only health with job counts per queue
   * GET /health/queues
   */
  @Get('queues')
  @HealthCheck()
  checkQueues() {
    return this.health.check([() => this.queues.isHealthy('queues')]);
  }

  /**
   * App-only health (memory + disk)
   * GET /health/app
   */
  @Get('app')
  @HealthCheck()
  checkApp() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
    ]);
  }
}
