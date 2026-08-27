import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ExportService } from '../../import-export/export.service';

@Processor('export')
export class ExportProcessor extends WorkerHost {
  constructor(private readonly exportService: ExportService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    return this.exportService.processExport(job);
  }
}
