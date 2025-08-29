import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.post(
  '/items/:id/like',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.like.create({
        data: { userId: (req.user as any).id as string, itemId: req.params.id }
      });
      res.sendStatus(201);
    } catch (e) { next(e); }
  }
);

router.delete(
  '/items/:id/like',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.like.delete({
        where: { userId_itemId: { userId: (req.user as any).id as string, itemId: req.params.id } }
      });
      res.sendStatus(204);
    } catch (e) { next(e); }
  }
);

export default router;
