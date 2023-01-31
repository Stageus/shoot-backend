const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const { addNotification } = require('./notificationControl');

const addPostGood = (postIdx = -1, loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        try{
            await pgClient.connect();
            
            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT post good
            const insertPostGoodSql = `INSERT INTO shoot.post_good (post_idx, email) VALUES ($1, $2)`;
            await pgClient.query(insertPostGoodSql, [postIdx, loginUserEmail]);

            //UPDATE post good count
            const updatePostGoodSql = 'UPDATE shoot.post SET post_good_count = post_good_count + 1 WHERE post_idx = $1 RETURNING post_good_count, upload_channel_email';
            const updatePostGoodResult = await pgClient.query(updatePostGoodSql, [postIdx]);

            //update post good count on es
            await esClient.update({
                index : "post",
                id : postIdx,
                body : {
                    doc : {
                        post_good_count : updatePostGoodResult.rows[0].post_good_count,
                    }
                }
            });

            //add notification
            if(loginUserEmail !== updatePostGoodResult.rows[0].upload_channel_email){
                addNotification(loginUserEmail, {
                    type : 0,
                    notifiedEmail : updatePostGoodResult.rows[0].upload_channel_email,
                    idx : parseInt(postIdx)
                });
            }

            //COMMIT
            await pgClient.query('COMMIT');
            
            resolve(1);
        }catch(err){
            await pgClient.query('ROLLBACK');

            if(err.code == 23505){  //unique error
                reject({
                    statusCode : 403,
                    message : 'already good'
                });
                return;
            }else if(err.code == 23503){ //no post-idx error
                reject({
                    statusCode : 404,
                    message : 'cannot find post'
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

const deletePostGood = (postIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        try{
            await pgClient.connect();
            
            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT post good
            const deletePostGoodSql = `DELETE FROM shoot.post_good WHERE post_idx = $1 AND email = $2`;
            const deletePostGoodResult = await pgClient.query(deletePostGoodSql, [postIdx, loginUserEmail]);
            
            if(deletePostGoodResult.rowCount === 0){
                reject({
                    statusCode : 403,
                    message : 'good data does not exist'
                });
            }else{
                //UPDATE post good count
                const updatePostGoodSql = 'UPDATE shoot.post SET post_good_count = post_good_count - 1 WHERE post_idx = $1 RETURNING post_good_count';
                const updatePostGoodResult = await pgClient.query(updatePostGoodSql, [postIdx]);

                //update post good count on es
                await esClient.update({
                    index : "post",
                    id : postIdx,
                    body : {
                        doc : {
                            post_good_count : updatePostGoodResult.rows[0].post_good_count,
                        }
                    }
                });

                //COMMIT
                await pgClient.query('COMMIT');
                
                resolve(1);
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
    addPostGood : addPostGood,
    deletePostGood : deletePostGood
}