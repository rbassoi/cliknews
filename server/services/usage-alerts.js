'use strict';

const log = require('../lib/log');
const knex = require('../lib/knex');
const config = require('../lib/config');
const accountUsageModel = require('../models/account-usage');
const messageSender = require('../lib/message-sender');
const {getSystemSendConfigurationId} = require('../../shared/send-configurations');
const {tUI} = require('../lib/translate');

const checkPeriod = 60 * 60 * 1000; // hourly

async function notifyAccount(row, percentUsed) {
    // The account's earliest user is used as a stand-in for "the account
    // owner" — there's no dedicated owner/billing-contact field yet.
    const notifyUser = await knex('users').where('account_id', row.account_id).orderBy('id', 'asc').first();

    if (!notifyUser || !notifyUser.email) {
        log.warn('UsageAlerts', `Account "${row.account_name}" (#${row.account_id}) has no user with an e-mail address to notify`);
        return;
    }

    const locale = config.defaultLanguage;

    await messageSender.queueSubscriptionMessage(
        getSystemSendConfigurationId(),
        {address: notifyUser.email},
        tUI('mailerUsageAlert80Subject', locale),
        null,
        {
            html: 'account/usage-alert-80-html.hbs',
            text: 'account/usage-alert-80-text.hbs',
            locale,
            data: {
                title: tUI('cliker', locale),
                accountName: row.account_name,
                planName: row.plan_name,
                percentUsed,
                emailsSent: row.emails_sent,
                emailsLimit: row.max_emails_per_month
            }
        }
    );
}

async function checkUsageAlerts() {
    const rows = await accountUsageModel.listCurrentPeriodWithLimits();

    for (const row of rows) {
        if (!row.max_emails_per_month) {
            continue;
        }

        const pct = row.emails_sent / row.max_emails_per_month;

        if (pct >= 0.8 && row.alert_80_sent !== '80') {
            const percentUsed = Math.round(pct * 100);

            await notifyAccount(row, percentUsed);

            log.info('UsageAlerts', `Notified account "${row.account_name}" (#${row.account_id}) at ${percentUsed}% of its monthly e-mail quota (${row.emails_sent}/${row.max_emails_per_month})`);
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
