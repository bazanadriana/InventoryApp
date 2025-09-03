import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = Router();

/* ------------ URLs & secrets ------------ */
const API_PREFIX = process.env.API_PREFIX || '/api';
const BACKEND_BASE = (
  process.env.BACKEND_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 4000}`
).replace(/\/+$/, '');

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_TTL = process.env.JWT_TTL || '7d';

/* ------------ helpers ------------ */
type OAuthUser = { id: number; email: string | null };

function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL });
}

function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,          // HTTPS only (Render)
    sameSite: 'none',      // cross-site Netlify → Render
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function successRedirect(res: Response) {
  res.redirect(`${FRONTEND_ORIGIN}/dashboard`);
}

function failureRedirect(res: Response, code = 'server') {
  res.redirect(`${FRONTEND_ORIGIN}/login?err=${encodeURIComponent(code)}`);
}

/* ------------ Google OAuth ------------ */
router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
  })
);

router.get('/auth/google/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'google',
    { session: false },
    async (err: unknown, user: OAuthUser | false, _info?: unknown) => {
      try {
        if (err) {
          console.error('[google] auth error:', err);
          return failureRedirect(res, 'oauth');
        }
        if (!user) {
          console.warn('[google] no user returned');
          return failureRedirect(res, 'unauthorized');
        }
        const token = signToken({ uid: user.id, email: user.email });
        setAuthCookie(res, token);
        return successRedirect(res);
      } catch (e) {
        console.error('[google] callback exception:', e);
        return failureRedirect(res, 'server');
      }
    }
  )(req, res, next);
});

/* ------------ GitHub OAuth ------------ */
router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], session: false }));

router.get('/auth/github/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'github',
    { session: false },
    async (err: unknown, user: OAuthUser | false, _info?: unknown) => {
      try {
        if (err) {
          console.error('[github] auth error:', err);
          return failureRedirect(res, 'oauth');
        }
        if (!user) {
          console.warn('[github] no user returned');
          return failureRedirect(res, 'unauthorized');
        }
        const token = signToken({ uid: user.id, email: user.email });
        setAuthCookie(res, token);
        return successRedirect(res);
      } catch (e) {
        console.error('[github] callback exception:', e);
        return failureRedirect(res, 'server');
      }
    }
  )(req, res, next);
});

/* ------------ Session helpers ------------ */
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

/* ------------ Debug (optional) ------------ */
router.get('/auth/debug/callbacks', (_req, res) => {
  const base = BACKEND_BASE.replace(/\/+$/, '');
  res.json({
    google: `${base}${API_PREFIX}/auth/google/callback`,
    github: `${base}${API_PREFIX}/auth/github/callback`,
    frontend: FRONTEND_ORIGIN,
  });
});

export default router;
