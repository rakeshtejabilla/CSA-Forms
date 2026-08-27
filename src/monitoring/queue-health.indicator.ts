import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue('submission-sync') private syncQueue: Queue,
    @InjectQueue('import') private importQueue: Queue,
    @InjectQueue('export') private exportQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const queues = {
        'submission-sync': this.syncQueue,
        'import': this.importQueue,
        'export': this.exportQueue,
        'notification': this.notificationQueue,
      };

      const results: Record<string, any> = {};

      for (const [name, queue] of Object.entries(queues)) {
        const counts = await queue.getJobCounts();
        results[name] = { ...counts, status: 'ok' };
      }

      return this.getStatus(key, true, results);
    } catch (error: any) {
      throw new HealthCheckError('Queue health check failed', this.getStatus(key, false, { error: error.message }));
    }
  }
}
