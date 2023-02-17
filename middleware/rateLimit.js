const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
    windowMs: 5 * 1000,
    max: 20,
    handler(req, res) {
        res.status(423).send({
            message : 'too many request'
        });
    },
})