import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// GET /api/inventories?q=...
router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;

  const where: Prisma.InventoryWhereInput | undefined = q
    ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] }
    : undefined;

  const items = await prisma.inventory.findMany({ where, orderBy: { id: 'desc' } });
  res.json({ ok: true, items });
});

// POST /api/inventories
router.post('/', async (req, res) => {
  const ownerId = Number(req.user?.id ?? req.body.ownerId);
  const title = String(req.body.title || '');
  const description = String(req.body.description || '');
  // If your schema requires a category enum, accept input or fall back
  const category: any = req.body.category ?? 'GENERAL';

  if (!ownerId || !title) return res.status(400).json({ error: 'ownerId and title required' });

  const created = await prisma.inventory.create({
    data: { ownerId, title, description, category } as any
  });

  res.json({ ok: true, inventory: created });
});

export default router;
