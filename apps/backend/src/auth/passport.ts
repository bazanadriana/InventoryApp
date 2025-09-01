import passport, { Profile } from 'passport';
import { PrismaClient } from '@prisma/client';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const prisma = new PrismaClient();

type SafeUser = { id: number; email: string | null };

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    const u = await prisma.user.findUnique({ where: { id } });
    done(null, u ? ({ id: u.id, email: u.email } as SafeUser) : false);
  } catch (e) {
    done(e as any);
  }
});

async function upsertOAuthUser(_provider: 'github' | 'google', profile: Profile) {
  const email =
    Array.isArray(profile.emails) && profile.emails[0]?.value
      ? profile.emails[0].value
      : null;
  const name = profile.displayName || profile.username || email || `user_${profile.id}`;

  let user = email
    ? await prisma.user.findFirst({ where: { email } })
    : null;

  if (!user) {
    user = await prisma.user.create({
      data: { email, name } as any,
    });
  }
  return user;
}

export function setupPassport() {
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
        },
        async (
          accessToken: string,
          refreshToken: string,
          profile: Profile,
          done: (err: any, user?: any) => void
        ) => {
          try {
            const user = await upsertOAuthUser('github', profile);
            return done(null, { id: user.id, email: user.email } as SafeUser);
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
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        },
        async (
          accessToken: string,
          refreshToken: string,
          profile: Profile,
          done: (err: any, user?: any) => void
        ) => {
          try {
            const user = await upsertOAuthUser('google', profile);
            return done(null, { id: user.id, email: user.email } as SafeUser);
          } catch (e) {
            return done(e as any);
          }
        }
      )
    );
  }
}

export default passport;
