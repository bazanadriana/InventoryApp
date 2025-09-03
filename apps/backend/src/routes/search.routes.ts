import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json({ inventories: [], items: [] });

    const inventories = (await prisma.$queryRawUnsafe(
      `
      SELECT id, title
      FROM "Inventory"
      WHERE search @@ plainto_tsquery('simple', $1)
      ORDER BY ts_rank(search, plainto_tsquery('simple', $1)) DESC
      LIMIT 20
      `,
      q
    )) as { id: number; title: string }[];

    const items = (await prisma.$queryRawUnsafe(
      `
      SELECT id, "customId" AS "customId"
      FROM "Item"
      WHERE search @@ plainto_tsquery('simple', $1)
      ORDER BY ts_rank(search, plainto_tsquery('simple', $1)) DESC
      LIMIT 20
      `,
      q
    )) as { id: number; customId: string }[];

    res.json({ inventories, items });
  } catch (e) {
    next(e);
  }
});

export default router;