const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addHistory = (postIdx, loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        if(loginUserEmail.length === 0){
            reject({
                statusCode : 401,
                message : 'no login'
            });
            return;
        }
        const pgClient = new Client(pgConfig);
        
        try{
            await pgClient.connect();

            if(loginUserEmail.length !== 0){
                //INSERT history
                const insertHistorySql = `INSERT INTO shoot.history 
                                                (channel_email, post_idx) 
                                            VALUES 
                                                ($1, $2)
                                            ON CONFLICT ON CONSTRAINT history_unique
                                            DO UPDATE SET
                                                    view_time = NOW()
                                                WHERE
                                                    shoot.history.channel_email = $1 AND shoot.history.post_idx = $2
                                            `;
                await pgClient.query(insertHistorySql, [loginUserEmail, postIdx]);

                resolve(1);
            }else{
                reject({
                    statusCode : 401,
                    message : 'no login'
                });
            }
        }catch(err){
            console.log(err);
            if(err.code == 23503){
                reject({
                    statusCode : 404,
                    message : 'cannot find post idx'
                });
            }else{
                reject({
                    statusCode : 409,
                    message : 'unexpected error occured'
                });
            }
        }
    });
}

const getHistory = (loginUserEmail = '', scroll = -1, size = 2) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
            
        try{    
            await pgClient.connect();

            const getHistorySql = `SELECT
                                            shoot.post.post_idx,
                                            shoot.post.post_title,
                                            shoot.post.post_thumbnail,
                                            shoot.post.post_upload_time,
                                            shoot.post.post_view_count,
                                            shoot.post.post_good_count,

                                            shoot.category.category_idx,
                                            shoot.category.category_name,
                                            
                                            shoot.post.upload_channel_email,
                                            shoot.channel.name AS upload_channel_name,
                                            shoot.channel.profile_img,

                                            shoot.history.view_time
                                        FROM
                                            shoot.history
                                        JOIN
                                            shoot.channel
                                        ON
                                            shoot.history.channel_email = shoot.channel.email
                                        JOIN
                                            shoot.post
                                        ON
                                            shoot.history.post_idx = shoot.post.post_idx
                                        LEFT JOIN
                                            shoot.category
                                        ON
                                            shoot.post.category_idx = shoot.category.category_idx
                                        WHERE
                                            shoot.history.channel_email = $1 ${scroll !== -1 ? `
                                            AND
                                                shoot.history.view_time < (SELECT view_time FROM shoot.history WHERE post_idx = $2)
                                            ` : ''}
                                        ORDER BY
                                            shoot.history.view_time DESC 
                                        LIMIT
                                            ${size}
                                        `
            const getHistoryResult = await pgClient.query(getHistorySql, scroll === -1 ? [loginUserEmail] : [loginUserEmail, scroll]);

            resolve(getHistoryResult.rows);
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
    addHistory : addHistory,
    getHistory : getHistory
}