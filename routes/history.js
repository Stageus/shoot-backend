const router = require('express').Router();
const loginAUth = require('../middleware/loginAuth');
const { getHistory } = require('../module/historyControl');


router.get('/all', loginAUth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email;
    const scroll = req.query.scroll || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getHistory(loginUserEmail, scroll);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;

    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;