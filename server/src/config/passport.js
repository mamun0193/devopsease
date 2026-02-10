import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "http://localhost:3497/auth/github/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      return done(null, {
        provider: "github",
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
      }); 
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3497/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      return done(null, {
        provider: "google",
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
      });
    }
  )
);

export default passport;
