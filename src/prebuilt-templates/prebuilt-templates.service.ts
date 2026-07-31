import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import { CreatePrebuiltTemplateDto } from './dto/create-prebuilt-template.dto';
import { UpdatePrebuiltTemplateDto } from './dto/update-prebuilt-template.dto';
import { FieldType } from '../common/interfaces/form.interface';

@Injectable()
export class PrebuiltTemplatesService {
  private prisma = new PrismaClient();

  async findAll(userRole: string) {
    const where = userRole === 'SUPER_ADMIN' ? {} : { status: 'PUBLISHED' };
    const templates = await this.prisma.prebuiltTemplate.findMany({
      where,
      include: {
        createdBy: { select: { name: true, email: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: { id: true, versionNumber: true, fields: true, conditionalLogic: true, settings: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return templates.map((t) => ({
      ...t,
      latestVersion: t.versions[0] || null,
      fieldCount: Array.isArray((t.versions[0]?.fields as any)) ? (t.versions[0].fields as any[]).length : 0,
    }));
  }

  async findOne(id: string, userRole: string) {
    const template = await this.prisma.prebuiltTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, email: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
    if (!template) throw new NotFoundException('Template not found');
    if (template.status !== 'PUBLISHED' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied. Template is not published.');
    }
    return template;
  }

  async getVersions(id: string, userRole: string) {
    await this.findOne(id, userRole);
    return this.prisma.prebuiltTemplateVersion.findMany({
      where: { templateId: id },
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async create(dto: CreatePrebuiltTemplateDto, userId: string) {
    const { fields, conditionalLogic, settings, ...templateData } = dto;
    const template = await this.prisma.prebuiltTemplate.create({
      data: {
        ...templateData,
        tags: dto.tags || [],
        createdById: userId,
        versions: {
          create: {
            versionNumber: 1,
            fields: fields || [],
            conditionalLogic: conditionalLogic || [],
            settings: settings || {},
            createdById: userId,
          },
        },
      },
      include: {
        versions: true,
      },
    });
    return template;
  }

  async update(id: string, dto: UpdatePrebuiltTemplateDto, userId: string) {
    const existing = await this.prisma.prebuiltTemplate.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });
    if (!existing) throw new NotFoundException('Template not found');

    const { fields, conditionalLogic, settings, ...metaData } = dto;
    const hasFormChanges = fields !== undefined || conditionalLogic !== undefined || settings !== undefined;

    if (hasFormChanges) {
      const latestVersion = existing.versions[0];
      const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;
      await this.prisma.prebuiltTemplateVersion.create({
        data: {
          templateId: id,
          versionNumber: newVersionNumber,
          fields: fields ?? (latestVersion?.fields ?? []),
          conditionalLogic: conditionalLogic ?? (latestVersion?.conditionalLogic ?? []),
          settings: settings ?? (latestVersion?.settings ?? {}),
          createdById: userId,
        },
      });
    }

    return this.prisma.prebuiltTemplate.update({
      where: { id },
      data: {
        ...metaData,
        tags: metaData.tags || existing.tags,
        updatedAt: new Date(),
      },
    });
  }

  async publish(id: string) {
    const template = await this.prisma.prebuiltTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.prebuiltTemplate.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  async unpublish(id: string) {
    const template = await this.prisma.prebuiltTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.prebuiltTemplate.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
  }

  async archive(id: string) {
    const template = await this.prisma.prebuiltTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.prebuiltTemplate.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async duplicate(id: string, userId: string) {
    const original = await this.prisma.prebuiltTemplate.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!original) throw new NotFoundException('Template not found');
    const latestVersion = original.versions[0];
    return this.prisma.prebuiltTemplate.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        category: original.category,
        tags: original.tags,
        status: 'DRAFT',
        thumbnail: original.thumbnail,
        createdById: userId,
        versions: {
          create: {
            versionNumber: 1,
            fields: (latestVersion?.fields ?? []) as any,
            conditionalLogic: (latestVersion?.conditionalLogic ?? []) as any,
            settings: (latestVersion?.settings ?? {}) as any,
            createdById: userId,
          },
        },
      },
      include: { versions: true },
    });
  }

  async remove(id: string) {
    const template = await this.prisma.prebuiltTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.prebuiltTemplate.delete({ where: { id } });
  }

  async importXlsForm(fileBuffer: Buffer, createdById: string) {
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

      const fields: any[] = [];
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
        let options: any[] | undefined = undefined;

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
        }

        const field: any = {
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

      const formTitle = workbook.Props?.Title || `Imported Template ${new Date().toLocaleDateString()}`;

      return this.prisma.prebuiltTemplate.create({
        data: {
          name: formTitle,
          description: 'Imported from XLSForm spreadsheet',
          status: 'DRAFT',
          createdById,
          versions: {
            create: {
              versionNumber: 1,
              fields: fields as any,
              conditionalLogic: [],
              settings: {},
              createdById,
            },
          },
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
