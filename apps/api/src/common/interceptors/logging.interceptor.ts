import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    
    const method = request.method;
    const url = request.url;
    const correlationId = request.headers['x-correlation-id'] || randomUUID();
    
    request.headers['x-correlation-id'] = correlationId;

    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        const status = response.statusCode;
        this.logger.log(`[${correlationId}] ${method} ${url} ${status} - ${duration}ms`);
      }),
    );
  }
}
