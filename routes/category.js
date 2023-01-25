const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { getCategoryAll } = require('../module/categoryControl');

router.get('/all', async (req, res) => {
    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getCategoryAll();
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
    const loginUserEmail = req.email;
    const loginUserAuthority = req.authority;

    //to FE
    const result =  {};
    let statusCode = 200;

    //main
    try{

    }catch(err){

    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;