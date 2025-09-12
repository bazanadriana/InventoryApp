import { Router, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import requireAuth from '../middleware/requireAuth.js'; 

const prisma = new PrismaClient();
const router = Router();

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id; 
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        salesforceAccountId: true,
        salesforceContactId: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e: any) {
    console.error('GET /api/users/me failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { id: 'asc' },
      take: 100,
    });
    res.json({ users, page: 1, perPage: users.length, total: users.length });
  } catch (e) {
    console.error('GET /api/users failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
