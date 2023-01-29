const elastic = require('elasticsearch');
const url = require('url');
const requestIp = require('request-ip');
const verifyToken = require('../module/verifyToken');

const addLog = (req, res, result) => {
    return new Promise(async (resolve, reject) => {
        const urlObj = url.parse(req.originalUrl);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'            
        });

        try{
            await esClient.index({
                index : 'log',
                body : {
                    ip : req.ip, // user ip
                    req_channel_email : verifyToken(req.cookies.token)?.email || '', // user email
                    method : req.method, // req method
                    api_path : urlObj.pathname, // api path
                    querystring : urlObj.query, // req query
                    req_time : req.date || null, // req time
                    res_time : new Date() || null, // res time
                    status_code : res.statusCode, // status code
                    result : JSON.stringify(result || {}) // result obj
                }
            })
        }catch(err){ 
            console.log(err);
        }
        
        resolve(1);
    });
}

const getAllLog = (loginUserAuthority = 0, searchOption = {}, size = 20) => {
    return new Promise(async (resolve, reject) => {
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'            
        });

        //auth check
        if(loginUserAuthority !== 1){
            reject({
                statusCode : 403,
                message : 'no admin auth',
            });
            return;
        }

        //must
        const mustArray = [];
        if(searchOption.email){
            for(emailSplitData of searchOption.email.split('@')){
                mustArray.push({
                    match : {
                        req_channel_email : emailSplitData
                    }
                });
            }
        }
        if(searchOption.path){
            mustArray.push({
                match : {
                    api_path : `*${searchOption.path}*`
                }
            });
        }

        //must not
        const mustNotArray = [];
        if(!searchOption.displayLog){
            mustNotArray.push({
                match : {
                    api_path : '/log/'
                }
            })
        }

        //sort
        const sortObj = {};
        if(searchOption.orderby !== 'desc'){
            sortObj.req_time = 'ASC';
        }else{
            sortObj.req_time = 'DESC';
        }

        try{
            const searchResult = await esClient.search({
                index : 'log',
                body : {
                    query : {
                        bool : {
                            must : mustArray,
                            must_not : mustNotArray
                        }
                    },
                    sort : [sortObj]
                },
                size : size,
                scroll : '3m'
            });
            
            resolve({
                scroll : searchResult._scroll_id,
                log : searchResult.hits.hits.map((logData) => {
                    return {
                        id : logData._id,
                        ...logData._source
                    }
                })
            });
        }catch(err){
            if(err.status === 404){
                resolve({
                    log : [],
                    scroll : ''
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

const getLogByScroll = (loginUserAuthority = 0, scrollId ='') => {
    return new Promise(async (resolve, reject) => {
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'            
        });

        //auth check
        if(loginUserAuthority !== 1){
            reject({
                statusCode : 403,
                message : 'no admin auth'
            });
            return;
        }

        try{
            const scrollResult = await esClient.scroll({
                scroll : '3m',
                scroll_id : scrollId
            });

            resolve({
                scroll : scrollResult._scroll_id,
                log : scrollResult.hits.hits.map((logData) => {
                    return {
                        id : logData._id,
                        ...logData._source
                    }
                })
            })
        }catch(err){
            if(err.status === 404){
                resolve({
                    log : [],
                    scroll : ''
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

const getLogByLogId = (loginUserAuthority = 0, logId = '') => {
    return new Promise(async (resolve, reject) => {
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'            
        });

        //auth check
        if(loginUserAuthority !== 1){
            reject({
                statusCode : 403,
                message : 'no admin auth'
            });
            return;
        }

        try{
            const searchResult = await esClient.search({
                index : 'log',
                id : logId
            });
        }catch(err){

        }
    });
}

module.exports = {
    addLog : addLog,
    getAllLog : getAllLog,
    getLogByScroll : getLogByScroll,
    getLogByLogId : getLogByLogId
}