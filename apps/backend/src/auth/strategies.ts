import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import type { VerifyCallback } from 'passport-oauth2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_PREFIX = process.env.API_PREFIX || '/api';
const BACKEND_BASE = (
  process.env.BACKEND_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 4000}`
).replace(/\/+$/, '');

const GOOGLE_CALLBACK_URL = `${BACKEND_BASE}${API_PREFIX}/auth/google/callback`;
const GITHUB_CALLBACK_URL = `${BACKEND_BASE}${API_PREFIX}/auth/github/callback`;

console.log('[AUTH] BACKEND_BASE_URL =', BACKEND_BASE);
console.log('[AUTH] GOOGLE_CALLBACK  =', GOOGLE_CALLBACK_URL);
console.log('[AUTH] GITHUB_CALLBACK  =', GITHUB_CALLBACK_URL);

async function upsertUserByEmail(email: string, name?: string | null) {
  return prisma.user.upsert({
    where: { email },
    update: { name: name ?? undefined },
    create: { email, name: name ?? undefined },
  });
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (_at: string, _rt: string, profile: GoogleProfile, done: VerifyCallback) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('Google profile missing email'), false);
        const name =
          profile.displayName ||
          (profile.name ? `${profile.name.givenName ?? ''} ${profile.name.familyName ?? ''}`.trim() : null);
        const user = await upsertUserByEmail(email, name);
        return done(null, { id: user.id, email: user.email });
      } catch (e) {
        return done(e as any, false);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: GITHUB_CALLBACK_URL,
    },
    async (_at: string, _rt: string, profile: GitHubProfile, done: VerifyCallback) => {
      try {
        const emails = (profile.emails ?? []) as Array<{ value: string; primary?: boolean; verified?: boolean }>;
        const email =
          emails.find((e) => e.verified)?.value ??
          emails.find((e) => e.primary)?.value ??
          emails[0]?.value ??
          null;

        if (!email) return done(new Error('GitHub profile missing email'), false);

        const name = profile.displayName || profile.username || null;
        const user = await upsertUserByEmail(email, name);
        return done(null, { id: user.id, email: user.email });
      } catch (e) {
        return done(e as any, false);
      }
    }
  )
);

// We operate stateless (session:false), so no serialize/deserialize needed.
