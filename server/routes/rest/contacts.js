'use strict';

const passport = require('../../lib/passport');
const contacts = require('../../models/contacts');
const { castToInteger } = require('../../lib/helpers');

const router = require('../../lib/router-async').create();

router.postAsync('/contacts-table/:listId?', passport.loggedIn, async (req, res) => {
    const listId = req.params.listId ? castToInteger(req.params.listId) : null;
    const status = req.query.status ? castToInteger(req.query.status) : null;
    return res.json(await contacts.listDTAjax(req.context, listId, status, req.body));
});

module.exports = router;
