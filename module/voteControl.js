const elastic = require('elasticsearch');
const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addVote = (voteIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT vote_channel
            const insertVoteChannelSql = 'INSERT INTO shoot.vote_channel (vote_idx, email) VALUES ($1, $2)';
            await pgClient.query(insertVoteChannelSql, [voteIdx, loginUserEmail]);

            //UPDATE post_contents_vote
            const updateVoteSql = 'UPDATE shoot.post_contents_vote SET vote_count = vote_count + 1 WHERE vote_idx = $1';
            await pgClient.query(updateVoteSql, [voteIdx]);

            //COMMIT
            await pgClient.query('COMMIT');

            resolve(1);
        }catch(err){
            await pgClient.query('ROLLBACK');

            if(err.code == 23505){  //unique error
                reject({
                    statusCode : 403,
                    message : 'already vote'
                });
                return;
            }else if(err.code == 23503){ //no vote-idx error
                reject({
                    statusCode : 404,
                    message : 'cannot find vote'
                });
                return;
            }

            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    });
}

const deleteVote = (voteIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT vote_channel
            const insertVoteChannelSql = 'INSERT INTO shoot.vote_channel (vote_idx, email) VALUES ($1, $2)';
            await pgClient.query(insertVoteChannelSql, [voteIdx, loginUserEmail]);

            //UPDATE post_contents_vote
            const updateVoteSql = 'UPDATE shoot.post_contents_vote SET vote_count = vote_count + 1 WHERE vote_idx = $1';
            await pgClient.query(updateVoteSql, [voteIdx]);

            //COMMIT
            await pgClient.query('COMMIT');

            resolve(1);
        }catch(err){
            await pgClient.query('ROLLBACK');

            if(err.code == 23505){  //unique error
                reject({
                    statusCode : 403,
                    message : 'already vote'
                });
                return;
            }else if(err.code == 23503){ //no vote-idx error
                reject({
                    statusCode : 404,
                    message : 'cannot find vote'
                });
                return;
            }

            reject({
                statusCode : 409,
                message : 'unexpected error occured',
                err : err
            });
        }
    })
}

module.exports = {
    addVote : addVote,
    deleteVote : deleteVote
}