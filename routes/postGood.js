const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addPostGood, deletePostGood } = require('../module/postGoodControl');

router.post('/:postIdx', loginAuth, async (req, res) => {
    //from FE
    const postIdx = req.params.postIdx;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addPostGood(postIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        statusCode = err.statusCode;
        result.message = err.message;
    }

    //send result
    res.status(statusCode).send(result);
});

router.delete('/:postIdx', loginAuth, async (req, res) => {
    //from FE
    const postIdx = req.params.postIdx;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deletePostGood(postIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        statusCode = err.statusCode;
        result.message = err.message;
    }

    //send result
    res.status(statusCode).send(result);
})

module.exports = router;