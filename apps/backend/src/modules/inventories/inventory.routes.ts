import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Safely derive the "where" type from findMany args
type FindManyArgs = Parameters<typeof prisma.inventory.findMany>[0];
type InventoryWhere = FindManyArgs extends { where?: infer W } ? W : Record<string, never>;

// GET /api/inventories?q=&ownerId=&memberId=
router.get('/', async (req, res) => {
  const q =
    typeof req.query.q === 'string' && req.query.q.trim().length
      ? req.query.q
      : undefined;

  const ownerId =
    typeof req.query.ownerId === 'string' ? Number(req.query.ownerId) : undefined;

  const memberId =
    typeof req.query.memberId === 'string' ? Number(req.query.memberId) : undefined;

  const where = {} as InventoryWhere;

  if (q) {
    (where as any).OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (Number.isFinite(ownerId)) (where as any).ownerId = ownerId!;
  if (Number.isFinite(memberId)) (where as any).members = { some: { userId: memberId! } };

  const items = await prisma.inventory.findMany({
    where,
    orderBy: { id: 'desc' },
  });

  res.json({ ok: true, items });
});

// POST /api/inventories
router.post('/', async (req, res) => {
  const ownerId = Number(req.user?.id ?? req.body.ownerId);
  const title = String(req.body.title || '');
  const description = String(req.body.description || '');
  const category: any = req.body.category ?? 'GENERAL';

  if (!ownerId || !title) {
    return res.status(400).json({ error: 'ownerId and title required' });
  }

  const created = await prisma.inventory.create({
    data: { ownerId, title, description, category } as any,
  });

  res.json({ ok: true, inventory: created });
});

export default router;