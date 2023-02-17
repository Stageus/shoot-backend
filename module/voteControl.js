const { Client } = require('pg');
const pgConfig = require('../config/psqlConfig');

const addVote = (voteIdx, loginUserEmail) => {
    return new Promise(async (resolve, reject) => {
        const pgClient = new Client(pgConfig);

        try{
            await pgClient.connect();

            //BEGIN
            await pgClient.query('BEGIN');

            //SELECT post_idx
            const selectDuplicationSql = `SELECT
                                            vote_channel_idx
                                        FROM
                                            shoot.vote_channel
                                        JOIN
                                            shoot.post_contents_vote
                                        ON
                                            shoot.post_contents_vote.vote_idx = shoot.vote_channel.vote_idx
                                        WHERE
                                            post_idx = ( SELECT post_idx FROM shoot.post_contents_vote WHERE vote_idx = $1 )
                                        AND
                                            shoot.vote_channel.email = $2
                                        `;
            const selectDuplicationResult = await pgClient.query(selectDuplicationSql, [voteIdx, loginUserEmail]);

            if(selectDuplicationResult.rows.length === 0){
                //INSERT vote_channel
                const insertVoteChannelSql = 'INSERT INTO shoot.vote_channel (vote_idx, email) VALUES ($1, $2)';
                await pgClient.query(insertVoteChannelSql, [voteIdx, loginUserEmail]);

                //UPDATE post_contents_vote
                const updateVoteSql = 'UPDATE shoot.post_contents_vote SET vote_count = vote_count + 1 WHERE vote_idx = $1';
                await pgClient.query(updateVoteSql, [voteIdx]);

                //COMMIT
                await pgClient.query('COMMIT');

                await pgClient.end();

                resolve(1);
            }else{
                await pgClient.end();

                reject({
                    statusCode : 403,
                    message : 'already vote'
                });
            }   
        }catch(err){
            if(pgClient._connected){
                await pgClient.query('ROLLBACK');
                await pgClient.end();
            }

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

            //SELECT
            const selectVoteSql = 'SELECT * FROM shoot.post_contents_vote WHERE vote_idx = $1';
            const selectVoteResult = await pgClient.query(selectVoteSql, [voteIdx]);

            if(selectVoteResult.rows.length === 0){
                await pgClient.end();

                reject({
                    statusCode : 404,
                    message : 'cannot find vote'
                });
                return;
            }

            //BEGIN
            await pgClient.query('BEGIN');

            //DELETE
            const deleteVoteChannelSql = 'DELETE FROM shoot.vote_channel WHERE vote_idx = $1 AND email = $2';
            const deleteVoteChannelResult = await pgClient.query(deleteVoteChannelSql, [voteIdx, loginUserEmail]);

            if(deleteVoteChannelResult.rowCount !== 0){
                //UPDATE post_contents_vote
                const updateVoteSql = 'UPDATE shoot.post_contents_vote SET vote_count = vote_count - 1 WHERE vote_idx = $1';
                await pgClient.query(updateVoteSql, [voteIdx]);

                //COMMIT
                await pgClient.query('COMMIT');

                await pgClient.end();

                resolve(1);
            }else{
                await pgClient.end();

                reject({
                    statusCode : 403,
                    message : 'do not have vote channel record'
                });
            }
        }catch(err){
            if(pgClient._connected){
                await pgClient.query('ROLLBACK');
                await pgClient.end();
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