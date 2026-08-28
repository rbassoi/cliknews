'use strict';

const router = require('../lib/router-async').create();
const knex = require('../lib/knex');
const {apiKeyAuth, requireScope} = require('../lib/middleware/api-key-auth');
const {apiRateLimit} = require('../lib/api-rate-limit');
const contacts = require('../models/contacts');
const lists = require('../models/lists');
const fields = require('../models/fields');
const subscriptions = require('../models/subscriptions');
const campaigns = require('../models/campaigns');
const sendConfigurations = require('../models/send-configurations');
const shares = require('../models/shares');
const messageSender = require('../lib/message-sender');
const planLimits = require('../lib/plan-limits');
const accountUsageModel = require('../models/account-usage');
const interoperableErrors = require('../../shared/interoperable-errors');
const {SubscriptionSource, UnsubscriptionMode} = require('../../shared/lists');
const {CampaignStatus, CampaignType, CampaignSource} = require('../../shared/campaigns');

const CAMPAIGN_STATUS_LABELS = {
    [CampaignStatus.IDLE]: 'idle',
    [CampaignStatus.SCHEDULED]: 'scheduled',
    [CampaignStatus.SENDING]: 'sending',
    [CampaignStatus.FINISHED]: 'sent',
    [CampaignStatus.PAUSED]: 'paused',
    [CampaignStatus.PAUSING]: 'pausing'
};

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

    // Custom fields are addressed by their stable `key` (see GET
    // /lists/:id/fields), not by the internal auto-generated DB column —
    // fields.fromAPI resolves key -> column for us, same mapping the legacy
    // POST /api/subscribe route already relies on (server/routes/api.js).
    // Unrecognized keys in the body are silently ignored.
    const entity = {};
    for (const k of ['email', 'tz', 'status', 'is_test']) {
        if (req.body[k] !== undefined) {
            entity[k] = req.body[k];
        }
    }
    Object.assign(entity, await fields.fromAPI(context, listId, req.body));

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

router.postAsync('/lists', requireScope('campaigns'), async (req, res) => {
    const context = contextForApiKey(req);
    const {name, description, contact_email, homepage, to_name} = req.body;

    if (!name) {
        throw badRequest('name is required');
    }

    // Every account has exactly one root namespace (namespace: null); same
    // resolution POST /campaigns below uses.
    const rootNamespace = await knex('namespaces').where({account_id: context.account.id, namespace: null}).first();

    const entity = {
        name,
        description: description || '',
        namespace: rootNamespace.id,
        contact_email: contact_email || '',
        homepage: homepage || '',
        to_name: to_name !== undefined ? to_name : null,
        // API-created lists are for imported contacts, not public signup
        // forms — no public subscribe page, no send configuration needed
        // since they never send a subscribe-confirmation email.
        default_form: null,
        public_subscribe: false,
        unsubscription_mode: UnsubscriptionMode.ONE_STEP,
        listunsubscribe_disabled: false,
        send_configuration: null
    };

    const id = await lists.create(context, entity);

    return res.status(201).json({id});
});

// Note: lists.create() (server/models/lists.js) only returns the new id, not
// the generated cid — callers that need the cid can fetch it via GET /lists.

// Lightweight lookups so an API caller can discover valid list_id/
// send_configuration_id values for POST /campaigns below without needing
// UI access. Scoped directly by account_id, same as every other tenant-
// scoped query (server/lib/tenant-scope.js) — an API key has no user to
// check ACL permissions against, only the account it belongs to.
router.getAsync('/lists', requireScope('campaigns'), async (req, res) => {
    const data = await knex('lists').where('account_id', req.account.id).select(['id', 'name', 'subscribers']);
    return res.json({data});
});

// Lets a caller discover the custom-field `key`s available on a list before
// calling POST /contacts (see the field-addressing note there) — the same
// `key` also doubles as the merge tag name in campaign HTML ([<key>]).
router.getAsync('/lists/:id/fields', requireScope('contacts'), async (req, res) => {
    const context = contextForApiKey(req);
    const listId = parseInt(req.params.id);

    if (!Number.isInteger(listId)) {
        throw badRequest('invalid list id');
    }

    await lists.getById(context, listId);

    const flds = await fields.list(context, listId);
    const data = flds.map(fld => ({
        key: fld.key,
        name: fld.name,
        type: fld.type,
        required: fld.required,
        default_value: fld.default_value,
        group: fld.group,
        settings: fld.settings
    }));

    return res.json({data});
});

router.getAsync('/send-configurations', requireScope('campaigns'), async (req, res) => {
    const data = await knex('send_configurations').where('account_id', req.account.id).select(['id', 'name']);
    return res.json({data});
});

router.getAsync('/campaigns/:id', requireScope('campaigns'), async (req, res) => {
    const context = contextForApiKey(req);
    const campaignId = parseInt(req.params.id);

    if (!Number.isInteger(campaignId)) {
        throw badRequest('invalid campaign id');
    }

    // Content.SETTINGS_WITH_STATS strips the (potentially large) HTML source
    // and adds `total` (recipient count) alongside the aggregate counters
    // that already live directly on the campaigns row (delivered/opened/
    // clicks/bounced/complained/unsubscribed/blacklisted) — same query the
    // admin UI's campaign stats page uses (server/routes/rest/campaigns.js).
    const entity = await campaigns.getById(context, campaignId, false, campaigns.Content.SETTINGS_WITH_STATS);

    return res.json({
        id: entity.id,
        name: entity.name,
        cid: entity.cid,
        subject: entity.subject,
        status: entity.status,
        status_label: CAMPAIGN_STATUS_LABELS[entity.status],
        scheduled: entity.scheduled,
        delivered: entity.delivered,
        opened: entity.opened,
        clicks: entity.clicks,
        bounced: entity.bounced,
        complained: entity.complained,
        unsubscribed: entity.unsubscribed,
        blacklisted: entity.blacklisted,
        total: entity.total
    });
});

router.postAsync('/campaigns', requireScope('campaigns'), async (req, res) => {
    const context = contextForApiKey(req);

    const {name, subject, html, text, list_id, list_ids, send_configuration_id, sender, unsubscribe_url, click_tracking_disabled, open_tracking_disabled, idempotency_key} = req.body;

    if (!name) {
        throw badRequest('name is required');
    }
    if (!subject) {
        throw badRequest('subject is required');
    }
    if (!html) {
        throw badRequest('html is required');
    }

    const rawListIds = list_ids || (list_id !== undefined ? [list_id] : []);
    const listIds = rawListIds.map(x => parseInt(x));
    if (listIds.length === 0 || listIds.some(x => !Number.isInteger(x))) {
        throw badRequest('list_id (or list_ids: [...]) is required and must be an integer id');
    }

    const sendConfigurationId = parseInt(send_configuration_id);
    if (!Number.isInteger(sendConfigurationId)) {
        throw badRequest('send_configuration_id is required and must be an integer — see GET /api-v1/send-configurations');
    }

    // Every account has exactly one root namespace (namespace: null); API-created
    // campaigns always go there rather than asking the caller to know a
    // namespace id, matching how contacts.js resolves it for import-created
    // contacts.
    const rootNamespace = await knex('namespaces').where({account_id: context.account.id, namespace: null}).first();

    if (idempotency_key !== undefined && idempotency_key !== null && typeof idempotency_key !== 'string') {
        throw badRequest('idempotency_key must be a string');
    }

    const entity = {
        type: CampaignType.REGULAR,
        source: CampaignSource.CUSTOM,
        idempotency_key: idempotency_key || null,
        name,
        description: '',
        namespace: rootNamespace.id,
        channel: null,
        send_configuration: sendConfigurationId,
        from_name_override: (sender && sender.name) || null,
        from_email_override: (sender && sender.email) || null,
        reply_to_override: null,
        subject,
        click_tracking_disabled: !!click_tracking_disabled,
        open_tracking_disabled: !!open_tracking_disabled,
        unsubscribe_url: unsubscribe_url || '',
        data: {
            // 'codeeditor' is the same source type the UI's own "Editor de
            // código" option produces, so the campaign still opens cleanly
            // in Conteúdo if someone looks at it there later — but sending
            // only ever reads .html/.text/.tag_language directly
            // (server/lib/message-sender.js), so this shape is enough on
            // its own for API-created campaigns even without an edit pass.
            sourceCustom: {
                type: 'codeeditor',
                tag_language: 'simple',
                data: {sourceType: 'html', data: {source: html}},
                html,
                text: text || ''
            }
        },
        lists: listIds.map(id => ({list: id, segment: null}))
    };

    const id = await campaigns.create(context, entity);

    return res.status(201).json({id});
});

router.postAsync('/campaigns/:id/send', requireScope('campaigns'), async (req, res) => {
    const context = contextForApiKey(req);
    const campaignId = parseInt(req.params.id);

    if (!Number.isInteger(campaignId)) {
        throw badRequest('invalid campaign id');
    }

    // send_at is optional — omit it to send immediately (today's behavior).
    // When present it must be an ISO-8601 datetime WITH a UTC offset/Z, since
    // it's parsed into an absolute point in time here and compared as-is
    // against the clock by the background sender; a date/time that has
    // already passed by the time it's processed is not an error, it's just
    // treated as "send now" (same as campaigns.start's existing behavior).
    let startAt = null;
    if (req.body.send_at !== undefined && req.body.send_at !== null) {
        startAt = new Date(req.body.send_at);
        if (isNaN(startAt.valueOf())) {
            throw badRequest('send_at must be a valid ISO-8601 datetime with a UTC offset or Z');
        }
    }

    const extraData = startAt ? {startAt, timezone: req.body.timezone} : {};

    try {
        await campaigns.start(context, campaignId, extraData);
    } catch (err) {
        if (err instanceof interoperableErrors.InvalidStateError) {
            err.status = 409;
        }
        throw err;
    }

    return res.json({status: CampaignStatus.SCHEDULED});
});

// Cancels a SCHEDULED or SENDING campaign (-> IDLE or PAUSING respectively,
// same transition the admin UI's "Parar" button uses). Does not delete
// anything — see DELETE /campaigns/:id below for that.
router.postAsync('/campaigns/:id/stop', requireScope('campaigns'), async (req, res) => {
    const context = contextForApiKey(req);
    const campaignId = parseInt(req.params.id);

    if (!Number.isInteger(campaignId)) {
        throw badRequest('invalid campaign id');
    }

    try {
        await campaigns.stop(context, campaignId);
    } catch (err) {
        if (err instanceof interoperableErrors.InvalidStateError) {
            err.status = 409;
        }
        throw err;
    }

    return res.json({status: CampaignStatus.PAUSING});
});

// Deletes a campaign regardless of status, including SENDING/PAUSING — it
// stops the campaign first (see campaigns.js's _removeTx) so nothing new
// gets sent, then removes the campaign and all its dependent rows.
router.deleteAsync('/campaigns/:id', requireScope('campaigns'), async (req, res) => {
    const context = contextForApiKey(req);
    const campaignId = parseInt(req.params.id);

    if (!Number.isInteger(campaignId)) {
        throw badRequest('invalid campaign id');
    }

    await campaigns.remove(context, campaignId);

    return res.json({success: true});
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
        // tagLanguage must be non-empty or message-sender.js's _init() enforce()
        // check fails (empty message, since this call never passed one) —
        // 'simple' matches the square-bracket tag convention POST /campaigns
        // above already uses for API-created content.
        await messageSender.queueAPITransactionalMessageTx(tx, sendConfigurationId, to, subject, html, text, 'simple');
    });

    await accountUsageModel.recordEmailsSent(context.account.id, 1);

    return res.status(202).json({queued: true});
});

module.exports = router;
