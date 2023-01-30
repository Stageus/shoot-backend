const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addNotificationOff = (loginUserEmail = '', type = 'post', idx = -1) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        const typeCode = {
            post : 0,
            comment : 1,
            reply_comment : 2
        }

        try{
            if(typeCode[type] !== undefined){
                await pgClient.connect();

                //SELECT
                const selectSql = `SELECT * FROM shoot.${type} WHERE ${type}_idx = $1`;
                const selectResult = await pgClient.query(selectSql, [idx]);
                const selectData = selectResult.rows[0];

                console.log(selectData.upload_channel_email);

                if(selectData?.upload_channel_email === loginUserEmail || selectData?.write_channel_email === loginUserEmail){
                    //INSERT notification off
                    const insertNotiOffSql = 'INSERT INTO shoot.notification_off (type, idx, email) VALUES ($1, $2, $3)';
                    await pgClient.query(insertNotiOffSql, [typeCode[type], idx, loginUserEmail]);

                    resolve(1);
                }else{
                    reject({
                        statusCode : 404,
                        message : `cannot find ${type}`
                    });  
                }
            }else{
                reject({
                    statusCode : 400,
                    message : 'invalid type'
                });
            }
        }catch(err){
            if(err.code == 23505){
                reject({
                    statusCode : 403,
                    message : 'notification already off'
                });
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
    addNotificationOff : addNotificationOff
}