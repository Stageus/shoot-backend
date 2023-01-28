const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { getCategoryAll, addCategory, deleteCategory } = require('../module/categoryControl');

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
    const loginUserAuthority = req.authority;
    const categoryName = req.body.category || '';

    //to FE
    const result =  {};
    let statusCode = 200;

    //main
    try{
        await addCategory(categoryName, loginUserAuthority);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;   
    }

    //send result
    res.status(statusCode).send(result);
});

router.delete('/:categoryIdx', loginAuth, async (req, res) => {
    //from FE
    const categoryIdx = req.params.categoryIdx;
    const loginUserAuthority = req.authority || 0;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteCategory(categoryIdx, loginUserAuthority);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;