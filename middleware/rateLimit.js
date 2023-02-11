const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    handler(req, res) {
        console.log('hi');
        res.status(423).send({
            message : 'too many request'
        });
    },
})