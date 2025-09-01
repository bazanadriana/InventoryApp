import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, type Profile as GitHubProfile } from 'passport-github2';

const BASE = process.env.API_BASE_URL || 'http://localhost:4000';

type OAuthUser = {
  provider: 'google' | 'github';
  providerId: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type VerifyDone = (error: any, user?: any, info?: any) => void;

/* ---------- Helpers ---------- */

async function fetchGithubPrimaryEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `token ${accessToken}`,
        'User-Agent': 'inventory-app',
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) return null;
    const emails = (await res.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
    const best =
      emails.find(e => e.primary && e.verified) ??
      emails.find(e => e.verified) ??
      emails[0];
    return best?.email ?? null;
  } catch {
    return null;
  }
}

/* ---------- Feature flags (from env) ---------- */

const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const hasGitHub = !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;

/* ---------- Configure strategies (guarded) ---------- */

export function configurePassport() {
  /* ----- Google ----- */
  if (hasGoogle) {
    const googleCallback =
      process.env.GOOGLE_CALLBACK_URL || `${BASE}/auth/google/callback`;

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          callbackURL: googleCallback,
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: GoogleProfile,
          done: VerifyDone
        ) => {
          const user: OAuthUser = {
            provider: 'google',
            providerId: profile.id,
            name: profile.displayName ?? profile.name?.givenName ?? null,
            email: profile.emails?.[0]?.value ?? null,
            image: profile.photos?.[0]?.value ?? null,
          };
          done(null, user as any);
        }
      )
    );
  } else {
    console.warn('Google OAuth disabled: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
  }

  /* ----- GitHub ----- */
  if (hasGitHub) {
    const githubCallback =
      process.env.GITHUB_CALLBACK_URL || `${BASE}/auth/github/callback`;

    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID as string,
          clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
          callbackURL: githubCallback,
          scope: ['user:email'],
        },
        async (
          accessToken: string,
          _refreshToken: string,
          profile: GitHubProfile,
          done: VerifyDone
        ) => {
          // GitHub may omit emails even with scope → fetch explicitly
          let email: string | null = (profile.emails && profile.emails[0]?.value) ?? null;
          if (!email) email = await fetchGithubPrimaryEmail(accessToken);

          const user: OAuthUser = {
            provider: 'github',
            providerId: profile.id,
            name: profile.displayName ?? (profile as any).username ?? null,
            email,
            image: profile.photos?.[0]?.value ?? null,
          };
          done(null, user as any);
        }
      )
    );
  } else {
    console.warn('GitHub OAuth disabled: missing GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET');
  }
}

/* Auto-configure on import for backward compatibility */
configurePassport();

/* Export flags so routes/UI can reflect availability if needed */
export const oauthEnabled = { google: hasGoogle, github: hasGitHub };

export default passport;
