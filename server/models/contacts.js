'use strict';

const knex = require('../lib/knex');
const dtHelpers = require('../lib/dt-helpers');
const { getSubscriptionTableName } = require('./subscriptions');

/** Lists the current user may view subscribers of. Used to build the cross-list contacts UNION. */
async function getPermittedListsTx(tx, context) {
    if (context.user.admin) {
        return await tx('lists').select('id', 'name');
    }

    return await tx('lists')
        .innerJoin(
            function () {
                this.from('permissions_list').distinct('entity').where('user', context.user.id).where('operation', 'viewSubscriptions').as('permitted');
            },
            'permitted.entity', 'lists.id'
        )
        .select('lists.id', 'lists.name');
}

/** Builds a `(SELECT ... UNION ALL ...) AS u` derived table across every given list's subscription table. */
function buildContactsUnion(tx, permittedLists) {
    const parts = [];
    const bindings = [];

    for (const list of permittedLists) {
        const table = getSubscriptionTableName(list.id);
        parts.push('select `hash_email`, `email`, `status`, `created`, ? as `list_id`, ? as `list_name` from `' + table + '` where `email` is not null');
        bindings.push(list.id, list.name);
    }

    const sql = '(' + parts.join(' union all ') + ') as u';
    return tx.raw(sql, bindings);
}

async function listDTAjax(context, listId, status, params) {
    return await knex.transaction(async tx => {
        let permittedLists = await getPermittedListsTx(tx, context);

        if (listId) {
            permittedLists = permittedLists.filter(list => list.id === listId);
        }

        if (permittedLists.length === 0) {
            return { draw: params.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
        }

        const unionSource = buildContactsUnion(tx, permittedLists);

        return await dtHelpers.ajaxListTx(
            tx,
            params,
            builder => {
                let query = builder.from(unionSource);
                if (status) {
                    query = query.where('u.status', status);
                }
                return query.groupBy('u.hash_email');
            },
            [
                { name: 'hash_email', raw: 'u.hash_email' },
                { name: 'email', raw: 'min(u.email) as `email`' },
                { name: 'status', raw: 'min(u.status) as `status`' },
                { name: 'created', raw: 'min(u.created) as `created`' },
                { name: 'lists', raw: 'group_concat(distinct u.list_name separator \';\') as `lists`' }
            ]
        );
    });
}

/** Total number of distinct contacts (by email) across every list the user may view. */
async function getTotalCount(context) {
    return await knex.transaction(async tx => {
        const permittedLists = await getPermittedListsTx(tx, context);
        if (permittedLists.length === 0) {
            return 0;
        }

        const unionSource = buildContactsUnion(tx, permittedLists);
        const row = await tx.from(unionSource).countDistinct('u.hash_email as cnt').first();
        return Number(row.cnt) || 0;
    });
}

module.exports.listDTAjax = listDTAjax;
module.exports.getTotalCount = getTotalCount;
