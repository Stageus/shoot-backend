const crypto = require('crypto');
const hashConfig = require('../config/hashConfig');

module.exports = (password) => {
    return crypto.createHmac('sha256', hashConfig.secret).update(password).digest('hex');
}