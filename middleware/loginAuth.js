const verifyToken = require('../module/verifyToken');

module.exports = (req, res, next) => {
    //from FE
    const token = req.cookies?.token;
    
    //main
    const verify = verifyToken(token);

    if(verify.state){
        req.email = verify.email;
        req.authority = verify.authority;
        next();
    }else{
        res.status(401).send({ message : verify.reason || 'no login' });
    }
}