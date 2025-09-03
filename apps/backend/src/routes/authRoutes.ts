import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import util from 'node:util';

const router = Router();

const API_PREFIX = process.env.API_PREFIX || '/api';
const BACKEND_BASE = (
  process.env.BACKEND_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 4000}`
).replace(/\/+$/, '');

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_TTL = process.env.JWT_TTL || '7d';

type OAuthUser = { id: number; email: string | null };

function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL });
}

function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function successRedirect(res: Response) {
  res.redirect(`${FRONTEND_ORIGIN}/dashboard`);
}

function failureRedirect(res: Response, code = 'oauth', detail?: string) {
  const d = detail ? `&detail=${encodeURIComponent(detail)}` : '';
  res.redirect(`${FRONTEND_ORIGIN}/login?err=${encodeURIComponent(code)}${d}`);
}

// Generic handler to reduce duplication + add rich logging
function handleCallback(provider: 'google' | 'github') {
  return (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(provider, { session: false }, async (err: unknown, user: OAuthUser | false, info?: unknown) => {
      try {
        if (err) {
          console.error(`[${provider}] oauth error:`, util.inspect(err, { depth: 4 }));
          return failureRedirect(res, 'oauth', (err as any)?.message || String(err));
        }
        // Some providers put details in req.query or info
        if (req.query?.error) {
          console.error(`[${provider}] provider returned error query:`, req.query);
          return failureRedirect(res, 'oauth', String(req.query.error));
        }
        if (!user) {
          console.warn(`[${provider}] no user returned. info=`, util.inspect(info, { depth: 4 }));
          return failureRedirect(res, 'unauthorized');
        }

        const token = signToken({ uid: user.id, email: user.email });
        setAuthCookie(res, token);
        return successRedirect(res);
      } catch (e: any) {
        console.error(`[${provider}] callback exception:`, e);
        return failureRedirect(res, 'server', e?.message);
      }
    })(req, res, next);
  };
}

/* ---------- Initiation routes ---------- */
router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
  session: false,
}));

router.get('/auth/github', passport.authenticate('github', {
  scope: ['user:email'],
  session: false,
}));

/* ---------- Callback routes ---------- */
router.get('/auth/google/callback', handleCallback('google'));
router.get('/auth/github/callback', handleCallback('github'));

/* ---------- Session helpers ---------- */
router.post('/auth/logout', (_req, res) => {
  res.clearCookie('token', { path: '/', sameSite: 'none', secure: true });
  res.status(204).end();
});

router.get('/auth/me', (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ user: null });
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return res.json({ user: { id: payload.uid, email: payload.email } });
  } catch {
    return res.status(401).json({ user: null });
  }
});

/* ---------- Debug ---------- */
router.get('/auth/debug/callbacks', (_req, res) => {
  res.json({
    google: `${BACKEND_BASE}${API_PREFIX}/auth/google/callback`,
    github: `${BACKEND_BASE}${API_PREFIX}/auth/github/callback`,
    frontend: FRONTEND_ORIGIN,
  });
});

export default router;
