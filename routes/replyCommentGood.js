const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addReplyCommentGood, deleteReplyCommentGood } = require('../module/replyCommentGoodControl');

router.post('/:replyCommentIdx', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';
    const replyCommentIdx = req.params.replyCommentIdx || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addReplyCommentGood(replyCommentIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.delete('/:replyCommentIdx', loginAuth, async (req, res) => {
    //from FE
    const replyCommentIdx = req.params.replyCommentIdx;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteReplyCommentGood(replyCommentIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;