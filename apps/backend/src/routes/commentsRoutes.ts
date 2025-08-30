import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// POST /api/comments
router.post('/', async (req, res) => {
  const userId = Number(req.user?.id ?? req.body.userId);
  const itemId = Number(req.body.itemId);
  const content = String(req.body.content ?? '');

  if (!userId || !itemId || !content) {
    return res.status(400).json({ error: 'userId, itemId and content are required' });
  }

  const comment = await prisma.comment.create({
    data: { userId, itemId, content }
  });

  res.json({ ok: true, comment });
});

export default router;
