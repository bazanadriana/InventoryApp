import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { optimisticVersion } from '../middleware/optimistic';
import { generateCustomId } from '../modules/items/id';
import { upsertValues } from '../modules/items/values';

const router = Router();

async function hasAccess(userId: number, inventoryId: number, requireEditor = false) {
  const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!inv) return { ok: false as const, status: 404 as const };
  if (inv.ownerId === userId) return { ok: true as const, status: 200 as const };
  const mem = await prisma.inventoryMember.findUnique({
    where: { inventoryId_userId: { inventoryId, userId } }
  });
  if (!mem) return { ok: false as const, status: 403 as const };
  if (!requireEditor) return { ok: true as const, status: 200 as const };
  return { ok: mem.role !== 'VIEWER', status: 200 as const };
}

// GET /inventories/:id/items
router.get('/inventories/:id/items', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const me = Number((req.user as any)?.id ?? 0);
    const role = await hasAccess(me, invId, false);
    if (!role.ok) return res.sendStatus(role.status);

    const q = String(req.query.q ?? '').trim();
    const order: 'asc' | 'desc' = (req.query.order === 'desc' ? 'desc' : 'asc');
    const sort = (req.query.sort as string) || 'customId';
    const page = Math.max(1, Number(req.query.page ?? 1));
    const perPage = Math.min(50, Math.max(1, Number(req.query.perPage ?? 20)));
    const skip = (page - 1) * perPage;

    const where: any = { inventoryId: invId };
    if (q) where.customId = { contains: q, mode: 'insensitive' };

    let orderBy: any = { customId: order };
    if (sort === 'createdAt') orderBy = { createdAt: order };
    if (sort === 'updatedAt') orderBy = { updatedAt: order };

    const [total, items] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({ where, orderBy, skip, take: perPage })
    ]);

    res.json({ total, page, perPage, items });
  } catch (e) { next(e); }
});

// POST /inventories/:id/items
router.post('/inventories/:id/items', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const me = Number((req.user as any)?.id ?? 0);
    const role = await hasAccess(me, invId, true);
    if (!role.ok) return res.sendStatus(role.status);

    const inv = await prisma.inventory.findUniqueOrThrow({ where: { id: invId } });
    const customId = await generateCustomId(invId, inv.customIdSpec as any);

    const item = await prisma.item.create({
      data: { inventoryId: invId, customId, createdById: me }
    });

    await upsertValues(item.id, (req.body?.values ?? {}) as Record<string, unknown>);
    res.status(201).json(item);
  } catch (e) { next(e); }
});

// PATCH /items/:id (optimistic concurrency)
router.patch(
  '/items/:id',
  requireAuth,
  optimisticVersion(async (req) => {
    const itemId = Number(req.params.id);
    if (Number.isNaN(itemId)) return undefined;
    const found = await prisma.item.findUnique({ where: { id: itemId } });
    return found?.version;
  }),
  async (req, res, next) => {
    try {
      const itemId = Number(req.params.id);
      if (Number.isNaN(itemId)) return res.status(400).json({ error: 'Bad item id' });

      const updated = await prisma.item.update({
        where: { id: itemId },
        data: { version: { increment: 1 } }
      });

      await upsertValues(itemId, (req.body?.values ?? {}) as Record<string, unknown>);
      res.set('x-version', String(updated.version)).json(updated);
    } catch (e) { next(e); }
  }
);

// POST /items/bulk-delete
router.post('/items/bulk-delete', requireAuth, async (req, res, next) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [])
      .map((v: any) => Number(v))
      .filter((n: number) => Number.isFinite(n));

    if (!ids.length) return res.status(400).json({ error: 'No valid ids' });
    await prisma.item.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: ids.length });
  } catch (e) { next(e); }
});

export default router;
