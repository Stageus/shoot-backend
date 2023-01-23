const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addReplyComment, deleteReplyCommnet } = require('../module/replyCommentControl');

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
});

router.delete('/:replyCommentIdx', loginAuth, async (req, res) => {
    //from FE
    const replyCommentIdx = req.params.replyCommentIdx;
    const loginUserEmail = req.email;
    const loginUserAuthority = req.authority;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteReplyCommnet(replyCommentIdx, loginUserEmail, loginUserAuthority);
    }catch(err){
        err.err ? console.log(err.err) : null;

        console.log(err)

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }
    
    //send result
    res.status(statusCode).send(result);
});

module.exports = router;