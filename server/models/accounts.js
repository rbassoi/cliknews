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
const crypto = require('crypto');
const {getAdminId} = require('../../shared/users');
const messageSender = require('../lib/message-sender');
const {getSystemSendConfigurationId} = require('../../shared/send-configurations');
const {getTrustedUrl} = require('../lib/urls');
const {tUI} = require('../lib/translate');
const config = require('../lib/config');

// Common personal-mailbox domains a real company would never register as its own -
// a signup from one of these never gets a stored accounts.domain, and so is never
// checked (or checkable) for a domain collision, since dozens of unrelated companies
// legitimately share a @gmail.com contact address.
const BLOCKED_GENERIC_EMAIL_DOMAINS = new Set([
    'gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'yahoo.com.br',
    'icloud.com', 'aol.com', 'protonmail.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br'
]);

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

// Guards signup() and createByAdmin() against creating a second account that collides
// on display name, or (for a real company domain, not a generic mailbox provider) on
// e-mail domain - closes the "Clikdata" duplicate-account bug this was written for:
// three separate @gmail.com signups all named "Clikdata" with nothing stopping them
// from being created as distinct, unrelated accounts. Returns the domain to store on
// the new account (null for a blocked/generic domain), which the caller threads into
// _createAccountWithOwnerTx.
async function _validateAccountUniqueness(tx, name, email) {
    const normalizedName = (name || '').trim().toLowerCase();
    const nameCollision = await tx('accounts').whereRaw('TRIM(LOWER(name)) = ?', [normalizedName]).first();
    if (nameCollision) {
        throw new interoperableErrors.DuplicitNameError(`Já existe uma conta cadastrada com o nome "${name}". Escolha outro nome ou fale com o administrador.`);
    }

    const emailDomain = (email.split('@')[1] || '').toLowerCase();
    const domain = BLOCKED_GENERIC_EMAIL_DOMAINS.has(emailDomain) ? null : emailDomain;

    if (domain) {
        const domainCollision = await tx('accounts').where('domain', domain).first();
        if (domainCollision) {
            throw new interoperableErrors.DuplicitNameError(`Já existe uma conta cadastrada com o domínio "${domain}". Fale com o administrador da sua empresa para ser adicionado.`);
        }
    }

    return domain;
}

// Bootstraps a brand-new account + root namespace + owner user together, all in one
// transaction - shared by the public signup() below and the admin-facing createByAdmin()
// further down, which only differ in the account's initial `status`/`plan_id` and in
// whether a "pending approval" notification fires afterward.
async function _createAccountWithOwnerTx(tx, accountFields, ownerFields) {
    let slug = slugify(accountFields.name);
    while (await tx('accounts').where('slug', slug).first()) {
        slug = slugify(accountFields.name) + '-' + shortid.generate().slice(0, 6).toLowerCase();
    }

    const accountIds = await tx('accounts').insert({
        name: accountFields.name,
        slug,
        status: accountFields.status,
        plan_id: accountFields.planId,
        domain: accountFields.domain || null
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

    let username = (ownerFields.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!username) {
        username = 'user';
    }
    let suffix = 0;
    let candidateUsername = username;
    while (await tx('users').where('username', candidateUsername).first()) {
        suffix += 1;
        candidateUsername = username + suffix;
    }

    const hashedPassword = await bcryptHash(ownerFields.password, null, null);

    const userIds = await tx('users').insert({
        username: candidateUsername,
        name: ownerFields.name,
        email: ownerFields.email,
        password: hashedPassword,
        // Not 'master' (Global Master) — that role carries rootNamespaceRole,
        // a holdover from the pre-multi-tenant single-root-namespace design
        // (see the comment on the rootNamespaceRole check in shares.js). This
        // role grants full control of the new account's own namespace only.
        role: 'accountOwner',
        namespace: namespaceId,
        account_id: accountId,
        // Only set for createByAdmin() - an admin creating the account directly has
        // already vetted it, so there's no signup e-mail-verification loop to run.
        // A public signup() leaves this null and fills it in once verifyEmail() succeeds.
        email_verified_at: ownerFields.emailVerifiedAt || null
    });
    const userId = userIds[0];

    await shares.rebuildPermissionsTx(tx, { userId });

    return {accountId, userId};
}

// The one case where none of the usual context-scoped create() functions apply,
// because there is no context (no account, no namespace, no user) yet for them to be
// scoped by. See the file-level comment above for why this model is infrastructure-level
// and takes no `context` param.
async function signup(entity) {
    enforce(await tools.validateEmail(entity.email) === 0, 'Invalid email');

    const passwordResult = passwordValidator.test(entity.password);
    enforce(passwordResult.errors.length === 0, 'Invalid password');

    const accountName = entity.companyName || entity.name;

    const {userId, verifyToken} = await knex.transaction(async tx => {
        if (await tx('users').where('email', entity.email).first()) {
            throw new interoperableErrors.DuplicitEmailError();
        }

        const domain = await _validateAccountUniqueness(tx, accountName, entity.email);

        const freePlan = await plans.getByCode('free');
        enforce(freePlan, 'Free plan is not configured');

        const {userId} = await _createAccountWithOwnerTx(
            tx,
            {name: accountName, status: 'pending', planId: freePlan.id, domain},
            {name: entity.name, email: entity.email, password: entity.password}
        );

        // 7 days, not password-reset's 1 hour - missing this isn't a security issue,
        // just an inconvenience, and a pending account isn't going anywhere in the
        // meantime (resolve-account.js already blocks it from logging in either way).
        const verifyToken = crypto.randomBytes(16).toString('base64').replace(/[^a-z0-9]/gi, '');
        await tx('users').where('id', userId).update({
            email_verify_token: verifyToken,
            email_verify_expire: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        return {userId, verifyToken};
    });

    // The admin's "pending approval" queue/notification only fires once the address
    // is confirmed real - see verifyEmail() below, not here.
    await queueVerificationEmail(entity, verifyToken);

    return userId;
}

// Same bootstrap as signup(), but run directly by the admin (server/routes/rest/accounts.js's
// POST /accounts) - the account starts 'active' immediately (no self-serve approval to wait
// on) on whatever plan the admin picked, and there's no "awaiting approval" notification to fire.
async function createByAdmin(context, entity) {
    enforceIsAdmin(context);

    enforce(await tools.validateEmail(entity.email) === 0, 'Invalid email');

    const passwordResult = passwordValidator.test(entity.password);
    enforce(passwordResult.errors.length === 0, 'Invalid password');

    return await knex.transaction(async tx => {
        if (await tx('users').where('email', entity.email).first()) {
            throw new interoperableErrors.DuplicitEmailError();
        }

        const accountName = entity.companyName || entity.name;
        const domain = await _validateAccountUniqueness(tx, accountName, entity.email);

        const plan = await tx('plans').where('id', entity.planId).first();
        enforce(plan, 'Plan not found');

        const {accountId} = await _createAccountWithOwnerTx(
            tx,
            {name: accountName, status: 'active', planId: plan.id, domain},
            {name: entity.name, email: entity.email, password: entity.password, emailVerifiedAt: new Date()}
        );

        return accountId;
    });
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

// Sends the new user the link they must click before their signup ever reaches the
// admin's approval queue - see verifyEmail() below, and resendVerification() further
// down for the admin-triggered re-send when the original link expired or got lost.
async function queueVerificationEmail(entity, verifyToken) {
    const locale = config.defaultLanguage;

    await messageSender.queueSubscriptionMessage(
        getSystemSendConfigurationId(),
        {address: entity.email},
        tUI('mailerVerifyEmailSubject', locale),
        null,
        {
            html: 'accounts/verify-email-html.hbs',
            text: 'accounts/verify-email-text.hbs',
            locale,
            data: {
                companyName: entity.companyName || entity.name,
                contactName: entity.name,
                verifyUrl: getTrustedUrl(`login/verify-email/${encodeURIComponent(verifyToken)}`)
            }
        }
    );
}

// Public, no context - reached from the link in queueVerificationEmail's e-mail before
// the account has ever been approved (or logged into). Confirms the address is real,
// then hands off to the same admin-notification signup() used to queue directly.
async function verifyEmail(token) {
    let notifyEntity;

    await knex.transaction(async tx => {
        const user = await tx('users')
            .where('email_verify_token', token)
            .andWhere('email_verify_expire', '>', new Date())
            .first();

        if (!user) {
            throw new interoperableErrors.InvalidTokenError();
        }

        await tx('users').where('id', user.id).update({
            email_verified_at: new Date(),
            email_verify_token: null,
            email_verify_expire: null
        });

        const account = await tx('accounts').where('id', user.account_id).first();
        notifyEntity = {companyName: account.name, name: user.name, email: user.email};
    });

    await notifyAdminOfPendingSignup(notifyEntity);
}

// Regenerates and re-queues the verification e-mail for a pending account whose
// owner never clicked (or lost) the original link - the only row action Pending
// Accounts offers instead of Approve while a row is still unverified.
async function resendVerification(context, accountId) {
    enforceIsAdmin(context);

    let entity, verifyToken;

    await knex.transaction(async tx => {
        const account = await tx('accounts').where({id: accountId, status: 'pending'}).first();
        if (!account) {
            throw new interoperableErrors.NotFoundError();
        }

        const user = await tx('users').where('account_id', accountId).first();
        if (!user) {
            throw new interoperableErrors.NotFoundError();
        }

        verifyToken = crypto.randomBytes(16).toString('base64').replace(/[^a-z0-9]/gi, '');
        await tx('users').where('id', user.id).update({
            email_verify_token: verifyToken,
            email_verify_expire: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        entity = {companyName: account.name, name: user.name, email: user.email};
    });

    await queueVerificationEmail(entity, verifyToken);
}

async function listPendingDTAjax(context, params) {
    enforceIsAdmin(context);

    return await dtHelpers.ajaxList(
        params,
        builder => builder
            .from('accounts')
            .innerJoin('users', 'users.account_id', 'accounts.id')
            .where('accounts.status', 'pending'),
        ['accounts.id', 'accounts.name', 'users.name', 'users.email', 'accounts.created_at', 'users.email_verified_at']
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

async function listAllDTAjax(context, params) {
    enforceIsAdmin(context);

    return await dtHelpers.ajaxList(
        params,
        builder => builder
            .from('accounts')
            .innerJoin('plans', 'plans.id', 'accounts.plan_id'),
        [
            'accounts.id', 'accounts.name', 'accounts.status', 'plans.name',
            {
                name: 'userCount',
                query: builder => builder.from('users').whereRaw('users.account_id = accounts.id').count().as('userCount')
            },
            'accounts.created_at'
        ]
    );
}

async function banAccount(context, accountId) {
    enforceIsAdmin(context);
    enforce(accountId !== context.user.account_id, "You can't ban your own account");

    const updated = await knex('accounts').where('id', accountId).update({status: 'suspended'});
    if (!updated) {
        throw new interoperableErrors.NotFoundError();
    }
}

async function unbanAccount(context, accountId) {
    enforceIsAdmin(context);

    const updated = await knex('accounts').where('id', accountId).update({status: 'active'});
    if (!updated) {
        throw new interoperableErrors.NotFoundError();
    }
}

module.exports.getById = getById;
module.exports.getByIdWithPlan = getByIdWithPlan;
module.exports.setStatus = setStatus;
module.exports.hash = hash;
module.exports.updateOwnAccount = updateOwnAccount;
module.exports.signup = signup;
module.exports.verifyEmail = verifyEmail;
module.exports.resendVerification = resendVerification;
module.exports.listPendingDTAjax = listPendingDTAjax;
module.exports.approvePending = approvePending;
module.exports.rejectPending = rejectPending;
module.exports.createByAdmin = createByAdmin;
module.exports.listAllDTAjax = listAllDTAjax;
module.exports.banAccount = banAccount;
module.exports.unbanAccount = unbanAccount;
