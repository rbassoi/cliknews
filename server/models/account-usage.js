'use strict';

const knex = require('../lib/knex');
const moment = require('moment');

function currentPeriodBounds() {
    const start = moment.utc().startOf('month');
    const end = moment(start).endOf('month');
    return {
        periodStart: start.format('YYYY-MM-DD'),
        periodEnd: end.format('YYYY-MM-DD')
    };
}

async function getCurrentPeriodTx(tx, accountId) {
    const {periodStart, periodEnd} = currentPeriodBounds();

    let row = await tx('account_usage').where({account_id: accountId, period_start: periodStart}).first();

    if (!row) {
        try {
            await tx('account_usage').insert({account_id: accountId, period_start: periodStart, period_end: periodEnd});
        } catch (err) {
            // Unique key race — another request already created this period's row.
        }

        row = await tx('account_usage').where({account_id: accountId, period_start: periodStart}).first();
    }

    return row;
}

async function getCurrentPeriod(accountId) {
    return await knex.transaction(tx => getCurrentPeriodTx(tx, accountId));
}

async function recordEmailsSentTx(tx, accountId, count) {
    await getCurrentPeriodTx(tx, accountId);
    const {periodStart} = currentPeriodBounds();
    await tx('account_usage').where({account_id: accountId, period_start: periodStart}).increment('emails_sent', count);
}

async function recordEmailsSent(accountId, count) {
    await knex.transaction(tx => recordEmailsSentTx(tx, accountId, count));
}

async function markAlertSent(accountId, level) {
    const {periodStart} = currentPeriodBounds();
    await knex('account_usage').where({account_id: accountId, period_start: periodStart}).update({alert_80_sent: level});
}

/** Used by the hourly usage-alerts job: current period's usage joined with each active account's plan limits. */
async function listCurrentPeriodWithLimits() {
    const {periodStart} = currentPeriodBounds();

    return await knex('accounts')
        .innerJoin('plans', 'plans.id', 'accounts.plan_id')
        .leftJoin('account_usage', function () {
            this.on('account_usage.account_id', 'accounts.id').andOn('account_usage.period_start', knex.raw('?', [periodStart]));
        })
        .whereIn('accounts.status', ['trial', 'active', 'past_due'])
        .select([
            'accounts.id as account_id', 'accounts.name as account_name', 'plans.name as plan_name',
            'plans.max_emails_per_month',
            knex.raw('COALESCE(account_usage.emails_sent, 0) as emails_sent'),
            knex.raw('COALESCE(account_usage.alert_80_sent, \'\') as alert_80_sent')
        ]);
}

module.exports.getCurrentPeriod = getCurrentPeriod;
module.exports.getCurrentPeriodTx = getCurrentPeriodTx;
module.exports.recordEmailsSent = recordEmailsSent;
module.exports.recordEmailsSentTx = recordEmailsSentTx;
module.exports.markAlertSent = markAlertSent;
module.exports.listCurrentPeriodWithLimits = listCurrentPeriodWithLimits;
