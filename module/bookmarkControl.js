const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addBookmark = (postIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //INSERT
            const insertBookmarkSql = 'INSERT INTO shoot.bookmark (post_idx, email)';
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured'
            });
        }
    });
}

module.exports = {
    addBookmark : addBookmark
}