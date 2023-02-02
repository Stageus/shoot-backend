const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const categoryDataValidCheck = require('./categoryDataValidCheck');

const getCategoryAll = (size = 5) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //SELECT category
            const selectCategorySql = `SELECT category_idx, category_name, category_time FROM shoot.category ORDER BY category_idx ASC LIMIT ${size}`;
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
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        
        //check validation
        if(loginUserAuthority !== 1){
            reject({
                statusCode : 403,
                message : 'no admin auth'
            });
            return;
        }

        if(categoryDataValidCheck(categoryName)){
            try{
                await pgClient.connect();

                //SELECT count
                const selectCountSql = 'SELECT (SELECT COUNT(*) FROM shoot.category) < 5 AS count_state';
                const selectCountResult = await pgClient.query(selectCountSql);
            
                if(selectCountResult.rows.count_state){
                    //INSERT
                    const insertCategorySql = 'INSERT INTO shoot.category (category_name) VALUES ($1)';
                    await pgClient.query(insertCategorySql, [categoryName]);

                    resolve(1);
                }else{
                    reject({
                        statusCode : 404,
                        message : 'cannot have more than 5 category'
                    });
                }
            }catch(err){
                if(err.code == 23505){
                    reject({
                        statusCode : 405,
                        message : 'already have category' 
                    });
                }else{
                    reject({
                        statusCode : 409,
                        message : 'unexpected error occured',
                        err : err
                    });
                }
            }
        }else{
            reject({
                statusCode : 400,
                message : 'invalid category'
            })
        }
    });
}

const deleteCategory = (categoryIdx = -1, loginUserAuthority = 0) => {
    return new Promise(async (resolve, reject) => {
        if(categoryIdx == -1){
            reject({
                statusCode : 404,
                message : 'cannot find category'
            });
            return;
        }

        if(loginUserAuthority === 1){
            const pgClient = new Client(pgConfig);
            try{
                await pgClient.connect();

                //DELETE 
                const deleteCategorySql = 'DELETE FROM shoot.category WHERE category_idx = $1';
                const deleteCategoryResult = await pgClient.query(deleteCategorySql, [categoryIdx]);

                if(deleteCategoryResult.rowCount !== 0){
                    resolve(1);
                }else{
                    reject({
                        statusCode : 404,
                        message : 'cannot find category'
                    }); 
                }
            }catch(err){
                reject({
                    statusCode : 409,
                    message : 'unexpected error occured',
                    err : err
                });
            }
        }else{
            reject({
                statusCode : 403,
                message : 'no admin auth'
            });
        }
    });
}

module.exports = {
    getCategoryAll : getCategoryAll,
    addCategory : addCategory,
    deleteCategory : deleteCategory
}