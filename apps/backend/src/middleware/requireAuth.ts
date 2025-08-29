import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  sub?: string;
  userId?: string;
  email?: string | null;
  name?: string | null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Auth required' });
    }
    const token = h.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret') as AuthPayload;
    (req as any).user = payload; // attach to request
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
