import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    // In Phase 0, we just return a basic status.
    // Later we can add Prisma/Redis connection checks here.
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
