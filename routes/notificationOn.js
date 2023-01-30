const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addNotificationOn } = require('./notificationOnControl');

router.post('/', loginAuth, async (req, res) => {
    //from FE
    const notiEmail = req.query.email || '';
    const loginUserEmail = req.email || '';

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await addNotificationOn(loginUserEmail, notiEmail);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;