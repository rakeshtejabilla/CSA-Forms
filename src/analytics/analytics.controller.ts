import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AuditLogAction } from '../common/decorators/audit.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  @Get('dashboards')
  getDashboards(@Req() req: any) {
    return this.analyticsService.getDashboards(req.user);
  }

  @Post('dashboards')
  @AuditLogAction('DASHBOARD_CREATE', 'Dashboard')
  createDashboard(@Req() req: any, @Body() data: any) {
    return this.analyticsService.createDashboard(req.user, data);
  }

  @Put('dashboards/:id')
  @AuditLogAction('DASHBOARD_UPDATE', 'Dashboard')
  updateDashboard(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.analyticsService.updateDashboard(id, req.user, data);
  }

  @Delete('dashboards/:id')
  @AuditLogAction('DASHBOARD_DELETE', 'Dashboard')
  deleteDashboard(@Param('id') id: string, @Req() req: any) {
    return this.analyticsService.deleteDashboard(id, req.user);
  }

  @Post('widgets')
  @AuditLogAction('WIDGET_CREATE', 'DashboardWidget')
  createWidget(@Body() data: any) {
    return this.analyticsService.createWidget(data.dashboardId, data);
  }

  @Put('widgets/:id')
  @AuditLogAction('WIDGET_UPDATE', 'DashboardWidget')
  updateWidget(@Param('id') id: string, @Body() data: any) {
    return this.analyticsService.updateWidget(id, data);
  }

  @Delete('widgets/:id')
  @AuditLogAction('WIDGET_DELETE', 'DashboardWidget')
  deleteWidget(@Param('id') id: string) {
    return this.analyticsService.deleteWidget(id);
  }

  @Post('query')
  async executeQuery(@Body() body: { formId: string; config: any }, @Req() req: any) {
    const cacheKey = `analytics-query-${body.formId}-${JSON.stringify(body.config)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    const result = await this.analyticsService.executeQuery(body.formId, body.config, req.user);
    await this.cacheManager.set(cacheKey, result, 60000); // 60 seconds
    return result;
  }
}
