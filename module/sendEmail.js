const nodemailer = require('nodemailer');
const gmailConfig = require('../config/gmailConfig');
const myMail = gmailConfig.gmail;
const myPassword = gmailConfig.password;

module.exports =  (email, contents) => {
    return new Promise(async (resolve, reject) => {
        const transport = nodemailer.createTransport({
            service : "gmail",
            auth : {
                user : myMail,
                pass : myPassword
            }
        });
    
        const mailOption = {
            from : myMail,
            to : email,
            subject : 'SHOOT 인증번호',
            html : `<h1>${contents}</h1>`
        }

        transport.sendMail(mailOption, (err, info) => {
            if(err) reject(err);
            resolve(info);
        })
    })
}