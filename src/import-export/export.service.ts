import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../submissions/prisma/prisma.service'; // Adjust path if needed
import { Job } from 'bullmq';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processExport(job: Job) {
    const { formId, format } = job.data;
    this.logger.log(`Processing export for form ${formId} format ${format}`);

    try {
      const form = await this.prisma.formTemplate.findUnique({ where: { id: formId } });
      if (!form) {
        throw new Error(`Form with ID ${formId} not found`);
      }

      await job.updateProgress(10);

      const totalSubmissions = await this.prisma.submission.count({
        where: { formId, isDraft: false, }
      });

      if (totalSubmissions === 0) {
        throw new Error('No submissions to export');
      }

      const fields = (form.fields || []) as any[];
      const headers = fields.map(f => f.label || f.id);
      headers.unshift('ID', 'Submitter', 'Submitted At');

      const worksheetData = [headers];

      const batchSize = 1000;
      let processed = 0;

      for (let skip = 0; skip < totalSubmissions; skip += batchSize) {
        const batch = await this.prisma.submission.findMany({
          where: { formId, isDraft: false, },
          orderBy: { submittedAt: 'desc' },
          skip,
          take: batchSize,
        });

        for (const sub of batch) {
          const row = [sub.id, sub.submitterName || 'Guest', sub.submittedAt.toISOString()];
          const data: any = sub.data || {};
          
          for (const field of fields) {
            let val = data[field.id];
            if (Array.isArray(val)) val = val.join(', ');
            else if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            row.push(val === undefined || val === null ? '' : val);
          }
          worksheetData.push(row);
          processed++;
        }

        const progress = 10 + Math.floor((processed / totalSubmissions) * 80);
        await job.updateProgress(progress);
      }

      const ws = xlsx.utils.aoa_to_sheet(worksheetData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Submissions');

      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const filename = `export_${formId}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      if (format === 'csv') {
        const csvData = xlsx.utils.sheet_to_csv(ws);
        fs.writeFileSync(filePath, csvData);
      } else {
        xlsx.writeFile(wb, filePath);
      }

      await job.updateProgress(100);

      return {
        success: true,
        downloadUrl: `/api/files/download/${filename}`,
        totalProcessed: processed
      };

    } catch (error: any) {
      this.logger.error(`Export failed: ${error.message}`);
      throw error;
    }
  }
}
