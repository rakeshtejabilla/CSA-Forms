import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('queues')
export class QueueMonitorController {
  constructor(
    @InjectQueue('submission-sync') private syncQueue: Queue,
    @InjectQueue('import') private importQueue: Queue,
    @InjectQueue('export') private exportQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
  ) {}

  @Get('stats')
  async getStats() {
    return {
      submissionSync: await this.syncQueue.getJobCounts(),
      import: await this.importQueue.getJobCounts(),
      export: await this.exportQueue.getJobCounts(),
      notification: await this.notificationQueue.getJobCounts(),
    };
  }
}
