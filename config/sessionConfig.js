require('dotenv').config();

module.exports = {
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires : new Date(Date.now() + 1000 * 60 * 60) //1 hours
    }
}