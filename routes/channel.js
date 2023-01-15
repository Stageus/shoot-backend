const channelImgUpload = require('../middleware/channelImgUpload');
const blockCheck = require('../module/blockCheck');
const { addChannel, getChannel } = require('../module/channelControl');
const { getSubscribeState } = require('../module/subscribeControl');
const router = require('express').Router();
const verifyToken = require('../module/verifyToken');

router.get('/all', async (req, res) => {
    //from FE
    const searchKeyword = req.query.search;
    const lastChannelEmail = req.query.scroll;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
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

router.post('/', channelImgUpload, async (req, res) => {
    //from FE
    req.body.imgName = req?.file?.key;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addChannel(req.body);
    }catch(err){
        console.log(err);

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
})

module.exports = router;