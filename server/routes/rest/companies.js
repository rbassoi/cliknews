'use strict';

const passport = require('../../lib/passport');
const companies = require('../../models/companies');

const router = require('../../lib/router-async').create();
const {castToInteger} = require('../../lib/helpers');


router.postAsync('/companies-table', passport.loggedIn, async (req, res) => {
    return res.json(await companies.listDTAjax(req.context, req.body));
});

router.getAsync('/companies/:companyId', passport.loggedIn, async (req, res) => {
    const company = await companies.getById(req.context, castToInteger(req.params.companyId));
    company.hash = companies.hash(company);
    return res.json(company);
});

router.postAsync('/companies', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    return res.json(await companies.create(req.context, req.body));
});

router.putAsync('/companies/:companyId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const entity = req.body;
    entity.id = castToInteger(req.params.companyId);

    await companies.updateWithConsistencyCheck(req.context, entity);
    return res.json();
});

router.deleteAsync('/companies/:companyId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await companies.remove(req.context, castToInteger(req.params.companyId));
    return res.json();
});


module.exports = router;
