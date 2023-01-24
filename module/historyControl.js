const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addHistory = (postIdx, loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        if(loginUserEmail.length === 0){
            reject({
                statusCode : 401,
                message : 'no login'
            });
            return;
        }
        const pgClient = new Client(pgConfig);
        
        try{
            await pgClient.connect();

            if(loginUserEmail.length !== 0){
                //INSERT history
                const insertHistorySql = `INSERT INTO shoot.history 
                                                (channel_email, post_idx) 
                                            VALUES 
                                                ($1, $2)
                                            ON CONFLICT ON CONSTRAINT history_unique
                                            DO UPDATE SET
                                                    view_time = NOW()
                                                WHERE
                                                    shoot.history.channel_email = $1 AND shoot.history.post_idx = $2
                                            `;
                await pgClient.query(insertHistorySql, [loginUserEmail, postIdx]);

                resolve(1);
            }else{
                reject({
                    statusCode : 401,
                    message : 'no login'
                });
            }
        }catch(err){
            if(err.code == 23503){ 
                reject({
                    statusCode : 404,
                    message : 'cannot find post idx'
                });
            }else{
                reject({
                    statusCode : 409,
                    message : 'unexpected error occured'
                });
            }
        }
    });
}

module.exports = {
    addHistory : addHistory
}