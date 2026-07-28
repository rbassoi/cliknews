'use strict';

const passport = require('../../lib/passport');
const contacts = require('../../models/contacts');
const { castToInteger } = require('../../lib/helpers');

const router = require('../../lib/router-async').create();

router.postAsync('/contacts-table', passport.loggedIn, async (req, res) => {
    const status = req.query.status ? castToInteger(req.query.status) : null;
    return res.json(await contacts.listDTAjax(req.context, status, req.body));
});

router.getAsync('/contacts/:contactId', passport.loggedIn, async (req, res) => {
    const contact = await contacts.getById(req.context, castToInteger(req.params.contactId));
    contact.hash = contacts.hash(contact);
    return res.json(contact);
});

router.postAsync('/contacts', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    return res.json(await contacts.create(req.context, req.body));
});

router.putAsync('/contacts/:contactId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const entity = req.body;
    entity.id = castToInteger(req.params.contactId);

    await contacts.updateWithConsistencyCheck(req.context, entity);
    return res.json();
});

router.deleteAsync('/contacts/:contactId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await contacts.remove(req.context, castToInteger(req.params.contactId));
    return res.json();
});

module.exports = router;
