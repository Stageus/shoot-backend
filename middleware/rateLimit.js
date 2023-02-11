const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
    windowMs: 10 * 1000,
    max: 10,
    handler(req, res) {
        res.status(423).send({
            message : 'too many request'
        });
    },
})