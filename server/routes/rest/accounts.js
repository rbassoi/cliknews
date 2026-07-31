'use strict';

const passport = require('../../lib/passport');
const accounts = require('../../models/accounts');
const {castToInteger} = require('../../lib/helpers');

const router = require('../../lib/router-async').create();

router.postAsync('/pending-accounts-table', passport.loggedIn, async (req, res) => {
    return res.json(await accounts.listPendingDTAjax(req.context, req.body));
});

router.postAsync('/pending-accounts/:accountId/approve', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await accounts.approvePending(req.context, castToInteger(req.params.accountId));
    return res.json();
});

router.postAsync('/pending-accounts/:accountId/reject', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await accounts.rejectPending(req.context, castToInteger(req.params.accountId));
    return res.json();
});

module.exports = router;
