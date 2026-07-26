'use strict';

const passport = require('../../lib/passport');
const apiKeys = require('../../models/api-keys');
const {castToInteger} = require('../../lib/helpers');

const router = require('../../lib/router-async').create();

router.postAsync('/api-keys-table', passport.loggedIn, async (req, res) => {
    return res.json(await apiKeys.listDTAjax(req.context, req.body));
});

router.postAsync('/api-keys', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    return res.json(await apiKeys.create(req.context, req.body.scopes));
});

router.postAsync('/api-keys-revoke/:id', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await apiKeys.revoke(req.context, castToInteger(req.params.id));
    return res.json();
});

module.exports = router;
