import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus-compatible metrics endpoint.
   * Scraped by Prometheus or any OpenMetrics-compatible tool (Grafana Agent, etc.)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metricsService.getMetrics();
    res.setHeader('Content-Type', this.metricsService.getContentType());
    res.send(metrics);
  }
}
