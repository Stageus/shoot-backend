const elastic = require('elasticsearch');
const { Client, Pool } = require('pg');
const redis = require('redis').createClient();
const pgConfig = require('../config/psqlConfig');
const channelDataValidCheck = require('./channelDataValidCheck');
const passwordHash = require('./passwordHash');
const verifyToken = require('../module/verifyToken');

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

                //index elasticsearch
                const esClient = elastic.Client({
                    node : "http://localhost:9200"
                });
                await esClient.index({
                    index : 'channel',
                    id : email,
                    body : {
                        name : channelName
                    }
                })
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

const getChannel = (channelEamil) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        try{
            await pgClient.connect();

            const selectChannelSql = 'SELECT name, birth, sex, authority, creation_time, description, profile_img FROM shoot.channel WHERE email = $1';
            const selectChannelResult = await pgClient.query(selectChannelSql, [channelEamil]);

            if(selectChannelResult.rows.length === 0){
                reject({
                    message : 'cannot find channel',
                    statusCode : 404
                })
            }else{
                const channelData = selectChannelResult.rows[0];

                resolve({
                    email : channelEamil,
                    name : channelData.name,
                    birth : channelData.birth,
                    sex : channelData.sex,
                    authority : channelData.int,
                    creation_time : channelData.creation_time,
                    description : channelData.description,
                    profile_img : channelData.profile_img
                });
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
        //connect es
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

const deleteChannel = (deleteEmail, token) => {
    return new Promise(async (resolve, reject) => {
        const verify = verifyToken(token);

        if(verify.state){
            const loginUserEmail = verify.email;
            try{
                const pgClient = new Client(pgConfig);
                await pgClient.connect();

                const esClient = elastic.Client({
                    node : "http://localhost:9200"
                });

                //SELECT login user email and authority
                const selectSql = 'SELECT email, authority FROM shoot.channel WHERE email = $1';
                const selectResult = await pgClient.query(selectSql, [deleteEmail]);

                console.log(deleteEmail);
                //check email existence
                if(selectResult.rows.length === 0){
                    reject({
                        message : 'cannot find channel',
                        statusCode : 404
                    });
                    return;
                }

                //check authority
                const loginUserAuthority = selectResult.rows[0].authority;
                if(loginUserEmail === deleteEmail || loginUserAuthority === 1){
                    //BEGIN
                    await pgClient.query('BEGIN');

                    //DELETE post
                    const updatePostQuery = 'UPDATE shoot.post SET delete_time = $1 WHERE upload_channel_email = $2';
                    await pgClient.query(updatePostQuery, [deleteEmail]);

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

                    //DELETE comment
                    const deleteCommentQuery = 'DELETE FROM shoot.comment WHERE wirte_channel_email = $1';
                    const deleteCommentResult = await pgClient.query(deleteCommentQuery, [deleteEmail]);
                    console.log(deleteCommentResult.rows);

                    //DELETE channel
                    const deleteChannelQuery = 'DELETE FROM shoot.channel WHERE email = $1';
                    await pgClient.query(deleteChannelQuery, [deleteEmail]);
                    
                    //delete channel on elasticsearch
                    await esClient.delete({
                        index : 'channel',
                        id : deleteEmail
                    });

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
    deleteChannel : deleteChannel
}