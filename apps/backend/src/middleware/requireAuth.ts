import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'change-me';

type Claims = {
  sub?: string | number;
  uid?: string | number;
  id?: string | number;
  email?: string | null;
  role?: string;
  [k: string]: any;
};

function getBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const [scheme, token] = h.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

export default function requireAuth(req: Request & { auth?: any }, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') return next();

  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    // Allow a little clock skew to avoid iat/nbf race conditions
    const payload = jwt.verify(token, JWT_SECRET, { clockTolerance: 30 }) as Claims;

    const userId = payload.sub ?? payload.uid ?? payload.id;
    if (userId === undefined || userId === null) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.auth = {
      userId,
      email: payload.email ?? null,
      role: payload.role ?? 'user',
      raw: payload,
    };
    next();
  } catch (e) {
    // Avoid leaking details in prod
    return res.status(401).json({ error: 'Unauthorized' });
  }
}