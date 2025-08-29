// apps/backend/src/db.ts
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

export const prisma = new PrismaClient();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If you deploy to Render/Neon/etc you may need:
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// optional tidy-up
process.on('beforeExit', async () => prisma.$disconnect());
