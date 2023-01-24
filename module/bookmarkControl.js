const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addBookmark = (postIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //INSERT
            const insertBookmarkSql = 'INSERT INTO shoot.bookmark (post_idx, email) VALUES ($1, $2)';
            await pgClient.query(insertBookmarkSql, [postIdx, loginUserEmail]);

            resolve(1);
        }catch(err){
            if(err.code == 23505){ //unique error
                reject({
                    statusCode : 403,
                    message : 'already bookmark' 
                });
            }else if(err.code == 23503){
                reject({
                    statusCode : 404,
                    message : 'cannot find post'
                })
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

const deleteBookmark = (postIdx = -1, loginUserEmail = '') => {
    if(postIdx === -1 || loginUserEmail === '') return;
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //DELETE
            const deleteBookmarkSql = 'DELETE FROM shoot.bookmark WHERE post_idx = $1 AND email = $2';
            const deleteBookmarkResult = await pgClient.query(deleteBookmarkSql, [postIdx, loginUserEmail]);

            if(deleteBookmarkResult.rowCount !== 0){
                resolve(1);
            }else{
                reject({
                    statusCode : 403,
                    message : 'bookmark data does not exist'
                })
            }
        }catch(err){
            reject({
                sttausCode : 409,
                message : 'unexpected error occrued',
                err : err
            });
        }
    });
}

module.exports = {
    addBookmark : addBookmark,
    deleteBookmark : deleteBookmark
}