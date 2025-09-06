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

/** ✅ Send token in URL hash so it never becomes a query param */
function bearerRedirect(res: Response, token: string) {
  const loc = `${FRONTEND_ORIGIN}/auth/callback#token=${encodeURIComponent(token)}`;
  if (AUTH_DEBUG) {
    console.log('[auth] redirecting to:', loc.slice(0, 160) + '…');
  }
  res.redirect(loc);
}

function failureRedirect(res: Response, code = 'oauth', detail?: string) {
  const d = detail ? `&detail=${encodeURIComponent(detail)}` : '';
  const loc = `${FRONTEND_ORIGIN}/login?err=${encodeURIComponent(code)}${d}`;
  if (AUTH_DEBUG) {
    console.warn('[auth] failureRedirect ->', loc);
  }
  res.redirect(loc);
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
function handleCallback(provider: 'google' | 'github') {
  return (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      provider,
      { session: false },
      async (err: unknown, user: OAuthUser | false, info?: unknown) => {
        try {
          if (err) {
            console.error(`[${provider}] oauth error:`, util.inspect(err, { depth: 4 }));
            return failureRedirect(res, 'oauth', (err as Error)?.message || String(err));
          }
          if ((req.query as Record<string, unknown>)?.error) {
            console.error(`[${provider}] provider returned error query:`, req.query);
            return failureRedirect(res, 'oauth', String((req.query as Record<string, unknown>).error));
          }
          if (!user) {
            console.warn(`[${provider}] no user returned. info=`, util.inspect(info, { depth: 4 }));
            return failureRedirect(res, 'unauthorized');
          }

          // Bearer-only flow: send a signed JWT (sub/email/role) to the frontend in the URL hash
          const token = signToken({ sub: user.id, email: user.email, role: user.role ?? 'user' });
          return bearerRedirect(res, token);
        } catch (e) {
          console.error(`[${provider}] callback exception:`, e);
          const msg = (e as Error)?.message;
          return failureRedirect(res, 'server', msg);
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
    const p = jwt.verify(token, JWT_SECRET, { clockTolerance: 30 }) as Record<string, unknown>;

    // Accept legacy tokens too (uid/id)
    const id = (p.sub ?? p.uid ?? p.id) as string | number | undefined | null;
    if (id === undefined || id === null) {
      return res.status(401).json({ user: null });
    }

    return res.json({ user: { id, email: (p.email as string) ?? null, role: (p.role as string) ?? 'user' } });
  } catch (e) {
    if (AUTH_DEBUG) {
      const err = e as { name?: string; message?: string };
      return res.status(401).json({ user: null, error: err.name, message: err.message });
    }
    return res.status(401).json({ user: null });
  }
});

/* ----------------------- Verify (debug) ------------------------ */
router.get('/verify-token', (req, res) => {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ ok: false, error: 'no_token' });
    const p = jwt.verify(token, JWT_SECRET, { clockTolerance: 30 }) as Record<string, unknown>;
    const id = p.sub ?? p.uid ?? p.id ?? null;
    return res.json({ ok: true, id, email: p.email ?? null, role: p.role ?? 'user', exp: p.exp });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    return res.status(401).json({ ok: false, name: err.name, message: err.message });
  }
});

/* ------------------------ Debug helpers ------------------------ */
router.get('/debug/callbacks', (_req, res) => {
  res.json({
    google: `${BACKEND_BASE}${API_PREFIX}/auth/google/callback`,
    github: `${BACKEND_BASE}${API_PREFIX}/auth/github/callback`,
    frontend: FRONTEND_ORIGIN,
  });
});

// Issue a throwaway JWT and redirect with #token=… to prove end-to-end
router.get('/debug/issue-token', (_req, res) => {
  const token = signToken({ sub: 'debug-user', email: 'debug@example.com', role: 'user' });
  return bearerRedirect(res, token);
});

export default router;