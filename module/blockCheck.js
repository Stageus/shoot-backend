const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

module.exports = (email) => {
    return new Promise(async (resolve, reject) => {
        const result = {
            state : true
        }

        try{
            //connect
            const pgClient = new Client(pgConfig);
            await pgClient.connect();

            //SELECT
            const selectBlockSql = 'SELECT block_start_time, block_reason, block_period FROM shoot.block_channel WHERE block_channel_email = $1 ORDER BY block_channel_idx DESC';
            const selectBlockResult = await pgClient.query(selectBlockSql, [email]);
            
            if(selectBlockResult.rows.length !== 0){
                const blockPeriod = selectBlockResult.rows[0].block_period;
                const blockStartTime = selectBlockResult.rows[0].block_start_time;
                const blockReason = selectBlockResult.rows[0].block_reason;

                const nowDate = new Date();
                const endTime = new Date(blockStartTime);
                endTime.setSeconds(endTime.getSeconds() + blockPeriod);

                if(nowDate < endTime){
                    result.state = false;
                    result.blockEndTime = endTime;
                    result.blockReason = blockReason;
                }
            }

            resolve(result)
        }catch(err){
            console.log(err);

            reject({
                message : err.message,
                statusCode : 409
            });
        }
    })
}