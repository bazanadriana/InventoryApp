// apps/backend/src/db/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Optional: shut it down nicely on process exit in dev
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
