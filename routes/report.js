const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addReport, getAllReport, getAllReportByMatch } = require('../module/reportControl');

router.get('/:groupby/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserAuthority = req.authority || 0;
    const scrollId = req.query.scroll;
    const groupby = req.params.groupby || 'channel';

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{    
        const getReportResult = await getAllReport(loginUserAuthority, groupby, scrollId, 100);
            
        result.data = getReportResult.report;
        result.scroll = getReportResult.scrollId;
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.mesage = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/:groupby/:match', loginAuth, async (req, res) => {
    //from FE
    const loginUserAuthority = req.authority || 0;
    const match = req.params.match || '';
    const groupby = req.params.groupby || 'channel';
    const scroll = req.query.scroll;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        if(scroll){

        }else{
            const searchResult = await getAllReportByMatch(loginUserAuthority, groupby, match, 20);

            result.data = searchResult.report;
            result.scroll = searchResult.scroll;
        }
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }
    
    //send result
    res.status(statusCode).send(result);
});

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';
    const reportContents = req.body.contents;
    const reportType = req.body.type || 0;
    const idxObject = req.body.object || 'channel';
    const idx = req.body.idx || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addReport(loginUserEmail, {
            contents : reportContents,
            type : reportType,
            object : idxObject,
            idx : idx
        });
    }catch(err){
        err.err ? console.log(err.err) : null;
        
        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;