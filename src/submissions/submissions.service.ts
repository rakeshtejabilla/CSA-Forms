import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(formId: string, payload: { data: any; gpsLocation?: any; isDraft?: boolean }, user: any) {
    const form = await this.prisma.formTemplate.findUnique({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException(`Form with ID ${formId} not found`);
    }
    if (user.role !== 'SUPER_ADMIN' && form.organizationId !== user.organizationId) {
      throw new ForbiddenException(`You do not have access to submit to this form`);
    }

    const isDraft = payload.isDraft ?? false;

    // Validation Engine (only run validation if NOT saving as a draft)
    if (!isDraft) {
      const errors = this.validatePayload(payload.data, form.fields as any[]);
      if (errors.length > 0) {
        throw new BadRequestException({
          message: 'Form validation failed',
          errors,
        });
      }
    }

    const saved = await this.prisma.submission.create({
      data: {
        formId,
        formVersion: form.version || 1,
        submitterId: user?.sub,
        submitterName: user?.name || 'Guest',
        data: payload.data,
        gpsLatitude: payload.gpsLocation?.latitude,
        gpsLongitude: payload.gpsLocation?.longitude,
        isDraft,
        organizationId: form.organizationId,
      }
    });

    const mapToFarmers = (form.settings as any)?.mapToFarmers === true;

    // If it is NOT a draft and mapToFarmers is true, save it to the Farmer registry as well!
    if (!isDraft && mapToFarmers) {
      try {
        const findValue = (data: any, keywords: string[]): any => {
          if (!data || typeof data !== 'object') return undefined;
          for (const key of Object.keys(data)) {
            const lowerKey = key.toLowerCase();
            if (keywords.some(kw => lowerKey.includes(kw))) {
              if (data[key] !== undefined && data[key] !== null) {
                return data[key];
              }
            }
          }
          return undefined;
        };

        const nameVal = String(findValue(payload.data, ['name', 'what is your name', 'full_name']) || 'Unknown');
        const ageVal = parseInt(findValue(payload.data, ['age']) || '0', 10);
        const phoneVal = String(findValue(payload.data, ['phone', 'mobile', 'contact']) || '');
        const aadhaarVal = String(findValue(payload.data, ['aadhaar', 'adhar', 'adha']) || '');
        const cropVal = String(findValue(payload.data, ['crop']) || '');
        const landVal = parseFloat(findValue(payload.data, ['land', 'acres', 'size']) || '0');
        const stateVal = String(findValue(payload.data, ['state']) || '');
        const districtVal = String(findValue(payload.data, ['district']) || '');
        const mandalVal = String(findValue(payload.data, ['mandal', 'block', 'tehsil']) || '');
        const villageVal = String(findValue(payload.data, ['village']) || '');

        const estYieldVal = String(findValue(payload.data, ['estimated_yield', 'estimatedyield', 'estimated yield', 'est_yield', 'yield']) || '');

        const tsVal = findValue(payload.data, ['timestamp', 'time', 'date']);
        let parsedDate = new Date();
        if (tsVal) {
          const d = new Date(tsVal);
          if (!isNaN(d.getTime())) {
            parsedDate = d;
          }
        }

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
            estimatedYield: estYieldVal || null,
            timestamp: parsedDate,
          }
        });
      } catch (err) {
        console.error('Failed to auto-create farmer from submission:', err);
      }
    }

    return saved;
  }

  async findAll(user: any) {
    const where: any = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.organizationId = user.organizationId;
    }
    return this.prisma.submission.findMany({
      where,
      include: {
        form: {
          select: {
            title: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
  }

  async update(id: string, payload: { data: any }, user: any) {
    const submission = await this.findOne(id, user);
    
    const form = await this.prisma.formTemplate.findUnique({ where: { id: submission.formId } });
    if (!form) {
      throw new NotFoundException(`Form with ID ${submission.formId} not found`);
    }

    // Admins can edit
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException(`You do not have access to edit this submission`);
    }

    // Validation Engine
    const errors = this.validatePayload(payload.data, form.fields as any[]);
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Form validation failed',
        errors,
      });
    }

    const updated = await this.prisma.submission.update({
      where: { id },
      data: {
        data: payload.data,
      }
    });

    return updated;
  }

  async findByForm(formId: string, page: number = 1, limit: number = 50, user?: any) {
    const skip = (page - 1) * limit;
    
    // First verify form access
    const form = await this.prisma.formTemplate.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException('Form not found');
    if (user?.role !== 'SUPER_ADMIN' && form.organizationId !== user?.organizationId) {
      throw new ForbiddenException('You do not have access to these submissions');
    }
    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({
        where: { formId, isDraft: false },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.submission.count({
        where: { formId, isDraft: false }
      })
    ]);
    return { data, meta: { total, page, limit } };
  }

  async findByFormAndSubmitter(formId: string, submitterId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({
        where: { formId, submitterId, isDraft: false },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.submission.count({
        where: { formId, submitterId, isDraft: false }
      })
    ]);
    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string, user?: any) {
    const submission = await this.prisma.submission.findFirst({ where: { id } });
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }
    if (user?.role !== 'SUPER_ADMIN' && submission.organizationId !== user?.organizationId) {
       throw new NotFoundException(`Submission with ID ${id} not found`);
    }
    return submission;
  }

  async remove(id: string, user: any) {
    await this.findOne(id, user);
    return this.prisma.submission.delete({
      where: { id }
    });
  }

  async countBySubmitter(submitterId: string): Promise<number> {
    return this.prisma.submission.count({ where: { submitterId, isDraft: false } });
  }

  // The validation logic engine
  private validatePayload(data: any, fields: any[]): string[] {
    const errors: string[] = [];

    for (const field of fields) {
      if (field.groupId) {
        const parentField = fields.find(f => f.id === field.groupId);
        if (parentField && (parentField.type === 'repeat' || (parentField.type as string) === 'begin_repeat')) {
          const repeatData = data[field.groupId];
          if (Array.isArray(repeatData)) {
            for (let rIndex = 0; rIndex < repeatData.length; rIndex++) {
              const rowData = repeatData[rIndex];
              const childVal = rowData ? rowData[field.id] : undefined;
              
              if (field.required) {
                if (childVal === undefined || childVal === null || childVal === '' || (Array.isArray(childVal) && childVal.length === 0)) {
                  errors.push(`Row ${rIndex + 1} of "${parentField.label}": Field "${field.label}" (${field.id}) is required`);
                }
              }
              
              if (childVal !== undefined && childVal !== null && childVal !== '') {
                if (field.type === 'number') {
                  const num = Number(childVal);
                  if (isNaN(num)) {
                    errors.push(`Row ${rIndex + 1} of "${parentField.label}": Field "${field.label}" (${field.id}) must be a valid number`);
                  }
                }
                if (field.type === 'email') {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(String(childVal))) {
                    errors.push(`Row ${rIndex + 1} of "${parentField.label}": Field "${field.label}" (${field.id}) must be a valid email address`);
                  }
                }
              }
            }
          }
          continue;
        }
      }

      const val = data[field.id];

      // 1. Required Field check
      if (field.required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors.push(`Field "${field.label}" (${field.id}) is required`);
          continue;
        }
      }

      // If value is empty and not required, skip further validations
      if (val === undefined || val === null || val === '') {
        continue;
      }

      // 2. Validate Numbers
      if (field.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`Field "${field.label}" (${field.id}) must be a valid number`);
          continue;
        }
        if (field.validation?.min !== undefined && num < field.validation.min) {
          errors.push(`Field "${field.label}" (${field.id}) value must be at least ${field.validation.min}`);
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          errors.push(`Field "${field.label}" (${field.id}) value must be at most ${field.validation.max}`);
        }
      }

      // 3. Email Check
      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(val))) {
          errors.push(`Field "${field.label}" (${field.id}) must be a valid email address`);
        }
      }

      // 4. Custom Regex check
      if (field.validation?.pattern) {
        try {
          const reg = new RegExp(field.validation.pattern);
          if (!reg.test(String(val))) {
            errors.push(`Field "${field.label}" (${field.id}) does not match the required pattern`);
          }
        } catch (e) {
          // ignore invalid system regex definitions
        }
      }

      // 5. Options constraint check (for select, radio, dropdown)
      if ((field.type === 'radio' || field.type === 'dropdown' || field.type === 'select') && field.options) {
        const validValues = field.options.map((opt: any) =>
          typeof opt === 'object' && opt !== null ? String(opt.value || opt.label) : String(opt)
        );
        if (!validValues.includes(String(val))) {
          errors.push(`Field "${field.label}" (${field.id}) has an invalid selected choice option`);
        }
      }

      // 6. Checkbox options constraint check (case-insensitive, multi-delimiter aware)
      if (field.type === 'checkbox' && field.options) {
        // Build valid set from both value and label (case-insensitive)
        const validValues = field.options.flatMap((opt: any) => {
          if (typeof opt === 'object' && opt !== null) {
            return [String(opt.value || '').toLowerCase(), String(opt.label || '').toLowerCase()].filter(Boolean);
          }
          return [String(opt).toLowerCase()];
        });

        let selectedValues: string[] = [];
        if (Array.isArray(val)) {
          selectedValues = val.map(v => String(v).trim()).filter(Boolean);
        } else if (typeof val === 'object' && val !== null) {
          selectedValues = Object.keys(val).filter(k => !!val[k]);
        } else if (typeof val === 'string' && val.trim()) {
          // Support comma, pipe, or space-separated values from imported spreadsheets
          if (val.includes(',')) {
            selectedValues = val.split(',').map(v => v.trim()).filter(Boolean);
          } else if (val.includes('|')) {
            selectedValues = val.split('|').map(v => v.trim()).filter(Boolean);
          } else if (val.trim().includes(' ')) {
            selectedValues = val.trim().split(/\s+/).filter(Boolean);
          } else {
            selectedValues = [val.trim()];
          }
        }

        for (const item of selectedValues) {
          if (!validValues.includes(item.toLowerCase())) {
            errors.push(`Field "${field.label}" (${field.id}) has an invalid selection item: "${item}"`);
          }
        }
      }
    }

    return errors;
  }

  async importSubmissions(formId: string, buffer: Buffer, user: any) {
    const form = await this.prisma.formTemplate.findUnique({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException(`Form with ID ${formId} not found`);
    }
    if (user.role !== 'SUPER_ADMIN' && form.organizationId !== user.organizationId) {
      throw new ForbiddenException(`You do not have access to import to this form`);
    }

    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new BadRequestException('Uploaded spreadsheet is empty');
      }

      const rows = xlsx.utils.sheet_to_json<any>(sheet);
      if (rows.length === 0) {
        throw new BadRequestException('No data rows found in the uploaded file');
      }

      const fields = (form.fields || []) as any[];
      const mapToFarmers = (form.settings as any)?.mapToFarmers === true;
      const submissionsToInsert: any[] = [];
      const farmersToInsert: any[] = [];

      const findValue = (row: any, mappedData: any, keywords: string[]): any => {
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
      };

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const mappedData: any = {};

        // Map row keys to field ids
        for (const field of fields) {
          // Find matching key case-insensitively by id or label
          const matchingKey = Object.keys(row).find(
            key =>
              key.trim().toLowerCase() === field.id.trim().toLowerCase() ||
              key.trim().toLowerCase() === field.label.trim().toLowerCase()
          );

          if (matchingKey !== undefined) {
            let val = row[matchingKey];

            // Format check/cast for standard types
            if (field.type === 'number' && val !== undefined && val !== null && val !== '') {
              val = Number(val);
            }

            if (field.type === 'checkbox' && typeof val === 'string' && val.trim()) {
              // Support comma, pipe, or space-separated multi-select values from spreadsheets
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

        const nameVal = String(findValue(row, mappedData, ['name', 'what is your name', 'full_name']) || 'Unknown');
        const ageVal = parseInt(findValue(row, mappedData, ['age']) || '0', 10);
        const phoneVal = String(findValue(row, mappedData, ['phone', 'mobile', 'contact']) || '');
        const aadhaarVal = String(findValue(row, mappedData, ['aadhaar', 'adhar', 'adha']) || '');
        const cropVal = String(findValue(row, mappedData, ['crop']) || '');
        const landVal = parseFloat(findValue(row, mappedData, ['land', 'acres', 'size']) || '0');
        const stateVal = String(findValue(row, mappedData, ['state']) || '');
        const districtVal = String(findValue(row, mappedData, ['district']) || '');
        const mandalVal = String(findValue(row, mappedData, ['mandal', 'block', 'tehsil']) || '');
        const villageVal = String(findValue(row, mappedData, ['village']) || '');

        const estYieldVal = String(findValue(row, mappedData, ['estimated_yield', 'estimatedyield', 'estimated yield', 'est_yield', 'yield']) || '');

        const tsVal = findValue(row, mappedData, ['timestamp', 'time', 'date']);
        let parsedDate = new Date();
        if (tsVal) {
          const d = new Date(tsVal);
          if (!isNaN(d.getTime())) {
            parsedDate = d;
          }
        }

        submissionsToInsert.push({
          formId,
          formVersion: form.version || 1,
          submitterId: user?.sub,
          submitterName: user?.name || 'Guest',
          data: mappedData,
          isDraft: false,
          organizationId: form.organizationId,
          submittedAt: parsedDate,
        });

        farmersToInsert.push({
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
        });
      }

      // Bulk insert submissions in database
      const createdSubmissions = await this.prisma.$transaction(
        submissionsToInsert.map(sub => this.prisma.submission.create({ data: sub }))
      );

      let createdFarmersCount = 0;
      if (mapToFarmers && farmersToInsert.length > 0) {
        const createdFarmers = await this.prisma.$transaction(
          farmersToInsert.map(farmer => this.prisma.farmer.create({ data: farmer }))
        );
        createdFarmersCount = createdFarmers.length;
      }

      return {
        success: true,
        count: createdSubmissions.length,
        farmersCount: createdFarmersCount,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Failed to process spreadsheet file: ' + err.message);
    }
  }
}
