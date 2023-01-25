const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const getCategoryAll = (size = 5) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //SELECT category
            const selectCategorySql = `SELECT category_idx, category_name, category_time FROM shoot.category ORDER BY category_idx ASC LIMIT ${size}}`;
            const selectCategoryResult = await pgClient.query(selectCategorySql);

            resolve(selectCategoryResult.rows);
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err 
            });
        }
    });
}

const addCategory = (categoryName, loginUserAuthority = 0) => {
    return new Pr
}

module.exports = {
    getCategoryAll : getCategoryAll
}