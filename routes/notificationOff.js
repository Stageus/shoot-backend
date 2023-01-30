const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const { addNotificationOff, deleteNotificationOff, getNotificationOffState } = require('../module/notificationOffControl');

router.get('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';
    const type = req.query.type || 'post';
    const idx = req.query.idx || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getNotificationOffState(loginUserEmail, type, idx);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }
 
    //send result
    res.status(statusCode).send(result);
});

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

router.delete('/', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.email || '';
    const type = req.query.type || 'post';
    const idx = req.query.idx || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await deleteNotificationOff(loginUserEmail, type, idx);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }
 
    //send result
    res.status(statusCode).send(result);
});

module.exports = router;