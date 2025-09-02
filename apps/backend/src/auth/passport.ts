import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { VerifyCallback } from 'passport-oauth2';
import type { Profile as PassportProfile } from 'passport';

const prisma = new PrismaClient();

type SafeUser = { id: number; email: string | null };

/** Build a reliable absolute base URL for callbacks (Render in prod, localhost in dev). */
const PORT = Number(process.env.PORT ?? 4000);
const BASE_URL =
  process.env.BACKEND_BASE_URL?.replace(/\/+$/, '') ?? `http://localhost:${PORT}`;

/** Turn relative paths into absolute URLs using BASE_URL. */
function abs(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_URL}${path}`;
}

passport.serializeUser((user: any, done) => done(null, (user as any).id));

passport.deserializeUser(
  async (id: number, done: (err: any, user?: SafeUser | false | null) => void) => {
    try {
      const u = await prisma.user.findUnique({ where: { id } });
      done(null, u ? ({ id: u.id, email: u.email } as SafeUser) : false);
    } catch (e) {
      done(e as any);
    }
  }
);

async function upsertOAuthUser(
  _provider: 'github' | 'google',
  profile: PassportProfile
): Promise<SafeUser> {
  const email =
    Array.isArray(profile.emails) && profile.emails?.[0]?.value
      ? profile.emails[0].value
      : null;

  const name =
    (profile as any).displayName ||
    (profile as any).username ||
    email ||
    `user_${profile.id}`;

  let user = email ? await prisma.user.findFirst({ where: { email } }) : null;

  if (!user) {
    user = await prisma.user.create({ data: { email, name } as any });
  }

  return { id: user.id, email: user.email } as SafeUser;
}

export function setupPassport() {
  // --- GitHub ---
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    const githubCallback = abs(
      process.env.GITHUB_CALLBACK_URL || '/auth/github/callback'
    );

    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID as string,
          clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
          callbackURL: githubCallback,
          scope: ['user:email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: PassportProfile,
          done: VerifyCallback
        ) => {
          try {
            const user = await upsertOAuthUser('github', profile);
            return done(null, user);
          } catch (e) {
            return done(e as any);
          }
        }
      )
    );
  }

  // --- Google ---
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const googleCallback = abs(
      process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    );

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          callbackURL: googleCallback,
          scope: ['profile', 'email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: PassportProfile,
          done: VerifyCallback
        ) => {
          try {
            const user = await upsertOAuthUser('google', profile);
            return done(null, user);
          } catch (e) {
            return done(e as any);
          }
        }
      )
    );
  }
}

export default passport;