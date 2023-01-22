const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addComment, deleteComment, modifyComment, getAllComment, getCommentByScroll } = require('../module/commentControl');
const verifyToken = require('../module/verifyToken');

router.get('/all', async (req, res) => {
    //from FE
    const postIdx = req.query['post-idx'] || -1;
    const sortby = req.query.sortby === 'good' ? 'good' : 'date';
    const scroll = req.query.scroll;
    const loginUserEmail = verifyToken(req.cookies.token).email || '';

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        if(scroll){
            const getCommentResult = await getCommentByScroll(scroll, loginUserEmail);
            result.data = getCommentResult.commentArray;
            result.scroll = getCommentResult.scrollId;
        }else{
            const getCommentResult = await getAllComment(postIdx, sortby, 1, loginUserEmail);
            result.data = getCommentResult.commentArray;
            result.scroll = getCommentResult.scrollId;
        }
    }catch(err){
        err.err ? console.log(err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const postIdx = req.query['post-idx'];
    const commentContents = req.body.contents;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addComment(commentContents, postIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //sned result
    res.status(statusCode).send(result);
});

router.put('/:commentIdx', loginAuth, async (req, res) => {
    //from FE
    const commentIdx = req.params.commentIdx;
    const loginUserEmail = req.email;
    const loginUserAuthority = req.authority;
    const modifyContents = req.body.contents || '';

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await modifyComment(modifyContents, commentIdx, loginUserEmail, loginUserAuthority);
    }catch(err){
        err.err ? console.log(err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //sned result
    res.status(statusCode).send(result);
});

router.delete('/:commentIdx', loginAuth, async (req, res) => {
    //from FE
    const commentIdx = req.params.commentIdx;
    const loginUserEmail = req.email;
    const loginUserAuthority = req.authority;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteComment(commentIdx, loginUserEmail, loginUserAuthority);
    }catch(err){
        err.err ? console.log(err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //sned result
    res.status(statusCode).send(result);
});

module.exports = router;