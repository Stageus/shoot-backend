const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addBlockChannel } = require('../module/blockChannelControl');

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserAuthority = req.authority || 0;
    const blockPeriod = req.body.period || 0;
    const blockReason = req.body.reason || '';
    const blockEmail = req.body.email || '';

    //to FE
    const result = {};
    let statsuCode = 200;

    //main
    try{
        await addBlockChannel(loginUserAuthority, blockEmail, blockPeriod, blockReason);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statsuCode = result.statsuCode || 409;
    }

    //send result
    res.status(statsuCode).send(result);
});

module.exports = router;