import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { prisma } from "../db/prisma/client.js";

// local 'done' type
type Done = (err: any, user?: any, info?: any) => void;

passport.serializeUser((user: any, done) => done(null, user.id));

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user || null);
  } catch (e) {
    done(e as any);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done: Done) => {
      try {
        const providerId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatarUrl = profile.photos?.[0]?.value;

        let user = await prisma.user.findUnique({ where: { providerId } });
        if (!user) {
          user = await prisma.user.create({
            data: { provider: 'google', providerId, email, name, avatarUrl },
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err as any);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
      scope: ['user:email'],
    },
    async (_accessToken: string, _refreshToken: string, profile: GitHubProfile, done: Done) => {
      try {
        const providerId = profile.id;
        const email = Array.isArray(profile.emails) ? profile.emails[0]?.value : undefined;
        const name = profile.username || profile.displayName;
        const avatarUrl = profile.photos?.[0]?.value;

        let user = await prisma.user.findUnique({ where: { providerId } });
        if (!user) {
          user = await prisma.user.create({
            data: { provider: 'github', providerId, email, name, avatarUrl },
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err as any);
      }
    }
  )
);

export default passport;
