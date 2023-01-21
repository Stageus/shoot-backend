const multer = require('multer');
const multerS3 = require('multer-s3-transform');
const channelDataValidCheck = require('../module/channelDataValidCheck');
const AWS = require('aws-sdk');
const awsConfig = require('../config/awsConfig');

AWS.config.update(awsConfig);

const channelImgUpload = multer({
    storage: multerS3({
        s3 : new AWS.S3(),
        bucket : "jochong/channel_img",
        contentType : multerS3.AUTO_CONTENT_TYPE,
        key : (req, file, cb) => {
            const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, 0);
            const date = new Date();
            cb(null, `profileImg-${date.getTime()}-${randomNumber}`);
        },
        acl : 'public-read',
        contentType : multerS3.AUTO_CONTENT_TYPE,
    }),
    fileFilter : (req, file, cb)=>{
        const { state, message } = channelDataValidCheck(req.body);
        if(!(file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg")){
            cb(new Error('invalid file type'));
        }else if(state){
            cb(null, true);
        }else{
            cb(new Error(message));
        }
    },
    limits : {
        fileSize: 1 * 1024 * 1024, //1MB
        files : 1
    }
})

module.exports = async (req, res, next) => {
    channelImgUpload.single('channelImg')(req, res, (err) => {
        if(err){
            console.log(err);

            //send result
            res.status(400).send({
                message : err.message
            });
        }else{
            next();
        }
    })
};