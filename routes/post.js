const router = require('express').Router();
const { getBookmarkPostAll, addPost, deletePost, getPostByPostIdx, getPostByScrollId, modifyPost, getPostByMatch, getPostBySearch, getHotPostAll, getHistoryPostAll, getPostAll, getSubscribePostAll } = require('../module/postControl');
const loginAuth = require('../middleware/loginAuth');
const postFileUpload = require('../middleware/postFileUpload');
const verifyToken = require('../module/verifyToken');
const { addHistory } = require('../module/historyControl');

router.get('/all', async (req, res) => {
    //from FE
    const matchType= req.query['match-type'];
    const match = req.query['match'];
    const searchType = req.query['search-type'];
    const search = req.query['search'];
    const sortby = req.query['sortby'];
    const orderby = req.query['orderby'];
    const scrollId = req.query['scroll'];

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        let postData = {};
        if(scrollId){
            postData = await getPostByScrollId(scrollId);
        }else if(matchType){
            postData = await getPostByMatch(matchType, match, sortby, orderby);
        }else if(searchType){
            postData = await getPostBySearch(searchType, search, sortby, orderby);
        }else{
            postData = await getPostAll(sortby, orderby, 20);
        }
        result.data = postData.postArray;
        result.scroll = postData.scrollId;
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/hot/all', async (req, res) => {
    //to FE
    const result = {};
    let statusCode = 200;
    
    //main
    try{
        const postData = await getHotPostAll();
        result.scroll = postData.scrollId;
        result.data = postData.postArray;
    }catch(err){
        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/history/all', loginAuth, async (req, res) => {
    //from FE
    const scroll = req.query['scroll'] || -1;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getHistoryPostAll(loginUserEmail, scroll, 20);
    }catch(err){
        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/subscribe/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email;
    const groupby = req.query.groupby || 'post';
    const scroll = req.query.scroll || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getSubscribePostAll(loginUserEmail, groupby, scroll, 10);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/bookmark/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';
    const scroll = req.query.scroll || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getBookmarkPostAll(loginUserEmail, scroll, 2);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
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

        try{
            await addHistory(postIdx, verifyToken(token).email);
        }catch(err){
            console.log(err);
        }
    }catch(err){
        err.err ? console.log(err.err) : null

        result.message = err.message;
        statusCode = statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.post('/', loginAuth, postFileUpload, async (req, res) => {
    //from FE
    req.body.video = req.files?.video?.[0]?.key;
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
        statusCode = err.statusCode || 409;
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
        statusCode = err.statusCode || 409;
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
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;