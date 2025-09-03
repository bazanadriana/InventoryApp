import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// POST /api/likes/toggle
router.post('/toggle', async (req, res) => {
  const userId = Number(req.user?.id ?? req.body.userId);
  const itemId = Number(req.body.itemId);
  if (!userId || !itemId) return res.status(400).json({ error: 'userId and itemId required' });

  const existing = await prisma.like.findFirst({ where: { userId, itemId } });

  if (existing) {
    await prisma.like.deleteMany({ where: { userId, itemId } });
    return res.json({ ok: true, liked: false });
  }

  await prisma.like.create({ data: { userId, itemId } });
  return res.json({ ok: true, liked: true });
});

export default router;