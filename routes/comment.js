const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addComment } = require('../module/commentControl');

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

module.exports = router;