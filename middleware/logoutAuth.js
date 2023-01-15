const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwtConfig');

module.exports = (req, res, next) => {
    //from FE
    const token = req.cookies?.token;

    //main
    try{
        const userData = jwt.verify(token, jwtConfig.jwtSecretKey);

        if(userData.email){
            //send result
            res.status(401).send({ message : 'already logged in' });
            return;
        }
    }catch(err){
        res.clearCookie('token');
    }

    //next
    next();
}