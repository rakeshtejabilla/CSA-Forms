import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubmissionSyncProcessor } from './processors/submission-sync.processor';
import { ImportProcessor } from './processors/import.processor';
import { ExportProcessor } from './processors/export.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { QueueMonitorController } from './queue-monitor.controller';
import { ImportExportModule } from '../import-export/import-export.module';

const redisEnabled = !!(process.env.REDIS_HOST || process.env.REDIS_URL);

const bullImports = redisEnabled
  ? [
      BullModule.forRoot({
        connection: process.env.REDIS_URL
          ? { url: process.env.REDIS_URL }
          : {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
            },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      BullModule.registerQueue(
        { name: 'submission-sync' },
        { name: 'import' },
        { name: 'export' },
        { name: 'notification' },
      ),
    ]
  : [];

const queueProviders = redisEnabled
  ? [SubmissionSyncProcessor, ImportProcessor, ExportProcessor, NotificationProcessor]
  : [];

@Module({
  imports: [ImportExportModule, ...bullImports],
  controllers: [QueueMonitorController],
  providers: [...queueProviders],
})
export class QueueModule {}
