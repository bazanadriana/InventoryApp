import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/inventories/:id/custom-id', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const inv = await prisma.inventory.findUnique({ where: { id: invId } });
    if (!inv) return res.sendStatus(404);
    res.json(inv.customIdSpec ?? []);
  } catch (e) { next(e); }
});

router.put('/inventories/:id/custom-id', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const spec = req.body; // array of elements
    const inv = await prisma.inventory.update({
      where: { id: invId },
      data: { customIdSpec: spec, version: { increment: 1 } },
      select: { customIdSpec: true }
    });
    res.json(inv.customIdSpec ?? []);
  } catch (e) { next(e); }
});

export default router;
