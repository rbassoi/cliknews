'use strict';

const knex = require('../lib/knex');
const contacts = require('./contacts');
const { CampaignStatus } = require('../../shared/campaigns');

function campaignsBaseQuery(context) {
    let query = knex('campaigns');
    if (!context.user.admin) {
        query = query.innerJoin(
            function () {
                this.from('permissions_campaign').distinct('entity').where('user', context.user.id).where('operation', 'view').as('permitted');
            },
            'permitted.entity', 'campaigns.id'
        );
    }
    return query;
}

function listsBaseQuery(context) {
    let query = knex('lists');
    if (!context.user.admin) {
        query = query.innerJoin(
            function () {
                this.from('permissions_list').distinct('entity').where('user', context.user.id).where('operation', 'view').as('permitted');
            },
            'permitted.entity', 'lists.id'
        );
    }
    return query;
}

async function getStats(context) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        totalContacts,
        listsCountRow,
        sentThisMonthRow,
        sentTotalRow,
        avgOpenRow,
        recentLists,
        recentCampaigns
    ] = await Promise.all([
        contacts.getTotalCount(context),
        listsBaseQuery(context).count('lists.id as cnt').first(),
        campaignsBaseQuery(context).where('campaigns.status', CampaignStatus.FINISHED).where('campaigns.created', '>=', startOfMonth).count('campaigns.id as cnt').first(),
        campaignsBaseQuery(context).where('campaigns.status', CampaignStatus.FINISHED).count('campaigns.id as cnt').first(),
        campaignsBaseQuery(context).where('campaigns.status', CampaignStatus.FINISHED).sum({ delivered: 'campaigns.delivered', opened: 'campaigns.opened' }).first(),
        listsBaseQuery(context).orderBy('lists.id', 'desc').limit(4).select('lists.id', 'lists.name', 'lists.subscribers'),
        campaignsBaseQuery(context)
            .leftJoin('campaign_lists', 'campaign_lists.campaign', 'campaigns.id')
            .leftJoin('lists', 'lists.id', 'campaign_lists.list')
            .whereIn('campaigns.status', [CampaignStatus.FINISHED, CampaignStatus.SCHEDULED])
            .groupBy('campaigns.id')
            .orderBy('campaigns.created', 'desc')
            .limit(4)
            .select(
                'campaigns.id', 'campaigns.name', 'campaigns.status', 'campaigns.created', 'campaigns.scheduled',
                'campaigns.delivered', 'campaigns.opened',
                knex.raw('group_concat(distinct lists.name separator \', \') as list_names')
            )
    ]);

    const avgOpenRate = avgOpenRow.delivered > 0 ? (avgOpenRow.opened / avgOpenRow.delivered * 100) : 0;

    return {
        totalContacts,
        listsCount: Number(listsCountRow.cnt) || 0,
        newslettersSent: Number(sentTotalRow.cnt) || 0,
        newslettersSentThisMonth: Number(sentThisMonthRow.cnt) || 0,
        avgOpenRate,
        recentLists: recentLists.map(l => ({
            id: l.id,
            name: l.name,
            subscribers: l.subscribers
        })),
        recentCampaigns: recentCampaigns.map(c => ({
            id: c.id,
            name: c.name,
            list: c.list_names,
            date: c.scheduled || c.created,
            status: c.status,
            openRate: c.status === CampaignStatus.FINISHED && c.delivered > 0 ? (c.opened / c.delivered * 100) : null
        }))
    };
}

module.exports.getStats = getStats;
