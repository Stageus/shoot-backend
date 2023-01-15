const passport = require('passport');
const { Client } = require('pg');
const LocalStrategy = require('passport-local').Strategy;
const pgConfig = require('../config/psqlConfig');
const passwordHash = require('../module/passwordHash');

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

            //SELECT block data
            const selectBlockSql = 'SELECT block_channel_idx, block_start_time, block_period FROM shoot.block_channel WHERE block_channel_email = $1 ORDER BY block_channel_idx DESC';
            const selectBlockData = [email];
            const selectBlockResult = await pgClient.query(selectBlockSql, selectBlockData);
            
            //check block channel
            if(selectBlockResult.rows.length !== 0){
                const blockPeriod = selectBlockResult.rows[0].block_period;
                const blockStartTime = selectBlockResult.rows[0].block_start_time;

                const nowDate = new Date();
                const endTime = new Date(blockStartTime);
                endTime.setSeconds(endTime.getSeconds() + blockPeriod);

                if(nowDate < endTime){
                    done({ message : 'this channel had been blocked', statusCode : 403, blockEndTime : endTime });
                    return;
                }

                delete selectPwResult.pw;
                done(null, email, selectPwResult.rows[0]);
            }
        }catch(err){
            console.log(err);

            done({ message : 'unexpected error occured', statusCode : 409 });
        }

        //done(에러, email, info);
    }
));

module.exports = passport;