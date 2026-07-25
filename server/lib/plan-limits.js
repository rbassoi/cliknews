'use strict';

const contactsModel = require('../models/contacts');
const accountUsageModel = require('../models/account-usage');
const interoperableErrors = require('../../shared/interoperable-errors');

// context.account already carries the plan's limits (see accounts.js:getByIdWithPlan),
// so these checks need no extra DB round-trip to fetch the plan itself.

async function checkContactLimit(context) {
    const account = context.account;

    const currentCount = await contactsModel.getTotalCount(context);
    if (currentCount >= account.max_contacts) {
        throw new interoperableErrors.PlanLimitError(
            `Contact limit reached (${account.max_contacts})`,
            {limit: 'contacts', max: account.max_contacts, current: currentCount}
        );
    }
}

async function checkEmailSendLimit(context, emailsToSend) {
    const account = context.account;

    const usage = await accountUsageModel.getCurrentPeriod(account.id);
    const wouldBeSent = usage.emails_sent + emailsToSend;

    if (wouldBeSent > account.max_emails_per_month) {
        if (account.overage_price_per_1000_cents === undefined || account.overage_price_per_1000_cents === 0) {
            throw new interoperableErrors.PlanLimitError(
                `Monthly email limit reached (${account.max_emails_per_month})`,
                {limit: 'emails_per_month', max: account.max_emails_per_month, current: usage.emails_sent, requested: emailsToSend}
            );
        }
        // Plans with overage pricing are let through; the overage itself still gets
        // recorded via accountUsageModel.recordEmailsSent so it can be billed later.
    }
}

module.exports.checkContactLimit = checkContactLimit;
module.exports.checkEmailSendLimit = checkEmailSendLimit;
