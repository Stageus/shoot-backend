const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addBookmark } = require('../module/bookmarkControl');

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const postIdx = req.query['postIdx'] || -1;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addBookmark(postIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;