'use strict';

const router = require('../lib/router-async').create();
const plans = require('../models/plans');
const cors = require('cors');

// Read-only, non-sensitive pricing data — open to any origin so the
// marketing landing page (a separate site/domain) can fetch it directly.
router.use(cors());

router.getAsync('/', async (req, res) => {
    const activePlans = await plans.listActive();

    res.json(activePlans.map(p => ({
        code: p.code,
        name: p.name,
        price_monthly: p.price_monthly_cents / 100,
        price_yearly: p.price_yearly_cents / 100,
        max_contacts: p.max_contacts,
        max_emails_per_month: p.max_emails_per_month,
        max_users: p.max_users,
        max_sending_domains: p.max_sending_domains,
        max_automations: p.max_automations,
        features: {
            api_access: !!p.api_access,
            dedicated_ip: !!p.dedicated_ip,
            custom_dkim: !!p.custom_dkim
        }
    })));
});

module.exports = router;
