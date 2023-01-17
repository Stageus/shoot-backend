const router = require('express').Router();
const { addPost } = require('../module/postControl');
const loginAuth = require('../middleware/loginAuth');
const postFileUpload = require('../middleware/postFileUpload');

router.get('/all', async (req, res) => {
    res.send(data);
})

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

module.exports = router;