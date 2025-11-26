const express = require('express');

module.exports = () => {
    const router = express.Router();

    const routes = require('./routes/index');
    router.use('/', routes);

    return router;
};
