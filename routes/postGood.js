const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addPostGood } = require('../module/postGoodControl');

router.post('/:postIdx', loginAuth, async (req, res) => {
    //from FE
    const postIdx = req.params.postIdx;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statsuCode = 200;

    //main
    try{
        await addPostGood(postIdx, loginUserEmail);
        console.log('end');
    }catch(err){
        //err.err ? console.log(err.err) : null;
        console.log(err);

        statusCode = err.statsuCode;
        result.message = err.message;
    }

    //send result
    res.status(statsuCode).send(result);
});

module.exports = router;