const channelImgUpload = require('../middleware/channelImgUpload');
const blockCheck = require('../module/blockCheck');
const { addChannel, getChannel, getAllChannel, deleteChannel, modifyChannel, modifyPw } = require('../module/channelControl');
const { getSubscribeState } = require('../module/subscribeControl');
const router = require('express').Router();
const verifyToken = require('../module/verifyToken');
const logoutAuth = require('../middleware/logoutAuth');
const loginAuth = require('../middleware/loginAuth');

router.get('/all', async (req, res) => {
    //from FE
    const searchKeyword = req.query.search;
    const scrollId = req.query.scroll;
    const size = req.query.size || 30;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const getChannelAllResult = await getAllChannel(searchKeyword, scrollId, size);

        result.data = getChannelAllResult.data;
        result.scroll = getChannelAllResult.scrollId; 
    }catch(err){
        console.log(err);

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/:email', async (req, res) => {
    //from FE
    const email = req.params.email;
    const token = req.cookies.token;
    
    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const block = await blockCheck(email);

        if(!block.state){
            //blocked channel
            result.message = 'blocked channel';
            statusCode = 404;
        }else{
            result.data = await getChannel(email, verifyToken(token).email);
        }
    }catch(err){
        err.err ? console.log(err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.post('/', logoutAuth, channelImgUpload, async (req, res) => {
    //from FE
    req.body.imgName = req?.file?.key;
    const loginType = req.body.loginType;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        if(loginType){
            await addChannel(req.body);
        }else{
            await addChannel(req.body, loginType);
        }
    }catch(err){
        console.log(err);

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

router.put('/', loginAuth, channelImgUpload, async (req, res) => {
    //from FE
    const modifyData = req.body || {};
    const loginUserEmail = req.email || '';
    req.body.channelImg = req?.file?.key;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{    
        await modifyChannel(loginUserEmail, modifyData);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.put('/pw', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';
    
    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await modifyPw(loginUserEmail, req.body);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.delete('/:channelEmail', loginAuth, async (req, res) => {
    //from FE
    const deleteEmail = req.params.channelEmail;
    const token = req.cookies.token;

    //to FE
    const result = {};
    let statusCode = 200;
    
    //main
    try{
        await deleteChannel(deleteEmail, token);
    }catch(err){
        err.err !== undefined ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;