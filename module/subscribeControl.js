const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const { addNotification } = require('./notificationControl');

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

            //BEGIN
            await pgClient.query('BEGIN');
            
            //INSERT
            const insertSubscribeSql = 'INSERT INTO shoot.subscribe (subscriber_channel_email, subscribed_channel_email) VALUES ($1, $2)';
            await pgClient.query(insertSubscribeSql, [loginUserEmail, subscribedChannelEmail]);

            //UPDATE
            const updateChannelSql = 'UPDATE shoot.channel SET subscribe_count = subscribe_count + 1 WHERE email = $1';
            await pgClient.query(updateChannelSql, [subscribedChannelEmail]);

            //COMMIT
            await pgClient.query('COMMIT');

            addNotification(loginUserEmail, {
                type : 5,
                notifiedEmail : subscribedChannelEmail,
            });

            resolve(1);
        }catch(err){
            //ROLLBACK
            await pgClient.query('ROLLBACK');

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

            //BEGIN
            await pgClient.query('BEGIN');

            //DELETE subscribe
            const deleteSubscribeSql = 'DELETE FROM shoot.subscribe WHERE subscriber_channel_email = $1 AND subscribed_channel_email = $2';
            const deleteSubscribeResult = await pgClient.query(deleteSubscribeSql, [loginUserEmail, subscribedChannelEmail]);

            if(deleteSubscribeResult.rowCount !== 0){
                //UPDATE
                const updateChannelSql = 'UPDATE shoot.channel SET subscribe_count = subscribe_count - 1 WHERE email = $1';
                await pgClient.query(updateChannelSql, [subscribedChannelEmail]);

                //COMMIT
                await pgClient.query('COMMIT');

                resolve(1);
            }else{
                //ROLLBACK
                await pgClient.query('ROLLBACK');

                reject({
                    statusCode : 403,
                    message : 'subscribe data does not exist'
                });
            }
        }catch(err){
            //ROLLBACK
            await pgClient.query('ROLLBACK');
            
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