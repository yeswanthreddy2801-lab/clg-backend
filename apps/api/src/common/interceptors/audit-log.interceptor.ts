import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaClient } from '@prisma/client';

import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    return next.handle().pipe(
      tap(() => {
        // Log mutating requests
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
          const user = request.user;
          if (user) {
            // Fire and forget audit log
            prisma.auditLog.create({
              data: {
                actorId: user.userId,
                collegeId: user.collegeId,
                action: `${method} ${request.url}`,
                targetType: 'API',
                targetId: request.url,
                metadataJson: { body: request.body, params: request.params, query: request.query },
              }
            }).catch(e => console.error('Failed to write audit log', e));
          }
        }
      }),
    );
  }
}
