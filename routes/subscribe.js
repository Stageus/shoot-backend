const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addSubscribe } = require('../module/subscribeControl');

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';
    const subscribedChannelEmail = req.query['channel-email'] || '';

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addSubscribe(loginUserEmail, subscribedChannelEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }
    
    //send result
    res.status(statusCode).send(result);
});

module.exports = router;