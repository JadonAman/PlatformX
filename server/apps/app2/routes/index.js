const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send(`App Home: ${req.appName}`);
});

router.get('/hello', (req, res) => {
    res.send(`Hello from ${req.appName}`);
});

module.exports = router;
