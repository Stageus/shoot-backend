require('dotenv').config();

module.exports = {
    httpPort : process.env.HTTP_PORT,
    httpsPort : process.env.HTTPS_PORT,
}