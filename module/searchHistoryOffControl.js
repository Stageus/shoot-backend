const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addSearchHistoryOff = (loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //INSERT
            const insertHistoryOffSql = 'INSERT INTO shoot.search_history_off (channel_email) VALUES ($1)';
            await pgClient.query(insertHistoryOffSql, [loginUserEmail]);

            resolve(1);
        }catch(err){
            if(err.code == 23505){
                reject({
                    statusCode : 403,
                    message : 'already off'
                });
            }else{
                reject({
                    statusCode : 409,
                    message : 'unexpected error occured',
                    err : err
                });
            }
        }
    }); 
}



module.exports = {
    addSearchHistoryOff : addSearchHistoryOff
}