const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const { addNotification } = require('./notificationControl');

const addCommentGood = (commentIdx = -1, loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        try{
            await pgClient.connect();
            
            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT comment good
            const insertCommentGoodSql = `INSERT INTO shoot.comment_good (comment_idx, email) VALUES ($1, $2)`;
            await pgClient.query(insertCommentGoodSql, [commentIdx, loginUserEmail]);

            //UPDATE comment good count
            const updateCommentGoodSql = 'UPDATE shoot.comment SET comment_good_count = comment_good_count + 1 WHERE comment_idx = $1 RETURNING comment_good_count, write_channel_email';
            const updateCommentGoodResult = await pgClient.query(updateCommentGoodSql, [commentIdx]);

            //update comment good count on es
            await esClient.update({
                index : "comment",
                id : commentIdx ,
                body : {
                    doc : {
                        comment_good_count : updateCommentGoodResult.rows[0].comment_good_count,
                    }
                }
            });

            if(updateCommentGoodResult.rows[0].write_channel_email !== loginUserEmail){
                addNotification(loginUserEmail, {
                    type : 2,
                    notifiedEmail : updateCommentGoodResult.rows[0].write_channel_email,
                    idx : parseInt(commentIdx)
                });
            }

            //COMMIT
            await pgClient.query('COMMIT');

            await pgClient.end();
            
            resolve(1);
        }catch(err){
            if(pgClient._connected){
                await pgClient.query('ROLLBACK');
                await pgClient.end();
            }

            if(err.code == 23505){  //unique error
                reject({
                    statusCode : 403,
                    message : 'already good'
                });
                return;
            }else if(err.code == 23503){ //no comment-idx error
                reject({
                    statusCode : 404,
                    message : 'cannot find comment'
                });
                return;
            }

            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const deleteCommentGood = (commentIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        try{
            await pgClient.connect();
            
            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT comment good
            const deleteCommentGoodSql = `DELETE FROM shoot.comment_good WHERE comment_idx = $1 AND email = $2`;
            const deleteCommentGoodResult = await pgClient.query(deleteCommentGoodSql, [commentIdx, loginUserEmail]);
            
            if(deleteCommentGoodResult.rowCount === 0){
                reject({
                    statusCode : 403,
                    message : 'do not have good record'
                });
            }else{
                //UPDATE comment good count
                const updateCommentGoodSql = 'UPDATE shoot.comment SET comment_good_count = comment_good_count - 1 WHERE comment_idx = $1 RETURNING comment_good_count';
                const updateCommentGoodResult = await pgClient.query(updateCommentGoodSql, [commentIdx]);

                //update comment good count on es
                await esClient.update({
                    index : "comment",
                    id : commentIdx,
                    body : {
                        doc : {
                            comment_good_count : updateCommentGoodResult.rows[0].comment_good_count,
                        }
                    }
                });

                //COMMIT
                await pgClient.query('COMMIT');
                
                resolve(1);
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

module.exports = {
    addCommentGood : addCommentGood,
    deleteCommentGood : deleteCommentGood
}