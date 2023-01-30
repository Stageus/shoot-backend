const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addNotificationOff } = require('../module/notificationOffControl');

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';
    const type = req.body.type || 'post';
    const idx = req.body.idx || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addNotificationOff(loginUserEmail, type, idx);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;