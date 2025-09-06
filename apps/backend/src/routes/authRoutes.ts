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
const AUTH_DEBUG = process.env.AUTH_DEBUG === '1';

const EXPIRES_IN: SignOptions['expiresIn'] = (() => {
  const raw = process.env.JWT_TTL ?? '7d';
  if (typeof raw === 'number') return raw;            // seconds
  if (/^\d+$/.test(String(raw))) return Number(raw);  // numeric string => seconds
  return String(raw) as SignOptions['expiresIn'];     // e.g., "7d", "12h"
})();

/* --------------------------- Helpers --------------------------- */
type OAuthUser = { id: number | string; email: string | null; role?: 'admin' | 'user' };

function signToken(payload: object) {
  const opts: SignOptions = { expiresIn: EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, opts);
}

/** Send token in URL hash so it never leaves the browser (robust for SPA/CDN). */
function bearerRedirect(res: Response, token: string) {
  // Example final URL: https://site.com/auth/callback#token=eyJhbGci...
  res.redirect(`${FRONTEND_ORIGIN}/auth/callback#token=${encodeURIComponent(token)}`);
}

function failureRedirect(res: Response, code = 'oauth', detail?: string) {
  const d = detail ? `&detail=${encodeURIComponent(detail)}` : '';
  res.redirect(`${FRONTEND_ORIGIN}/login?err=${encodeURIComponent(code)}${d}`);
}

// Extract "Bearer <token>" from Authorization header
function getBearer(req: Request): string | null {
  const h = req.headers['authorization'];
  if (!h) return null;
  const [scheme, token] = String(h).split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
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
// NOTE: explicit `err: unknown` to satisfy noImplicitAny
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
          if ((req.query as Record<string, any>)?.error) {
            console.error(`[${provider}] provider returned error query:`, req.query);
            return failureRedirect(res, 'oauth', String((req.query as any).error));
          }
          if (!user) {
            console.warn(`[${provider}] no user returned. info=`, util.inspect(info, { depth: 4 }));
            return failureRedirect(res, 'unauthorized');
          }

          // Standard JWT subject + claims (Bearer only; no cookies)
          const token = signToken({ sub: user.id, email: user.email, role: user.role ?? 'user' });
          return bearerRedirect(res, token);
        } catch (e: any) {
          console.error(`[${provider}] callback exception:`, e);
          return failureRedirect(res, 'server', e?.message);
        }
      }
    )(req, res, next);
  };
}

router.get('/google/callback', handleCallback('google'));
router.get('/github/callback', handleCallback('github'));

/* ---------------------- Session helpers ------------------------ */
// Bearer-based auth: backend logout is a no-op; frontend deletes token
router.post('/logout', (_req, res) => {
  res.status(204).end();
});

/* ------------------------- Me (Bearer) ------------------------- */
router.get('/me', (req, res) => {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ user: null });

    // Allow small clock skew to avoid iat/nbf races right after login
    const p = jwt.verify(token, JWT_SECRET, { clockTolerance: 30 }) as any;

    // Accept legacy tokens too (uid/id)
    const id = p.sub ?? p.uid ?? p.id;
    if (id === undefined || id === null) {
      return res.status(401).json({ user: null });
    }

    return res.json({ user: { id, email: p.email ?? null, role: p.role ?? 'user' } });
  } catch (e: any) {
    if (AUTH_DEBUG) {
      return res.status(401).json({ user: null, error: e?.name, message: e?.message });
    }
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