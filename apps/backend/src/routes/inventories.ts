import type { Request, Response } from 'express';
import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const r = Router();

r.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as { sub?: string; userId?: string };
    const userId = payload?.sub ?? payload?.userId;
    if (!userId) return res.status(401).json({ error: 'Auth required' });

    const inventories = await prisma.inventory.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(inventories);
  } catch (err) {
    console.error('GET /api/inventories failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default r;
