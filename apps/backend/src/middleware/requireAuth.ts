import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'change-me';

export type Claims = JwtPayload & {
  sub?: string | number;
  uid?: string | number;
  id?: string | number;
  email?: string | null;
  role?: string;
  [k: string]: any;
};

export interface AuthedRequest extends Request {
  auth?: {
    userId: string | number;
    email?: string | null;
    role?: string;
    raw: Claims;
  };
}

function getBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const [scheme, token] = h.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

export default function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  // Always let CORS preflights through
  if (req.method === 'OPTIONS') return next();

  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    // Tolerate small clock skew so brand-new tokens don't fail verify
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

    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
