'use strict';

const knex = require('../lib/knex');
const hasher = require('node-object-hash')();
const shares = require('./shares');
const interoperableErrors = require('../../shared/interoperable-errors');
const { enforce, filterObject } = require('../lib/helpers');

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

module.exports.getById = getById;
module.exports.getByIdWithPlan = getByIdWithPlan;
module.exports.setStatus = setStatus;
module.exports.hash = hash;
module.exports.updateOwnAccount = updateOwnAccount;
