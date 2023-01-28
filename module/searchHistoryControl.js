const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const searchHistoryDataValidCheck = require('../module/searchHistoryDataValidCheck');

const addSearchHistory = (searchKeyword = '', loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        if(searchHistoryDataValidCheck(searchKeyword)){
            try{
                await pgClient.connect();
                
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

module.exports = {
    addSearchHistory : addSearchHistory
}