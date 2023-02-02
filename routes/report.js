const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addReport, getAllReport, getAllReportByMatch, getAllReportByScroll, deleteReportAllByMatch } = require('../module/reportControl');

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

router.get('/:groupby/:match/all', loginAuth, async (req, res) => {
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
            const searchResult = await getAllReportByScroll(loginUserAuthority, scroll);

            result.data = searchResult.report;
            result.scroll = searchResult.scrollId;
        }else{
            const searchResult = await getAllReportByMatch(loginUserAuthority, groupby, match, 20);

            result.data = searchResult.report;
            result.scroll = searchResult.scrollId;
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

router.delete('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserAuthority = req.authority || 0;
    const group = req.query.group || 'channel';
    const idx = req.query.idx || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteReportAllByMatch(loginUserAuthority, group, idx);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;