const elastic = require('elasticsearch');
const { Client } = require('pg');
const redis = require('redis').createClient();
const pgConfig = require('../config/psqlConfig');
const channelDataValidCheck = require('./channelDataValidCheck');
const passwordHash = require('./passwordHash');
const verifyToken = require('../module/verifyToken');
const AWS = require('aws-sdk');
const awsConfig = require('../config/awsConfig');

const addChannel = (channelData, loginType = 'local') => {
    return new Promise(async (resolve, reject) => {
        const { email, pw, birth, sex, channelName, imgName } = channelData;

        if(!channelDataValidCheck(channelData).state){
            return reject({
                statusCode : 400,
                message : 'invalid channel data'
            })
        }

        const pgClient = new Client(pgConfig);
        const esClient = elastic.Client({
            node : "http://localhost:9200"
        });

        try{
            //connect psql
            await pgClient.connect();
            await pgClient.query('BEGIN');

            //check email already exists
            const selectData = await pgClient.query('SELECT * FROM shoot.channel WHERE email = $1', [email]);
            if(selectData.rows.length >=  1){
                reject({
                    statusCode : 409,
                    message : 'this email already exists'
                })
                return;
            }

            if(loginType !== 'local'){
                //check email auth
                await redis.connect();
                const authState = await redis.exists(`certified_email_${email}_${loginType}`);
                if(!authState){
                    await redis.disconnect();
                    reject({
                        message : 'no email is being authenticated',
                        statusCode : 403
                    });
                    return;
                }

                //delete email auth state on redis
                await redis.del(`certified_email_${email}_${loginType}`);
                await redis.disconnect();
                
                //prepare sql
                let insertSql = '';
                let insertArray = [];
                if(!imgName){
                    insertSql = 'INSERT INTO shoot.channel (email, pw, name, sex, birth, login_type) VALUES ($1, $2, $3, $4, $5)'
                    insertArray = [email, passwordHash(pw), channelName, sex, birth];
                }else{
                    insertSql = 'INSERT INTO shoot.channel (email, pw, name, sex, birth, login_type, profile_img) VALUES ($1, $2, $3, $4, $5, $6)'
                    insertArray = [email, passwordHash(pw), channelName, sex, birth, loginType,imgName];
                }

                //INSERT psql
                await pgClient.query(insertSql, insertArray);

                //index elasticsearch
                const esClient = elastic.Client({
                    node : "http://localhost:9200"
                });
                await esClient.index({
                    index : 'channel',
                    id : email,
                    body : {
                        name : channelName,
                        login_type : loginType
                    }
                });
            }else{
                //check email auth
                await redis.connect();
                const authState = await redis.exists(`certified_email_${email}`);
                if(!authState){
                    await redis.disconnect();
                    reject({
                        message : 'no email is being authenticated',
                        statusCode : 403
                    });
                    return;
                }

                //delete email auth state on redis
                await redis.del(`certified_email_${email}`);
                await redis.disconnect();
                
                //prepare sql
                let insertSql = '';
                let insertArray = [];
                if(!imgName){
                    insertSql = 'INSERT INTO shoot.channel (email, pw, name, sex, birth) VALUES ($1, $2, $3, $4, $5)'
                    insertArray = [email, passwordHash(pw), channelName, sex, birth];
                }else{
                    insertSql = 'INSERT INTO shoot.channel (email, pw, name, sex, birth, profile_img) VALUES ($1, $2, $3, $4, $5, $6)'
                    insertArray = [email, passwordHash(pw), channelName, sex, birth, imgName];
                }

                //INSERT psql
                await pgClient.query(insertSql, insertArray);

                await esClient.index({
                    index : 'channel',
                    id : email,
                    body : {
                        name : channelName
                    }
                });
            }
            
            //COMMIT
            await pgClient.query('COMMIT');
            
            resolve(1);
        }catch(err){
            console.log(err);

            await pgClient.query('ROLLBACK');

            if(redis.isOpen){
                await redis.disconnect();
            }

            reject({
                message : 'unexpected error occured',
                statusCode : 409
            });
        }
    })
}

const getChannel = (channelEamil, loginUserEmail = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        try{
            await pgClient.connect();

            const selectChannelSql = 'SELECT email, name, birth, sex, authority, creation_time, description, profile_img, subscribe_count FROM shoot.channel WHERE email = $1';
            const selectChannelResult = await pgClient.query(selectChannelSql, [channelEamil]);

            if(selectChannelResult.rows.length === 0){
                reject({
                    message : 'cannot find channel',
                    statusCode : 404
                })
            }else{
                const channelData = selectChannelResult.rows[0];

                if(loginUserEmail.length !== 0){
                    //SELECT subscribe
                    const selectSubscribeSql = 'SELECT * FROM shoot.subscribe WHERE subscriber_channel_email = $1 AND subscribed_channel_email = $2';
                    const selectSubscribeResult = await pgClient.query(selectSubscribeSql, [loginUserEmail, channelEamil]);

                    channelData.subscribe_state = selectSubscribeResult.rows[0] !== undefined;
                }

                resolve(channelData);
            }
        }catch(err){
            reject({
                message : 'unexpected error occured',
                statusCode : 409,
                err : err
            })
        }
    })
}

const getAllChannel = (searchKeyword, scrollId = undefined, size = 30) => {
    return new Promise(async (resolve, reject) => {
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        })

        try{
            //check index
            const exitsResult = await esClient.indices.exists({
                index : 'channel',
            });
            if(!exitsResult || searchKeyword === "" && !scrollId){
                reject({
                    message : 'query error',
                    statusCode : 400
                })
            }

            let searchResult = {};
            if(!scrollId){
                //SEARCH
                searchResult = await esClient.search({
                    index : 'channel',
                    body : {
                        query : {
                            bool : {
                                must : [
                                    {
                                        wildcard : {
                                            name : `*${searchKeyword}*`
                                        }
                                    }
                                ]
                            }
                        }, 
                        size : size
                    },
                    scroll : '3m'
                })
            }else{
                searchResult = await esClient.scroll({
                    scroll : '3m',
                    scroll_id : scrollId
                })
            }
            
            resolve({
                scrollId : searchResult._scroll_id,
                data : searchResult.hits.hits.map((hit) => {
                    return {
                        email : hit._id,
                        name : hit._source.name
                    }
                })
            })
        }catch(err){
            const rejectObj = {
                err : err
            }

            if(err.status === 400){
                rejectObj.statusCode = 400;
                rejectObj.message = 'wrong scroll id';
            }else{
                rejectObj.statusCode = 409;
                rejectObj.message = 'unexpected error occured';
            }

            reject(rejectObj);
        }
    })
}

const modifyChannel = (loginUserEmail, channelData) => {
    return new Promise(async (resolve, reject) => {
        AWS.config.update(awsConfig);
        const s3 = new AWS.S3();
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        const modifyChannelImg = channelData.channelImg || '';
        const modifyChannelName = channelData.channelName || '';
        const modifyDescription = channelData.description || '';
        const modifyBirth = channelData.birth;
        const modifySex = channelData.sex;

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //SELECT profile img 
            const selectChannelSql = 'SELECT profile_img FROM shoot.channel WHERE email = $1';
            const selectChannelResult = await pgClient.query(selectChannelSql, [loginUserEmail]);

            //UPDATE name,sex,birth,description
            const updateObj = {};
            if(modifyChannelImg.length === 0){
                updateObj.sql = `UPDATE
                                            shoot.channel
                                        SET
                                            name = $1,
                                            sex = $2,
                                            birth = $3,
                                            description = $4
                                        WHERE
                                            email = $5
                                        `;
                updateObj.dataArray = [modifyChannelName, modifySex, modifyBirth, modifyDescription, loginUserEmail];
            }else{
                updateObj.sql = `UPDATE
                                    shoot.channel
                                SET
                                    name = $1,
                                    sex = $2,
                                    birth = $3,
                                    description = $4,
                                    profile_img = $5
                                WHERE
                                    email = $6
                                `;
                updateObj.dataArray = [modifyChannelName, modifySex, modifyBirth, modifyDescription, modifyChannelImg, loginUserEmail];
            }
            await pgClient.query(updateObj.sql, updateObj.dataArray);
            
            //delete channel profile img on s3
            if(selectChannelResult.rows[0].profile_img && modifyChannelImg){
                await s3.deleteObject({
                    Bucket: 'jochong/channel_img', 
                    Key: selectChannelResult.rows[0].profile_img
                }).promise();
            }

            //update es
            await esClient.index({
                index : 'channel',
                id : loginUserEmail,
                body : {
                    name : modifyChannelName
                }
            });

            //COMMIT
            await pgClient.query('COMMIT');

            resolve(1);
        }catch(err){
            //ROLLBACK
            await pgClient.query('ROLLBACK');

            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const modifyPw = (loginUserEmail = '', pwData = {}) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        const modifyPw = pwData.pw;
        const modifyPwCheck = pwData.pwCheck

        //pw valid check
        const pwExp = new RegExp('^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$');
        if(!pwExp.test(modifyPw)){
            reject({
                statusCode : 400,
                message : "invalid password"
            });
            return;
        }

        //pwCheck valid check
        if(modifyPw !== modifyPwCheck){
            reject({
                statusCode : 400,
                message : "invalid password check"
            });
            return;
        }

        try{
            await pgClient.connect();

            await redis.connect();

            const authState = await redis.exists(`certified_email_${loginUserEmail}`);

            if(authState){
                //UPDATE channel
                const updateSql = 'UPDATE shoot.channel SET pw = $1 WHERE email = $2';
                await pgClient.query(updateSql, [passwordHash(modifyPw), loginUserEmail]);

                await redis.del(`certified_email_${loginUserEmail}`);

                await redis.disconnect();

                resolve(1);
            }else{
                await redis.disconnect();
                
                reject({
                    statusCode : 403,
                    message : 'no auth'
                });
            }
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occureed',
                err : err
            });
        }
    });
}

const deleteChannel = (deleteEmail, token) => {
    return new Promise(async (resolve, reject) => {
        AWS.config.update(awsConfig);
        const s3 = new AWS.S3();
        const pgClient = new Client(pgConfig);
        const esClient = elastic.Client({
            node : "http://localhost:9200"
        });

        const verify = verifyToken(token);

        if(verify.state){
            const loginUserEmail = verify.email;
            const loginUserAuthority = verify.authority;
            try{
                await pgClient.connect();

                //SELECT login user email and authority
                const selectSql = 'SELECT email, authority, profile_img FROM shoot.channel WHERE email = $1';
                const selectResult = await pgClient.query(selectSql, [deleteEmail]);

                //check email existence
                if(selectResult.rows.length === 0){
                    reject({
                        message : 'cannot find channel',
                        statusCode : 404
                    });
                    return;
                }

                //check delete channel authority
                if(selectResult.rows[0].authority === 1){
                    reject({
                        message : 'cannot delete admin account',
                        auth : 403
                    });
                    return;
                }

                //check authority
                if(loginUserEmail === deleteEmail || loginUserAuthority === 1){
                    //BEGIN
                    await pgClient.query('BEGIN');

                    if(selectResult.rows[0].profile_img){
                        //delete channel profile img on s3
                        await s3.deleteObject({
                            Bucket: 'jochong/channel_img', 
                            Key: selectResult.rows[0].profile_img
                        }).promise();
                    }

                    //delete post on elasticsearch
                    await esClient.deleteByQuery({
                        index : 'post',
                        body : {
                            query : {
                                match : {
                                    upload_channel_email : deleteEmail
                                }
                            }
                        }
                    });

                    //delete comment on elasticsearch
                    await esClient.deleteByQuery({
                        index : 'comment',
                        body : {
                            query : {
                                match : {
                                    write_channel_email : deleteEmail
                                }
                            }
                        }
                    });
                    
                    //delete channel on elasticsearch
                    await esClient.delete({
                        index : 'channel',
                        id : deleteEmail
                    });

                    //DELETE channel
                    const deleteChannelQuery = 'DELETE FROM shoot.channel WHERE email = $1';
                    await pgClient.query(deleteChannelQuery, [deleteEmail]);

                    //COMMIT
                    await pgClient.query('COMMIT');

                    resolve(1);
                }else{
                    reject({
                        message : 'no auth',
                        statusCode : 403
                    })
                }
            }catch(err){
                await pgClient.query('ROLLBACK');

                reject({
                    message : 'unexpected error occured',
                    statusCode : 409,
                    err : err
                })
            }
        }else{
            reject({
                message : 'no login',
                statusCode : 401
            });
        }
    })
}

module.exports = {
    addChannel : addChannel,
    getChannel : getChannel,
    getAllChannel : getAllChannel,
    deleteChannel : deleteChannel,
    modifyChannel : modifyChannel,
    modifyPw : modifyPw
}