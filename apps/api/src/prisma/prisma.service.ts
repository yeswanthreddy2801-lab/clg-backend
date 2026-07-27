import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { readReplicas } from '@prisma/extension-read-replicas';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Expose the extended client with read replicas
  public readonly extended: any;

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/campusverse';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    
    super({ adapter });
    
    // Configure read-replica-aware query routing
    // Writes go to DATABASE_URL, reads can fall back to REPLICA_URL
    const replicaUrl = process.env.REPLICA_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/campusverse';
    const replicaPool = new Pool({ connectionString: replicaUrl });
    const replicaAdapter = new PrismaPg(replicaPool);
    
    this.extended = this.$extends(
      readReplicas({
        replicas: [
          new PrismaClient({ adapter: replicaAdapter }),
        ],
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
