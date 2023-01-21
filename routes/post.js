const router = require('express').Router();
const { addPost } = require('../module/postControl');

router.get('/all', async (req, res) => {
    //
    const data = await addPost();

    res.send(data);
})

router.post('/', async (req, res) => {
    //from FE
    
});

module.exports = router;