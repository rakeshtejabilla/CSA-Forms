import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { PrismaService } from '../submissions/prisma/prisma.service';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionsService: SubmissionsService
  ) {}

  private findValue(row: any, mappedData: any, keywords: string[]): any {
    for (const key of Object.keys(mappedData)) {
      const lowerKey = key.toLowerCase();
      if (keywords.some(kw => lowerKey.includes(kw))) {
        if (mappedData[key] !== undefined && mappedData[key] !== null) {
          return mappedData[key];
        }
      }
    }
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (keywords.some(kw => lowerKey.includes(kw))) {
        if (row[key] !== undefined && row[key] !== null) {
          return row[key];
        }
      }
    }
    return undefined;
  }

  async processImport(params: { formId: string; filePath: string; submitterId?: string; submitterName?: string }) {
    const { formId, filePath, submitterId, submitterName } = params;
    this.logger.log(`Processing import for form ${formId} from file ${filePath}`);

    try {
      const form = await this.prisma.formTemplate.findUnique({ where: { id: formId } });
      if (!form) {
        throw new Error(`Form with ID ${formId} not found`);
      }


      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<any>(sheet);

      if (rows.length === 0) {
        throw new Error('No data rows found in the uploaded file');
      }



      const fields = (form.fields || []) as any[];
      const mapToFarmers = (form.settings as any)?.mapToFarmers === true;
      const errors: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      // Group child sheets by repeat field IDs
      const repeatSheetsData = new Map<string, Map<string, any[]>>(); // fieldId -> Map(parentRef -> childRows[])
      
      for (let s = 1; s < workbook.SheetNames.length; s++) {
        const sheetName = workbook.SheetNames[s];
        const repeatField = fields.find(
          f =>
            (f.type === 'repeat' || (f.type as string) === 'begin_repeat') &&
            (f.id.toLowerCase() === sheetName.toLowerCase() ||
              f.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === sheetName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
        );
        
        if (repeatField) {
          const childSheet = workbook.Sheets[sheetName];
          const childRows = xlsx.utils.sheet_to_json<any>(childSheet);
          const parentGroupMap = new Map<string, any[]>();
          
          for (const childRow of childRows) {
            let refValue: string | undefined = undefined;
            if (childRow._parent_index !== undefined) refValue = String(childRow._parent_index);
            else if (childRow._submission__uuid !== undefined) refValue = String(childRow._submission__uuid);
            else if (childRow._submission__id !== undefined) refValue = String(childRow._submission__id);
            else {
              const parentKey = Object.keys(childRow).find(
                key => key.toLowerCase().includes('parent') || key.toLowerCase().includes('submission__')
              );
              if (parentKey) refValue = String(childRow[parentKey]);
            }
            
            if (refValue) {
              if (!parentGroupMap.has(refValue)) {
                parentGroupMap.set(refValue, []);
              }
              parentGroupMap.get(refValue)!.push(childRow);
            }
          }
          repeatSheetsData.set(repeatField.id, parentGroupMap);
        }
      }

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowNum = index + 2; 
        const mappedData: any = {};

        for (const field of fields) {
          if (field.type === 'repeat' || (field.type as string) === 'begin_repeat') {
            const parentIndex = row._index !== undefined ? String(row._index) : undefined;
            const parentUuid = row._uuid !== undefined ? String(row._uuid) : (row._id !== undefined ? String(row._id) : undefined);
            
            const parentGroupMap = repeatSheetsData.get(field.id);
            let matchedChildRows: any[] = [];
            if (parentGroupMap) {
              if (parentIndex && parentGroupMap.has(parentIndex)) {
                matchedChildRows = parentGroupMap.get(parentIndex)!;
              } else if (parentUuid && parentGroupMap.has(parentUuid)) {
                matchedChildRows = parentGroupMap.get(parentUuid)!;
              }
            }
            
            const childFields = fields.filter(f => f.groupId === field.id);
            const mappedChildren: any[] = [];
            
            for (const childRow of matchedChildRows) {
              const mappedChild: any = {};
              for (const childField of childFields) {
                const childMatchingKey = Object.keys(childRow).find(
                  key =>
                    key.trim().toLowerCase() === childField.id.trim().toLowerCase() ||
                    key.trim().toLowerCase() === childField.label.trim().toLowerCase() ||
                    key.trim().toLowerCase().endsWith(`) ${childField.id.trim().toLowerCase()}`) ||
                    key.trim().toLowerCase().includes(childField.id.trim().toLowerCase())
                );
                
                if (childMatchingKey !== undefined) {
                  let val = childRow[childMatchingKey];
                  if (childField.type === 'number' && val !== undefined && val !== null && val !== '') {
                    val = Number(val);
                  }
                  mappedChild[childField.id] = val;
                } else {
                  mappedChild[childField.id] = undefined;
                }
              }
              mappedChildren.push(mappedChild);
            }
            mappedData[field.id] = mappedChildren;
            continue;
          }

          if (field.groupId) {
            const parentField = fields.find(f => f.id === field.groupId);
            if (parentField && (parentField.type === 'repeat' || (parentField.type as string) === 'begin_repeat')) {
              continue;
            }
          }

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

        try {
          const nameVal = String(this.findValue(row, mappedData, ['name', 'what is your name', 'full_name']) || 'Unknown');
          const ageVal = parseInt(this.findValue(row, mappedData, ['age']) || '0', 10);
          const phoneVal = String(this.findValue(row, mappedData, ['phone', 'mobile', 'contact']) || '');
          const aadhaarVal = String(this.findValue(row, mappedData, ['aadhaar', 'adhar', 'adha']) || '');
          const cropVal = String(this.findValue(row, mappedData, ['crop']) || '');
          const landVal = parseFloat(this.findValue(row, mappedData, ['land', 'acres', 'size']) || '0');
          const stateVal = String(this.findValue(row, mappedData, ['state']) || '');
          const districtVal = String(this.findValue(row, mappedData, ['district']) || '');
          const mandalVal = String(this.findValue(row, mappedData, ['mandal', 'block', 'tehsil']) || '');
          const villageVal = String(this.findValue(row, mappedData, ['village']) || '');
          const assignedOrgVal = String(this.findValue(row, mappedData, ['assigned_org', 'assignedorg', 'assignedorganization', 'assigned organization']) || '');
          const estYieldVal = String(this.findValue(row, mappedData, ['estimated_yield', 'estimatedyield', 'estimated yield', 'est_yield', 'yield']) || '');

          const tsVal = this.findValue(row, mappedData, ['timestamp', 'time', 'date']);
          let parsedDate = new Date();
          if (tsVal) {
            const d = new Date(tsVal);
            if (!isNaN(d.getTime())) {
              parsedDate = d;
            }
          }

          await this.prisma.submission.create({
            data: {
              formId,
              formVersion: form.version || 1,
              submitterId: submitterId || null,
              submitterName: submitterName || 'Guest',
              data: mappedData,
              isDraft: false,
              organizationId: form.organizationId,
              submittedAt: parsedDate,
            }
          });

          if (mapToFarmers) {
            await this.prisma.farmer.create({
              data: {
                name: nameVal,
                age: ageVal,
                phoneNumber: phoneVal,
                aadhaarNumber: aadhaarVal,
                cropName: cropVal,
                landSizeAcres: landVal,
                state: stateVal,
                district: districtVal,
                mandal: mandalVal,
                village: villageVal,
                organizationId: form.organizationId,
                assignedOrganization: assignedOrgVal || null,
                estimatedYield: estYieldVal || null,
                timestamp: parsedDate,
              }
            });
          }
          successCount++;
        } catch (dbErr: any) {
          failedCount++;
          errors.push(`Row ${rowNum}: DB Error - ${dbErr.message}`);
        }

        // Update progress every 10%

      }

      // Cleanup file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }


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
