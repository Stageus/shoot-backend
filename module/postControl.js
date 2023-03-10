const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const verifyToken = require('../module/verifyToken');
const AWS = require('aws-sdk');
const awsConfig = require('../config/awsConfig');
const postDataValidCheck = require('./postDataValidCheck');
const { addNotification } = require('./notificationControl');

const getPostAll = (sortby = 'date', orderby = 'desc', size = 20) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        //prepare sort object for searching elastcisearch
        const sortObj = {};
        if(sortby === 'good'){
            sortObj['post_good_count'] = orderby;
        }else{
            sortObj['post_upload_time'] = orderby;
        }
        
        try{
            await pgClient.connect();

            //search post on es
            const searchResult = await esClient.search({
                index : 'post',
                body : {
                    sort : [sortObj]
                },
                size : size,
                scroll : '3m'
            });

            //SELECT post
            const postArray = [];
            for(postData of searchResult.hits.hits){
                //SELECT post
                const selectPostSql = `SELECT 
                                            post_idx,
                                            post_title,
                                            post_thumbnail,
                                            post_upload_time,
                                            post_view_count,
                                            post_good_count,

                                            shoot.category.category_idx,
                                            category_name,

                                            upload_channel_email,
                                            name AS channel_name,
                                            profile_img
                                        FROM
                                            shoot.post
                                        LEFT JOIN
                                            shoot.category
                                        ON
                                            shoot.post.category_idx = shoot.category.category_idx
                                        JOIN
                                            shoot.channel
                                        ON 
                                            upload_channel_email = email
                                        WHERE
                                            post_idx = $1
                                    `
                const selectPostResult = await pgClient.query(selectPostSql, [postData._id]);
                postArray.push(selectPostResult.rows[0]);
            }

            resolve({
                postArray : postArray,
                scrollId : searchResult._scroll_id
            });
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    })
}

const getPostByPostIdx = (postIdx, token = "") => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            //connect
            await pgClient.connect();

            //verify token
            const verify = verifyToken(token);
            const loginUserEmail = verify ? verify.email : undefined;
            
            //SELECT post
            const selectPostSql = `SELECT 
                                        post_idx,
                                        post_title,
                                        post_description,
                                        post_video,
                                        post_thumbnail,
                                        name AS upload_channel_name,
                                        upload_channel_email,
                                        profile_img,
                                        post_upload_time,
                                        post_type,
                                        post_good_count,
                                        post_view_count,
                                        comment_count,
                                        shoot.post.category_idx,
                                        category_name
                                    FROM 
                                        shoot.post 
                                    LEFT JOIN 
                                        shoot.channel 
                                    ON 
                                        email = upload_channel_email 
                                    LEFT JOIN
                                        shoot.category
                                    ON
                                        shoot.post.category_idx = shoot.category.category_idx
                                    WHERE 
                                        post_idx = $1
                                    `;
            const selectPostRresult = await pgClient.query(selectPostSql, [postIdx]);
            const resolveData = selectPostRresult.rows[0];

            if(resolveData){
                //SELECT hashtag
                const selectHashtagSql = 'SELECT * FROM shoot.hashtag WHERE post_idx = $1';
                const selectHashtagResult = await pgClient.query(selectHashtagSql, [postIdx]);
                resolveData.hashtag = selectHashtagResult.rows.map(hashtagData => hashtagData.hashtag_name);

                if(resolveData.post_type == 2){
                    //SELECT vote
                    const selectVoteSql = 'SELECT * FROM shoot.post_contents_vote WHERE post_idx = $1';
                    const selectVoteResult = await pgClient.query(selectVoteSql, [postIdx]);
                    const vote = [];

                    //SELECT vote state
                    for(voteData of selectVoteResult.rows){
                        let voteState = undefined;

                        if(loginUserEmail){
                            const selectVoteChannelSql = 'SELECT * FROM shoot.vote_channel WHERE vote_idx = $1 AND email = $2';
                            const selectVoteChannelResult = await pgClient.query(selectVoteChannelSql, [voteData.vote_idx, loginUserEmail]);
                            
                            voteState = selectVoteChannelResult.rows.length !== 0;
                        }       

                        vote.push({
                            vote_idx : voteData.vote_idx,
                            vote_contents : voteData.vote_contents,
                            vote_count : voteData.vote_count,
                            vote_state : voteState
                        });
                    }

                    resolveData.vote = vote;
                }else if(resolveData.post_type == 3){
                    //SELECT link
                    const selectLinkSql = 'SELECT link_idx, link_name, link_url FROM shoot.post_contents_link WHERE post_idx = $1';
                    const selectLinkResult = await pgClient.query(selectLinkSql, [postIdx]);

                    resolveData.link = selectLinkResult.rows;
                }

                if(loginUserEmail){
                    //SELECT good
                    const selectGoodSql = 'SELECT * FROM shoot.post_good WHERE email = $1 AND post_idx = $2';
                    const selectGoodResult = await pgClient.query(selectGoodSql, [loginUserEmail, postIdx]);
                    resolveData.good_state = selectGoodResult.rows.length !== 0;

                    //SELECT history
                    const selectHistorySql = 'SELECT * FROM shoot.bookmark WHERE email = $1 AND post_idx = $2';
                    const selectHistoryResult = await pgClient.query(selectHistorySql, [loginUserEmail, postIdx]);
                    resolveData.bookmark_state = selectHistoryResult.rows.length !== 0;

                    //SELECT subscribe
                    const selectSubsribeSql = 'SELECT * FROM shoot.subscribe WHERE subscriber_channel_email = $1 AND subscribed_channel_email = $2'
                    const selectSubsribeResult = await pgClient.query(selectSubsribeSql, [loginUserEmail, resolveData.upload_channel_email]);
                    resolveData.subscribe_state = selectSubsribeResult.rows.length !== 0;
                }

                resolve(resolveData);
            }else{
                reject({
                    message : 'cannot find post with post-idx',
                    statusCode : 404
                })
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

const getPostByScrollId = (scrollId = '') => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        try{
            await pgClient.connect();

            const searchResult = await esClient.scroll({
                scroll : '3m',
                scroll_id : scrollId
            });

            const postArray = [];
            for(postData of searchResult.hits.hits){
                //SELECT post
                const selectPostSql = `SELECT 
                                            post_idx,
                                            post_title,
                                            post_thumbnail,
                                            post_upload_time,
                                            post_view_count,
                                            post_good_count,

                                            shoot.category.category_idx,
                                            category_name,

                                            upload_channel_email,
                                            name AS channel_name,
                                            profile_img
                                        FROM
                                            shoot.post
                                        LEFT JOIN
                                            shoot.category
                                        ON
                                            shoot.post.category_idx = shoot.category.category_idx
                                        JOIN
                                            shoot.channel
                                        ON 
                                            upload_channel_email = email
                                        WHERE
                                            post_idx = $1
                                    `
                const selectPostResult = await pgClient.query(selectPostSql, [postData._id]);
                postArray.push(selectPostResult.rows[0]);
            }

            resolve({
                postArray : postArray,
                scrollId : searchResult._scroll_id
            });
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    })
}

const getPostByMatch = (matchType, match = '', sortby = 'date', orderby = 'desc', size = 20) => {
    return new Promise(async (resolve, reject) => {
        //check sortby
        if(!(sortby === 'date' || sortby === 'good')){
            reject({
                statusCode : 400,
                message : 'invalid sortby'
            });
            return; 
        }

        //check orderby
        if(!(orderby === 'desc' || orderby === 'asc')){
            reject({
                statusCode : 400,
                message : 'invalid orderby'
            });
            return;
        }

        //check match length
        if(match.length === 0){
            reject({
                statusCode : 400,
                message : 'invalid match keyword'
            });
        }

        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });
        
        try{
            await pgClient.connect();

            //prepare sort object for searching elastcisearch
            const sortObj = {};
            if(sortby === 'good'){
                sortObj['post_good_count'] = orderby;
            }else{
                sortObj['post_upload_time'] = orderby;
            }

            if(matchType === 'category'){
                //SELECT category idx
                const selectCategorySql = 'SELECT category_idx FROM shoot.category WHERE category_name = $1';
                const selectCategoryResult = await pgClient.query(selectCategorySql, [match]);
                if(selectCategoryResult.rows[0]){
                    const { category_idx } = selectCategoryResult.rows[0];

                    //search post on es
                    const searchResult = await esClient.search({
                        index : 'post',
                        body : {
                            query : {
                                bool : {
                                    filter : [
                                        {
                                            match : {
                                                'category_idx.keyword' : category_idx
                                            }
                                        }
                                    ]
                                }
                            },
                            sort : [sortObj]
                        },
                        size : size,
                        scroll : '3m',
                    });
                    
                    //SELECT post
                    const postArray = [];
                    for(postData of searchResult.hits.hits){
                        //SELECT post
                        const selectPostSql = `SELECT 
                                                    post_idx,
                                                    post_title,
                                                    post_thumbnail,
                                                    post_upload_time,
                                                    post_view_count,
                                                    post_good_count,

                                                    shoot.category.category_idx,
                                                    category_name,

                                                    upload_channel_email,
                                                    name AS channel_name,
                                                    profile_img
                                                FROM
                                                    shoot.post
                                                LEFT JOIN
                                                    shoot.category
                                                ON
                                                    shoot.post.category_idx = shoot.category.category_idx
                                                JOIN
                                                    shoot.channel
                                                ON 
                                                    upload_channel_email = email
                                                WHERE
                                                    post_idx = $1
                                            `
                        const selectPostResult = await pgClient.query(selectPostSql, [postData._id]);
                        postArray.push(selectPostResult.rows[0]);
                    }

                    resolve({
                        postArray : postArray,
                        scrollId : searchResult._scroll_id
                    });
                }else{
                    resolve({
                        postArray : [],
                        scrollId : ''
                    });
                }
            }else if(matchType === 'channel'){
                //search post on es
                const searchResult = await esClient.search({
                    index : 'post',
                    body : {
                        query : {
                            bool : {
                                filter : [
                                    {
                                        match : {
                                            'upload_channel_email.keyword' : match
                                        }
                                    }
                                ]
                            }
                        },
                        sort : [sortObj]
                    },
                    size : size,
                    scroll : '3m'
                });

                //SELECT post
                const postArray = [];
                for(postData of searchResult.hits.hits){
                    //SELECT post
                    const selectPostSql = `SELECT 
                                                post_idx,
                                                post_title,
                                                post_thumbnail,
                                                post_upload_time,
                                                post_view_count,
                                                post_good_count,

                                                shoot.category.category_idx,
                                                category_name,

                                                upload_channel_email,
                                                name AS channel_name,
                                                profile_img
                                            FROM
                                                shoot.post
                                            LEFT JOIN
                                                shoot.category
                                            ON
                                                shoot.post.category_idx = shoot.category.category_idx
                                            JOIN
                                                shoot.channel
                                            ON 
                                                upload_channel_email = email
                                            WHERE
                                                post_idx = $1
                                        `
                    const selectPostResult = await pgClient.query(selectPostSql, [postData._id]);
                    postArray.push(selectPostResult.rows[0]);
                }

                resolve({
                    postArray : postArray,
                    scrollId : searchResult._scroll_id
                });
            }else if(matchType === 'hashtag'){
                //search post on es
                const searchResult = await esClient.search({
                    index : 'post',
                    body : {
                        query : {
                            bool : {
                                filter : [
                                    {
                                        match : {
                                            hashtag : match
                                        }
                                    }
                                ]
                            }
                        },
                        sort : [sortObj]
                    },
                    size : size,
                    scroll : '3m'
                });

                //SELECT post
                const postArray = [];
                for(postData of searchResult.hits.hits){
                    //SELECT post
                    const selectPostSql = `SELECT 
                                                post_idx,
                                                post_title,
                                                post_thumbnail,
                                                post_upload_time,
                                                post_view_count,
                                                post_good_count,

                                                shoot.category.category_idx,
                                                category_name,

                                                upload_channel_email,
                                                name AS channel_name,
                                                profile_img
                                            FROM
                                                shoot.post
                                            LEFT JOIN
                                                shoot.category
                                            ON
                                                shoot.post.category_idx = shoot.category.category_idx
                                            JOIN
                                                shoot.channel
                                            ON 
                                                upload_channel_email = email
                                            WHERE
                                                post_idx = $1
                                        `
                    const selectPostResult = await pgClient.query(selectPostSql, [postData._id]);
                    postArray.push(selectPostResult.rows[0]);
                }

                resolve({
                    postArray : postArray,
                    scrollId : searchResult._scroll_id
                });
            }else{
                reject({
                    statusCode : 400,
                    message : 'invalid match type'
                });
            }
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const getPostBySearch = (searchType, search = '', sortby = 'date', orderby = 'desc', size = 20) => {
    return new Promise(async (resolve, reject) => {
        //check sortby
        if(!(sortby === 'date' || sortby === 'good')){
            reject({
                statusCode : 400,
                message : 'invalid sortby'
            });
            return; 
        }

        //check orderby
        if(!(orderby === 'desc' || orderby === 'asc')){
            reject({
                statusCode : 400,
                message : 'invalid orderby'
            });
            return;
        }

        //check search length
        if(search.length === 0){
            reject({
                statusCode : 400,
                message : 'invalid search keyword'
            });
        }

        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });
        
        try{
            await pgClient.connect();

            //prepare sort object for searching elastcisearch
            const sortObj = {};
            if(sortby === 'good'){
                sortObj['post_good_count'] = orderby;
            }else{
                sortObj['post_upload_time'] = orderby;
            }

            if(searchType === 'title'){
                //search post on es
                const searchResult = await esClient.search({
                    index : 'post',
                    body : {
                        query : {
                            wildcard : {
                                post_title : `*${search}*`
                            }
                        },
                        sort : [sortObj]
                    },
                    size : size,
                    scroll : '3m'
                });

                //SELECT post
                const postArray = [];
                for(postData of searchResult.hits.hits){
                    //SELECT post
                    const selectPostSql = `SELECT 
                                                post_idx,
                                                post_title,
                                                post_thumbnail,
                                                post_upload_time,
                                                post_view_count,
                                                post_good_count,

                                                shoot.category.category_idx,
                                                category_name,

                                                upload_channel_email,
                                                name AS channel_name,
                                                profile_img
                                            FROM
                                                shoot.post
                                            LEFT JOIN
                                                shoot.category
                                            ON
                                                shoot.post.category_idx = shoot.category.category_idx
                                            JOIN
                                                shoot.channel
                                            ON 
                                                upload_channel_email = email
                                            WHERE
                                                post_idx = $1
                                        `
                    const selectPostResult = await pgClient.query(selectPostSql, [postData._id]);
                    postArray.push(selectPostResult.rows[0]);
                }

                resolve({
                    postArray : postArray,
                    scrollId : searchResult._scroll_id
                });
            }else if(searchType === 'hashtag'){
                //search post on es
                const searchResult = await esClient.search({
                    index : 'post',
                    body : {
                        query : {
                            wildcard : {
                                hashtag : `*${search}*`
                            }
                        },
                        sort : [sortObj]
                    },
                    size : size,
                    scroll : '3m'
                });

                //SELECT post
                const postArray = [];
                for(postData of searchResult.hits.hits){
                    //SELECT post
                    const selectPostSql = `SELECT 
                                                post_idx,
                                                post_title,
                                                post_thumbnail,
                                                post_upload_time,
                                                post_view_count,
                                                post_good_count,

                                                shoot.category.category_idx,
                                                category_name,

                                                upload_channel_email,
                                                name AS channel_name,
                                                profile_img
                                            FROM
                                                shoot.post
                                            LEFT JOIN
                                                shoot.category
                                            ON
                                                shoot.post.category_idx = shoot.category.category_idx
                                            JOIN
                                                shoot.channel
                                            ON 
                                                upload_channel_email = email
                                            WHERE
                                                post_idx = $1
                                        `
                    const selectPostResult = await pgClient.query(selectPostSql, [postData._id]);
                    postArray.push(selectPostResult.rows[0]);
                }

                resolve({
                    postArray : postArray,
                    scrollId : searchResult._scroll_id
                });
            }else{
                reject({
                    statusCode : 400,
                    message : 'invalid match type'
                });
            }
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    }) 
}

const getHotPostAll = (size = 20, hot = 1) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });
        
        try{
            await pgClient.connect();

            //search post on es
            const searchResult = await esClient.search({
                index : 'post',
                body : {
                    query : {
                        range : {
                            post_good_count : {
                                gte : hot
                            }
                        }
                    },
                },
                size : size,
                scroll : '3m'
            });

            //SELECT post
            const postArray = [];
            for(postData of searchResult.hits.hits){
                //SELECT post
                const selectPostSql = `SELECT 
                                            post_idx,
                                            post_title,
                                            post_thumbnail,
                                            post_upload_time,
                                            post_view_count,
                                            post_good_count,

                                            shoot.category.category_idx,
                                            category_name,

                                            upload_channel_email,
                                            name AS channel_name,
                                            profile_img
                                        FROM
                                            shoot.post
                                        LEFT JOIN
                                            shoot.category
                                        ON
                                            shoot.post.category_idx = shoot.category.category_idx
                                        JOIN
                                            shoot.channel
                                        ON 
                                            upload_channel_email = email
                                        WHERE
                                            post_idx = $1
                                    `
                const selectPostResult = await pgClient.query(selectPostSql, [postData._id]);
                postArray.push(selectPostResult.rows[0]);
            }

            resolve({
                postArray : postArray,
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

const getBookmarkPostAll = (loginUserEmail = '', scroll = -1, size = 20) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //SELECT post
            const getBookmarkSql = `SELECT
                                        shoot.post.post_idx,
                                        shoot.post.post_title,
                                        shoot.post.post_thumbnail,
                                        shoot.post.post_upload_time,
                                        shoot.post.post_view_count,
                                        shoot.post.post_good_count,

                                        shoot.category.category_idx,
                                        shoot.category.category_name,
                                        
                                        shoot.post.upload_channel_email,
                                        shoot.channel.name AS upload_channel_name,
                                        shoot.channel.profile_img,

                                        shoot.bookmark.bookmark_time
                                    FROM
                                        shoot.bookmark
                                    JOIN
                                        shoot.channel
                                    ON
                                        shoot.bookmark.email = shoot.channel.email
                                    JOIN
                                        shoot.post
                                    ON
                                        shoot.bookmark.post_idx = shoot.post.post_idx
                                    LEFT JOIN
                                        shoot.category
                                    ON
                                        shoot.post.category_idx = shoot.category.category_idx
                                    WHERE
                                        shoot.bookmark.email = $1 ${scroll !== -1 ? `
                                        AND
                                            shoot.bookmark.bookmark_time < (SELECT bookmark_time FROM shoot.bookmark WHERE post_idx = $2 AND shoot.bookmark.email = $1)
                                        ` : ''}
                                    ORDER BY
                                        shoot.bookmark.bookmark_time DESC 
                                    LIMIT
                                        ${size}
                                    `;
            const getBookmarkResult = await pgClient.query(getBookmarkSql, scroll === -1 ? [loginUserEmail] : [loginUserEmail, scroll]);

            resolve(getBookmarkResult.rows);
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const getSubscribePostAll = (loginUserEmail = '', groupby = 'post', scroll = -1, size = 20) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            if(groupby === 'post'){
                //SELECT post
                const selectSubscribeSql = `SELECT
                                                shoot.post.post_idx,
                                                shoot.post.post_title,
                                                shoot.post.post_thumbnail,
                                                shoot.post.post_upload_time,
                                                shoot.post.post_view_count,
                                                shoot.post.post_good_count,

                                                shoot.category.category_idx,
                                                shoot.category.category_name,
                                                
                                                shoot.post.upload_channel_email,
                                                shoot.channel.name AS upload_channel_name,
                                                shoot.channel.profile_img
                                            FROM
                                                shoot.post
                                            JOIN
                                                shoot.channel
                                            ON
                                                shoot.post.upload_channel_email = shoot.channel.email
                                            JOIN
                                                shoot.subscribe
                                            ON
                                                shoot.subscribe.subscribed_channel_email = shoot.post.upload_channel_email
                                            LEFT JOIN
                                                shoot.category
                                            ON
                                                shoot.post.category_idx = shoot.category.category_idx
                                            WHERE
                                                shoot.subscribe.subscriber_channel_email = $1 ${scroll !== -1 ? `AND post_idx < $2` : ''}
                                            ORDER BY
                                                post_upload_time DESC
                                            LIMIT
                                                ${size}
                                            `;
                const selectSubscribeResult = await pgClient.query(selectSubscribeSql, scroll === -1 ? [loginUserEmail] : [loginUserEmail, scroll]);

                resolve(selectSubscribeResult.rows);
            }else if(groupby === 'channel'){
                //SELECT channel
                const selectChannelSql = `SELECT
                                                shoot.channel.email AS upload_channel_email,
                                                shoot.channel.name AS channel_name,
                                                shoot.channel.profile_img
                                            FROM
                                                shoot.subscribe
                                            JOIN
                                                shoot.channel
                                            ON
                                                shoot.channel.email = shoot.subscribe.subscribed_channel_email
                                            WHERE
                                                shoot.subscribe.subscriber_channel_email = $1 ${scroll !== -1 ? `
                                                AND
                                                    shoot.subscribe.subscribe_time < (SELECT subscribe_time FROM shoot.subscribe WHERE subscribed_channel_email = $2 AND subscriber_channel_email = $1)
                                                ` : ''}
                                            ORDER BY
                                                shoot.subscribe.subscribe_time DESC
                                            LIMIT
                                                ${size}
                                            `;
                const selectChannelResult = await pgClient.query(selectChannelSql, scroll !== -1 ? [loginUserEmail, scroll] : [loginUserEmail]);

                for(channelData of selectChannelResult.rows){
                    //select post data
                    const selectPostSql = `SELECT 
                                                post_idx,
                                                post_title,
                                                post_thumbnail,
                                                post_upload_time,
                                                post_view_count,
                                                post_good_count,
                                                
                                                shoot.category.category_idx,
                                                category_name
                                            FROM 
                                                shoot.post
                                            JOIN
                                                shoot.category
                                            ON
                                                shoot.post.category_idx = shoot.category.category_idx
                                            WHERE
                                                shoot.post.upload_channel_email = $1
                                            ORDER BY
                                                shoot.post.post_idx DESC
                                            LIMIT
                                                10
                                            `;
                    const selectPostResult = await pgClient.query(selectPostSql, [channelData.upload_channel_email]);
                    channelData.post = selectPostResult.rows;
                }

                resolve(selectChannelResult.rows);
            }else{
                reject({
                    statusCode : 400,
                    message : 'invalid groupby query'
                }); 
            }
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }

        const a = [
            {
                id : 'asd123',
                posts : [
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                ]
            },
            {
                id : 'asd123',
                posts : [
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                    {
                        author : 'asd123',
                        title : 'asdf'
                    },
                ]
            }
        ]
    });
}

const getHistoryPostAll = (loginUserEmail = '', scroll = -1, size = 2) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
            
        try{    
            await pgClient.connect();

            const getHistorySql = `SELECT
                                            shoot.post.post_idx,
                                            shoot.post.post_title,
                                            shoot.post.post_thumbnail,
                                            shoot.post.post_upload_time,
                                            shoot.post.post_view_count,
                                            shoot.post.post_good_count,

                                            shoot.category.category_idx,
                                            shoot.category.category_name,
                                            
                                            shoot.post.upload_channel_email,
                                            shoot.channel.name AS upload_channel_name,
                                            shoot.channel.profile_img,

                                            shoot.history.view_time
                                        FROM
                                            shoot.history
                                        JOIN
                                            shoot.channel
                                        ON
                                            shoot.history.channel_email = shoot.channel.email
                                        JOIN
                                            shoot.post
                                        ON
                                            shoot.history.post_idx = shoot.post.post_idx
                                        LEFT JOIN
                                            shoot.category
                                        ON
                                            shoot.post.category_idx = shoot.category.category_idx
                                        WHERE
                                            shoot.history.channel_email = $1 ${scroll !== -1 ? `
                                            AND
                                                shoot.history.view_time < (SELECT view_time FROM shoot.history WHERE post_idx = $2)
                                            ` : ''}
                                        ORDER BY
                                            shoot.history.view_time DESC 
                                        LIMIT
                                            ${size}
                                        `
            const getHistoryResult = await pgClient.query(getHistorySql, scroll === -1 ? [loginUserEmail] : [loginUserEmail, scroll]);

            resolve(getHistoryResult.rows);
        }catch(err){
            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const addPost = (postData) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'
        });

        //check video existence
        if(!postData.video){
            reject({
                statusCode : 400,
                message : 'video is required'
            });
            return;
        }

        try{    
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT shoot.post
            let insertPostSql = '';
            let insertPostDataArray = [];
            if(postData.thumbnail){
                insertPostSql = 'INSERT INTO shoot.post (post_title, post_type, post_video, upload_channel_email, post_description, post_thumbnail, category_idx) VALUES ( $1, $2, $3, $4, $5, $6, $7) RETURNING post_idx, post_upload_time';
                insertPostDataArray = [postData.title, postData.postType, postData.video, postData.email, postData.description, postData.thumbnail, postData.categoryIdx];
            }else{
                insertPostSql = 'INSERT INTO shoot.post (post_titleb, post_type, post_video, upload_channel_email, post_description, category_idx) VALUES ( $1, $2, $3, $4, $5, $6) RETURNING post_idx, post_upload_time';
                insertPostDataArray = [postData.title, postData.postType, postData.video, postData.email, postData.description, postData.categoryIdx];
            }
            const insertPostResult = await pgClient.query(insertPostSql, insertPostDataArray);
            const postIdx = insertPostResult.rows[0].post_idx;
            const postUploadTime = insertPostResult.rows[0].post_upload_time;
            
            //INSERT contents
            if(postData.postType == 2){
                for(voteData of postData.vote){
                    //INSERT vote
                    const insertVoteSql = 'INSERT INTO shoot.post_contents_vote (vote_contents, post_idx) VALUES ($1, $2)';
                    await pgClient.query(insertVoteSql, [voteData.contents, postIdx]);
                }
            }else if(postData.postType == 3){
                for(linkData of postData.link){
                    //INSERT link
                    const insertLinkSql = 'INSERT INTO shoot.post_contents_link (link_name, link_url, post_idx) VALUES ($1, $2, $3)';
                    await pgClient.query(insertLinkSql, [linkData.name, linkData.url, postIdx]);
                }
            }

            if(Array.isArray(postData.hashtag)){
                //INSERT hashtag
                for(hashtagData of postData.hashtag){
                    const insertHashtagSql = 'INSERT INTO shoot.hashtag (hashtag_name, post_idx) VALUES ($1, $2)';
                    await pgClient.query(insertHashtagSql, [hashtagData.trim(), postIdx]);
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
                    hashtag : postData.hashtag,
                    post_upload_time : postUploadTime,
                    post_good_count : 0
                }
            });

            addNotification(postData.email, {
                type : 6,
                idx : postIdx
            });

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

const modifyPost = (postIdx, postData, token) => {
    return new Promise(async (resolve, reject) => {
        const postType = postData.postType;
        postData.postType = undefined; //for validation check

        //vote type check
        if(postData.type == 2 && postData.vote && Array.isArray(postData.vote)){
            reject({
                statusCode : 400,
                message : 'type of vote must be array'
            });
            return;
        }

        //link type check
        if(postData.type == 3 && postData.link && Array.isArray(postData.link)){
            reject({
                statusCode : 400,
                message : 'type of link must be array'
            });
            return;
        }

        //post data valid check
        const postDataValidation = postDataValidCheck(postData);
        if(postDataValidation.state){
            const pgClient = new Client(pgConfig);

            const esClient = new elastic.Client({
                node : 'http://localhost:9200'
            });

            //update try
            try{
                //check token
                const verify = verifyToken(token);
                const loginUserEmail = verify.email;
                if(loginUserEmail){
                    await pgClient.connect();

                    //SELECT post
                    const selectPostSql = 'SELECT upload_channel_email FROM shoot.post WHERE post_idx = $1';
                    const selectPostResult = await pgClient.query(selectPostSql, [postIdx]);
                    if(!selectPostResult.rows[0]){
                        reject({
                            statusCode : 404,
                            message : 'cannot find post'
                        });
                        return;
                    }
                    const { upload_channel_email } = selectPostResult.rows[0];

                    //SELECT channel
                    const selectChannelSql = 'SELECT authority FROM shoot.channel WHERE email = $1';
                    const selectChannelResult = await pgClient.query(selectChannelSql, [loginUserEmail]);
                    const { authority } = selectChannelResult.rows[0];

                    console.log(selectChannelResult.rows);
                    //auth check
                    if(upload_channel_email === loginUserEmail || authority == 1){
                        //BEGIN
                        await pgClient.query('BEGIN');

                        //UPDATE post
                        const updatePostSql = `UPDATE 
                                                    shoot.post 
                                                SET 
                                                    post_title = $1,
                                                    post_description = $2,
                                                    category_idx = $3
                                                WHERE
                                                    post_idx = $4
                                                `;
                        await pgClient.query(updatePostSql, [postData.title, postData.description, postData.categoryIdx, postIdx]);

                        //UPDATE hashtag
                        if(postData.hashtag){
                            //DELETE hashtag
                            const deleteHashtagSql = 'DELETE FROM shoot.hashtag WHERE post_idx = $1';
                            await pgClient.query(deleteHashtagSql, [postIdx]);

                            //INSERT hashtag
                            for(hashtagContents of postData.hashtag){
                                const insertHashTagSql = 'INSERT INTO shoot.hashtag (post_idx, hashtag_name) VALUES ($1, $2)';
                                await pgClient.query(insertHashTagSql, [postIdx, hashtagContents]);
                            }
                        }

                        //UPDATE vote
                        if(postType == 2 && postData.vote){
                            //DELETE post_contents_vote
                            const deleteVoteSql = 'DELETE FROM shoot.post_contents_vote WHERE post_idx = $1';
                            await pgClient.query(deleteVoteSql, [postIdx]);

                            //INSERT post_contents_vote
                            for(voteData of postData.vote){
                                const insertVoteSql = 'INSERT INTO shoot.post_contents_vote (post_idx, vote_contents) VALUES ($1, $2)';
                                await pgClient.query(insertVoteSql, [postIdx, voteData.contents]);
                            }
                        }

                        //UPDATE link
                        if(postType == 3 && postData.link){
                            //DELETE post_contents_link
                            const deleteLinkSql = 'DELETE FROM shoot.post_contents_link WHERE post_idx = $1';
                            await pgClient.query(deleteLinkSql, [postIdx]);

                            //INSERT post_conetnts_link
                            for(linkData of postData.link){
                                const insertLinkSql = 'INSERT INTO shoot.post_contents_link (post_idx, link_name, link_url) VALUES ($1, $2, $3)';
                                await pgClient.query(insertLinkSql, [postIdx, linkData.name, linkData.url]);
                            }
                        }

                        //update post on es
                        await esClient.update({
                            index : "post",
                            id : postIdx,
                            body : {
                                doc : {
                                    post_title : postData.title,
                                    category_idx : postData.categoryIdx
                                }
                            }
                        });

                        //update hashtag on es
                        if(postData.hashtag){
                            await esClient.update({
                                index : "post",
                                id : postIdx,
                                body : {
                                    doc : {
                                        hashtag : postData.hashtag
                                    }
                                }
                            });
                        }

                        //COMMIT
                        await pgClient.query('COMMIT');

                        resolve(1);
                    }else{
                        reject({
                            statusCode : 403,
                            message : 'no auth'
                        })
                    }
                }else{
                    reject({
                        statusCode : 401,
                        message : 'no login'
                    })
                }
    
                resolve(1);
            }catch(err){
                await pgClient.query('ROLLBACK');
                reject({
                    statusCode : 409,
                    message : 'unexpected error occured',
                    err : err
                })
            }
        }else{
            reject({
                statusCode : 400,
                message : postDataValidation.message
            })
        }
    })
}

const deletePost = (postIdx, token) => {
    return new Promise(async (resolve, reject) => {
        const verify = verifyToken(token);
        if(verify.state){
            const loginUserEmail = verify.email;

            const esClient = new elastic.Client({
                node : 'http://localhost:9200'
            });
    
            const pgClient = new Client(pgConfig);
            
            try{
                await pgClient.connect();

                //SELECT login user data
                const selectChannelSql = 'SELECT email, authority FROM shoot.channel WHERE email = $1';
                const selectChannelResult = await pgClient.query(selectChannelSql, [loginUserEmail]);
                const { authority } = selectChannelResult.rows[0];
    
                //SELECT post
                const selectPostSql = 'SELECT upload_channel_email,post_type, post_video, post_thumbnail  FROM shoot.post WHERE post_idx = $1';
                const selectResult = await pgClient.query(selectPostSql, [postIdx]);
                if(!selectResult.rows[0]){
                    reject({
                        statusCode : 404,
                        message : 'cannot find post'
                    })
                    return;
                }
                const { upload_channel_email, post_video, post_thumbnail } = selectResult.rows[0];

                //auth check
                if(authority == 1 || upload_channel_email === loginUserEmail){
                    //BEGIN
                    await pgClient.query('BEGIN');

                    //UPDATE post
                    const deletePostQuery = 'DELETE FROM shoot.post WHERE post_idx = $1';
                    await pgClient.query(deletePostQuery, [postIdx]);

                    AWS.config.update(awsConfig);
                    const s3 = new AWS.S3();

                    //remove video
                    if(post_video){
                        await s3.deleteObject({
                            Bucket: 'jochong/post', 
                            Key: post_video
                        }).promise();
                    }

                    // //remove thumbnail
                    if(post_thumbnail){
                        await s3.deleteObject({
                            Bucket: 'jochong/post', 
                            Key: post_thumbnail
                        }).promise();
                    }
                    
                    //DELETE post data on elasticsearch
                    await esClient.delete({
                        index : 'post',
                        id : postIdx,
                        ignore : 404
                    });

                    //DELETE comment data on elasticsearch
                    await esClient.deleteByQuery({
                        index : 'comment',
                        body : {
                            query : {
                                match : {
                                    post_idx : postIdx
                                }
                            }
                        }
                    });

                    //COMMIT
                    await pgClient.query('COMMIT');
                }else{
                    reject({
                        statusCode : 403,
                        message : 'no auth'
                    });
                }

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
        }else{
            
        }
    })
}

module.exports = {
    addPost : addPost,
    deletePost: deletePost,
    getPostByPostIdx : getPostByPostIdx,
    modifyPost : modifyPost,
    getPostByMatch : getPostByMatch,
    getPostByScrollId : getPostByScrollId,
    getPostBySearch : getPostBySearch,
    getPostAll : getPostAll,
    getHotPostAll : getHotPostAll,
    getHistoryPostAll : getHistoryPostAll,
    getBookmarkPostAll : getBookmarkPostAll,
    getSubscribePostAll : getSubscribePostAll
}