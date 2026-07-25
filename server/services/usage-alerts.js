'use strict';

const log = require('../lib/log');
const accountUsageModel = require('../models/account-usage');

const checkPeriod = 60 * 60 * 1000; // hourly

async function checkUsageAlerts() {
    const rows = await accountUsageModel.listCurrentPeriodWithLimits();

    for (const row of rows) {
        if (!row.max_emails_per_month) {
            continue;
        }

        const pct = row.emails_sent / row.max_emails_per_month;

        if (pct >= 0.8 && row.alert_80_sent !== '80') {
            // TODO: send an actual notification e-mail once a template exists for it
            // (see server/lib/message-sender.js for the queueing mechanism used
            // elsewhere, e.g. users.js:sendPasswordReset). For now this at least
            // stops the same account from being flagged again every hour.
            log.warn('UsageAlerts', `Account "${row.account_name}" (#${row.account_id}) has used ${(pct * 100).toFixed(0)}% of its monthly e-mail quota (${row.emails_sent}/${row.max_emails_per_month})`);
            await accountUsageModel.markAlertSent(row.account_id, '80');
        }
    }
}

async function run() {
    while (true) {
        try {
            await checkUsageAlerts();
        } catch (err) {
            log.error('UsageAlerts', err);
        }

        await new Promise(resolve => setTimeout(resolve, checkPeriod));
    }
}

function start() {
    log.info('UsageAlerts', 'Starting usage alerts service');
    run().catch(err => log.error('UsageAlerts', err));
}

module.exports.start = start;
module.exports.checkUsageAlerts = checkUsageAlerts;
