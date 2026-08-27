import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { FarmersService } from './farmers.service';
import { AuditLogAction } from '../common/decorators/audit.decorator';

@Controller('farmers')
@UseGuards(JwtAuthGuard)
export class FarmersController {
  constructor(private readonly farmersService: FarmersService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.farmersService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.farmersService.findOne(id, req.user);
  }

  @Post()
  @AuditLogAction('FARMER_CREATE', 'Farmer')
  create(@Body() body: any, @Req() req: any) {
    return this.farmersService.create(body, req.user);
  }

  @Patch(':id')
  @AuditLogAction('FARMER_UPDATE', 'Farmer')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.farmersService.update(id, body, req.user);
  }

  @Delete(':id')
  @AuditLogAction('FARMER_DELETE', 'Farmer')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.farmersService.remove(id, req.user);
  }
}
