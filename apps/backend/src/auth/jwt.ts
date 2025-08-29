// apps/backend/src/auth/jwt.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AuthClaims = {
  sub?: string; userId?: string; id?: string;
  email?: string | null; name?: string | null;
  provider?: string; providerId?: string;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token' });
  const token = h.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AuthClaims;
    (req as any).user = payload;        // <-- attach decoded claims
    next();
  } catch (e: any) {
    console.error('JWT verify failed:', e?.message);
    return res.status(401).json({ error: 'invalid_token' });
  }
}
