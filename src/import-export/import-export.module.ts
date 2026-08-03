import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportService } from './import.service';
import { ExportService } from './export.service';
import { ImportExportController } from './import-export.controller';
import { SubmissionsModule } from '../submissions/submissions.module';
import { FormsModule } from '../forms/forms.module';
import { createMockQueueProviders } from '../queue/mock-queue.provider';

const redisEnabled = !!(process.env.REDIS_HOST || process.env.REDIS_URL);

@Module({
  imports: [
    SubmissionsModule,
    FormsModule,
    ...(redisEnabled
      ? [BullModule.registerQueue({ name: 'import' }, { name: 'export' })]
      : []),
  ],
  controllers: [ImportExportController],
  providers: [
    ImportService,
    ExportService,
    ...(redisEnabled ? [] : createMockQueueProviders()),
  ],
  exports: [ImportService, ExportService],
})
export class ImportExportModule {}
