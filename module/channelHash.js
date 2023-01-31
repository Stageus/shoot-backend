const crypto = require('crypto');

module.exports = (channelEmail) => {
    return crypto.createHmac('sha256', 'asdfasdf').update(channelEmail).digest('hex');
}