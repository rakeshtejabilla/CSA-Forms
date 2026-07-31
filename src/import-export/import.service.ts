import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { PrismaService } from '../submissions/prisma/prisma.service'; // Adjust path if needed
import { Job } from 'bullmq';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionsService: SubmissionsService
  ) {}

  async processImport(job: Job) {
    const { formId, filePath, submitterId, submitterName } = job.data;
    this.logger.log(`Processing import for form ${formId} from file ${filePath}`);

    try {
      const form = await this.prisma.formTemplate.findUnique({ where: { id: formId } });
      if (!form) {
        throw new Error(`Form with ID ${formId} not found`);
      }

      await job.updateProgress(10);

      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<any>(sheet);

      if (rows.length === 0) {
        throw new Error('No data rows found in the uploaded file');
      }

      await job.updateProgress(20);

      const fields = (form.fields || []) as any[];
      const errors: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowNum = index + 2; 
        const mappedData: any = {};

        for (const field of fields) {
          const matchingKey = Object.keys(row).find(
            key =>
              key.trim().toLowerCase() === field.id.trim().toLowerCase() ||
              key.trim().toLowerCase() === field.label.trim().toLowerCase()
          );

          if (matchingKey !== undefined) {
            let val = row[matchingKey];
            if (field.type === 'number' && val !== undefined && val !== null && val !== '') {
              val = Number(val);
            }
            if (field.type === 'checkbox' && typeof val === 'string' && val.trim()) {
              if (val.includes(',')) {
                val = val.split(',').map(item => item.trim()).filter(Boolean);
              } else if (val.includes('|')) {
                val = val.split('|').map(item => item.trim()).filter(Boolean);
              } else if (val.includes(' ')) {
                val = val.trim().split(/\s+/).filter(Boolean);
              } else {
                val = [val.trim()];
              }
            }
            mappedData[field.id] = val;
          } else {
            mappedData[field.id] = undefined;
          }
        }

        // We use a hacky way to call validatePayload since it's private in SubmissionsService
        // But since TS compiles it out, we can cast it to any.
        const validationErrors = (this.submissionsService as any).validatePayload(mappedData, fields);
        
        if (validationErrors.length > 0) {
          failedCount++;
          errors.push(`Row ${rowNum}: ${validationErrors.join(', ')}`);
        } else {
          try {
            await this.prisma.submission.create({
              data: {
                formId,
                formVersion: form.version || 1,
                submitterId,
                submitterName: submitterName || 'Imported User',
                data: mappedData,
                isDraft: false,
              }
            });
            successCount++;
          } catch (dbErr: any) {
            failedCount++;
            errors.push(`Row ${rowNum}: DB Error - ${dbErr.message}`);
          }
        }

        // Update progress every 10%
        if (index % Math.max(1, Math.floor(rows.length / 10)) === 0) {
          const progress = 20 + Math.floor((index / rows.length) * 80);
          await job.updateProgress(progress);
        }
      }

      // Cleanup file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await job.updateProgress(100);

      return {
        success: true,
        successCount,
        failedCount,
        errors
      };

    } catch (error: any) {
      this.logger.error(`Import failed: ${error.message}`);
      throw error;
    }
  }
}
