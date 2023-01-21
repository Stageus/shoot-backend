const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwtConfig');

module.exports = (token) => {
    try{
        const data = jwt.verify(token, jwtConfig.jwtSecretKey);

        return {
            state : true,
            email : data.email,
            authority : data.authority
        }
    }catch(err){
        return {
            state : false
        }
    }
}