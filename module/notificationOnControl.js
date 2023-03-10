const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const getNotificationOn = (loginUserEmail, notiEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgCleint = new Client(pgConfig);

        try{
            await pgCleint.connect();

            //SELECT
            const selectSubscribeSql = 'SELECT notification FROM shoot.subscribe WHERE subscriber_channel_email = $1 AND subscribed_channel_email = $2';
            const selectSubscribeResult = await pgCleint.query(selectSubscribeSql, [loginUserEmail, notiEmail]);
            const subscribeData = selectSubscribeResult.rows[0];

            if(subscribeData){
                resolve({
                    state : subscribeData.notification
                });
            }else{
                reject({
                    statusCode : 404,
                    message : 'cannot find subscribe data'
                });
            }
        }catch(err){
            reject({
                statusCode: 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const addNotificationOn = (loginUserEmail, notiEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgCleint = new Client(pgConfig);

        try{
            await pgCleint.connect();

            //SELECT subscribe
            const selectSubscribeSql = 'SELECT * FROM shoot.subscribe WHERE subscriber_channel_email = $1 AND subscribed_channel_email = $2';
            const selectSubscribeResult = await pgCleint.query(selectSubscribeSql, [loginUserEmail, notiEmail]);
            const subscribeData = selectSubscribeResult.rows[0];

            if(subscribeData){
                if(!subscribeData.notification){
                    //UPDATE notification column
                    const updateNotiSql = 'UPDATE shoot.subscribe SET notification = True WHERE subscribe_idx = $1';
                    await pgCleint.query(updateNotiSql, [subscribeData.subscribe_idx]);
                    
                    resolve(1);
                }else{
                    reject({
                        statusCode : 403,
                        message : 'already notification on'
                    });
                }
            }else{
                reject({
                    statusCode : 404,
                    message : 'cannot find subscribe data'
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

const deleteNotificationOn = (loginUserEmail, notiEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgCleint = new Client(pgConfig);
        try{
            await pgCleint.connect();

            //SELECT subscribe
            const selectSubscribeSql = 'SELECT * FROM shoot.subscribe WHERE subscriber_channel_email = $1 AND subscribed_channel_email = $2';
            const selectSubscribeResult = await pgCleint.query(selectSubscribeSql, [loginUserEmail, notiEmail]);
            const subscribeData = selectSubscribeResult.rows[0];

            if(subscribeData){
                if(subscribeData.notification){
                    //UPDATE notification column
                    const updateNotiSql = 'UPDATE shoot.subscribe SET notification = False WHERE subscribe_idx = $1';
                    await pgCleint.query(updateNotiSql, [subscribeData.subscribe_idx]);
                    
                    resolve(1);
                }else{
                    reject({
                        statusCode : 403,
                        message : 'already notification off'
                    });
                }
            }else{
                reject({
                    statusCode : 404,
                    message : 'cannot find subscribe data'
                });   
            }
        }catch(err){
            reject({
                statusCode: 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

module.exports = {
    addNotificationOn : addNotificationOn,
    deleteNotificationOn : deleteNotificationOn,
    getNotificationOn : getNotificationOn
}