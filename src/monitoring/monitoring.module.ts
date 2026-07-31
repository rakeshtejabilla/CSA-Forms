import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';
import { QueueHealthIndicator } from './queue-health.indicator';
import { PrismaService } from '../auth/prisma/prisma.service';

const redisEnabled = !!(process.env.REDIS_HOST || process.env.REDIS_URL);

@Module({
  imports: [
    TerminusModule,
    ...(redisEnabled
      ? [BullModule.registerQueue(
          { name: 'submission-sync' },
          { name: 'import' },
          { name: 'export' },
          { name: 'notification' },
        )]
      : []),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    MetricsService,
    PrismaService,
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    QueueHealthIndicator,
  ],
  exports: [MetricsService],
})
export class MonitoringModule {}
