const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addPost = (postData) => {
    return new Promise(async (resolve, reject) => {
        //connect es
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        })

        //connect psql
        const pgClient = new Client(pgConfig);

        try{    
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT shoot.post
            let insertPostSql = '';
            let insertPostDataArray = [];
            if(postData.thumbnail){
                insertPostSql = 'INSERT INTO shoot.post (post_title, post_type, post_video, upload_channel_email, post_description, post_thumbnail, category_idx) VALUES ( $1, $2, $3, $4, $5, $6, $7) RETURNING post_idx';
                insertPostDataArray = [postData.title, postData.postType, postData.video, postData.email, postData.description, postData.thumbnail, postData.categoryIdx];
            }else{
                insertPostSql = 'INSERT INTO shoot.post (post_title, post_type, post_video, upload_channel_email, post_description, category_idx) VALUES ( $1, $2, $3, $4, $5, $6) RETURNING post_idx';
                insertPostDataArray = [postData.title, postData.postType, postData.video, postData.email, postData.description, postData.categoryIdx];
            }
            const insertPostResult = await pgClient.query(insertPostSql, insertPostDataArray);
            const postIdx = insertPostResult.rows[0].post_idx;
            
            //INSERT contents
            if(postData.postType == 2){
                for(voteData in postData.vote){
                    //INSERT vote
                    const insertVoteSql = 'INSERT INTO shoot.post_contents_vote (vote_contents, post_idx) VALUES ($1, $2)';
                    await pgClient.query(insertVoteSql, [voteData, postIdx]);
                }
            }else if(postData.postType == 3){
                for(linkData in postData.link){
                    //INSERT link
                    const insertLinkSql = 'INSERT INTO shoot.post_contents_link (link_name, link_url, post_idx) VALUES ($1, $2, $3)';
                    await pgClient.query(insertLinkSql, [linkData.name, linkData.url, postIdx]);
                }
            }
            
            //index elasticsearch
            await esClient.index({
                index : 'post',
                id : postIdx,
                body : {
                    post_title : postData.title,
                    upload_channel_email : postData.email,
                    category_idx : postData.categoryIdx,
                    hashtag : postData.hashtag
                }
            })

            //COMMIT
            await pgClient.query('COMMIT');

            resolve(1);
        }catch(err){
            await pgClient.query('ROLLBACK');

            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            })
        }
    })
}

//삭제 예정?
const deletePostByChannelEmail = (uploadChannelEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        const esClient = elastic.Client({
            node : "http://localhost:9200"
        })
        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //DELETE
            const deleteSql = 'UPDATE shoot.post SET delete_time = $1 WHERE upload_channel_email = $2';
            await pgClient.query(deleteSql, [new Date(), uploadChannelEmail]);
            
            //delete on es
            await esClient.delete({
                
            })
        }catch(err){
            reject({
                message : 'unexpected error occured',
                statusCode : 409,
                err : err
            })
        }
    })
}

module.exports = {
    addPost : addPost,
}