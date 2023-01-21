const router = require('express').Router();
const { addPost, deletePost, getPostByPostIdx, getPostByScrollId, modifyPost, getPostByMatch, getPostBySearch } = require('../module/postControl');
const loginAuth = require('../middleware/loginAuth');
const postFileUpload = require('../middleware/postFileUpload');
const verifyToken = require('../module/verifyToken');

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
            postData = await getPostAll(20);
        }
        result.data = postData.postArray;
        result.scroll = postData.scrollId;
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    console.log(result);
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