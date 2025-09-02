import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { VerifyCallback } from 'passport-oauth2';
import type { Profile as PassportProfile } from 'passport';

const prisma = new PrismaClient();

type SafeUser = { id: number; email: string | null };

/** Build absolute base + optional API prefix for OAuth callbacks. */
const PORT = Number(process.env.PORT ?? 4000);
const BASE_URL = (process.env.BACKEND_BASE_URL ?? `http://localhost:${PORT}`).replace(/\/+$/, '');
const API_PREFIX_RAW = (process.env.API_PREFIX ?? '').trim();
const API_PREFIX = API_PREFIX_RAW ? (API_PREFIX_RAW.startsWith('/') ? API_PREFIX_RAW : `/${API_PREFIX_RAW}`) : '';

/** Create absolute callback URLs with API prefix baked in. */
const cb = (path: string) => `${BASE_URL}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;

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
  if (!user) user = await prisma.user.create({ data: { email, name } as any });

  return { id: user.id, email: user.email } as SafeUser;
}

export function setupPassport(): void {
  // --- GitHub ---
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL || cb('/auth/github/callback'),
          scope: ['user:email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: PassportProfile,
          done: VerifyCallback
        ): Promise<void> => {
          try {
            const user = await upsertOAuthUser('github', profile);
            done(null, user);
          } catch (e) {
            done(e as any);
          }
        }
      )
    );
  }

  // --- Google ---
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || cb('/auth/google/callback'),
          scope: ['profile', 'email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: PassportProfile,
          done: VerifyCallback
        ): Promise<void> => {
          try {
            const user = await upsertOAuthUser('google', profile);
            done(null, user);
          } catch (e) {
            done(e as any);
          }
        }
      )
    );
  }
}

export default passport;