const router = require('express').Router();
const { addPost, deletePost, getPostByPostIdx, modifyPost } = require('../module/postControl');
const loginAuth = require('../middleware/loginAuth');
const postFileUpload = require('../middleware/postFileUpload');

router.get('/all', async (req, res) => {

});

router.get('/:postIdx', async (req, res) => {
    //from FE
    const postIdx = req.params.postIdx;
    const token = req.cookies?.token || '';

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const postData = await getPostByPostIdx(postIdx, token);
        result.data = postData;
    }catch(err){
        err.err ? console.log(err.err) : null

        result.message = err.message;
        statusCode = statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

router.post('/', loginAuth, postFileUpload, async (req, res) => {
    //from FE
    req.body.video = req.files.video[0].key;
    req.body.thumbnail = req.files?.thumbnail?.[0]?.key;
    req.body.email = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addPost(req.body);
    }catch(err){
        err.err !== undefined ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

router.put('/:postIdx', loginAuth, async (req, res) => {
    //from FE
    const postIdx = req.params.postIdx;
    const postData = req.body;
    const token = req.cookies.token;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await modifyPost(postIdx, postData, token);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

router.delete('/:postIdx', loginAuth, async (req, res) => {
    //from FE
    const postIdx = req.params.postIdx;
    const token = req.cookies.token;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deletePost(postIdx, token);
    }catch(err){
        err.err ? console.log(err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;