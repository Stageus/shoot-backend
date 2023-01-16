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
                console.log(req.body);
                //auto login check
                let expiresIn = '1h';
                if(req.body.autoLogin){
                    expiresIn = '48h';
                }

                //set token
                const token = createToken({ email : email }, expiresIn);
    
                //cookie
                res.cookie('token', token);
            }
    
            //send result
            res.status(statusCode).send(result);
        })(req, res, next);
    }    
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email']}));
 
// 이거 고쳐야함
router.get('/google/callback', (req, res) => {
    passport.authenticate('google', async (err, email, info) => {
        if(err){
            console.log(err);

            let cookieData = '';
            if(err.statusCode === 409){
                //예상치못한 에러
                cookieData = JSON.stringify({
                    statusCode : 409,
                    message : 'unexpected error occured'
                });
            }else if(err.statusCode === 403){
                //정지된 계정
                cookieData = JSON.stringify({
                    statusCode : 403
                });
            }
            res.cookie('login_error', cookieData);
            // ==============================================여기 로그인 페이지로 리디렉션 코드 넣어야함


        }else if(info){
            //최초 로그인
            console.log('최초 로그인 입니다.');
    
            await redis.connect();
    
            await redis.set(`certified_email_${email}_google`);
            await redis.expire(`certified_email_${email}_google`, 60 * 60 * 24);
    
            await redis.disconnect();
            // ==============================================여기 소셜 로그인 회원가입 페이지로 리디렉션 코드 넣어야함
            res.redirect();
        }else{
            //정상적 로그인
            const token = createToken(email);
            res.cookie('token', token);

            res.redirect('/');
        }
        console.log(err, email, info);
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
        console.log('/auth/channel');
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
    
            const selectSql = 'select * from shoot.channel WHERE email = $1';
            const selectData = await pgClient.query(selectSql, [email]);
    
            if(selectData.rows.length === 0){
                const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, 0);
                
                await redis.connect();
    
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
            }else{
                result.message = "this email already exists";
                statusCode = 403;
            }
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