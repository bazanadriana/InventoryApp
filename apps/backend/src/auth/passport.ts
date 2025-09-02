// apps/backend/src/auth/passport.ts
import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { VerifyCallback } from 'passport-oauth2';
import type { Profile as PassportProfile } from 'passport';

const prisma = new PrismaClient();

type SafeUser = { id: number; email: string | null };

passport.serializeUser(
  (user: any, done: (err: any, id?: any) => void) => done(null, (user as any).id)
);

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
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID as string,
          clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
          callbackURL:
            (process.env.GITHUB_CALLBACK_URL as string) || '/auth/github/callback',
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

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          callbackURL:
            (process.env.GOOGLE_CALLBACK_URL as string) || '/auth/google/callback',
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
