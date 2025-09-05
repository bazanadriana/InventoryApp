import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'change-me';

export type AuthPayload = {
  sub?: string | number;
  uid?: string | number;
  id?: string | number;
  email?: string | null;
  role?: 'admin' | 'user' | string;
  [k: string]: any;
};

export interface AuthedRequest extends Request {
  auth?: {
    userId: string | number;
    email?: string | null;
    role?: string;
    raw: AuthPayload;
  };
}

function getBearer(req: Request): string | null {
  const h = req.headers['authorization'];
  if (!h) return null;
  const [scheme, token] = String(h).split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

/**
 * Accepts tokens signed with payloads that use any of: sub | uid | id
 * Attaches req.auth = { userId, email, role, raw }
 */
export default function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // Always let CORS preflights through
  if (req.method === 'OPTIONS') return next();

  try {
    const token =
      getBearer(req) ||
      // fallback for local dev if someone still has a cookie from older builds
      (req as any).cookies?.token ||
      null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

    const userId =
      payload.sub ??
      payload.uid ??
      payload.id;

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
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}