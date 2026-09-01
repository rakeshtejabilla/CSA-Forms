import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { FormsModule } from './forms/forms.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GatewayController } from './gateway.controller';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
// import { QueueModule } from './queue/queue.module';
import { ImportExportModule } from './import-export/import-export.module';
// import { MonitoringModule } from './monitoring/monitoring.module';
import { CacheModule } from '@nestjs/cache-manager';
// import { redisStore } from 'cache-manager-redis-yet';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrebuiltTemplatesModule } from './prebuilt-templates/prebuilt-templates.module';
import { FarmersModule } from './farmers/farmers.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 1000,
    }]),
    CacheModule.register({ isGlobal: true }),
    // CacheModule.registerAsync({
    //   isGlobal: true,
    //   useFactory: async () => ({
    //     store: await redisStore({
    //       socket: {
    //         host: process.env.REDIS_HOST || 'localhost',
    //         port: parseInt(process.env.REDIS_PORT || '6379', 10),
    //       },
    //     }),
    //   }),
    // }),
    // QueueModule,
    ImportExportModule,
    // MonitoringModule,
    AuditModule,
    AuthModule,
    FormsModule,
    SubmissionsModule,
    AnalyticsModule,
    FilesModule,
    NotificationsModule,
    OrganizationsModule,
    PrebuiltTemplatesModule,
    FarmersModule,
  ],
  controllers: [GatewayController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule {}
