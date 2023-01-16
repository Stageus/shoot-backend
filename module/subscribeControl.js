const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const getSubscribeState = (subscriberEmail, subscribedEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        try{
            await pgClient.connect();
            
            //SELECT
            const selectSql = 'SELECT * FROM shoot.subscribe WHERE subscriber_channel_email = $1 AND subscribed_channel_email = $2';
            const selectResult = await pgClient.query(selectSql, [subscriberEmail, subscribedEmail]);

            if(selectResult.rows.length === 0){
                resolve({
                    state : false
                })
            }else{
                resolve({
                    state : true,
                    subsribe_time : selectResult.rows[0].subscribe_time
                })
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

module.exports = {
    getSubscribeState : getSubscribeState,
}