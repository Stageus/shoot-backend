const channelImgUpload = require('../middleware/channelImgUpload');
const { addChannel } = require('../module/channelControl');
const router = require('express').Router();

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