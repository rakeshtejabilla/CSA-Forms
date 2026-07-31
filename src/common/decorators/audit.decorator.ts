import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit';

export const AuditLogAction = (action: string, entityType?: string) => 
  SetMetadata(AUDIT_LOG_KEY, { action, entityType });
