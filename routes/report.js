const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addReport, getAllReport } = require('../module/reportControl');

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