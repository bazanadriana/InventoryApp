import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import {
  Strategy as GoogleStrategy,
  type Profile as GoogleProfile,
  type VerifyCallback as GoogleVerify,
} from 'passport-google-oauth20';
import {
  Strategy as GitHubStrategy,
  type Profile as GitHubProfile,
} from 'passport-github2';

const prisma = new PrismaClient();

/* ----------------------------- ENV HELPERS ----------------------------- */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

const BACKEND_BASE = (
  process.env.BACKEND_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 4000}`
).replace(/\/+$/, '');

const GOOGLE_CLIENT_ID = required('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = required('GOOGLE_CLIENT_SECRET');

const GITHUB_CLIENT_ID = required('GITHUB_CLIENT_ID');
const GITHUB_CLIENT_SECRET = required('GITHUB_CLIENT_SECRET');

/* ------------------------------- UTILS -------------------------------- */
async function findOrCreateByEmail(email: string, displayName?: string | null) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: displayName ?? null },
    });
  }
  return user;
}

type Done = (error: any, user?: any, info?: any) => void;

/* -------------------------------- GOOGLE -------------------------------- */
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_BASE}/api/auth/google/callback`,
    },
    async (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done: GoogleVerify) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('Google profile did not include an email'), undefined);
        const user = await findOrCreateByEmail(email, profile.displayName);
        return done(null, user);
      } catch (err) {
        return done(err as any, undefined);
      }
    }
  )
);

/* -------------------------------- GITHUB -------------------------------- */
passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: `${BACKEND_BASE}/api/auth/github/callback`,
      scope: ['user:email'],
    },
    async (_accessToken: string, _refreshToken: string, profile: GitHubProfile, done: Done) => {
      try {
        const email =
          profile.emails?.[0]?.value || null;

        if (!email) return done(new Error('GitHub profile did not include an email'), undefined);

        const user = await findOrCreateByEmail(email, profile.displayName);
        return done(null, user);
      } catch (err) {
        return done(err as any, undefined);
      }
    }
  )
);