const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addSearchHistory, getAllSearchHistory } = require('../module/searchHistoryControl');

router.get('/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getAllSearchHistory(loginUserEmail);
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
    const searchKeyword = req.body.keyword || '';
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addSearchHistory(searchKeyword, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;