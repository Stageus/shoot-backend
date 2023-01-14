const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addChannel = (channelData) => {
    return new Promise(async (resolve, reject) => {
        const { email, pw, pwCheck, birth, sex, channelName } = channelData;
        
        console.log(channelData);
    })
}

module.exports = {
    addChannel : addChannel,
}