import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/inventories/:id/members', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const rows = await prisma.inventoryMember.findMany({
      where: { inventoryId: invId },
      include: { user: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/inventories/:id/members', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const userId = Number((req.body as any).userId);
    if (Number.isNaN(userId)) return res.status(400).json({ error: 'Bad user id' });
    const role = (req.body as any).role as 'OWNER'|'EDITOR'|'VIEWER';

    const row = await prisma.inventoryMember.upsert({
      where: { inventoryId_userId: { inventoryId: invId, userId } },
      update: { role },
      create: { inventoryId: invId, userId, role }
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.delete('/inventories/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    const userId = Number(req.params.userId);
    if (Number.isNaN(invId) || Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Bad ids' });
    }

    await prisma.inventoryMember.delete({
      where: { inventoryId_userId: { inventoryId: invId, userId } }
    });
    res.sendStatus(204);
  } catch (e) { next(e); }
});

export default router;
