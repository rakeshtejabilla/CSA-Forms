import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ImportService } from '../../import-export/import.service';

@Processor('import')
export class ImportProcessor extends WorkerHost {
  constructor(private readonly importService: ImportService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    return this.importService.processImport(job);
  }
}
