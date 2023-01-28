const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addRequestCategory } = require('../module/requestCategoryControl');

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email;
    const requestCategoryName = req.body.category;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addRequestCategory(requestCategoryName, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;