const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addReport } = require('../module/reportControl');

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