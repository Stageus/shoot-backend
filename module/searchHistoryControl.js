const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const searchHistoryDataValidCheck = require('../module/searchHistoryDataValidCheck');

const addSearchHistory = (searchKeyword = '', loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        if(searchHistoryDataValidCheck(searchKeyword)){
            try{
                await pgClient.connect();

                //SELECT search history off
                const selectHistoryOffSql = 'SELECT * FROM shoot.search_history_off WHERE channel_email = $1';
                const selectHistoryOffResult = await pgClient.query(selectHistoryOffSql, [loginUserEmail]);

                if(selectHistoryOffResult.rows.length === 0){
                    //SELECT search history
                    const selectHistorySql = 'SELECT * FROM shoot.search_history WHERE channel_email = $1 ORDER BY search_keyword_idx DESC';
                    const selectHistoryResult = await pgClient.query(selectHistorySql, [loginUserEmail]);

                    //DELETE duplicate history, last history
                    const keywordIndex = selectHistoryResult.rows.map(history => history.search_keyword).indexOf(searchKeyword);
                    if(keywordIndex !== -1){
                        const deleteHistorySql = 'DELETE FROM shoot.search_history WHERE search_keyword_idx = $1';
                        await pgClient.query(deleteHistorySql, [selectHistoryResult.rows[keywordIndex].search_keyword_idx]);
                    }else if(selectHistoryResult.rows.length === 5){
                        const deleteHistorySql = 'DELETE FROM shoot.search_history WHERE search_keyword_idx = $1';
                        await pgClient.query(deleteHistorySql, [selectHistoryResult.rows[4].search_keyword_idx]);
                    }

                    //INSERT
                    const insertHistorySql = 'INSERT INTO shoot.search_history (search_keyword, channel_email) VALUES ($1, $2)';
                    await pgClient.query(insertHistorySql, [searchKeyword, loginUserEmail]);
                }

                resolve(1);
            }catch(err){
                reject({
                    statusCode : 409,
                    message : 'unexpected error occured',
                    err : err
                });
            }
        }else{
            reject({
                statusCode : 400,
                message : 'invalid keyword'
            });
        }
    });
}

const getAllSearchHistory = (loginUserEmail = '', size = 5) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();
            
            //SELECT search history
            const selectSearchHistorySql = 'SELECT search_keyword_idx, search_keyword AS keyword FROM shoot.search_history WHERE channel_email = $1 ORDER BY search_keyword_idx DESC';
            const selectSearchHistoryResult = await pgClient.query(selectSearchHistorySql, [loginUserEmail]);

            resolve(selectSearchHistoryResult.rows);
        }catch(err){
            reject({
                statusCode: 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const deleteSearchHistory = (searchHistoryIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //DELETE search history
            const deleteSearchHistorySql = 'DELETE FROM shoot.search_history WHERE search_keyword_idx = $1 RETURNING channel_email';
            const deleteSearchHistoryResult = await pgClient.query(deleteSearchHistorySql, [searchHistoryIdx]);

            if(deleteSearchHistoryResult.rows[0].channel_email){
                if(deleteSearchHistoryResult.rows[0].channel_email === loginUserEmail){
                    //COMMIT
                    await pgClient.query('COMMIT');

                    resolve(1);
                }else{
                    //ROLLBACK
                    await pgClient.query('ROLLBACK');

                    reject({
                        statusCode : 403,
                        message : 'no auth'
                    });
                }
            }else{
                reject({
                    statusCode : 404,
                    message : 'cannot find search history'
                });
            }
        }catch(err){
            //ROLLBACK
            await pgClient.query('ROLLBACK');
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            })
        }
    });
}

module.exports = {
    addSearchHistory : addSearchHistory,
    getAllSearchHistory : getAllSearchHistory,
    deleteSearchHistory : deleteSearchHistory
}