import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../auth/prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [AuditService, PrismaService],
  exports: [AuditService],
})
export class AuditModule {}
