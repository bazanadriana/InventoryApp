import { Router, type Request, type Response } from 'express';
import passport from 'passport';
import '../config/passport';
import jwt from 'jsonwebtoken';

const router = Router();

const CLIENT_URL = (
  process.env.CLIENT_URL ||
  process.env.FRONTEND_ORIGIN ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
).replace(/\/+$/, '');

const JWT_SECRET: string = process.env.JWT_SECRET || 'change-me';

function issueToken(user: any) {
  return jwt.sign(
    { uid: user?.id, role: user?.role ?? 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

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

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure', session: false }),
  (req: Request, res: Response) => {
    const token = issueToken((req as any).user);
    res.redirect(`${CLIENT_URL}#/auth/callback?token=${encodeURIComponent(token)}`);
  }
);

router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/failure', session: false }),
  (req: Request, res: Response) => {
    const token = issueToken((req as any).user);
    res.redirect(`${CLIENT_URL}#/auth/callback?token=${encodeURIComponent(token)}`);
  }
);

router.get('/failure', (_req, res) => res.status(401).json({ error: 'OAuth failed' }));

export default router;