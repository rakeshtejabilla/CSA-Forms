import {
  Controller, Post, Get, Body, Req, Param,
  Delete, Patch, UseGuards, UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { FileInterceptor } from '@nestjs/platform-express';
import { FormsService } from './forms.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AuditLogAction } from '../common/decorators/audit.decorator';

@Controller('forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @AuditLogAction('FORM_CREATE', 'FormTemplate')
  create(@Body() createFormDto: any, @Req() req: any) {
    if (req.user.role === 'ENUMERATOR') {
      throw new BadRequestException('Enumerators cannot create forms');
    }
    if (req.user.role !== 'SUPER_ADMIN') {
      createFormDto.organizationId = req.user.organizationId;
    }
    return this.formsService.create(createFormDto, req.user.sub);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.formsService.findAll(req.user);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000) // 60 seconds TTL
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.formsService.findOne(id, req.user);
  }

  @Patch(':id')
  @AuditLogAction('FORM_EDIT', 'FormTemplate')
  update(@Param('id') id: string, @Body() updateFormDto: any, @Req() req: any) {
    return this.formsService.update(id, updateFormDto, req.user);
  }

  @Delete(':id')
  @AuditLogAction('FORM_DELETE', 'FormTemplate')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.formsService.remove(id, req.user);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Req() req: any) {
    return this.formsService.duplicate(id, req.user);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @AuditLogAction('IMPORT_FORM', 'FormTemplate')
  importXlsForm(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.formsService.importXlsForm(file.buffer, req.user.sub, req.user.organizationId);
  }
}
