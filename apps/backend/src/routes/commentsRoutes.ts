import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/inventories/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const rows = await prisma.comment.findMany({
      where: { inventoryId: invId },
      orderBy: { createdAt: 'asc' },
      include: { user: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/inventories/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const userId = Number((req.user as any).id);
    const row = await prisma.comment.create({
      data: { inventoryId: invId, userId, body: String(req.body?.body ?? '') }
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

export default router;
