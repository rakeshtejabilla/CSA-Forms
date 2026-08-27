import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportService } from './import.service';
import { ExportService } from './export.service';
import { ImportExportController } from './import-export.controller';
import { SubmissionsModule } from '../submissions/submissions.module';
import { FormsModule } from '../forms/forms.module';

@Module({
  imports: [
    SubmissionsModule,
    FormsModule,
    BullModule.registerQueue(
      { name: 'import' },
      { name: 'export' },
    ),
  ],
  controllers: [ImportExportController],
  providers: [ImportService, ExportService],
  exports: [ImportService, ExportService]
})
export class ImportExportModule {}
