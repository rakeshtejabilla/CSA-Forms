import { Controller, Post, Get, Param, Body, UseInterceptors, UploadedFile, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { AuditLogAction } from '../common/decorators/audit.decorator';
import { FormsService } from '../forms/forms.service';
import { ImportService } from './import.service';
import { ExportService } from './export.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('import-export')
@UseGuards(JwtAuthGuard)
export class ImportExportController {
  constructor(
    private readonly importService: ImportService,
    private readonly exportService: ExportService,
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
  async runImport(@Param('formId') formId: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Authorize
    await this.formsService.findOne(formId, req.user);

    // Run synchronously (no queue)
    const result = await this.importService.processImport({
      formId,
      filePath: file.path,
      submitterId: req.user.sub,
      submitterName: req.user.name || 'Imported via API',
    });

    return result;
  }

  @Post('export/form/:formId')
  @AuditLogAction('EXPORT_DATA', 'Submission')
  async runExport(@Param('formId') formId: string, @Body() body: { format?: 'csv' | 'xlsx' }, @Req() req: any) {
    // Authorize
    await this.formsService.findOne(formId, req.user);

    const format = body.format === 'csv' ? 'csv' : 'xlsx';

    // Run synchronously (no queue)
    const result = await this.exportService.processExport({ formId, format });

    return result;
  }
}
