import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = request.header('x-correlation-id') || uuidv4();
    request.headers['x-correlation-id'] = correlationId;

    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('X-Correlation-ID', correlationId);

    // In a real implementation, we would attach this correlationId to AsyncLocalStorage
    // so it can be automatically injected into Winston logs and outgoing requests.

    return next.handle();
  }
}
