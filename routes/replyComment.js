const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addReplyComment } = require('../module/replyCommentControl');

router.post('/', loginAuth, async (req, res) => { 
    //from FE
    const replyCommentContents = req.body.contents || '';
    const loginUserEmail = req.email;
    const commentIdx = req.query['comment-idx'] || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addReplyComment(replyCommentContents, commentIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
})

module.exports = router;