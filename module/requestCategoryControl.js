const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const categoryDataValidCheck = require('./categoryDataValidCheck');

const addRequestCategory = (requestCategoryName = '', loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            if(categoryDataValidCheck(requestCategoryName)){
                await pgClient.connect();

                //SELECT category
                const selectCategorySql = 'SELECT * FROM shoot.category WHERE category_name = $1';
                const selectCategoryResult = await pgClient.query(selectCategorySql, [requestCategoryName]);

                if(selectCategoryResult.rowCount === 0){
                    //INSERT
                    const insertReqCategorySql = 'INSERT INTO shoot.request_category (request_category_name, request_channel_email) VALUES ($1, $2)';
                    await pgClient.query(insertReqCategorySql, [requestCategoryName, loginUserEmail]);

                    resolve(1);
                }else{
                    reject({
                        statusCode : 404,
                        message : 'already exists'
                    });
                }
            }else{
                reject({
                    statusCode : 400,
                    message : 'invalid request category'
                });
            }
        }
        catch(err){
            if(err.code == 23505){ //unique error
                reject({
                    statusCode : 403,
                    message : 'cannot request the same category multiple times'
                });
            }else{
                reject({
                    statusCode : 409,
                    message  : 'unexpected error occured',
                    err : err
                });
            }
        }
    });
}

const deleteRequestCategory = (requestCategoryName = '', loginUserAuthority) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured'
            });
        }
    });
}

module.exports = {
    addRequestCategory : addRequestCategory
}