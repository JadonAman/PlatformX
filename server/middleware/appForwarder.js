async function appForwarder(req, res, next) {
    if (!req.appRouter) {
        return next();
    }

    try {
        req.appRouter(req, res, next);
    } catch (err) {
        return res.status(500).json({ error: 'Application router error' });
    }
}

module.exports = {
    appForwarder,
};
