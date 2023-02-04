const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const getAllTopHashtag = (categoryIdx) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //SELECT hashtag group by hashtag name
            const selectHashtagSql = `SELECT 
                                            hashtag_name AS name
                                        FROM
                                            shoot.hashtag
                                        JOIN
                                            shoot.post
                                        ON
                                            shoot.post.post_idx = shoot.hashtag.post_idx
                                        JOIN
                                            shoot.category
                                        ON
                                            shoot.category.category_idx = shoot.post.category_idx
                                        WHERE
                                            shoot.post.category_idx = $1
                                        GROUP BY
                                            shoot.hashtag.hashtag_name
                                        ORDER BY
                                            COUNT(*) DESC
                                        LIMIT
                                            5
                                        `;
            const selectHashtagResult = await pgClient.query(selectHashtagSql, [categoryIdx]);

            resolve(selectHashtagResult.rows);
        }catch(err){
            reject({
                message : 'unexpected error occured',
                statusCode : 409,
                err : err
            });
        }
    });
}

module.exports = {
    getAllTopHashtag : getAllTopHashtag
}