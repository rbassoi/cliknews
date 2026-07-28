'use strict';

const passport = require('../../lib/passport');
const contactFields = require('../../models/contact-fields');
const { castToInteger } = require('../../lib/helpers');

const router = require('../../lib/router-async').create();

router.getAsync('/contact-fields', passport.loggedIn, async (req, res) => {
    return res.json(await contactFields.list(req.context));
});

router.getAsync('/contact-fields/:fieldId', passport.loggedIn, async (req, res) => {
    return res.json(await contactFields.getById(req.context, castToInteger(req.params.fieldId)));
});

router.postAsync('/contact-fields', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    return res.json(await contactFields.create(req.context, req.body));
});

router.putAsync('/contact-fields/:fieldId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await contactFields.updateName(req.context, castToInteger(req.params.fieldId), req.body.name);
    return res.json();
});

router.deleteAsync('/contact-fields/:fieldId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await contactFields.remove(req.context, castToInteger(req.params.fieldId));
    return res.json();
});

module.exports = router;
