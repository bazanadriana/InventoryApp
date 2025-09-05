// apps/backend/src/routes/debugRoutes.ts
import { Router } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const r = Router();

function getBearer(h?: string) {
  if (!h) return null;
  const [scheme, token] = h.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

r.get('/auth/verify-token', (req, res) => {
  try {
    const token = getBearer(req.headers.authorization as string | undefined);
    if (!token) return res.status(400).json({ ok: false, reason: 'no_token' });
    const p = jwt.verify(token, JWT_SECRET, { clockTolerance: 30 }) as any;
    const id = p.sub ?? p.uid ?? p.id ?? null;
    res.json({ ok: true, id, claims: p });
  } catch (e: any) {
    res.status(401).json({ ok: false, name: e?.name, message: e?.message });
  }
});

export default r;
