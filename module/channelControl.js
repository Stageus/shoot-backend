const elastic = require('elasticsearch');
const { Client } = require('pg');
const redis = require('redis').createClient();
const pgConfig = require('../config/psqlConfig');
const channelDataValidCheck = require('./channelDataValidCheck');
const passwordHash = require('./passwordHash');

const addChannel = (channelData) => {
    return new Promise(async (resolve, reject) => {
        const { email, pw, birth, sex, channelName, imgName } = channelData;

        if(!channelDataValidCheck(channelData).state){
            return reject({
                statusCode : 400,
                message : 'invalid channel data'
            })
        }

        const pgClient = new Client(pgConfig);

        try{
            //connect psql
            await pgClient.connect();
            await pgClient.query('BEGIN');

            //check email already exists
            const selectData = await pgClient.query('SELECT * FROM shoot.channel WHERE email = $1', [email]);
            if(selectData.rows.length >=  1){
                reject({
                    statusCode : 409,
                    message : 'this email already exists'
                })
                return;
            }

            //check email auth
            await redis.connect();
            const authState = await redis.exists(`certified_email_${email}`);
            if(!authState){
                await redis.disconnect();
                reject({
                    message : 'no email is being authenticated',
                    statusCode : 403
                });
                return;
            }
            
            //prepare sql
            let insertSql = '';
            let insertData = [];
            if(!imgName){
                insertSql = 'INSERT INTO shoot.channel (email, pw, name, sex, birth) VALUES ($1, $2, $3, $4, $5)'
                insertData = [email, passwordHash(pw), channelName, sex, birth];
            }else{
                insertSql = 'INSERT INTO shoot.channel (email, pw, name, sex, birth, profile_img) VALUES ($1, $2, $3, $4, $5, $6)'
                insertData = [email, passwordHash(pw), channelName, sex, birth, imgName];
            }

            //INSERT psql
            await pgClient.query(insertSql, insertData);

            //index elasticsearch
            const esClient = elastic.Client({
                node : "http://localhost:9200"
            });
            await esClient.index({
                index : 'channel',
                id : email,
                body : {
                    name : channelName
                }
            })

            //delete email auth state on redis
            await redis.del(`certified_email_${email}`);
            await redis.disconnect();

            //COMMIT
            await pgClient.query('COMMIT');

            resolve(1);
        }catch(err){
            console.log(err);

            await pgClient.query('ROLLBACK');

            if(redis.isOpen){
                await redis.disconnect();
            }

            reject({
                message : 'unexpected error occured',
                statusCode : 409
            });
        }
    })
}

module.exports = {
    addChannel : addChannel,
}