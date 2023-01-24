const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addSubscribe = (loginUserEmail = '', subscribedChannelEmail = '') => {
    return new Promise(async (resolve, reject) => {
        if(loginUserEmail === subscribedChannelEmail){
            reject({
                statusCode : 400,
                message : 'cannot subscribe myself'
            });
            return;
        }
        
        const pgClient = new Client(pgConfig);
        try{
            await pgClient.connect();
            
            //INSERT
            const insertSubscribeSql = 'INSERT INTO shoot.subscribe (subscriber_channel_email, subscribed_channel_email) VALUES ($1, $2)';
            await pgClient.query(insertSubscribeSql, [loginUserEmail, subscribedChannelEmail]);

            resolve(1);
        }catch(err){
            if(err.code == 23505){
                reject({
                    statusCode : 403,
                    message : 'already subscribe'
                });
            }else if(err.code == 23503){
                reject({
                    statusCode : 404,
                    message : 'cannot find channel' 
                });
            }else{
                reject({
                    message : 'unexpected error occured',
                    statusCode : 409
                });
            }
        }
    })
}

module.exports = {
    addSubscribe : addSubscribe
}