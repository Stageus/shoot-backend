const redis = require('redis').createClient();

module.exports = (req, res, next) => {
    (async () => {
        const title = req.body.title || '';
        const loginUserEmail = req.email || '';
        
        try{
            await redis.connect();

            const existState = await redis.exists(`post_upload_${loginUserEmail}_${title}`);
            if(existState){
                await redis.disconnect();

                res.status(423).send({
                    message : 'too many request'
                });
            }else{
                await redis.set(`post_upload_${loginUserEmail}_${title}`, 1);
                await redis.expire(`post_upload_${loginUserEmail}_${title}`, 60); // 1 minutes

                await redis.disconnect();

                next();
            }
        }catch(err){
            console.log(err);

            if(redis.isOpen){
                await redis.disconnect();
            }
            
            res.status(409).send({
                message : 'unexpected error occured'
            });
        }
    })();
}