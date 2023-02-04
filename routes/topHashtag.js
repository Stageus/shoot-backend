const { getAllTopHashtag } = require('../module/topHashtagControl');

const router = require('express').Router();

router.get('/all', async (req, res) => {
    //from FE
    const categoryIdx = req.query.category || -1;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        result.data = await getAllTopHashtag(categoryIdx);
    }catch(err){
        err.err ? console.log(err.err) : null;

        result.message = err.message;
        statusCode = err.statusCode || 409;
    }

    res.status(statusCode).send(result);
});

module.exports = router;