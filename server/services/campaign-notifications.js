'use strict';

const log = require('../lib/log');
const knex = require('../lib/knex');
const config = require('../lib/config');
const moment = require('moment');
const messageSender = require('../lib/message-sender');
const {getSystemSendConfigurationId} = require('../../shared/send-configurations');
const {CampaignStatus} = require('../../shared/campaigns');
const {getTrustedUrl} = require('../lib/urls');
const {tUI} = require('../lib/translate');

const checkPeriod = 2 * 60 * 1000; // 2 minutes - "your campaign just finished" is time-sensitive

async function notifyCampaignFinished(campaign) {
    const users = await knex('users').where('account_id', campaign.account_id).select('email');

    if (users.length === 0) {
        log.warn('CampaignNotifications', `Campaign #${campaign.id}'s account (#${campaign.account_id}) has no users to notify`);
        return;
    }

    const locale = config.defaultLanguage;
    const reportUrl = getTrustedUrl(`campaigns/${campaign.id}/statistics`);
    const sentDate = moment().format('DD-MM-YYYY');

    for (const user of users) {
        if (!user.email) {
            continue;
        }

        await messageSender.queueSubscriptionMessage(
            getSystemSendConfigurationId(),
            {address: user.email},
            tUI('mailerCampaignSentSubject', locale, {name: campaign.name}),
            null,
            {
                html: 'campaigns/campaign-sent-html.hbs',
                text: 'campaigns/campaign-sent-text.hbs',
                locale,
                data: {
                    campaignName: campaign.name,
                    deliveredCount: (campaign.delivered || 0).toLocaleString(),
                    sentDate,
                    reportUrl
                }
            }
        );
    }
}

async function checkFinishedCampaigns() {
    const campaigns = await knex('campaigns')
        .where('status', CampaignStatus.FINISHED)
        .whereNull('finished_notified_at')
        .select(['id', 'name', 'account_id', 'delivered']);

    for (const campaign of campaigns) {
        await notifyCampaignFinished(campaign);

        // Marked after queuing succeeds for everyone - queueSubscriptionMessage only ever
        // does fast local DB writes (actual delivery happens later via the normal sender
        // pipeline), so a failure here means something's actually wrong and worth retrying
        // next poll rather than silently skipping the rest of this campaign's users forever.
        await knex('campaigns').where('id', campaign.id).update({finished_notified_at: knex.fn.now()});

        log.info('CampaignNotifications', `Notified campaign #${campaign.id}'s account (#${campaign.account_id}) that it finished sending`);
    }
}

async function run() {
    while (true) {
        try {
            await checkFinishedCampaigns();
        } catch (err) {
            log.error('CampaignNotifications', err);
        }

        await new Promise(resolve => setTimeout(resolve, checkPeriod));
    }
}

function start() {
    log.info('CampaignNotifications', 'Starting campaign-finished notification service');
    run().catch(err => log.error('CampaignNotifications', err));
}

module.exports.start = start;
module.exports.checkFinishedCampaigns = checkFinishedCampaigns;
