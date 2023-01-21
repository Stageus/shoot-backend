const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const commentDataValidCheck = require('./commentDataValidCheck');

const addComment = (contents = '', postIdx = '', loginUserEmail ='') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            if(commentDataValidCheck(contents)){
                await pgClient.connect();

                //BEGIN
                await pgClient.query('BEGIN');

                //INSERT
                const insertCommentSql = 'INSERT INTO shoot.comment (comment_contents, post_idx, write_channel_email) VALUES ($1, $2, $3)';
                await pgClient.query(insertCommentSql, [contents, postIdx, loginUserEmail]);

                //UPDATE
                const updatePostSql = 'UPDATE shoot.post SET comment_count = comment_count + 1 WHERE post_idx = $1';
                await pgClient.query(updatePostSql, [postIdx]);

                //COMMIT
                await pgClient.query('COMMIT');
                
                resolve(1);
            }else{
                reject({
                    statusCode : 400,
                    message : 'invalid comment contents'
                });
            }
        }catch(err){
            if(err.code == 23503){
                reject({
                    statusCode : 404,
                    message : 'cannot find post',
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

const deleteComment = (commentIdx, loginUserEmail, loginUserAuthority = 0) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        
        try{
            await pgClient.connect();

            if(loginUserAuthority == 1){
                const deleteCommentSql = 'DELETE FROM shoot.comment WHERE comment_idx = $1';
                const deleteCommentResult = await pgClient.query(deleteCommentSql, [commentIdx]);

                if(deleteCommentResult.rowCount === 0){
                    reject({
                        statusCode : 404,
                        message : 'cannot find comment'
                    });
                }else{
                    resolve(1);
                }
            }else{
                const deleteCommentSql = 'DELETE FROM shoot.comment WHERE comment_idx = $1 AND write_channel_email = $2';
                const deleteCommentResult = await pgClient.query(deleteCommentSql, [commentIdx, loginUserEmail]);

                if(deleteCommentResult.rowCount === 0){
                    reject({
                        statusCode : 403,
                        message : 'no auth'
                    });
                }else{
                    resolve(1);
                }
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
    addComment : addComment,
    deleteComment : deleteComment
}