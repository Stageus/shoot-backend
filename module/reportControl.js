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
        
        console.log(idxObject, idx, reportType, reportContents);

        try{
            await pgClient.connect();

            if(idxObject === 'post'){
                const selectPostSql = 'SELECT upload_channel_email FROM shoot.post WHERE post_idx = $1';
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
                            reported_post_idx : idx
                        }
                    });

                    resolve(1);
                }else{
                    reject({
                        message : 'cannot find post',
                        statusCode : 404
                    });
                }
            }else if(idxObject === 'channel'){
                const selectChannelSql = 'SELECT email FROM shoot.channel WHERE email = $1';
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
                const selectCommentSql = 'SELECT write_channel_email, post_idx FROM shoot.comment WHERE comment_idx = $1';
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

                            post_idx : selectCommentResult.rows[0].post_idx,
                            reported_comment_idx : idx,
                            reported_channel_email : selectCommentResult.rows[0].write_channel_email,
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
                const selectReplyCommentSql = 'SELECT shoot.reply_comment.write_channel_email, shoot.comment.post_idx, shoot.comment.comment_idx FROM shoot.reply_comment JOIN shoot.comment ON shoot.reply_comment.comment_idx = shoot.comment.comment_idx WHERE shoot.reply_comment.reply_comment_idx = $1';
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

                            post_idx : selectReplyCommentResult.rows[0].post_idx,
                            comment_idx : selectReplyCommentResult.rows[0].comment_idx,
                            reported_reply_comment_idx : idx,
                            reported_channel_email : selectReplyCommentResult.rows[0].write_channel_email,
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

module.exports = {
    addReport : addReport
}
