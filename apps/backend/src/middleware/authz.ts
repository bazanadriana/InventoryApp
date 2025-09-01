import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type TokenPayload = {
  uid: number;
  role: 'USER' | 'ADMIN';
  iat?: number;
  exp?: number;
  [key: string]: unknown;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const raw = req.headers.authorization ?? '';
  const token = raw.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!); 

    if (typeof decoded !== 'object' || decoded === null) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const payload = decoded as TokenPayload;

    if (
      typeof payload.uid !== 'number' ||
      (payload.role !== 'USER' && payload.role !== 'ADMIN')
    ) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    (req as any).user = { ...(req as any).user, uid: payload.uid, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as { role?: string } | undefined;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}
