const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const commentDataValidCheck = require('./commentDataValidCheck');
const { addNotification } = require('./notificationControl');

const getCommentByScroll = (scrollId, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        try{
            await pgClient.connect();

            const searchCommentResult = await esClient.scroll({
                scroll : '3m',
                scroll_id : scrollId,
                ignore : 404
            });

            if(searchCommentResult.status === 404){
                resolve({
                    commentArray : [],
                    scrollId : scrollId
                });
                return;
            }

            const commentArray = [];
            for(commentData of searchCommentResult.hits.hits){
                //SELECT comment
                const selectCommentSql = `SELECT
                                                shoot.comment.comment_idx,
                                                comment_contents,
                                                comment_good_count,
                                                comment_time,
                                                reply_comment_count,

                                                write_channel_email,
                                                profile_img,
                                                name AS channel_name

                                                ${loginUserEmail ? `, CASE 
                                                    WHEN 
                                                        comment_good_idx is not null
                                                    THEN 
                                                        true
                                                    ELSE 
                                                        false
                                                END AS comment_good_state` : ''}
                                            FROM
                                                shoot.comment
                                            JOIN
                                                shoot.channel
                                            ON
                                                write_channel_email = shoot.channel.email
                                            LEFT JOIN
                                                shoot.comment_good
                                            ON
                                                shoot.comment.comment_idx = shoot.comment_good.comment_idx 
                                            AND 
                                                shoot.comment_good.email = $2
                                            WHERE
                                                shoot.comment.comment_idx = $1
                                            `;
                const selectCommentResult = await pgClient.query(selectCommentSql, [commentData._id, loginUserEmail]);
                commentArray.push(selectCommentResult.rows[0]);
            }

            resolve({
                commentArray : commentArray, 
                scrollId : searchCommentResult._scroll_id
            })
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            })
        }
    });
}

const getAllComment = (postIdx, sortby = 'date', size = 20, loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        let sortObj = {};
        if(sortby === 'date'){
            sortObj = {
                _id : {
                    order : 'desc'
                }
            }
        }else if(sortby === 'good'){
            sortObj = {
                comment_good_count : {
                    order : 'desc'
                }
            }
        }else{
            reject({
                statusCode : 400,
                message : 'invalid sortby'
            });
            return;
        }
        
        try{
            await pgClient.connect();

            const searchCommentResult = await esClient.search({
                index : 'comment',
                body : {
                    query : {
                        match : {
                            post_idx : postIdx
                        }
                    },
                    sort : [ sortObj ]
                },
                size : size,
                scroll : '3m'
            });

            const commentArray = [];
            for(commentData of searchCommentResult.hits.hits){
                //SELECT comment
                const selectCommentSql = `SELECT
                                                shoot.comment.comment_idx,
                                                comment_contents,
                                                comment_good_count,
                                                comment_time,
                                                reply_comment_count,

                                                write_channel_email,
                                                profile_img,
                                                name AS channel_name

                                                ${loginUserEmail ? `, CASE 
                                                    WHEN 
                                                        comment_good_idx is not null
                                                    THEN 
                                                        true
                                                    ELSE 
                                                        false
                                                END AS comment_good_state` : ''}
                                            FROM
                                                shoot.comment
                                            JOIN
                                                shoot.channel
                                            ON
                                                write_channel_email = shoot.channel.email
                                            LEFT JOIN
                                                shoot.comment_good
                                            ON
                                                shoot.comment.comment_idx = shoot.comment_good.comment_idx 
                                            AND 
                                                shoot.comment_good.email = $2
                                            WHERE
                                                shoot.comment.comment_idx = $1
                                            `;
                const selectCommentResult = await pgClient.query(selectCommentSql, [commentData._id, loginUserEmail]);
                commentArray.push(selectCommentResult.rows[0]);
            }

            resolve({
                commentArray : commentArray,
                scrollId : searchCommentResult._scroll_id
            });
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            })
        }
    });
}

const addComment = (contents = '', postIdx = '', loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        try{
            if(commentDataValidCheck(contents)){
                await pgClient.connect();

                //BEGIN
                await pgClient.query('BEGIN');

                //INSERT
                const insertCommentSql = 'INSERT INTO shoot.comment (comment_contents, post_idx, write_channel_email) VALUES ($1, $2, $3) RETURNING comment_idx, write_channel_email';
                const insertCommentResult = await pgClient.query(insertCommentSql, [contents, postIdx, loginUserEmail]);

                //UPDATE
                const updatePostSql = 'UPDATE shoot.post SET comment_count = comment_count + 1 WHERE post_idx = $1 RETURNING upload_channel_email';
                const updatePostResult = await pgClient.query(updatePostSql, [postIdx]);

                //ES
                await esClient.index({
                    index : 'comment',
                    id : insertCommentResult.rows[0].comment_idx,
                    body : {
                        comment_good_count : 0,
                        post_idx : postIdx
                    }
                });

                if(updatePostResult.rows[0].upload_channel_email !== loginUserEmail){
                    addNotification(loginUserEmail, {
                        type : 1,
                        notifiedEmail : updatePostResult.rows[0].upload_channel_email,
                        idx : parseInt(insertCommentResult.rows[0].comment_idx)
                    });
                }

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

const modifyComment = (contents = '', commentIdx = -1, loginUserEmail = '', loginUserAuthority = 0) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        //check contents validation
        if(!commentDataValidCheck(contents)){
            reject({
                statusCode : 400,
                message : 'invalid comment contents'
            });
            return;
        }

        try{
            await pgClient.connect();

            //SELECT comment idx
            const selectCommentSql = 'SELECT write_channel_email FROM shoot.comment WHERE comment_idx = $1';
            const selectCommentResult = await pgClient.query(selectCommentSql, [commentIdx]);

            if(selectCommentResult.rows[0]){
                if(selectCommentResult.rows[0].write_channel_email === loginUserEmail || loginUserAuthority == 1){
                    //UPDATE comment contents
                    const updateCommentSql = 'UPDATE shoot.comment SET comment_contents = $1 WHERE comment_idx = $2';
                    await pgClient.query(updateCommentSql, [contents, commentIdx])

                    resolve(1);
                }else{
                    reject({
                        statusCode : 403,
                        message : 'no auth'
                    });
                }
            }else{
                reject({
                    statusCode : 404,
                    message : 'cannot find comment'
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
    deleteComment : deleteComment,
    modifyComment : modifyComment,
    getAllComment : getAllComment,
    getCommentByScroll : getCommentByScroll
}