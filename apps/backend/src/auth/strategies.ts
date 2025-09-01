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

/* ---------- Google ---------- */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${BASE}/auth/google/callback`,
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

/* ---------- GitHub ---------- */

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: `${BASE}/auth/github/callback`,
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

export default passport;
