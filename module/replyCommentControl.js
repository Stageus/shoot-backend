const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const commentDataValidCheck = require('./commentDataValidCheck');

const addReplyComment = (contents, commentIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        if(!commentDataValidCheck(contents)){
            reject({
                statusCode : 400,
                message : 'invalid reply comment contents'
            })
        }

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT
            const insertReplyCommentSql = 'INSERT INTO shoot.reply_comment (comment_idx, reply_comment_contents, write_channel_email) VALUES ($1, $2, $3)';
            await pgClient.query(insertReplyCommentSql, [commentIdx, contents, loginUserEmail]);

            //UPDATE
            const updateCommentSql = 'UPDATE shoot.comment SET reply_comment_count = reply_comment_count + 1 WHERE comment_idx = $1';
            await pgClient.query(updateCommentSql, [commentIdx]);

            //COMMIT
            await pgClient.query('COMMIT');

            resolve();
        }catch(err){
            await pgClient.query('ROLLBACK');

            if(err.code == 23503){
                reject({
                    statusCode : 404,
                    message : 'cannot find comment'
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
    addReplyComment : addReplyComment   
}