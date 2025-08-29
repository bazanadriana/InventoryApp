import { Router } from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Start OAuth flows
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// Callbacks -> issue JWT then redirect to CLIENT_URL with token in hash
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req: any, res) => {
    const token = jwt.sign({ uid: req.user.id, role: req.user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.redirect(`${process.env.CLIENT_URL}#/auth/callback?token=${token}`);
  }
);

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/failure' }),
  (req: any, res) => {
    const token = jwt.sign({ uid: req.user.id, role: req.user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.redirect(`${process.env.CLIENT_URL}#/auth/callback?token=${token}`);
  }
);

router.get('/failure', (_req, res) => res.status(401).json({ error: 'OAuth failed' }));

export default router;
