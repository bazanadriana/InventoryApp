import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type JwtShape = { sub?: number | string; role?: 'admin' | 'user' };

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token =
    (header && header.startsWith('Bearer ') ? header.slice(7) : undefined) ||
    (req.cookies?.token as string | undefined);

  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    if (typeof decoded !== 'object' || decoded === null) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { sub, role } = decoded as JwtShape;
    const id = typeof sub === 'string' ? Number(sub) : sub;
    if (!id || Number.isNaN(id)) {
      return res.status(401).json({ error: 'Invalid token subject' });
    }

    req.user = { id: Number(id), role: role ?? 'user' };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
