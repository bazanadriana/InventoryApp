import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import passport from 'passport';
import jwt, { type SignOptions } from 'jsonwebtoken';
import util from 'node:util';

const router = Router();

/* ----------------------------- ENV ----------------------------- */
const API_PREFIX = process.env.API_PREFIX || '/api';

const BACKEND_BASE = (
  process.env.BACKEND_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 4000}`
).replace(/\/+$/, '');

const FRONTEND_ORIGIN = (
  process.env.FRONTEND_ORIGIN ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
).replace(/\/+$/, '');

const JWT_SECRET: string = process.env.JWT_SECRET || 'change-me';

const EXPIRES_IN: SignOptions['expiresIn'] = (() => {
  const raw = process.env.JWT_TTL ?? '7d';
  if (typeof raw === 'number') return raw;           // seconds
  if (/^\d+$/.test(String(raw))) return Number(raw); // numeric string => seconds
  return String(raw) as SignOptions['expiresIn'];    // e.g., "7d", "12h"
})();

/* --------------------------- Helpers --------------------------- */
type OAuthUser = { id: number; email: string | null; role?: 'admin' | 'user' };

function signToken(payload: object) {
  const opts: SignOptions = { expiresIn: EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, opts);
}

function bearerRedirect(res: Response, token: string) {
  // ✅ Redirect with token in query; frontend stores it (localStorage)
  res.redirect(`${FRONTEND_ORIGIN}/auth/callback?token=${encodeURIComponent(token)}`);
}

function failureRedirect(res: Response, code = 'oauth', detail?: string) {
  const d = detail ? `&detail=${encodeURIComponent(detail)}` : '';
  res.redirect(`${FRONTEND_ORIGIN}/login?err=${encodeURIComponent(code)}${d}`);
}

// Extract "Bearer <token>" from Authorization header
function getBearer(req: Request): string | null {
  const h = req.headers['authorization'];
  if (!h) return null;
  const [scheme, token] = h.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

// Generic handler to reduce duplication + add rich logging
function handleCallback(provider: 'google' | 'github') {
  return (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      provider,
      { session: false },
      async (err: unknown, user: OAuthUser | false, info?: unknown) => {
        try {
          if (err) {
            console.error(`[${provider}] oauth error:`, util.inspect(err, { depth: 4 }));
            return failureRedirect(res, 'oauth', (err as any)?.message || String(err));
          }
          if (req.query?.error) {
            console.error(`[${provider}] provider returned error query:`, req.query);
            return failureRedirect(res, 'oauth', String(req.query.error));
          }
          if (!user) {
            console.warn(`[${provider}] no user returned. info=`, util.inspect(info, { depth: 4 }));
            return failureRedirect(res, 'unauthorized');
          }

          // Standard JWT subject + claims
          const token = signToken({ sub: user.id, email: user.email, role: user.role ?? 'user' });

          // ✅ No cookies; pass token to frontend where it will be stored and used as Bearer
          return bearerRedirect(res, token);
        } catch (e: any) {
          console.error(`[${provider}] callback exception:`, e);
          return failureRedirect(res, 'server', e?.message);
        }
      }
    )(req, res, next);
  };
}

/* ---------------------- Initiation routes ---------------------- */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
  })
);

router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })
);

/* ---------------------- Callback routes ------------------------ */
router.get('/google/callback', handleCallback('google'));
router.get('/github/callback', handleCallback('github'));

/* ---------------------- Session helpers ------------------------ */
// For Bearer-based auth, backend logout is a no-op (frontend deletes token)
router.post('/logout', (_req, res) => {
  res.status(204).end();
});

// "Who am I" using Authorization: Bearer <jwt>
router.get('/me', (req, res) => {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ user: null });
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return res.json({
      user: { id: payload.sub, email: payload.email, role: payload.role ?? 'user' },
    });
  } catch {
    return res.status(401).json({ user: null });
  }
});

/* -------------------------- Debug ------------------------------ */
router.get('/debug/callbacks', (_req, res) => {
  res.json({
    google: `${BACKEND_BASE}${API_PREFIX}/auth/google/callback`,
    github: `${BACKEND_BASE}${API_PREFIX}/auth/github/callback`,
    frontend: FRONTEND_ORIGIN,
  });
});

export default router;