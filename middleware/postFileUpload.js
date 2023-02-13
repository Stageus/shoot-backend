const multer = require('multer');
const multerS3 = require('multer-s3-transform');
const AWS = require('aws-sdk');
const awsConfig = require('../config/awsConfig');
const postDataValidCheck = require('../module/postDataValidCheck');

AWS.config.update(awsConfig);

const postFileUpload = multer({
    storage: multerS3({
        s3 : new AWS.S3(),
        bucket : "jochong/post",
        contentType : multerS3.AUTO_CONTENT_TYPE,
        key : (req, file, cb) => {
            const date = new Date();
            if(file.fieldname === 'video'){
                const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, 0);
                cb(null, `video-${date.getTime()}-${randomNumber}`);
            }else if(file.fieldname === 'thumbnail'){
                const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, 0);
                cb(null, `thumbnail-${date.getTime()}-${randomNumber}`);
            }else{
                cb(new Error('invalid body data with file'));
            }
        },
        acl : 'public-read',
        contentType : multerS3.AUTO_CONTENT_TYPE,
    }),
    fileFilter : (req, file, cb)=>{
        if(!req.files.video){
            cb(new Error('video is required'));
        }else{
            const { state, message } = postDataValidCheck(req.body);
            if(file.fieldname === 'video'){
                if(file.mimetype !== "video/mp4"){
                    cb(new Error('invalid file type'));
                }else if(state){
                    cb(null, true);
                }else{
                    cb(new Error(message));
                }
            }else if(file.fieldname === 'thumbnail'){
                if(!(file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg")){
                    cb(new Error('invalid file type'));
                }else if(state){
                    cb(null, true);
                }else{
                    cb(new Error(message));
                }
            }else{
                cb(new Error('invalid body data with file'));
            }
        }
    },
    limits : {
        fileSize: 50 * 1024 * 1024, //
    }
});

module.exports = (req, res, next) => {
    postFileUpload.fields([
        {
            name : 'video',
            maxCount : 1,
        },
        {
            name : 'thumbnail',
            maxCount : 1,
        }
    ])(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.log(err);
        }else if(err){
            //send result
            res.status(400).send({
                message : err.message
            });
        }else if(!req?.files?.video){
            res.status(400).send({
                message : 'video is required'
            });
        }else{
            next();
        }
    })
};