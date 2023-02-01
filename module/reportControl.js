const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const channelHash = require('../module/channelHash');

const addReport = (loginUserEmail, reportInfo) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        const reportContents = reportInfo.contents;
        const reportType = reportInfo.type || 0;
        const idxObject = reportInfo.object || 'channel';
        const idx = reportInfo.idx || -1;

        if(![0,1,2,3,4,5,6,7,8,9].includes(reportType)){
            reject({
                statusCode : 400,
                message : 'invalid report type'
            });
            return;
        }

        if(reportContents.length > 512){
            reject({
                statusCode : 400,
                message : 'invalid report contents'
            });
            return;
        }

        try{
            await pgClient.connect();

            if(idxObject === 'post'){
                const selectPostSql = 'SELECT upload_channel_email, post_title, post_upload_time, shoot.channel.name FROM shoot.post JOIN shoot.channel ON shoot.post.upload_channel_email = shoot.channel.email WHERE post_idx = $1';
                const selectPostResult = await pgClient.query(selectPostSql, [idx]);
                
                if(selectPostResult.rows.length !== 0){
                    await esClient.index({
                        index : 'report',
                        id : `${channelHash(loginUserEmail)}-${idxObject}-${idx}`,
                        body : {
                            object : 'post',
                            report_channel_email : loginUserEmail,
                            report_contents : reportContents,
                            report_time : new Date(),
                            report_type : reportType,

                            reported_channel_email : selectPostResult.rows[0].upload_channel_email,
                            reported_channel_name : selectPostResult.rows[0].name,
                            reported_post_idx : parseInt(idx),
                            reported_post_title : selectPostResult.rows[0].post_title,
                            reported_post_upload_time : selectPostResult.rows[0].post_upload_time
                        }
                    });

                    console.log(`${channelHash(loginUserEmail)}-${idxObject}-${idx}`);
                    resolve(1);
                }else{
                    reject({
                        message : 'cannot find post',
                        statusCode : 404
                    });
                }
            }else if(idxObject === 'channel'){
                const selectChannelSql = 'SELECT email, creation_time, name FROM shoot.channel WHERE email = $1';
                const selectChannelResult = await pgClient.query(selectChannelSql, [idx]);
                
                if(selectChannelResult.rows.length !== 0){
                    await esClient.index({
                        index : 'report',
                        id : `${channelHash(loginUserEmail)}-${idxObject}-${idx}`,
                        body : {
                            object : 'channel',
                            report_channel_email : loginUserEmail,
                            report_contents : reportContents,
                            report_time : new Date(),
                            report_type : reportType,

                            reported_channel_email : selectChannelResult.rows[0].email,
                            channel_name : selectChannelResult.rows[0].name,
                            channel_creation_time : selectChannelResult.rows[0].creation_time
                        }
                    });

                    resolve(1);
                }else{
                    reject({
                        message : 'cannot find channel',
                        statusCode : 404
                    });
                }
            }else if(idxObject === 'comment'){
                const selectCommentSql = 'SELECT shoot.comment.write_channel_email, shoot.comment.post_idx, shoot.comment.comment_contents, shoot.channel.name, shoot.comment.comment_time FROM shoot.comment JOIN shoot.channel ON shoot.comment.write_channel_email = shoot.channel.email WHERE comment_idx = $1';
                const selectCommentResult = await pgClient.query(selectCommentSql, [idx]);
                
                if(selectCommentResult.rows.length !== 0){
                    await esClient.index({
                        index : 'report',
                        id : `${channelHash(loginUserEmail)}-${idxObject}-${idx}`,
                        body : {
                            object : 'comment',
                            report_channel_email : loginUserEmail,
                            report_contents : reportContents,
                            report_time : new Date(),
                            report_type : reportType,

                            post_idx : parseInt(selectCommentResult.rows[0].post_idx),
                            reported_comment_idx : parseInt(idx),
                            reported_comment_contents : selectCommentResult.rows[0].comment_contents,
                            reported_comment_write_time : selectCommentResult.rows[0].comment_time,

                            reported_channel_email : selectCommentResult.rows[0].write_channel_email,
                            reported_channel_name : selectCommentResult.rows[0].name
                        }
                    });

                    resolve(1);
                }else{
                    reject({
                        message : 'cannot find comment',
                        statusCode : 404
                    });
                }
            }else if(idxObject === 'reply_comment'){
                const selectReplyCommentSql = `SELECT 
                                                    shoot.reply_comment.write_channel_email, 
                                                    shoot.comment.post_idx, 
                                                    shoot.comment.comment_idx,
                                                    shoot.reply_comment.reply_comment_contents,
                                                    shoot.reply_comment.reply_comment_time,
                                                    shoot.channel.name
                                                FROM 
                                                    shoot.reply_comment 
                                                JOIN 
                                                    shoot.comment
                                                ON 
                                                    shoot.reply_comment.comment_idx = shoot.comment.comment_idx 
                                                JOIN
                                                    shoot.channel
                                                ON
                                                    shoot.reply_comment.write_channel_email = shoot.channel.email
                                                WHERE 
                                                    shoot.reply_comment.reply_comment_idx = $1`;
                const selectReplyCommentResult = await pgClient.query(selectReplyCommentSql, [idx]);
                
                if(selectReplyCommentResult.rows.length !== 0){
                    await esClient.index({
                        index : 'report',
                        id : `${channelHash(loginUserEmail)}-${idxObject}-${idx}`,
                        body : {
                            object : 'reply_comment',
                            report_channel_email : loginUserEmail,
                            report_contents : reportContents,
                            report_time : new Date(),
                            report_type : reportType,

                            post_idx : parseInt(selectReplyCommentResult.rows[0].post_idx),
                            comment_idx : parseInt(selectReplyCommentResult.rows[0].comment_idx),
                            reported_reply_comment_idx : parseInt(idx),
                            reported_reply_comment_contents : selectReplyCommentResult.rows[0].reply_comment_contents,
                            reported_reply_comment_write_time : selectReplyCommentResult.rows[0].reply_comment_time,

                            reported_channel_email : selectReplyCommentResult.rows[0].write_channel_email,
                            reported_channel_name : selectReplyCommentResult.rows[0].name
                        }
                    });

                    resolve(1);
                }else{
                    reject({
                        message : 'cannot find reply comment',
                        statusCode : 404
                    });
                }
            }else{
                reject({
                    message : 'invalid object',
                    statusCode : 400
                });
            }
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            })
        }
    });
}

const getAllReport = (loginUserAuthority = 0, groupby, scroll = 0, size = 20) => {
    return new Promise(async (resolve , reject) => {
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        if(loginUserAuthority !== 1){
            reject({
                statusCode : 403,
                message : 'no admin auth'
            });
            return;
        }

        try{
            if(groupby === 'channel'){
                const searchResult = await esClient.search({
                    index : 'report',
                    body : {
                        query : {
                            bool : {
                                must : [
                                    {
                                        match : {
                                            'object.keyword' : groupby
                                        }
                                    }
                                ]
                            }
                        },
                        aggs : {
                            group_by_reported_channel : {
                                terms : {
                                    field : 'reported_channel_email.keyword',
                                    size : size
                                },
                                aggs : {
                                    channel_creation_time : {
                                        top_hits : {
                                            size : 1,
                                            sort : [
                                                {
                                                    report_time : 'desc'
                                                }
                                            ]
                                        }
                                    }
                                }
                            },
                        }
                    }
                });
                
                resolve({
                    report : searchResult.aggregations.group_by_reported_channel.buckets.map((data) => {
                        return {
                            reported_channel_email : data.key,
                            reported_channel_creation_time : data.channel_creation_time.hits.hits[0]._source.channel_creation_time,
                            reported_channel_name : data.channel_creation_time.hits.hits[0]._source.channel_name,
                            report_count : data.doc_count
                        }
                    })
                });
            }else if(groupby === 'post'){
                const searchResult = await esClient.search({
                    index : 'report',
                    body : {
                        query : {
                            bool : {
                                must : [
                                    {
                                        match : {
                                            'object.keyword' : 'post'
                                        }
                                    }
                                ]
                            }
                        },
                        aggs : {
                            group_by_reported_post : {
                                terms : {
                                    field : 'reported_post_idx',
                                    size : size
                                },
                                aggs : {
                                    channel_creation_time : {
                                        top_hits : {
                                            size : 1,
                                            sort : [
                                                {
                                                    report_time : 'desc'
                                                }
                                            ]
                                        }
                                    }
                                }
                            },
                        }
                    },
                    size : 100
                });
                
                resolve({
                    report : searchResult.aggregations.group_by_reported_post.buckets.map((data) => {
                        return {
                            reported_post_idx : data.key,
                            reported_post_title : data.channel_creation_time.hits.hits[0]._source.reported_post_title,
                            reported_post_upload_time : data.channel_creation_time.hits.hits[0]._source.reported_post_upload_time,

                            reported_channel_email : data.channel_creation_time.hits.hits[0]._source.reported_channel_email,
                            reported_channel_name : data.channel_creation_time.hits.hits[0]._source.reported_channel_name,

                            report_count : data.doc_count
                        }
                    })
                });
            }else if(groupby === 'comment'){
                const searchResult = await esClient.search({
                    index : 'report',
                    body : {
                        query : {
                            bool : {
                                must : [
                                    {
                                        match : {
                                            'object.keyword' : 'comment'
                                        }
                                    }
                                ]
                            }
                        },
                        aggs : {
                            group_by_reported_channel : {
                                terms : {
                                    field : 'reported_comment_idx',
                                    size : size
                                },
                                aggs : {
                                    channel_creation_time : {
                                        top_hits : {
                                            size : 1,
                                            sort : [
                                                {
                                                    report_time : 'desc'
                                                }
                                            ]
                                        }
                                    }
                                }
                            },
                        }
                    }
                });
                
                resolve({
                    report : searchResult.aggregations.group_by_reported_channel.buckets.map((data) => {
                        const topCommentData = data.channel_creation_time.hits.hits[0]._source;
    
                        return {
                            post_idx : topCommentData.post_idx,
                            reported_comment_idx : data.key,
                            reported_comment_contents : topCommentData.reported_comment_contents,
                            reported_comment_write_time : topCommentData.reported_comment_write_time,
    
                            reported_channel_email : topCommentData.reported_channel_email,
                            reported_channel_name : topCommentData.reported_channel_name,
    
                            report_count : data.doc_count, 
                        }
                    }),
                    scrollId : searchResult._scroll_id
                });
            }else if(groupby === 'reply-comment'){
                const searchResult = await esClient.search({
                    index : 'report',
                    body : {
                        query : {
                            bool : {
                                must : [
                                    {
                                        match : {
                                            'object.keyword' : 'reply_comment'
                                        }
                                    }
                                ]
                            }
                        },
                        aggs : {
                            group_by_reported_channel : {
                                terms : {
                                    field : 'reported_reply_comment_idx',
                                    size : size
                                },
                                aggs : {
                                    channel_creation_time : {
                                        top_hits : {
                                            size : 1,
                                            sort : [
                                                {
                                                    report_time : 'desc'
                                                }
                                            ]
                                        }
                                    }
                                }
                            },
                        }
                    },
                    size : size
                });
                
                resolve({
                    report : searchResult.aggregations.group_by_reported_channel.buckets.map((data) => {
                        const topReplyCommentData = data.channel_creation_time.hits.hits[0]._source
    
                        return {
                            post_idx : topReplyCommentData.post_idx,
                            comment_idx : topReplyCommentData.comment_idx,
                            reported_reply_comment_idx : data.key,
                            reported_reply_comment_contents : topReplyCommentData.reported_reply_comment_contents,
                            reported_reply_comment_write_time : topReplyCommentData.reported_reply_comment_write_time,
    
                            reported_channel_email : topReplyCommentData.reported_channel_email,
                            reported_channel_name : topReplyCommentData.reported_channel_name,
    
                            report_count : data.doc_count,
                        }
                    }),
                    scrollId : searchResult._scroll_id
                });
            }else{
                reject({
                    statusCode : 400,
                    message : 'invalid parameter'
                });
            }
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            })
        }
    });
}

module.exports = {
    addReport : addReport,
    getAllReport : getAllReport
}
