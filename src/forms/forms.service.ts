import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { FormField, FieldOption, FieldType } from '../common/interfaces/form.interface';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, createdById: string) {
    return this.prisma.formTemplate.create({
      data: {
        title: data.title,
        description: data.description,
        fields: (data.fields || []) as any,
        version: 1,
        status: data.status || 'draft',
        organizationId: data.organizationId,
        ownerId: createdById,
      },
    });
  }

  async findAll(user: any) {
    const isEnumerator = user?.role === 'ENUMERATOR';
    const where: any = {};

    // Enumerators only see PUBLISHED forms
    if (isEnumerator) {
      where.status = 'PUBLISHED';
    }

    // Non-super-admins are scoped to their organisation
    if (user?.role !== 'SUPER_ADMIN' && user?.organizationId) {
      where.organizationId = user.organizationId;
    }

    return this.prisma.formTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: any) {
    const form = await this.prisma.formTemplate.findUnique({ where: { id } });
    if (!form) {
      throw new NotFoundException(`Form with ID ${id} not found`);
    }
    // Scope to organisation (non-super-admins)
    if (user.role !== 'SUPER_ADMIN' && form.organizationId !== user.organizationId) {
      throw new NotFoundException(`Form with ID ${id} not found`);
    }
    // Enumerators cannot access draft or archived forms
    if (user.role === 'ENUMERATOR' && form.status !== 'PUBLISHED') {
      throw new NotFoundException(`Form with ID ${id} not found`);
    }
    return form;
  }

  async update(id: string, updateData: any, user: any) {
    const currentForm = await this.findOne(id, user); // ensure exists & authorized
    return this.prisma.formTemplate.update({
      where: { id },
      data: {
        ...updateData,
        version: currentForm.version + 1,
      },
    });
  }

  async remove(id: string, user: any) {
    await this.findOne(id, user); // ensure exists & authorized
    return this.prisma.formTemplate.delete({ 
      where: { id }
    });
  }

  async duplicate(id: string, user: any) {
    const form = await this.findOne(id, user); // ensure exists & authorized
    const newForm = { ...form, id: undefined, createdAt: undefined, updatedAt: undefined };
    newForm.title = `${newForm.title} (Copy)`;
    newForm.ownerId = user.sub;
    return this.prisma.formTemplate.create({ data: newForm as any });
  }

  async importXlsForm(fileBuffer: Buffer, createdById: string, organizationId?: string) {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const surveySheet = workbook.Sheets['survey'];
      const choicesSheet = workbook.Sheets['choices'];

      if (!surveySheet) {
        throw new BadRequestException('XLSForm must have a "survey" sheet');
      }

      const surveyData = xlsx.utils.sheet_to_json<any>(surveySheet);
      let choicesData: any[] = [];
      if (choicesSheet) {
        choicesData = xlsx.utils.sheet_to_json<any>(choicesSheet);
      }

      const fields: FormField[] = [];
      let currentGroup: string | undefined = undefined;

      for (let i = 0; i < surveyData.length; i++) {
        const row = surveyData[i];
        if (!row.type || !row.name) continue;

        const typeStr = row.type.toString().trim();
        const typeParts = typeStr.split(/\s+/);
        const baseType = typeParts[0].toLowerCase();

        if (baseType === 'begin_group' || baseType === 'begin group') {
          currentGroup = row.name;
          continue;
        }
        if (baseType === 'end_group' || baseType === 'end group') {
          currentGroup = undefined;
          continue;
        }

        const fieldId = row.name.toString().trim();
        const label = row.label ? row.label.toString() : fieldId;
        const required = row.required === 'yes' || row.required === true || row.required === 'true';

        let mappedType: FieldType = FieldType.TEXT;
        let options: FieldOption[] | undefined = undefined;

        if (baseType === 'select_one' || baseType === 'select_multiple') {
          mappedType = baseType === 'select_one' ? FieldType.RADIO : FieldType.CHECKBOX;
          const listName = typeParts[1];
          if (listName && choicesData.length > 0) {
            options = choicesData
              .filter(c => c.list_name === listName)
              .map(c => ({
                label: c.label ? c.label.toString() : c.name.toString(),
                value: c.name.toString(),
              }));
          }
        } else if (baseType === 'integer' || baseType === 'decimal') {
          mappedType = FieldType.NUMBER;
        } else if (baseType === 'date' || baseType === 'datetime') {
          mappedType = FieldType.DATE;
        } else if (baseType === 'geopoint') {
          mappedType = FieldType.GPS;
        } else if (baseType === 'image' || baseType === 'photo') {
          mappedType = FieldType.IMAGE;
        } else if (baseType === 'barcode') {
          mappedType = FieldType.BARCODE;
        } else if (baseType === 'text') {
          mappedType = FieldType.TEXT;
        }

        const field: FormField = {
          id: fieldId,
          type: mappedType,
          label,
          required,
        };

        if (options) field.options = options;
        if (currentGroup) field.groupId = currentGroup;
        if (row.hint) field.helpText = row.hint.toString();
        if (row.appearance) field.appearance = row.appearance.toString();
        if (row.relevant) field.relevance = row.relevant.toString();
        if (row.constraint) field.constraint = row.constraint.toString();
        if (row.calculation) field.calculation = row.calculation.toString();
        if (row.default) field.defaultValue = row.default;

        fields.push(field);
      }

      const formTitle = workbook.Props?.Title || `Imported XLSForm ${new Date().toLocaleDateString()}`;

      return this.prisma.formTemplate.create({
        data: {
          title: formTitle,
          description: 'Imported from XLSForm spreadsheet',
          fields: fields as any,
          version: 1,
          status: 'published',
          organizationId,
          ownerId: createdById,
        },
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException('Failed to process XLSForm: ' + err.message);
    }
  }
}
