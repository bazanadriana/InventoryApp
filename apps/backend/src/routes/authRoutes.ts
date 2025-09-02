import { Router } from 'express';
import jwt from 'jsonwebtoken';
import passport from '../auth/passport';

const router = Router();

const FRONTEND = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').replace(/\/+$/, '');

/** Kick off OAuth */
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], session: false }));

/** Callback -> issue JWT -> redirect to frontend */
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/oauth/failure', session: false }),
  (req, res) => {
    const u = req.user as { id: number; email: string | null };
    const token = jwt.sign({ sub: u.id, email: u.email }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.redirect(`${FRONTEND}/oauth/callback?token=${encodeURIComponent(token)}`);
  }
);

router.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/oauth/failure', session: false }),
  (req, res) => {
    const u = req.user as { id: number; email: string | null };
    const token = jwt.sign({ sub: u.id, email: u.email }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.redirect(`${FRONTEND}/oauth/callback?token=${encodeURIComponent(token)}`);
  }
);

router.get('/oauth/failure', (_req, res) => res.status(401).json({ error: 'OAuth failed' }));

export default router;
