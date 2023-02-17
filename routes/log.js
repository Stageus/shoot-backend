const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { getAllLog, getLogByScroll, getLogByLogId } = require('../module/logControl');

router.get('/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserAuthority = req.authority || 0;
    const scrollId = req.query.scroll;

    const searchOption = {
        email : req.query.email || '',
        path : req.query.path || '',
        orderby : req.query.orderby === 'asc' ? 'asc' : 'desc',
        displayLog : req.query.log === 'true' ? true : false
    }

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        if(scrollId){
            const getResult = await getLogByScroll(loginUserAuthority, scrollId);
            result.data = getResult.log;
            result.scroll = getResult.scroll;
        }else{
            const getResult = await getAllLog(loginUserAuthority, searchOption, 20);
            result.data = getResult.log;
            result.scroll = getResult.scroll;
        }
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }
    
    //send result
    res.status(statusCode).send(result);
});

router.get('/:logId', loginAuth, async (req, res) => {
    //from FE
    const loginUserAuthority = req.authority || 0;
    const logId = req.params.logId || '';

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getLogByLogId(loginUserAuthority, logId);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;