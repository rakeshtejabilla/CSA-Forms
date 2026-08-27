import {
  Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrebuiltTemplatesService } from './prebuilt-templates.service';
import { CreatePrebuiltTemplateDto } from './dto/create-prebuilt-template.dto';
import { UpdatePrebuiltTemplateDto } from './dto/update-prebuilt-template.dto';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogAction } from '../common/decorators/audit.decorator';

@Controller('prebuilt-templates')
@UseGuards(JwtAuthGuard)
export class PrebuiltTemplatesController {
  constructor(private readonly service: PrebuiltTemplatesService) {}

  // ── Available to all authenticated users (SUPER_ADMIN sees all, others see PUBLISHED only) ──
  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.role);
  }

  @Get(':id/versions')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  getVersions(@Param('id') id: string, @Req() req: any) {
    return this.service.getVersions(id, req.user.role);
  }

  // ── Super Admin only mutations ──
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @AuditLogAction('PREBUILT_TEMPLATE_CREATE', 'PrebuiltTemplate')
  create(@Body() dto: CreatePrebuiltTemplateDto, @Req() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @AuditLogAction('PREBUILT_TEMPLATE_UPDATE', 'PrebuiltTemplate')
  update(@Param('id') id: string, @Body() dto: UpdatePrebuiltTemplateDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLogAction('PREBUILT_TEMPLATE_PUBLISH', 'PrebuiltTemplate')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Post(':id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLogAction('PREBUILT_TEMPLATE_UNPUBLISH', 'PrebuiltTemplate')
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(id);
  }

  @Post(':id/archive')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLogAction('PREBUILT_TEMPLATE_ARCHIVE', 'PrebuiltTemplate')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @AuditLogAction('PREBUILT_TEMPLATE_DUPLICATE', 'PrebuiltTemplate')
  duplicate(@Param('id') id: string, @Req() req: any) {
    return this.service.duplicate(id, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLogAction('PREBUILT_TEMPLATE_DELETE', 'PrebuiltTemplate')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @AuditLogAction('IMPORT_PREBUILT_TEMPLATE', 'PrebuiltTemplate')
  importXlsForm(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.service.importXlsForm(file.buffer, req.user.sub);
  }
}
