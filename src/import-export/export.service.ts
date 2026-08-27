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

      // Identify repeat fields
      const repeatFields = fields.filter(f => f.type === 'repeat' || (f.type as string) === 'begin_repeat');
      const repeatFieldIds = repeatFields.map(f => f.id);

      // Parent headers: exclude child fields of repeat groups
      const parentFields = fields.filter(
        f => !f.groupId || !repeatFieldIds.includes(f.groupId)
      );

      const parentHeaders = parentFields.map(f => f.label || f.id);
      parentHeaders.unshift('_index', '_uuid', 'Submitter', 'Submitted At');

      const parentWorksheetData = [parentHeaders];

      // Child worksheets data: Map<fieldId, rows[]>
      const childWorksheetsData = new Map<string, any[][]>();
      repeatFields.forEach(rf => {
        const childFields = fields.filter(f => f.groupId === rf.id);
        const childHeaders = childFields.map(f => f.label || f.id);
        childHeaders.unshift('_parent_index', '_submission__uuid');
        childWorksheetsData.set(rf.id, [childHeaders]);
      });

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
          const parentRowIndex = processed + 1; // 1-based index for linking
          const parentRow = [
            parentRowIndex,
            sub.id,
            sub.submitterName || 'Guest',
            sub.submittedAt.toISOString()
          ];
          const data: any = sub.data || {};

          // Map parent fields
          for (const field of parentFields) {
            let val = data[field.id];
            if (field.type === 'repeat' || (field.type as string) === 'begin_repeat') {
              // Write repeat count as summary
              parentRow.push(Array.isArray(val) ? val.length : 0);
            } else {
              if (Array.isArray(val)) val = val.join(', ');
              else if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
              parentRow.push(val === undefined || val === null ? '' : val);
            }
          }
          parentWorksheetData.push(parentRow);

          // Map repeat fields into child sheets
          for (const rf of repeatFields) {
            const childFields = fields.filter(f => f.groupId === rf.id);
            const childRows = data[rf.id];

            if (Array.isArray(childRows)) {
              const childSheetRows = childWorksheetsData.get(rf.id)!;
              childRows.forEach(childRow => {
                const mappedChildRow = [parentRowIndex, sub.id];
                for (const childField of childFields) {
                  let val = childRow[childField.id];
                  if (Array.isArray(val)) val = val.join(', ');
                  else if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                  mappedChildRow.push(val === undefined || val === null ? '' : val);
                }
                childSheetRows.push(mappedChildRow);
              });
            }
          }

          processed++;
        }

        const progress = 10 + Math.floor((processed / totalSubmissions) * 80);
        await job.updateProgress(progress);
      }

      const wb = xlsx.utils.book_new();

      // Append parent sheet
      const ws = xlsx.utils.aoa_to_sheet(parentWorksheetData);
      xlsx.utils.book_append_sheet(wb, ws, 'Submissions');

      // Append child sheets if format is xlsx (csv doesn't support multiple sheets)
      if (format !== 'csv') {
        childWorksheetsData.forEach((rowsData, childFieldId) => {
          // Limit sheet name to 31 chars (Excel limit)
          const sheetName = childFieldId.substring(0, 31);
          const childWs = xlsx.utils.aoa_to_sheet(rowsData);
          xlsx.utils.book_append_sheet(wb, childWs, sheetName);
        });
      }

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
