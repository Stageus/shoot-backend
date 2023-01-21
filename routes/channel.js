const channelImgUpload = require('../middleware/channelImgUpload');
const blockCheck = require('../module/blockCheck');
const { addChannel, getChannel, getAllChannel, deleteChannel } = require('../module/channelControl');
const { getSubscribeState } = require('../module/subscribeControl');
const router = require('express').Router();
const verifyToken = require('../module/verifyToken');
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
})

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
            result.data = await getChannel(email);

            //get subscribe state
            const verify = verifyToken(token);
            const myEmail = verify.email;
            if(verify.state && email !== myEmail){
                const subscribeData = await getSubscribeState(myEmail, email);
                result.data.subscribe_state = subscribeData.state;
            }
        }
    }catch(err){
        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
})

router.post('/', loginAuth, channelImgUpload, async (req, res) => {
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
})

router.delete('/:channelEmail', loginAuth, async (req, res) => {
    //from FE
    const deleteEmail = req.params.channelEmail;
    const token = req.cookies.token;

    //to FE
    const result = {};
    let statusCode = 200;
    
    //main
    try{
        //await deleteChannel(deleteEmail, token);
    }catch(err){
        err.err !== undefined ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
})

module.exports = router;