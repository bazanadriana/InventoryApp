// src/config/passport.ts
import passport from 'passport';
import {
  Strategy as GoogleStrategy,
  type StrategyOptions as GoogleStrategyOptions,
  type Profile as GoogleProfile,
  type VerifyCallback as GoogleVerifyCallback,
} from 'passport-google-oauth20';

import {
  Strategy as GitHubStrategy,
} from 'passport-github2';
import type {
  StrategyOptions as GitHubStrategyOptions,
  Profile as GitHubProfile,
} from 'passport-github2';

let initialized = false;

export function configurePassport() {
  if (initialized) return;
  initialized = true;

  // Prefer an explicit public API base, then Render’s public URL, then localhost:PORT
  const PORT = Number(process.env.PORT || 4000);
  const RAW_BASE =
    process.env.API_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${PORT}`;

  // Normalize base (remove trailing slash) and append `/api/auth/.../callback`
  const BASE = RAW_BASE.replace(/\/$/, '');
  const googleCallback = `${BASE}/api/auth/google/callback`;
  const githubCallback = `${BASE}/api/auth/github/callback`;

  console.log('[OAuth] Using callbacks:', { googleCallback, githubCallback });

  // Helper: shape object to satisfy your Express.User (id required)
  const toExpressUser = (u: {
    provider: 'google' | 'github';
    providerId: string;
    name?: string | null;
    email?: string | null;
  }): Express.User => {
    return {
      id: `${u.provider}:${u.providerId}`,
      name: u.name ?? undefined,
      email: u.email ?? undefined,
      provider: u.provider,
      providerId: u.providerId,
    } as unknown as Express.User;
  };

  /* ---------- Google ---------- */
  const googleOptions: GoogleStrategyOptions = {
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: googleCallback,
  };

  const googleVerify = (
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: GoogleVerifyCallback
  ) => {
    const user = toExpressUser({
      provider: 'google',
      providerId: profile.id,
      name: profile.displayName ?? null,
      email: profile.emails?.[0]?.value ?? null,
    });
    done(null, user);
  };

  passport.use(new GoogleStrategy(googleOptions, googleVerify));

  /* ---------- GitHub ---------- */
  const githubOptions: GitHubStrategyOptions = {
    clientID: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    callbackURL: githubCallback,
  };

  const githubVerify = (
    _accessToken: string,
    _refreshToken: string,
    profile: GitHubProfile,
    done: (err: any, user?: Express.User | false) => void
  ) => {
    const primaryEmail = profile.emails?.[0]?.value ?? null;

    const user = toExpressUser({
      provider: 'github',
      providerId: profile.id,
      name: profile.displayName ?? profile.username ?? null,
      email: primaryEmail,
    });

    done(null, user);
  };

  passport.use(new GitHubStrategy(githubOptions, githubVerify));
}

export default passport;
