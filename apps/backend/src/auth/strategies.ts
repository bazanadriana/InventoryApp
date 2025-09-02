// apps/backend/src/auth/strategies.ts
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

/** Minimal profile we pass to the auth route; DB id is created there. */
type MinimalPassportUser = {
  id: string;                    // provider id (string)
  provider: 'google' | 'github';
  providerId: string;
  email: string | null;
  name?: string | null;
  image?: string | null;
};

function firstProfileEmail(p: PassportProfile): string | null {
  const v =
    Array.isArray(p.emails) && p.emails[0]?.value ? p.emails[0].value : null;
  return v ?? null;
}

function firstProfilePhoto(p: PassportProfile): string | null {
  const v =
    Array.isArray((p as any).photos) && (p as any).photos[0]?.value
      ? (p as any).photos[0].value
      : null;
  return v ?? null;
}

function normalizeBase(
  provider: 'google' | 'github',
  profile: PassportProfile,
  email: string | null
): MinimalPassportUser {
  const name =
    (profile as any).displayName ||
    (profile as any).username ||
    email ||
    undefined;

  return {
    id: profile.id,
    provider,
    providerId: profile.id,
    email,
    name,
    image: firstProfilePhoto(profile),
  };
}

/** Fallback email fetch for GitHub when profile.emails is empty. */
async function fetchGithubEmail(accessToken: string): Promise<string | null> {
  try {
    const r = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'inventory-app',
      },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
      visibility?: string | null;
    }>;
    const primary = data.find((e) => e.primary && e.verified)?.email;
    if (primary) return primary;
    const verified = data.find((e) => e.verified)?.email;
    return verified ?? (data[0]?.email ?? null);
  } catch {
    return null;
  }
}

/** ------------------------ GitHub Strategy ------------------------ */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  const githubCallback = process.env.GITHUB_CALLBACK_URL || cb('/auth/github/callback');
  const githubScope =
    (process.env.GITHUB_SCOPE ?? 'user:email')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: githubCallback,
        scope: githubScope,
      },
      async (
        accessToken: string,
        _refreshToken: string,
        profile: PassportProfile,
        done: VerifyCallback
      ) => {
        try {
          // Prefer email from profile; if missing, call GitHub API.
          let email = firstProfileEmail(profile);
          if (!email) {
            email = await fetchGithubEmail(accessToken);
          }

          const user = normalizeBase('github', profile, email);
          // Cast to any to satisfy projects that augment Express.User with id:number.
          done(null, user as any);
        } catch (e) {
          done(e as any);
        }
      }
    )
  );
}

/** ------------------------ Google Strategy ------------------------ */
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
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: PassportProfile,
        done: VerifyCallback
      ) => {
        try {
          const user = normalizeBase('google', profile, firstProfileEmail(profile));
          done(null, user as any);
        } catch (e) {
          done(e as any);
        }
      }
    )
  );
}

/** Helpful logs in Render to confirm we’re using the right URLs */
console.log('[auth] BASE_URL:', BASE_URL);
console.log('[auth] API_PREFIX:', API_PREFIX);
console.log('[auth] GitHub callback:', process.env.GITHUB_CALLBACK_URL || cb('/auth/github/callback'));
console.log('[auth] Google callback:', process.env.GOOGLE_CALLBACK_URL || cb('/auth/google/callback'));
