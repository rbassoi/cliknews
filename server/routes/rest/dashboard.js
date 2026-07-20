'use strict';

const passport = require('../../lib/passport');
const dashboard = require('../../models/dashboard');

const router = require('../../lib/router-async').create();

router.getAsync('/dashboard-stats', passport.loggedIn, async (req, res) => {
    return res.json(await dashboard.getStats(req.context));
});

module.exports = router;
