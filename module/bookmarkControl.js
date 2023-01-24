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

module.exports = {
    addBookmark : addBookmark
}