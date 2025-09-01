import { Router, type Request, type Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js'; 

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_TTL = process.env.JWT_TTL || '7d';

type OAuthProfile = {
  id?: string;          
  name?: string | null;
  email?: string | null;
  image?: string | null; 
  provider?: 'google' | 'github' | string;
  providerId?: string;    
};

/**
 * Create/update a local User (by email) and redirect to the frontend
 * with a signed JWT in the query string.
 */
async function issueForLocalUserAndRedirect(res: Response, profile: OAuthProfile) {
  const email = profile.email ?? undefined;
  if (!email) {
    return res.redirect(`${FRONTEND_URL}/login?err=no_email`);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: profile.name ?? undefined,
      image: profile.image ?? undefined,
    },
    create: {
      email,
      name: profile.name ?? undefined,
      image: profile.image ?? undefined,
    },
  });

  const token = jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      name: user.name ?? undefined,
      provider: profile.provider,
      providerId: profile.providerId ?? profile.id,
    },
    JWT_SECRET,
    { expiresIn: JWT_TTL }
  );

  const redirectUrl = new URL('/oauth/callback', FRONTEND_URL);
  redirectUrl.searchParams.set('token', token);
  return res.redirect(redirectUrl.toString());
}

/* --------------------------- Google OAuth --------------------------- */

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?err=google`,
  }),
  async (req: Request, res: Response) => {
    const u = req.user as any;
    const profile: OAuthProfile = {
      id: u?.id,
      providerId: u?.providerId ?? u?.id,
      provider: 'google',
      email: u?.email,
      name: u?.name,
      image: u?.image, 
    };
    try {
      await issueForLocalUserAndRedirect(res, profile);
    } catch (e) {
      console.error('Google callback error:', e);
      res.redirect(`${FRONTEND_URL}/login?err=server`);
    }
  }
);

/* --------------------------- GitHub OAuth --------------------------- */

router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'], session: false })
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?err=github`,
  }),
  async (req: Request, res: Response) => {
    const u = req.user as any;
    const profile: OAuthProfile = {
      id: u?.id,
      providerId: u?.providerId ?? u?.id,
      provider: 'github',
      email: u?.email,
      name: u?.name,
      image: u?.image,
    };
    try {
      await issueForLocalUserAndRedirect(res, profile);
    } catch (e) {
      console.error('GitHub callback error:', e);
      res.redirect(`${FRONTEND_URL}/login?err=server`);
    }
  }
);

/* ------------------------------ Logout ------------------------------ */

router.post('/logout', (_req, res) => {
  res.status(204).end();
});

export default router;
