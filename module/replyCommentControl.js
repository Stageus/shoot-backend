const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const commentDataValidCheck = require('./commentDataValidCheck');
const { addNotification } = require('./notificationControl');

const getAllReplyComment = (commentIdx,loginUserEmail = '', scroll = 2147483647, size = 20) => {
    return new Promise(async (resolve, reject) => {
        const pgClient =  new Client(pgConfig);

        try{
            await pgClient.connect();

            const selectCommentSql = `SELECT
                                        shoot.reply_comment.reply_comment_idx,
                                        reply_comment_contents,
                                        reply_comment_time,
                                        reply_comment_good_count,

                                        write_channel_email,
                                        profile_img,
                                        name AS channel_name
                                    ${
                                        loginUserEmail ? 
                                      `,CASE 
                                            WHEN 
                                            shoot.reply_comment_good.reply_comment_good_idx is not null
                                            THEN 
                                                true
                                            ELSE 
                                                false
                                        END AS reply_comment_good_state` 
                                        : 
                                        ''
                                    }
                                    FROM
                                        shoot.reply_comment
                                    JOIN
                                        shoot.channel
                                    ON
                                        write_channel_email = shoot.channel.email
                                    LEFT JOIN
                                        shoot.reply_comment_good
                                    ON
                                        shoot.reply_comment.reply_comment_idx = shoot.reply_comment_good.reply_comment_idx 
                                    AND 
                                        shoot.reply_comment_good.email = $2
                                    WHERE
                                        shoot.reply_comment.comment_idx = $1 AND shoot.reply_comment.reply_comment_idx < $3
                                    ORDER BY
                                        shoot.reply_comment.reply_comment_idx DESC
                                    LIMIT ${size}
                                    `;
            const selectCommentResult = await pgClient.query(selectCommentSql, [commentIdx, loginUserEmail, scroll]);

            await pgClient.end();

            resolve(selectCommentResult.rows);
        }catch(err){
            if(pgClient._connected){
                await pgClient.end();
            }

            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

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
            const insertReplyCommentSql = 'INSERT INTO shoot.reply_comment (comment_idx, reply_comment_contents, write_channel_email) VALUES ($1, $2, $3) RETURNING reply_comment_idx';
            const insertReplyCommentResult = await pgClient.query(insertReplyCommentSql, [commentIdx, contents, loginUserEmail]);

            //UPDATE
            const updateCommentSql = 'UPDATE shoot.comment SET reply_comment_count = reply_comment_count + 1 WHERE comment_idx = $1 RETURNING write_channel_email';
            const updateCommentResult = await pgClient.query(updateCommentSql, [commentIdx]);

            if(loginUserEmail !== updateCommentResult.rows[0].write_channel_email){
                console.log('대댓글 추가 알림 생성');
                addNotification(loginUserEmail, {
                    type : 3,
                    notifiedEmail : updateCommentResult.rows[0].write_channel_email,
                    idx : parseInt(insertReplyCommentResult.rows[0].reply_comment_idx)
                });
            }

            //COMMIT
            await pgClient.query('COMMIT');

            await pgClient.end();

            resolve();
        }catch(err){
            if(pgClient._connected){
                await pgClient.query('ROLLBACK');
                await pgClient.end();
            }

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

            await pgClient.end();
        }catch(err){
            if(pgClient._connected){
                await pgClient.query('ROLLBACK');
                await pgClient.end();
            }

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

                    await pgClient.end();

                    resolve(1);
                }else{
                    await pgClient.query('ROLLBACK');

                    await pgClient.end();

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

                        await pgClient.end();

                        resolve(1);
                    }else{
                        await pgClient.query('ROLLBACK');

                        await pgClient.end();
                        
                        reject({
                            statusCode : 403,
                            message : 'no auth'
                        });
                    }
                }else{
                    await pgClient.query('ROLLBACK');
                    
                    await pgClient.end();

                    reject({
                        statusCode : 404,
                        message : 'cannot find reply comment'
                    });
                }
            }
        }catch(err){
            if(pgClient._connected){
                await pgClient.query('ROLLBACK');
                await pgClient.end();
            }

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
    modifyReplyComment : modifyReplyComment,
    getAllReplyComment : getAllReplyComment
}