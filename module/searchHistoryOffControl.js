const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const getSearchHistoryOffState = (loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //SELECT
            const selectHistoryOffSql = 'SELECT * FROM shoot.search_history_off WHERE channel_email = $1';
            const selectHistoryOffResult = await pgClient.query(selectHistoryOffSql, [loginUserEmail]);

            if(selectHistoryOffResult.rows.length === 0){
                resolve({ state : true });
            }else{
                resolve({ state : false });
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

const deleteSearchHistoryOff = (loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //DELETE history off
            const deleteSearchHistoryOffSql = 'DELETE FROM shoot.search_history_off WHERE channel_email = $1';
            const deleteSearchHistoryOffResult = await pgClient.query(deleteSearchHistoryOffSql, [loginUserEmail]);

            if(deleteSearchHistoryOffResult.rowCount !== 0){
                resolve(1);
            }else{
                reject({
                    statusCode : 403,
                    message : 'already on'
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
    addSearchHistoryOff : addSearchHistoryOff,
    deleteSearchHistoryOff : deleteSearchHistoryOff,
    getSearchHistoryOffState : getSearchHistoryOffState
}