const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const elastic = require('elasticsearch');
const channelHash = require('../module/channelHash');

const getAllNotification = (notifiedUserEmail, size = 10) => {
    return new Promise(async (resolve, reject) => {
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'            
        });

        try{
            const searchResult = await esClient.search({
                index : 'notification',
                body : {
                    query : {
                        match : {
                            notified_email : notifiedUserEmail
                        }
                    },
                    sort : [
                        {
                            notification_time : 'DESC'
                        }
                    ]
                },
                size : size,
                scroll : '3m'
            });

            resolve({
                notification : searchResult.hits.hits.map((noti) => noti._source),
                scrollId : searchResult._scroll_id
            });
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const addNotification = (notifyEmail, notiInfo) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'            
        });

        const notiType = notiInfo.type;
        const notiTime = new Date();
        const notifiedEmail = notiInfo.notifiedEmail;
        const idx = notiInfo.idx || -1;

        const indexData = {
            notification_type : notiType,
            notification_time : notiTime,
            notified_email : notifiedEmail,
            notify_email : notifyEmail,
            read_state : false,
        };

        try{
            await pgClient.connect();

            if([0,1,2,3,4].includes(notiType)){
                const notiOffType = [0, 0, 1, 1, 2];

                //prepare idx data
                if(notiType === 0){
                    indexData.post_idx = idx;
                }else if(notiType === 1 || notiType === 2){
                    //SELECT post_idx
                    const selectPostSql = 'SELECT post_idx FROM shoot.comment WHERE comment_idx = $1';
                    const selectPostResult = await pgClient.query(selectPostSql, [idx]);

                    if(selectPostResult.rows[0]){
                        indexData.comment_idx = idx;
                        indexData.post_idx = selectPostResult.rows[0].post_idx;
                    }else{
                        resolve(1);
                        return;
                    }
                }else if(notiType === 3 || notiType === 4){
                    //SELECT post_idx, comment_idx
                    const selectCommentSql = 'SELECT shoot.comment.post_idx, shoot.comment.comment_idx FROM shoot.reply_comment JOIN shoot.comment ON shoot.comment.comment_idx = shoot.reply_comment.comment_idx WHERE reply_comment_idx = $1';
                    const selectCommentResult = await pgClient.query(selectCommentSql, [idx]);

                    if(selectCommentResult.rows[0]){
                        indexData.reply_comment_idx = idx;
                        indexData.comment_idx = selectCommentResult.rows[0].comment_idx
                        indexData.post_idx = selectCommentResult.rows[0].post_idx;
                    }else{
                        resolve(1);
                        return;
                    }
                }

                //SELECT notification off
                const selectNotiOffSql = 'SELECT * FROM shoot.notification_off WHERE email = $1 AND type = $2 AND idx = $3';
                const selectNotiOffResult = await pgClient.query(selectNotiOffSql, [notifiedEmail, notiOffType[notiType], idx]);

                if(!selectNotiOffResult.rows[0]){
                    await esClient.index({
                        index : 'notification',
                        id : `${notiType}-${channelHash(notifiedEmail)}-${channelHash(notifyEmail)}-${idx}`,
                        body : indexData
                    });
                }

                resolve(1);
            }else if(notiType ==  5){
                await esClient.index({
                    index : 'notification',
                    id : `${notiType}-${channelHash(notifiedEmail)}-${channelHash(notifyEmail)}`,
                    body : indexData
                });
                
                resolve(1);
            }else if(notiType == 6){
                addPostUploadNoti(notifyEmail, idx);

                resolve(1);
            }
        }catch(err){
            console.log(err);

            resolve(1);
        }
    });
}

const addPostUploadNoti = (uploadChannelEmail, postIdx) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'            
        });

        try{
            await pgClient.connect();

            let subscribeIdx = -1;
            
            while(true){
                //SELECT subscribe 
                const selectSubscribeSql = 'SELECT subscribe_idx, subscriber_channel_email, subscribed_channel_email FROM shoot.subscribe WHERE subscribed_channel_email = $1 AND notification = True AND subscribe_idx > $2 ORDER BY subscribe_idx ASC LIMIT 100';
                const selectSubscribeResult = await pgClient.query(selectSubscribeSql, [uploadChannelEmail, subscribeIdx]);

                if(selectSubscribeResult.rows.length === 0){
                    break;
                }else{
                    subscribeIdx = selectSubscribeResult.rows[selectSubscribeResult.rows.length - 1].subscribe_idx;
                }

                for(subscribeData of selectSubscribeResult.rows){
                    esClient.index({
                        index : 'notification',
                        id : `${6}-${channelHash(subscribeData.subscriber_channel_email)}-${channelHash(uploadChannelEmail)}`,
                        body : {
                            notification_type : 6,
                            notification_time : new Date(),
                            notified_email : subscribeData.subscriber_channel_email,
                            notify_email : uploadChannelEmail,
                            read_state : false,
                            post_idx : postIdx
                        }
                    });
                }
            }

            resolve(1);
        }catch(err){
            console.log(err);
        }
    });
}

module.exports = { 
    addNotification : addNotification,
    getAllNotification : getAllNotification
}