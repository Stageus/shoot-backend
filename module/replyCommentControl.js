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
            });
            return;
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

const modifyReplyComment = (contents, replyCommentIdx, loginUserEmail, loginUserAuthority = 0) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        if(!commentDataValidCheck(contents)){
            reject({
                statusCode : 400,
                message : 'invalid reply comment contents'
            });
            return;
        }

        try{
            await pgClient.connect();

            await pgClient.query('BEGIN');
            
            //UPDATE reply comment
            const updateReplyCommentSql = 'UPDATE shoot.reply_comment SET reply_comment_contents = $1 WHERE reply_comment_idx = $2 RETURNING write_channel_email';
            const updateReplyCommentResult = await pgClient.query(updateReplyCommentSql, [contents, replyCommentIdx]);

            if(updateReplyCommentResult.rows[0]){
                if(updateReplyCommentResult.rows[0].write_channel_email === loginUserEmail || loginUserAuthority == 1){
                    await pgClient.query('COMMIT');

                    resolve(1);
                }else{
                    await pgClient.query('ROLLBACK');

                    reject({
                        statusCode : 403,
                        message : 'no auth'
                    });
                }
            }else{
                await pgClient.query('ROLLBACK');

                reject({
                    statusCode : 404,
                    message : 'cannot find reply comment'
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

const deleteReplyCommnet = (replyCommentIdx, loginUserEmail, loginUserAuthority = 0) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');
            
            if(loginUserAuthority == 1){
                //DELETE reply_comment
                const deleteReplyCommentSql = 'DELETE FROM shoot.reply_comment WHERE reply_comment_idx = $1 RETURNING comment_idx';
                const deleteReplyCommentResult = await pgClient.query(deleteReplyCommentSql, [replyCommentIdx]);

                if(deleteReplyCommentResult.rows[0]){
                    const commentIdx = deleteReplyCommentResult.rows[0].comment_idx;

                    //UPDATE comment count
                    const updateReplyCommenSql = 'UPDATE shoot.comment SET reply_comment_count = reply_comment_count - 1 WHERE comment_idx = $1';
                    await pgClient.query(updateReplyCommenSql, [commentIdx]);

                    //COMMIT
                    await pgClient.query('COMMIT');

                    resolve(1);
                }else{
                    await pgClient.query('ROLLBACK');

                    reject({
                        statusCode : 404,
                        message : 'cannot find reply comment'
                    });
                }
            }else{
                //DELETE reply_comment
                const deleteReplyCommentSql = 'DELETE FROM shoot.reply_comment WHERE reply_comment_idx = $1 RETURNING comment_idx, write_channel_email';
                const deleteReplyCommentResult = await pgClient.query(deleteReplyCommentSql, [replyCommentIdx]);

                if(deleteReplyCommentResult.rows[0]){
                    if(deleteReplyCommentResult.rows[0].write_channel_email === loginUserEmail){
                        const commentIdx = deleteReplyCommentResult.rows[0].comment_idx;

                        //UPDATE
                        const updateCommentSql = 'UPDATE shoot.comment SET reply_comment_count = reply_comment_count - 1 WHERE comment_idx = $1';
                        await pgClient.query(updateCommentSql, [commentIdx]);

                        //COMMIT
                        await pgClient.query('COMMIT');
                        resolve(1);
                    }else{
                        await pgClient.query('ROLLBACK');
                        
                        reject({
                            statusCode : 403,
                            message : 'no auth'
                        });
                    }
                }else{
                    await pgClient.query('ROLLBACK');

                    reject({
                        statusCode : 404,
                        message : 'cannot find reply comment'
                    });
                }
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
    addReplyComment : addReplyComment,
    deleteReplyCommnet : deleteReplyCommnet,
    modifyReplyComment : modifyReplyComment
}