const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addCommentGood, deleteCommentGood } = require('../module/commentGoodControl');

router.post('/:commentIdx', loginAuth, async (req, res) => {
    //from FE
    const commentIdx = req.params.commentIdx;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addCommentGood(commentIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

router.delete('/:commentIdx', loginAuth, async (req, res) => {
    //from FE
    const commentIdx = req.params.commentIdx;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteCommentGood(commentIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;