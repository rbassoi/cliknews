'use strict';

const knex = require('../lib/knex');

// Separate from the existing global `blacklist` table (a manually-curated,
// install-wide hard block) — this is auto-populated per account on
// bounce/complaint/unsubscribe, so one account's bounce never suppresses
// another account's recipient. See docs/saas-plan.md Part H.5.

async function isSuppressed(accountId, email) {
    return !!(await knex('suppression_list').where({account_id: accountId, email}).first());
}

async function add(accountId, email, reason) {
    const existing = await knex('suppression_list').where({account_id: accountId, email}).first();
    if (existing) {
        return;
    }

    try {
        await knex('suppression_list').insert({account_id: accountId, email, reason});
    } catch (err) {
        // Unique key race - another request already suppressed this address this instant.
    }
}

module.exports.isSuppressed = isSuppressed;
module.exports.add = add;
