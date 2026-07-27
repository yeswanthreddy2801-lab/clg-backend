import { defineConfig } from '@prisma/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// For Prisma CLI migration commands
export default defineConfig({
  schema: 'libs/database/prisma/schema.prisma',
  earlyAccess: true, // Prisma 7 usually uses early access features or we might not need this depending on the exact alpha/beta of v7.
  datasource: {
    url: process.env.DIRECT_URL || "postgresql://postgres.acodkhlvyclwahrqguyj:2004.Reddy1234@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  },
  migrate: {
    connection: {
      url: process.env.DIRECT_URL || "postgresql://postgres.acodkhlvyclwahrqguyj:2004.Reddy1234@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
    },
  },
});
