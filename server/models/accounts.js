'use strict';

const knex = require('../lib/knex');
const hasher = require('node-object-hash')();
const dtHelpers = require('../lib/dt-helpers');
const shares = require('./shares');
const plans = require('./plans');
const interoperableErrors = require('../../shared/interoperable-errors');
const { enforce, filterObject } = require('../lib/helpers');
const shortid = require('../lib/shortid');
const tools = require('../lib/tools');
const passwordValidator = require('../../shared/password-validator')();
const bluebird = require('bluebird');
const bcrypt = require('bcrypt-nodejs');
const bcryptHash = bluebird.promisify(bcrypt.hash.bind(bcrypt));
const {getAdminId} = require('../../shared/users');
const messageSender = require('../lib/message-sender');
const {getSystemSendConfigurationId} = require('../../shared/send-configurations');
const {getTrustedUrl} = require('../lib/urls');
const {tUI} = require('../lib/translate');
const config = require('../lib/config');

function enforceIsAdmin(context) {
    if (!context.user || context.user.id !== getAdminId()) {
        throw new interoperableErrors.PermissionDeniedError('Only the admin can manage account approvals');
    }
}

// This model is intentionally infrastructure-level (no `context`/ACL
// parameter): it's what resolves *which* account a request belongs to
// (server/lib/middleware/resolve-account.js), so it has to run before a
// context.account can exist. Every other model in the app receives context
// and is scoped through server/lib/tenant-scope.js instead.
//
// updateOwnAccount/hash below are the one exception — they back the "Company"
// section of the logged-in user's own profile page (client/src/account/Company.js)
// and so are naturally context-aware, same as every other model in the app.

async function getById(id) {
    return await knex('accounts').where('id', id).first();
}

const companyAllowedKeys = new Set(['name', 'website', 'address', 'city', 'zip_code', 'country', 'phone']);
const hashKeys = new Set([...companyAllowedKeys, 'id']);

function hash(entity) {
    return hasher.hash(filterObject(entity, hashKeys));
}

async function updateOwnAccount(context, entity) {
    await knex.transaction(async tx => {
        shares.enforceGlobalPermission(context, 'manageSettings');

        const existing = await tx('accounts').where('id', context.account.id).first();
        enforce(existing, 'Account not found');

        const existingHash = hash(existing);
        if (existingHash !== entity.originalHash) {
            throw new interoperableErrors.ChangedError();
        }

        // Deliberately ignores entity.id — a user can only ever update their own
        // account this way, regardless of what's in the submitted payload.
        await tx('accounts').where('id', context.account.id).update(filterObject(entity, companyAllowedKeys));
    });
}

async function getByIdWithPlan(id) {
    return await knex('accounts')
        .innerJoin('plans', 'plans.id', 'accounts.plan_id')
        .where('accounts.id', id)
        .select([
            'accounts.id', 'accounts.name', 'accounts.slug', 'accounts.status', 'accounts.plan_id',
            'accounts.billing_cycle_start', 'accounts.billing_cycle_end', 'accounts.gateway_customer_id',
            'accounts.gateway_subscription_id', 'accounts.trial_ends_at', 'accounts.ip_pool', 'accounts.created_at',
            'plans.code as plan_code', 'plans.name as plan_name', 'plans.max_contacts', 'plans.max_emails_per_month',
            'plans.max_users', 'plans.max_sending_domains', 'plans.max_automations', 'plans.api_access',
            'plans.dedicated_ip', 'plans.custom_dkim', 'plans.overage_price_per_1000_cents'
        ])
        .first();
}

async function setStatus(id, status) {
    await knex('accounts').where('id', id).update({status});
}

function slugify(name) {
    return (name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'account';
}

// Bootstraps a brand-new account + root namespace + master user together, all in
// one shot — the one case where none of the usual context-scoped create() functions
// apply, because there is no context (no account, no namespace, no user) yet for
// them to be scoped by. See the file-level comment above for why this model is
// infrastructure-level and takes no `context` param.
async function signup(entity) {
    enforce(await tools.validateEmail(entity.email) === 0, 'Invalid email');

    const passwordResult = passwordValidator.test(entity.password);
    enforce(passwordResult.errors.length === 0, 'Invalid password');

    const userId = await knex.transaction(async tx => {
        if (await tx('users').where('email', entity.email).first()) {
            throw new interoperableErrors.DuplicitEmailError();
        }

        const freePlan = await plans.getByCode('free');
        enforce(freePlan, 'Free plan is not configured');

        let slug = slugify(entity.companyName || entity.name);
        while (await tx('accounts').where('slug', slug).first()) {
            slug = slugify(entity.companyName || entity.name) + '-' + shortid.generate().slice(0, 6).toLowerCase();
        }

        const accountIds = await tx('accounts').insert({
            name: entity.companyName || entity.name,
            slug,
            status: 'pending',
            plan_id: freePlan.id
        });
        const accountId = accountIds[0];

        const namespaceIds = await tx('namespaces').insert({
            name: 'Root',
            namespace: null,
            account_id: accountId
        });
        const namespaceId = namespaceIds[0];

        // Seed the two contact fields the Contacts CRM feature ships with by default
        // (server/setup/knex/migrations/20260728120000_contacts.js does the same for
        // pre-existing accounts) so a fresh account isn't starting from an empty
        // fields list.
        await tx('contact_fields').insert([
            { account_id: accountId, namespace: namespaceId, name: 'Telefone', key: 'telefone', type: 'text' },
            { account_id: accountId, namespace: namespaceId, name: 'WhatsApp', key: 'whatsapp', type: 'text' }
        ]);

        let username = (entity.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9._-]/g, '');
        if (!username) {
            username = 'user';
        }
        let suffix = 0;
        let candidateUsername = username;
        while (await tx('users').where('username', candidateUsername).first()) {
            suffix += 1;
            candidateUsername = username + suffix;
        }

        const hashedPassword = await bcryptHash(entity.password, null, null);

        const userIds = await tx('users').insert({
            username: candidateUsername,
            name: entity.name,
            email: entity.email,
            password: hashedPassword,
            // Not 'master' (Global Master) — that role carries rootNamespaceRole,
            // a holdover from the pre-multi-tenant single-root-namespace design
            // (see the comment on the rootNamespaceRole check in shares.js). This
            // role grants full control of the new account's own namespace only.
            role: 'accountOwner',
            namespace: namespaceId,
            account_id: accountId
        });
        const userId = userIds[0];

        await shares.rebuildPermissionsTx(tx, { userId });

        return userId;
    });

    await notifyAdminOfPendingSignup(entity);

    return userId;
}

// Alerts the platform admin (the one user allowed to approve/reject new accounts —
// see enforceIsAdmin above) that a new signup is waiting on them. Fired after the
// transaction commits, same reasoning as campaign-notifications.js: this is a
// best-effort side notification, not something that should ever roll back the
// signup itself if the mailer hiccups.
async function notifyAdminOfPendingSignup(entity) {
    const adminUser = await knex('users').where('id', getAdminId()).first();
    if (!adminUser || !adminUser.email) {
        return;
    }

    const locale = config.defaultLanguage;

    await messageSender.queueSubscriptionMessage(
        getSystemSendConfigurationId(),
        {address: adminUser.email},
        tUI('mailerPendingSignupSubject', locale, {name: entity.companyName || entity.name}),
        null,
        {
            html: 'accounts/pending-signup-html.hbs',
            text: 'accounts/pending-signup-text.hbs',
            locale,
            data: {
                companyName: entity.companyName || entity.name,
                contactName: entity.name,
                contactEmail: entity.email,
                approvalUrl: getTrustedUrl('accounts/pending')
            }
        }
    );
}

async function listPendingDTAjax(context, params) {
    enforceIsAdmin(context);

    return await dtHelpers.ajaxList(
        params,
        builder => builder
            .from('accounts')
            .innerJoin('users', 'users.account_id', 'accounts.id')
            .where('accounts.status', 'pending'),
        ['accounts.id', 'accounts.name', 'users.name', 'users.email', 'accounts.created_at']
    );
}

async function approvePending(context, accountId) {
    enforceIsAdmin(context);

    const updated = await knex('accounts').where({id: accountId, status: 'pending'}).update({status: 'active'});
    if (!updated) {
        throw new interoperableErrors.NotFoundError();
    }
}

// Deletes everything a pending signup created (see server/models/accounts.js's
// signup() above for the exhaustive list: the account itself, its one namespace,
// its one user, the two default contact fields, and the namespace shares/permissions
// rebuildPermissionsTx wrote for that user) - a pending account can't have created
// anything else yet, since resolve-account.js blocks it from ever logging in.
async function rejectPending(context, accountId) {
    enforceIsAdmin(context);

    await knex.transaction(async tx => {
        const account = await tx('accounts').where({id: accountId, status: 'pending'}).first();
        if (!account) {
            throw new interoperableErrors.NotFoundError();
        }

        const namespaceIds = (await tx('namespaces').where('account_id', accountId).select('id')).map(n => n.id);

        if (namespaceIds.length > 0) {
            await tx('permissions_namespace').whereIn('entity', namespaceIds).del();
            await tx('shares_namespace').whereIn('entity', namespaceIds).del();
        }

        await tx('users').where('account_id', accountId).del();
        await tx('contact_fields').where('account_id', accountId).del();
        await tx('namespaces').where('account_id', accountId).del();
        await tx('accounts').where('id', accountId).del();
    });
}

module.exports.getById = getById;
module.exports.getByIdWithPlan = getByIdWithPlan;
module.exports.setStatus = setStatus;
module.exports.hash = hash;
module.exports.updateOwnAccount = updateOwnAccount;
module.exports.signup = signup;
module.exports.listPendingDTAjax = listPendingDTAjax;
module.exports.approvePending = approvePending;
module.exports.rejectPending = rejectPending;
