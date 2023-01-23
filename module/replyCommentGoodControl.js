const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addReplyCommentGood = (replyCommentIdx = -1, loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT reply comment good
            const insertReplyCommentGoodSql = 'INSERT INTO shoot.reply_comment_good (reply_comment_idx, email) VALUES ($1, $2)';
            await pgClient.query(insertReplyCommentGoodSql, [replyCommentIdx, loginUserEmail]);

            //UPDATE reply commnt
            const updateReplyCommentSql = 'UPDATE shoot.reply_comment SET reply_comment_good_count = reply_comment_good_count + 1 WHERE reply_comment_idx = $1';
            await pgClient.query(updateReplyCommentSql, [replyCommentIdx]);

            //COMMIT
            await pgClient.query('COMMIT');

            resolve(1);
        }catch(err){
            await pgClient.query('ROLLBACK');

            if(err.code == 23505){
                reject({
                    statusCode : 403,
                    message : 'already good'
                });
            }else if(err.code == 23503){ //no reply-comment
                reject({
                    statusCode : 404,
                    message : 'cannot find reply comment'
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

const deleteReplyCommentGood = (replyCommentIdx = -1, loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //DELETE
            const deleteReplyCommentGoodSql = 'DELETE FROM shoot.reply_comment_good WHERE reply_comment_idx = $1 AND email = $2';
            const deleteReplyCommentGoodResult = await pgClient.query(deleteReplyCommentGoodSql, [replyCommentIdx, loginUserEmail]);

            if(deleteReplyCommentGoodResult.rowCount !== 0){
                //UPDATE
                const updateReplyCommentSql = 'UPDATE shoot.reply_comment SET reply_comment_good_count = reply_comment_good_count - 1 WHERE reply_comment_idx = $1';
                await pgClient.query(updateReplyCommentSql, [replyCommentIdx]);

                //COMMIT
                await pgClient.query('COMMIT');

                resolve(1);
            }else{
                await pgClient.query('ROLLBACK');
                
                reject({
                    statusCode : 403,
                    message : 'good data does not exist'
                });
            }
        }catch(err){
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
    addReplyCommentGood : addReplyCommentGood,
    deleteReplyCommentGood : deleteReplyCommentGood
}