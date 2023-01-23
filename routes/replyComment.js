const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addReplyComment, deleteReplyCommnet, modifyReplyComment, getAllReplyComment } = require('../module/replyCommentControl');
const verifyToken = require('../module/verifyToken');

router.get('/all', async (req, res) => {
    //from FE
    const loginUserEmail = verifyToken(req.cookies.token).email || '';
    const commentIdx = req.query['comment-idx'];
    const scroll = req.query['scroll'];

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getAllReplyComment(commentIdx, loginUserEmail, scroll, 20);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    res.status(statusCode).send(result);
})

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

router.put('/:replyCommentIdx', loginAuth, async (req, res) => {
    //from FE
    const modifyContents = req.body.contents || '';
    const replyCommentIdx = req.params.replyCommentIdx || -1;
    const loginUserEmail = req.email;
    const loginUserAuthority = req.authority;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await modifyReplyComment(modifyContents, replyCommentIdx, loginUserEmail,loginUserAuthority);
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
    const loginUserAuthority = req.authority;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteReplyCommnet(replyCommentIdx, loginUserEmail, loginUserAuthority);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }
    
    //send result
    res.status(statusCode).send(result);
});

module.exports = router;