'use strict';

const router = require('../lib/router-async').create();
const knex = require('../lib/knex');
const {apiKeyAuth, requireScope} = require('../lib/middleware/api-key-auth');
const {apiRateLimit} = require('../lib/api-rate-limit');
const contacts = require('../models/contacts');
const lists = require('../models/lists');
const subscriptions = require('../models/subscriptions');
const campaigns = require('../models/campaigns');
const shares = require('../models/shares');
const messageSender = require('../lib/message-sender');
const planLimits = require('../lib/plan-limits');
const accountUsageModel = require('../models/account-usage');
const interoperableErrors = require('../../shared/interoperable-errors');
const {SubscriptionSource} = require('../../shared/lists');
const {CampaignStatus} = require('../../shared/campaigns');

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

function badRequest(msg) {
    const err = new Error(msg);
    err.status = 400;
    return err;
}

function parseLimit(raw, def, max) {
    const val = parseInt(raw);
    if (!raw) {
        return def;
    }
    if (!Number.isInteger(val) || val < 1) {
        throw badRequest('limit must be a positive integer');
    }
    return Math.min(val, max);
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

router.getAsync('/contacts', requireScope('contacts'), async (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const status = req.query.status ? parseInt(req.query.status) : undefined;

    const data = [];
    for await (const contact of contacts.contactsIterator(contextForApiKey(req), status)) {
        data.push({
            email: contact.email,
            status: contact.status,
            lists: contact.lists ? contact.lists.split(';') : [],
            created: contact.created
        });

        if (data.length >= limit) {
            break;
        }
    }

    return res.json({data});
});

router.postAsync('/contacts', requireScope('contacts'), async (req, res) => {
    const context = contextForApiKey(req);
    const listId = parseInt(req.body.list_id);

    if (!Number.isInteger(listId)) {
        throw badRequest('list_id is required and must be an integer');
    }
    if (!req.body.email) {
        throw badRequest('email is required');
    }

    // Confirms the list exists AND belongs to this account (throws otherwise) —
    // on top of the same check now enforced centrally in shares.js.
    await lists.getById(context, listId);

    await planLimits.checkContactLimit(context);

    const entity = {...req.body};
    delete entity.list_id;

    const id = await subscriptions.create(context, listId, entity, SubscriptionSource.API, {
        ip: req.ip,
        subscribeIfNoExisting: true,
        updateAllowed: true,
        updateOfUnsubscribedAllowed: true
    });

    return res.status(201).json({id});
});

router.getAsync('/campaigns', requireScope('campaigns'), async (req, res) => {
    const limit = parseLimit(req.query.limit, 50, 200);

    const data = await campaigns.listForAccount(contextForApiKey(req), limit);

    return res.json({data});
});

router.postAsync('/campaigns/:id/send', requireScope('campaigns'), async (req, res) => {
    const context = contextForApiKey(req);
    const campaignId = parseInt(req.params.id);

    if (!Number.isInteger(campaignId)) {
        throw badRequest('invalid campaign id');
    }

    try {
        await campaigns.start(context, campaignId, {});
    } catch (err) {
        if (err instanceof interoperableErrors.InvalidStateError) {
            err.status = 409;
        }
        throw err;
    }

    return res.json({status: CampaignStatus.SCHEDULED});
});

router.postAsync('/transactional/send', requireScope('transactional'), async (req, res) => {
    const context = contextForApiKey(req);
    const {send_configuration_id, to, subject, html, text} = req.body;

    const sendConfigurationId = parseInt(send_configuration_id);
    if (!Number.isInteger(sendConfigurationId)) {
        throw badRequest('send_configuration_id is required and must be an integer');
    }
    if (!to) {
        throw badRequest('to is required');
    }
    if (!subject) {
        throw badRequest('subject is required');
    }
    if (!html && !text) {
        throw badRequest('html or text is required');
    }

    // Confirms the send configuration exists, belongs to this account (now
    // enforced centrally in shares.js), and this key is allowed to send with it.
    await shares.enforceEntityPermission(context, 'sendConfiguration', sendConfigurationId, 'sendWithoutOverrides');

    await planLimits.checkEmailSendLimit(context, 1);

    await knex.transaction(async tx => {
        await messageSender.queueAPITransactionalMessageTx(tx, sendConfigurationId, to, subject, html, text);
    });

    await accountUsageModel.recordEmailsSent(context.account.id, 1);

    return res.status(202).json({queued: true});
});

module.exports = router;
