const passport = require('passport');
const { Client } = require('pg');
const domainConfig = require('../config/domainConfig');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const googleOauthConfig = require('../config/googleOauthConfig');
const pgConfig = require('../config/psqlConfig');
const passwordHash = require('../module/passwordHash');
const blockCheck = require('./blockCheck');

passport.serializeUser((email, done) => {
    done(null, email);
 });

//local login
passport.use(new LocalStrategy(
    {
        usernameField : 'email',
        passwordField : 'pw'
    },
    async (email, pw, done) => {
        try{
            //connect psql
            const pgClient = new Client(pgConfig);
            await pgClient.connect();

            //SELECT pw data
            const selectPwSql = 'SELECT * FROM shoot.channel WHERE email = $1';
            const selectPwData = [email];
            const selectPwResult = await pgClient.query(selectPwSql, selectPwData);

            //check email existence
            if(selectPwResult.rows.length === 0){
                done({ message : 'email does not exist', statusCode : 400 });
                return;
            }

            //check password
            if(selectPwResult.rows[0].pw !== passwordHash(pw)){
                done({ message : 'wrong password', statusCode : 400 });
                return;
            }
            
            //check block channel
            const block = await blockCheck(email);
            if(!block.state){
                done({ 
                    message : 'this channel had been blocked', 
                    statusCode : 403, 
                    blockEndTime : block.blockEndTime, 
                    blockReason : block.blockReason 
                });
            }else{
                done(null, email, selectPwResult.rows[0]);
            }
        }catch(err){
            console.log(err);

            done({ message : 'unexpected error occured', statusCode : 409 });
        }
    }
));

//google login
passport.use(new GoogleStrategy(
    {
        clientID : googleOauthConfig.clientId,
        clientSecret : googleOauthConfig.clientSecret,
        callbackURL : `http://${domainConfig.enDomain}/auth/google/callback`,
        passReqToCallback : true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
        const email = profile.emails[0].value;

        try{
            //connect psql
            const pgClient = new Client(pgConfig);
            await pgClient.connect();

            //SELECT email data
            const selectSql = 'SELECT email, login_type FROM shoot.channel WHERE email = $1';
            const selectChannelResult = await pgClient.query(selectSql, [email]);
            if(selectChannelResult.rows.length !== 0){
                if(selectChannelResult.rows[0].login_type !== 'google'){
                    done({
                        message : 'already exists email with other login',
                        statusCode : 401,
                        loginType : selectChannelResult.rows[0].login_type
                    })
                }else{
                    //block check
                    const block = await blockCheck(email);
                    if(!block.state){
                        done({ 
                            message : 'this channel had been blocked', 
                            statusCode : 403, 
                            blockEndTime : block.blockEndTime, 
                            blockReason : block.blockReason 
                        });
                    }else{
                        done(null, email, null);
                    }
                }
            }else{
                //최초 로그인
                done(null, email, { firstLogin : true });
            }
        }catch(err){
            console.log(err);

            done({ message : 'unexpected error occured ', statusCode : 409 })
        }
    }
));

module.exports = passport;