import { Controller, Post, Get, Param, Body, UseInterceptors, UploadedFile, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { AuditLogAction } from '../common/decorators/audit.decorator';
import { FormsService } from '../forms/forms.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('import-export')
@UseGuards(JwtAuthGuard)
export class ImportExportController {
  constructor(
    @InjectQueue('import') private importQueue: Queue,
    @InjectQueue('export') private exportQueue: Queue,
    private readonly formsService: FormsService,
  ) {}

  @Post('import/form/:formId')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  @AuditLogAction('IMPORT_DATA', 'Farmer')
  async queueImport(@Param('formId') formId: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Authorize
    await this.formsService.findOne(formId, req.user);

    const job = await this.importQueue.add('import-submissions', {
      formId,
      filePath: file.path,
      submitterId: req.user.sub,
      submitterName: req.user.name || 'Imported via API'
    });

    return { jobId: job.id, message: 'Import queued successfully' };
  }

  @Post('export/form/:formId')
  @AuditLogAction('EXPORT_DATA', 'Submission')
  async queueExport(@Param('formId') formId: string, @Body() body: { format?: 'csv' | 'xlsx' }, @Req() req: any) {
    // Authorize
    await this.formsService.findOne(formId, req.user);

    const format = body.format === 'csv' ? 'csv' : 'xlsx';
    
    const job = await this.exportQueue.add('export-submissions', {
      formId,
      format
    });

    return { jobId: job.id, message: 'Export queued successfully' };
  }

  @Get('job/:queueName/:jobId/status')
  async getJobStatus(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    if (queueName !== 'import' && queueName !== 'export') {
      throw new BadRequestException('Invalid queue name');
    }

    const queue = queueName === 'import' ? this.importQueue : this.exportQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    const state = await job.getState();
    const progress = job.progress;
    
    return {
      jobId: job.id,
      state,
      progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
