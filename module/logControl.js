const elastic = require('elasticsearch');
const url = require('url');
const requestIp = require('request-ip');
const verifyToken = require('../module/verifyToken');

const addLog = (req, res, result) => {
    return new Promise(async (resolve, reject) => {
        const urlObj = url.parse(req.originalUrl);
        const esClient = new elastic.Client({
            node : 'http://localhost:9200'            
        })

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
                    result : result || {} // result obj
                }
            })
        }catch(err){
            console.log(err);
        }
        
        resolve(1);
    });
}

const getAllLog = () => {
    
}

module.exports = {
    addLog : addLog
}