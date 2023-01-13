const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addPost = () => {
    return Promise(async (resolve, reject) => {
        try{    
            //connect es
            const esClient = new elastic.Client({
                node : 'http://localhost:9200'
            })

            //es test
            const postState = await esClient.indices.exists({
                index : 'post',
            });

            //connect psql
            const pgClient = new Client(pgConfig);
            await pgClient.connect();

            //psql test
            const selectData = await pgClient.query('SELECT NOW()');
            const now = selectData.rows[0];

            resolve([postState, now]);
        }catch(err){
            console.log(err);
        }
    })
}

module.exports = {
    addPost : addPost,
}