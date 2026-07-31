import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── DASHBOARDS ─────────────────────────────────────────────────────────────

  async createDashboard(user: any, data: { title: string; description?: string }) {
    return this.prisma.dashboard.create({
      data: {
        title: data.title,
        description: data.description,
        ownerId: user.sub,
        organizationId: user.organizationId,
      },
    });
  }

  async getDashboards(user: any) {
    if (user.role === 'SUPER_ADMIN') {
      return this.prisma.dashboard.findMany({
        include: { widgets: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    return this.prisma.dashboard.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { ownerId: user.sub },
          { isShared: true }
        ]
      },
      include: { widgets: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateDashboard(dashboardId: string, user: any, data: any) {
    if (user.role === 'SUPER_ADMIN') {
      return this.prisma.dashboard.updateMany({
        where: { id: dashboardId },
        data,
      });
    }

    return this.prisma.dashboard.updateMany({
      where: { id: dashboardId, ownerId: user.sub, organizationId: user.organizationId },
      data,
    });
  }

  async deleteDashboard(dashboardId: string, user: any) {
    if (user.role === 'SUPER_ADMIN') {
      return this.prisma.dashboard.deleteMany({
        where: { id: dashboardId }
      });
    }

    return this.prisma.dashboard.deleteMany({
      where: { id: dashboardId, ownerId: user.sub, organizationId: user.organizationId }
    });
  }

  // ─── WIDGETS ────────────────────────────────────────────────────────────────

  async createWidget(dashboardId: string, data: any) {
    return this.prisma.dashboardWidget.create({
      data: {
        dashboardId,
        formId: data.formId,
        title: data.title,
        chartType: data.chartType,
        queryConfig: data.queryConfig,
        layout: data.layout || { w: 4, h: 2, x: 0, y: Infinity },
      }
    });
  }

  async updateWidget(widgetId: string, data: any) {
    return this.prisma.dashboardWidget.update({
      where: { id: widgetId },
      data,
    });
  }

  async deleteWidget(widgetId: string) {
    return this.prisma.dashboardWidget.delete({ where: { id: widgetId } });
  }

  // ─── DYNAMIC QUERY ENGINE ───────────────────────────────────────────────────

  async executeQuery(formId: string, config: any, user: any) {
    const { xAxis, yAxis, aggregation, dateRange } = config;

    let aggSql = '';
    const safeAgg = (aggregation || 'COUNT').toUpperCase();
    
    // Cast to numeric for math operations. Note: null handling might be needed depending on DB engine strictly typing JSON
    if (safeAgg === 'SUM') aggSql = yAxis ? `SUM((data->>'${yAxis}')::numeric)` : 'SUM(1)';
    else if (safeAgg === 'AVG') aggSql = yAxis ? `AVG((data->>'${yAxis}')::numeric)` : 'AVG(1)';
    else if (safeAgg === 'MIN') aggSql = yAxis ? `MIN((data->>'${yAxis}')::numeric)` : 'MIN(1)';
    else if (safeAgg === 'MAX') aggSql = yAxis ? `MAX((data->>'${yAxis}')::numeric)` : 'MAX(1)';
    else aggSql = `COUNT(*)`;

    let query = '';
    
    // Base WHERE
    const whereClauses = [`"formId" = '${formId}'`, `"isDraft" = false`, `"deletedAt" IS NULL`];
    if (user.role !== 'SUPER_ADMIN') {
      whereClauses.push(`"organizationId" = '${user.organizationId}'`);
    }
    
    if (dateRange?.start && dateRange?.end) {
      whereClauses.push(`"submittedAt" >= '${dateRange.start}' AND "submittedAt" <= '${dateRange.end}'`);
    }

    const whereStr = whereClauses.join(' AND ');

    if (!xAxis || xAxis === 'NONE') {
      // KPI / Global aggregate
      query = `SELECT 'Total' as name, COALESCE(${aggSql}, 0) as value FROM "Submission" WHERE ${whereStr}`;
    } else {
      // Grouped query
      query = `
        SELECT COALESCE(data->>'${xAxis}', 'N/A') as name, COALESCE(${aggSql}, 0) as value
        FROM "Submission"
        WHERE ${whereStr}
        GROUP BY data->>'${xAxis}'
        ORDER BY value DESC
        LIMIT 50
      `;
    }

    try {
      const results: any[] = await this.prisma.$queryRawUnsafe(query);
      return results.map(row => ({
        name: row.name,
        value: Number(row.value) || 0
      }));
    } catch (e: any) {
      console.error('Query execution failed:', e);
      throw new BadRequestException('Failed to execute analytic query. Ensure fields are correctly typed.');
    }
  }
}
