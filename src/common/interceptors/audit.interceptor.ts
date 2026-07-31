import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_LOG_KEY } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get<{ action: string, entityType: string }>(AUDIT_LOG_KEY, context.getHandler());
    
    if (!auditMeta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const ipAddress = req.ip || req.connection?.remoteAddress;
    
    return next.handle().pipe(
      tap((res) => {
        let userId = req.user?.sub || req.user?.id;
        let organizationId = req.user?.organizationId;
        
        // For login, userId might be in the response
        if (!userId && auditMeta.action === 'LOGIN' && res?.user?.id) {
          userId = res.user.id;
          organizationId = res.user.organizationId;
        }

        let entityId = req.params?.id || req.params?.formId;
        // For creations, entityId might be in the response
        if (!entityId && res?.id) {
          entityId = res.id;
        }

        let metadata = {};
        if (req.body) {
           // Mask passwords
           const { password, ...safeBody } = req.body;
           metadata = { body: safeBody };
        }

        this.auditService.logAction({
          userId,
          action: auditMeta.action,
          entityType: auditMeta.entityType,
          entityId: entityId?.toString(),
          metadata,
          ipAddress,
          organizationId
        }).catch(err => console.error('Failed to log audit event', err));
      })
    );
  }
}
