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

router.postAsync('/accounts-table', passport.loggedIn, async (req, res) => {
    return res.json(await accounts.listAllDTAjax(req.context, req.body));
});

router.postAsync('/accounts', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const accountId = await accounts.createByAdmin(req.context, req.body);
    return res.json(accountId);
});

router.postAsync('/accounts/:accountId/ban', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await accounts.banAccount(req.context, castToInteger(req.params.accountId));
    return res.json();
});

router.postAsync('/accounts/:accountId/unban', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await accounts.unbanAccount(req.context, castToInteger(req.params.accountId));
    return res.json();
});

module.exports = router;
