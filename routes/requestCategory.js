const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addRequestCategory, deleteRequestCategory, getAllRequestCategory } = require('../module/requestCategoryControl');

router.get('/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserAuthority = req.authority || 0;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getAllRequestCategory(loginUserAuthority);
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

router.delete('/:delReqCategoryName', loginAuth, async (req, res) => {
    //from FE
    const delReqCategoryName = req.params.delReqCategoryName;
    const loginUserAuthority = req.authority;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteRequestCategory(delReqCategoryName, loginUserAuthority);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;