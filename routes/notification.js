const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { getAllNotification } = require('../module/notificationControl');

router.get('/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const getResult = await getAllNotification(loginUserEmail, 10);
        
        result.data = getResult.notification;
        result.scroll = getResult.scrollId;
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;