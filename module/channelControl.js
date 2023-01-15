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
            let insertArray = [];
            if(!imgName){
                insertSql = 'INSERT INTO shoot.channel (email, pw, name, sex, birth) VALUES ($1, $2, $3, $4, $5)'
                insertArray = [email, passwordHash(pw), channelName, sex, birth];
            }else{
                insertSql = 'INSERT INTO shoot.channel (email, pw, name, sex, birth, profile_img) VALUES ($1, $2, $3, $4, $5, $6)'
                insertArray = [email, passwordHash(pw), channelName, sex, birth, imgName];
            }

            //INSERT psql
            await pgClient.query(insertSql, insertArray);

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

const getChannel = (channelEamil) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        try{
            await pgClient.connect();

            const selectChannelSql = 'SELECT name, birth, sex, authority, creation_time, description, profile_img FROM shoot.channel WHERE email = $1';
            const selectChannelResult = await pgClient.query(selectChannelSql, [channelEamil]);

            if(selectChannelResult.rows.length === 0){
                reject({
                    message : 'cannot find channel',
                    statusCode : 404
                })
            }else{
                const channelData = selectChannelResult.rows[0];

                resolve({
                    email : channelEamil,
                    name : channelData.name,
                    birth : channelData.birth,
                    sex : channelData.sex,
                    authority : channelData.int,
                    creation_time : channelData.creation_time,
                    description : channelData.description,
                    profile_img : channelData.profile_img
                });
            }
        }catch(err){
            console.log(err);

            reject({
                message : 'unexpected error occured',
                statusCode : 409
            })
        }
    })
}

const getAllChannel = (searchKeyword, lastChannelEmail = undefined) => {
    return new Promise(async (resolve, reject) => {
        //connect es
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        })
    })
}

module.exports = {
    addChannel : addChannel,
    getChannel : getChannel,
}