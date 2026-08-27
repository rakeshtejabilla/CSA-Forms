import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubmissionSyncProcessor } from './processors/submission-sync.processor';
import { ImportProcessor } from './processors/import.processor';
import { ExportProcessor } from './processors/export.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { QueueMonitorController } from './queue-monitor.controller';
import { ImportExportModule } from '../import-export/import-export.module';

@Module({
  imports: [
    ImportExportModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    BullModule.registerQueue(
      { name: 'submission-sync' },
      { name: 'import' },
      { name: 'export' },
      { name: 'notification' },
    ),
  ],
  controllers: [QueueMonitorController],
  providers: [
    SubmissionSyncProcessor,
    ImportProcessor,
    ExportProcessor,
    NotificationProcessor,
  ],
})
export class QueueModule {}
