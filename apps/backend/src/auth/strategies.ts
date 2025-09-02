import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Profile as PassportProfile } from 'passport';
import type { VerifyCallback } from 'passport-oauth2';

/** Build absolute base + optional API prefix for OAuth callbacks. */
const PORT = Number(process.env.PORT ?? 4000);
const RAW_BASE =
  process.env.BACKEND_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`;
const BASE_URL = RAW_BASE.replace(/\/+$/, '');

const RAW_PREFIX = (process.env.API_PREFIX ?? '/api').trim();
const API_PREFIX = RAW_PREFIX.startsWith('/') ? RAW_PREFIX : `/${RAW_PREFIX}`;

const cb = (path: string) => `${BASE_URL}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;

/** Minimal profile passed to the route; DB id is created in the callback route. */
type MinimalPassportUser = {
  id: string;                    // provider id (string)
  provider: 'google' | 'github';
  providerId: string;
  email: string | null;
  name?: string | null;
  image?: string | null;
};

function normalize(provider: 'google' | 'github', profile: PassportProfile): MinimalPassportUser {
  const email =
    Array.isArray(profile.emails) && profile.emails[0]?.value ? profile.emails[0].value : null;
  const name = (profile as any).displayName || (profile as any).username || email || undefined;
  const image =
    Array.isArray((profile as any).photos) && (profile as any).photos[0]?.value
      ? (profile as any).photos[0].value
      : null;

  return { id: profile.id, provider, providerId: profile.id, email, name, image };
}

/** Register strategies */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  const githubCallback = process.env.GITHUB_CALLBACK_URL || cb('/auth/github/callback');

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: githubCallback,
        scope: ['user:email'],
      },
      async (_at: string, _rt: string, profile: PassportProfile, done: VerifyCallback) => {
        try {
          const user = normalize('github', profile);
          // Cast to any to satisfy Express.User augmentation (id:number) — we create numeric id later.
          done(null, user as any);
        } catch (e) {
          done(e as any);
        }
      }
    )
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const googleCallback = process.env.GOOGLE_CALLBACK_URL || cb('/auth/google/callback');

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallback,
        scope: ['profile', 'email'],
      },
      async (_at: string, _rt: string, profile: PassportProfile, done: VerifyCallback) => {
        try {
          const user = normalize('google', profile);
          done(null, user as any);
        } catch (e) {
          done(e as any);
        }
      }
    )
  );
}

/** Optional logs to confirm callbacks in Render */
console.log('[auth] BASE_URL:', BASE_URL);
console.log('[auth] API_PREFIX:', API_PREFIX);
console.log('[auth] Google callback:', process.env.GOOGLE_CALLBACK_URL || cb('/auth/google/callback'));
console.log('[auth] GitHub  callback:', process.env.GITHUB_CALLBACK_URL || cb('/auth/github/callback'));
