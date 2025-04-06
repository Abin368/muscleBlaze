const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const Wallet = require('../../MuscleBlaze/models/walletSchema');

require('dotenv').config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
      
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          if (user.isBlocked) {
            return done(null, false, { message: 'Your account is blocked.' });
          }
          return done(null, user);
        }

       
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          if (user.isBlocked) {
            return done(null, false, { message: 'Your account is blocked.' });
          }

        
          if (!user.googleId) {
            user.googleId = profile.id;
            user.name = user.name || profile.displayName;
            await user.save();
            return done(null, user);
          }

          return done(null, user);
        }

      
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
        });
        await user.save();

      
        const wallet = new Wallet({ userId: user._id });
        await wallet.save();

        return done(null, user);
      } catch (error) {
        console.error('Google Auth Error:', error);
        return done(error, null);
      }
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
