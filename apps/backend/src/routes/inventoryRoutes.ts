import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;

  // ⬇️ no explicit Prisma.InventoryWhereInput annotation
  const where =
    q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined;

  const items = await prisma.inventory.findMany({ where, orderBy: { id: 'desc' } });
  res.json({ ok: true, items });
});

// (keep your POST route as you have it)
export default router;
