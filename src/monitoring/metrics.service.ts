import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: client.Registry;

  // HTTP Metrics
  readonly httpRequestsTotal: client.Counter<string>;
  readonly httpRequestDuration: client.Histogram<string>;
  readonly httpRequestsInFlight: client.Gauge<string>;

  // Queue Metrics
  readonly queueJobsTotal: client.Counter<string>;
  readonly queueJobsFailed: client.Counter<string>;
  readonly queueJobsActive: client.Gauge<string>;
  readonly queueJobsWaiting: client.Gauge<string>;

  // App Metrics
  readonly formCreationsTotal: client.Counter<string>;
  readonly submissionsTotal: client.Counter<string>;
  readonly activeUsers: client.Gauge<string>;

  constructor() {
    this.registry = new client.Registry();

    // Collect default Node.js metrics (cpu, memory, event loop lag etc.)
    client.collectDefaultMetrics({ register: this.registry, prefix: 'formbuilder_' });

    this.httpRequestsTotal = new client.Counter({
      name: 'formbuilder_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'formbuilder_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new client.Gauge({
      name: 'formbuilder_http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      registers: [this.registry],
    });

    this.queueJobsTotal = new client.Counter({
      name: 'formbuilder_queue_jobs_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    this.queueJobsFailed = new client.Counter({
      name: 'formbuilder_queue_jobs_failed_total',
      help: 'Total number of failed queue jobs',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueJobsActive = new client.Gauge({
      name: 'formbuilder_queue_jobs_active',
      help: 'Number of currently active queue jobs',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueJobsWaiting = new client.Gauge({
      name: 'formbuilder_queue_jobs_waiting',
      help: 'Number of queued jobs waiting to be processed',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.formCreationsTotal = new client.Counter({
      name: 'formbuilder_form_creations_total',
      help: 'Total number of forms created',
      registers: [this.registry],
    });

    this.submissionsTotal = new client.Counter({
      name: 'formbuilder_submissions_total',
      help: 'Total number of form submissions',
      registers: [this.registry],
    });

    this.activeUsers = new client.Gauge({
      name: 'formbuilder_active_users',
      help: 'Number of active users (tracked via JWT sessions)',
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return client.Registry.OPENMETRICS_CONTENT_TYPE;
  }
}
