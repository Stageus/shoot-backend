const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const { createClient } = require("redis");

const authApi = require('./routes/auth');
const bookmarkApi = require('./routes/bookmark');
const categoryApi = require('./routes/category');
const channelApi = require('./routes/channel');
const commentApi = require('./routes/comment');
const historyApi = require('./routes/history');
const notificationApi = require('./routes/notification');
const notificationOffApi = require('./routes/notificationOff');
const notificationOnApi = require('./routes/notificationOn');
const postApi = require('./routes/post');
const replyCommentApi = require('./routes/replyComment');
const voteApi = require('./routes/vote');
const requestCategoryApi = require('./routes/requestCategory');
const reportApi = require('./routes/report');
const searchHistoryApi = require('./routes/searchHistory');
const searchHistoryOffApi = require('./routes/searchHistoryOff');
const logApi = require('./routes/log');
const blockChannelApi = require('./routes/blockChannel');

// config ===========================================================
const { httpPort, httpsPort } = require('./config/portConfig');
const { publicPath } = require('./config/pathConfig');
const sessionOption = require('./config/sessionConfig');

// setting ==========================================================
let redisClient = createClient({ legacyMode: true });
redisClient.connect().catch(console.error);
sessionOption.store = new RedisStore({ client: redisClient });

// middleware =======================================================
app.use(express.json());
app.use(session(sessionOption));

// routes ===========================================================
app.use('/post', postApi);
app.use('/auth', authApi);
app.use('/channel', channelApi);
app.use('/vote', voteApi);
app.use('/comment', commentApi);
app.use('/reply-comment', replyCommentApi);
app.use('/history', historyApi);
app.use('/bookmark', bookmarkApi);
app.use('/notification', notificationApi);
app.use('/notification-on', notificationOnApi);
app.use('/notification-off', notificationOffApi);
app.use('/category', categoryApi);
app.use('/request-category', requestCategoryApi);
app.use('/report', reportApi);
app.use('/search-history', searchHistoryApi);
app.use('/search-history-off', searchHistoryOffApi);
app.use('/log', logApi);
app.use('/block-channel', blockChannelApi);

// api ==============================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html')); 
});

app.listen(httpPort, () => {
    console.log(`server on port : ${httpPort}`);
});