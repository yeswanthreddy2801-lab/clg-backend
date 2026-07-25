import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withReplicas } from '@prisma/extension-read-replicas';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Expose the extended client with read replicas
  public readonly extended: any;

  constructor() {
    super();
    
    // Configure read-replica-aware query routing
    // Writes go to DATABASE_URL, reads can fall back to REPLICA_URL
    this.extended = this.$extends(
      withReplicas({
        url: process.env.REPLICA_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/campusverse'
      })
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
