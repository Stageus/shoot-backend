const jwtConfig = require('../config/jwtConfig');
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    //from FE
    const token = req.cookies?.token;

    //main
    try{
        const userData = jwt.verify(token, jwtConfig.jwtSecretKey);
        console.log(userData);
        req.email = userData.email;

        next();
    }catch(err){
        res.status(401).send({ message : err.message });
    }
}