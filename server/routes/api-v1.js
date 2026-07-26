'use strict';

const router = require('../lib/router-async').create();
const {apiKeyAuth, requireScope} = require('../lib/middleware/api-key-auth');
const {apiRateLimit} = require('../lib/api-rate-limit');
const contacts = require('../models/contacts');

router.use(apiKeyAuth, apiRateLimit);

// A "scoped admin" context: bypasses the namespaces/shares ACL (an API key
// has no user to check it against) while remaining hard-scoped by account_id
// (tenant-scope.js only bypasses the admin context when context.account is
// ALSO absent — here it's always present). See docs/saas-plan.md Part K.
function contextForApiKey(req) {
    return {
        user: {admin: true, id: 0},
        account: req.account
    };
}

router.getAsync('/account', requireScope('read'), async (req, res) => {
    return res.json({
        name: req.account.name,
        status: req.account.status,
        plan_code: req.account.plan_code,
        max_contacts: req.account.max_contacts,
        max_emails_per_month: req.account.max_emails_per_month
    });
});

router.getAsync('/contacts/count', requireScope('contacts'), async (req, res) => {
    const count = await contacts.getTotalCount(contextForApiKey(req));
    return res.json({count});
});

module.exports = router;
