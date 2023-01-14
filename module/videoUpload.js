const multer = require('multer');
const multerS3 = require('multer-s3-transform');
const s3 = require('../module/s3');

//s3에 저장할 때 사용할 옵션
const postImgUpload = multer({
    storage: multerS3({
        s3 : s3,
        bucket : "jochong/post",
        contentType : multerS3.AUTO_CONTENT_TYPE,
        //check img file
        shouldTransform: function (req, file, cb) {
            cb(null, /^image/i.test(file.mimetype));
        },
        //img file resizing
        transforms: [
            {
                id: 'post_img',
                key: function (req, file, cb) {
                    cb(null, Date.now().toString()+'.png');
                },
                transform: function (req, file, cb) {
                    cb(null, sharp().resize({width : 300}));
                }
            }
        ],
        acl : 'public-read',
        contentType : multerS3.AUTO_CONTENT_TYPE,
    }),
    //check body data
    fileFilter : (req, file, cb)=>{
        if(req.body.title.length !==0 && req.body.title.length <= 32 && req.body.contents.length !== 0){
            cb(null, true);
        }else{
            cb(null, false);
        }
    },
    //limit file size
    limits : {
        fileSize: 1 * 1024 * 1024,
        files : 3 
    }
})

module.exports = async (req, res, next) => {
    postImgUpload.array('postImg')(req, res, (err) => {
        if(err){
            console.log(err);

            //send result
            res.status(400).send({
                message : 'file size is too much large'
            });
        }else{ 
            next();
        }
    })
};