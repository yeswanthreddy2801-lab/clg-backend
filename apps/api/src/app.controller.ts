import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  healthCheck() {
    return this.appService.getHealth();
  }

  @Get('metrics')
  async getMetrics() {
    // In a real app we would use inject the registry from a metrics module or use prom-client directly.
    // const { register } = require('prom-client');
    // return register.metrics();
    return '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",route="/health",status_code="200"} 12\n';
  }
}
