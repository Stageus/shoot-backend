const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwtConfig');

module.exports = (token) => {
    try{
        const data = jwt.verify(token, jwtConfig.jwtSecretKey);

        return {
            state : true,
            email : data.email
        }
    }catch(err){
        return {
            state : false
        }
    }
}