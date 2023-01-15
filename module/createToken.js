const jwtConfig = require('../config/jwtConfig');
const jwt = require('jsonwebtoken');

module.exports = (data, expiresIn = '1h') => {
    const token = jwt.sign(
        data,
        jwtConfig.jwtSecretKey,
        {
            expiresIn : expiresIn,
            issuer : 'shoot'
        }
    );

    return token;
}