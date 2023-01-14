const router = require('express').Router();
const redis = require('redis').createClient();
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');
const sendEmail = require('../module/sendEmail');

router.get('/number/:email', async (req, res) => {
    //from FE
    const email = req.params.email;
    const inputNumber = req.body.number;

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
            await redis.set(`certified_email_${email}`, true);
            redis.expire(`certified_email_${email}`, 60 * 30);
        }

        await redis.disconnect();
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occured';
        statusCode = 409;
    }

    //send reuslt
    res.status(statusCode).send(result);
})

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
})

module.exports = router;