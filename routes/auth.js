const router = require('express').Router();
const redis = require('redis').createClient();
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const sendEmail = require('../module/sendEmail');
const passport = require('../module/passport');
const logoutAuth = require('../middleware/logoutAuth');
const loginAuth = require('../middleware/loginAuth');
const createToken = require('../module/createToken');
const { getChannel } = require('../module/channelControl');

router.get('/', loginAuth, (req, res) => {
    //from FE
    const email = req.email;

    //send result
    res.status(200).send({ email : email });
});

router.post('/local', logoutAuth, (req, res, next) => {
    //from FE
    const { email, pw } = req.body;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    if(!email || !pw){
        result.message = 'email and password must required';
        statusCode = 400;

        //send result
        res.status(statusCode).send(result);
    }else{
        passport.authenticate('local', (err, email, channelData) => {
            if(err){
                statusCode = err.statusCode;
                result.message = err.message;
                result.blockEndTime = err.blockEndTime;
                result.blockReason = err.blockReason;
            }else{
                //auto login check
                let expiresIn = '1h';
                if(req.body.autoLogin){
                    expiresIn = '48h';
                }

                //set token
                const token = createToken({ email : email, authority : channelData.authority }, expiresIn);
    
                //cookie
                res.cookie('token', token);
            }
    
            //send result
            res.status(statusCode).send(result);
        })(req, res, next);
    }    
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email']}));
 
router.get('/google/callback', (req, res) => {
    passport.authenticate('google', async (err, email, info) => {
        if(err){
            if(err.statusCode === 409){ //unexpected error
                res.cookie('statusCode', 409);
            }else if(err.statusCode === 403){ //blocked email
                res.cookie('statusCode', 403);
                res.cookie('blockEndTime', err.blockEndTime);
                res.cookie('blockReason', err.blockReason);
            }

            res.redirect('/login');
        }else if(info){ //first login
            await redis.connect();
    
            await redis.set(`certified_email_${email}_google`);
            await redis.expire(`certified_email_${email}_google`, 60 * 60 * 24);
    
            await redis.disconnect();

            res.cookie('statusCode', 200);
            res.cookie('loginType', 'google');
            res.cookie('email', email);

            res.redirect('/signup');
        }else{ //login success
            const token = createToken(email);
            res.cookie('token', token);

            res.redirect('/');
        }
    })
});

router.delete('/', loginAuth, async (req, res) => {
    res.clearCookie('token');
    res.status(200).send({});
});

router.get('/channel', loginAuth, async (req, res) => {
    //from FE
    const email = req.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const channelData = await getChannel(email);
        
        result.data = channelData;
    }catch(err){
        result.message = err.message;
        statusCode = err.statusCode;
    }

    //send result
    res.status(statusCode).send(result);
})

router.get('/number/:email', async (req, res) => {
    //from FE
    const email = req.params.email;
    const inputNumber = req.query.number;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        await redis.connect();

        const authNumber = await redis.get(`${email}_auth_number`);
        
        if(authNumber === null){
            result.message = 'no email is being authenticated';
            statusCode = 403;
        }else if(authNumber !== inputNumber){
            result.message = 'incorrect auth number';
            statusCode = 400;
        }else{
            await redis.set(`certified_email_${email}`, 1);
            await redis.expire(`certified_email_${email}`, 60 * 30);
            await redis.del(`${email}_auth_number`);
        }

        await redis.disconnect();
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occured';
        statusCode = 409;
    }

    //send reuslt
    res.status(statusCode).send(result);
});

router.post('/number', async (req, res) => {
    //from FE
    const email = req.body.email;
    
    //to FE
    const result = {};
    let statusCode = 200;

    //main
    const emailExp = new RegExp('^[a-zA-Z0-9+-\_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$');
    if(!emailExp.test(email)){
        result.message = "invalid email";
        statusCode = 400;
    }else{
        try{
            const pgClient = new Client(pgConfig);
            
            await pgClient.connect();
            await redis.connect();
    
            const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, 0);

            //check auth number already exists
            const existState = await redis.exists(`${email}_auth_number`);
            if(existState) await redis.del(`${email}_auth_number`);

            //check email already has authentication
            const authState = await redis.exists(`certified_email_${email}`);
            if(authState) await redis.del(`certified_email_${email}`);

            //set auth number on redis
            await redis.set(`${email}_auth_number`, randomNumber);
            await redis.expire(`${email}_auth_number`, 60 * 3); //3minutes

            await redis.disconnect();

            await sendEmail(email, randomNumber);
        }catch(err){
            console.log(err);
    
            result.message = "unexpected error occured";
            statusCode = 409;
        }
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;