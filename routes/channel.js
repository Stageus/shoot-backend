const channelImgUpload = require('../middleware/channelImgUpload');
const { addChannel } = require('../module/channelControl');
const router = require('express').Router();

router.post('/', channelImgUpload, async (req, res) => {
    //from FE
    const { email, pw, pwCheck, birth, sex, channelName } = req.body;

    //to FE
    const result = {};
    const statusCode = 200;

    //main
    await addChannel(req.body);

    //send result
    res.sendStatus(statusCode).send(result);
})

module.exports = router;