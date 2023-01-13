const router = require('express').Router();
const { addPost } = require('../module/postControl');

router.get('/all', async (req, res) => {
    const data = await addPost();
    console.log(data);

    res.send(data);
})

module.exports = router;