import { Injectable } from '@nestjs/common';
import { PrismaService } from '../auth/prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsGateway,
  ) {}

  async logAction(data: {
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
    organizationId?: string | null;
  }) {
    const log = await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata ? data.metadata : undefined,
        ipAddress: data.ipAddress,
        organizationId: data.organizationId || null,
      },
      include: {
        user: true, // to get the email
      }
    });

    const formattedLog = {
      id: log.id,
      action: log.action,
      userEmail: log.user?.email || 'System',
      userName: log.user?.name || '',
      userRole: log.user?.role || '',
      timestamp: log.createdAt,
      details: log.metadata && Object.keys(log.metadata as object).length > 0
        ? JSON.stringify(log.metadata)
        : (log.entityType ? `${log.entityType} action` : 'Action performed')
    };

    if (log.organizationId) {
      this.notifications.notifyOrganization(log.organizationId, 'newAuditLog', formattedLog);
    }
    // Also notify super admins listening in the 'admin' room
    this.notifications.notifyOrganization('admin', 'newAuditLog', formattedLog);

    return log;
  }
}
