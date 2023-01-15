const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwtConfig');
const verifyToken = require('../module/verifyToken');

module.exports = (req, res, next) => {
    //from FE
    const token = req.cookies?.token;

    //main
    const verify = verifyToken(token);
    if(verify.state){
        res.status(401).send({ message : verify.reason || 'already logged in' });
    }else{
        res.clearCookie('token');
        next();
    }
}