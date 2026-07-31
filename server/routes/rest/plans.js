'use strict';

const passport = require('../../lib/passport');
const plans = require('../../models/plans');

const router = require('../../lib/router-async').create();

router.getAsync('/plans', passport.loggedIn, async (req, res) => {
    return res.json(await plans.listActive());
});

module.exports = router;
