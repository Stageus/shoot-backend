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

const deleteSubscribe = (loginUserEmail, subscribedChannelEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //DELETE subscribe
            const deleteSubscribeSql = 'DELETE FROM shoot.subscribe WHERE subscriber_channel_email = $1 AND subscribed_channel_email = $2';
            const deleteSubscribeResult = await pgClient.query(deleteSubscribeSql, [loginUserEmail, subscribedChannelEmail]);

            if(deleteSubscribeResult.rowCount !== 0){
                resolve();
            }else{
                reject({
                    statusCode : 403,
                    message : 'subscribe data does not exist'
                });
            }
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

module.exports = {
    addSubscribe : addSubscribe,
    deleteSubscribe : deleteSubscribe
}