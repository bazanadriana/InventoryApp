import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

export const prisma = new PrismaClient();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

process.on('beforeExit', async () => prisma.$disconnect());
