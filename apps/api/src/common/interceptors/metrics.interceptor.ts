import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
// import { Counter, Histogram } from 'prom-client'; // In a real setup, we'd inject these

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  // In a real implementation we would use prom-client objects here.
  // private readonly requestLatency = new Histogram({ name: 'http_request_duration_ms', help: 'Duration of HTTP requests in ms', labelNames: ['method', 'route', 'status_code'] });
  // private readonly requestCount = new Counter({ name: 'http_requests_total', help: 'Total number of HTTP requests', labelNames: ['method', 'route', 'status_code'] });

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const route = request.route ? request.route.path : request.url;

    return next.handle().pipe(
      tap({
        next: (val) => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          // this.requestLatency.labels(method, route, response.statusCode.toString()).observe(duration);
          // this.requestCount.labels(method, route, response.statusCode.toString()).inc();
        },
        error: (err) => {
          const status = err.status || 500;
          const duration = Date.now() - start;
          // this.requestLatency.labels(method, route, status.toString()).observe(duration);
          // this.requestCount.labels(method, route, status.toString()).inc();
        }
      }),
    );
  }
}
