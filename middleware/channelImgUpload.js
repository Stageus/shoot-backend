const multer = require('multer');
const multerS3 = require('multer-s3-transform');
const channelDataValidCheck = require('../module/channelDataValidCheck');
const s3 = require('s3');
const AWS = require('aws-sdk');
const awsConfig = require('../config/awsConfig');

AWS.config.update(awsConfig);

const channelImgUpload = multer({
    storage: multerS3({
        s3 : s3,
        bucket : "jochong/channel_img",
        contentType : multerS3.AUTO_CONTENT_TYPE,
        key : () => {
            const imgName = '';
            cb(null, name);
        },
        acl : 'public-read',
        contentType : multerS3.AUTO_CONTENT_TYPE,
    }),
    fileFilter : (req, file, cb)=>{
        //channel data check
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