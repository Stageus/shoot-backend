const router = require('express').Router();
const { addSearchHistoryOff } = require('../module/searchHistoryOffControl');
const loginAuth = require('../middleware/loginAuth');

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';

    //to FE
    const result = {};
    let statusCode = 200;
    
    //main
    try{
        await addSearchHistoryOff(loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;