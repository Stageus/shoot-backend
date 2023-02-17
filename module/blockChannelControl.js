const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addBlockChannel = (loginUserAuthority = 0, blockEmail = '', blockPeriod = 0, blockReason = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        if(loginUserAuthority !== 1){
            reject({
                statusCode : 403,
                message : 'no admin auth'
            });
            return;
        }

        if(blockEmail.length === 0 || blockEmail.length > 320){
            reject({
                statusCode : 400,
                message : 'invalid email'
            });
            return;
        }

        if(blockPeriod === 0){
            reject({
                statusCode : 400,
                message : 'invalid block period'
            });
            return;
        }

        if(blockReason.length > 200){
            reject({
                statusCode : 400,
                message : 'invalid block reason'
            });
            return;
        }

        try{
            await pgClient.connect();

            //INSERT
            const insertBlockSql = 'INSERT INTO shoot.block_channel (block_channel_email, block_reason, block_period) VALUES ($1, $2, $3)';
            await pgClient.query(insertBlockSql, [blockEmail, blockReason, blockPeriod]);

            await pgClient.end();

            resolve(1);
        }catch(err){
            if(pgClient._connected){
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
    addBlockChannel : addBlockChannel
}