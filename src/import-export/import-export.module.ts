import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ExportService } from './export.service';
import { ImportExportController } from './import-export.controller';
import { SubmissionsModule } from '../submissions/submissions.module';
import { FormsModule } from '../forms/forms.module';

@Module({
  imports: [
    SubmissionsModule,
    FormsModule,
  ],
  controllers: [ImportExportController],
  providers: [ImportService, ExportService],
  exports: [ImportService, ExportService]
})
export class ImportExportModule {}

