'use strict';

const passport = require('../../lib/passport');
const sendingDomains = require('../../models/sending-domains');
const {castToInteger} = require('../../lib/helpers');

const router = require('../../lib/router-async').create();

function withDnsRecord(domain) {
    return {
        ...domain,
        dns_record_name: sendingDomains.getDnsTxtRecordName(domain),
        dns_record_value: sendingDomains.getDnsTxtRecordValue(domain)
    };
}

router.postAsync('/sending-domains-table', passport.loggedIn, async (req, res) => {
    return res.json(await sendingDomains.listDTAjax(req.context, req.body));
});

router.getAsync('/sending-domains', passport.loggedIn, async (req, res) => {
    const domains = await sendingDomains.listByAccount(req.context);
    return res.json(domains.map(withDnsRecord));
});

router.postAsync('/sending-domains', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const domain = await sendingDomains.create(req.context, req.body.domain);
    return res.json(withDnsRecord(domain));
});

router.deleteAsync('/sending-domains/:id', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await sendingDomains.remove(req.context, castToInteger(req.params.id));
    return res.json();
});

module.exports = router;
