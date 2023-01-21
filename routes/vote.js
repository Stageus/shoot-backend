const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addVote } = require('../module/voteControl');

router.post('/:voteIdx', loginAuth, async (req, res) => {
    //from FE
    const voteIdx = req.params.voteIdx;
    const loginUserEmail = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addVote(voteIdx, loginUserEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;