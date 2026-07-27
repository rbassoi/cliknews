'use strict';

const knex = require('../lib/knex');
const dtHelpers = require('../lib/dt-helpers');
// Not destructured: subscriptions.js sits in a circular require chain (subscriptions ->
// campaigns -> plan-limits -> contacts), and whichever module gets loaded first can end
// up destructuring this before subscriptions.js has finished assigning its exports.
// Accessing it as a property at call time (below) always sees the final export.
const subscriptions = require('./subscriptions');
const { requireAccountScope, requireAccountScopeOn } = require('../lib/tenant-scope');

/** Lists the current user may view subscribers of. Used to build the cross-list contacts UNION. */
async function getPermittedListsTx(tx, context) {
    if (context.user.admin) {
        // A "scoped admin" context (account present, e.g. an API-key request —
        // see server/lib/middleware/api-key-auth.js) still gets filtered by
        // that account; a true admin context (no account, background jobs)
        // is unaffected, same as requireAccountScope's bypass everywhere else.
        return await tx('lists').select('id', 'name').modify(requireAccountScope, context);
    }

    return await tx('lists')
        .innerJoin(
            function () {
                this.from('permissions_list').distinct('entity').where('user', context.user.id).where('operation', 'viewSubscriptions').as('permitted');
            },
            'permitted.entity', 'lists.id'
        )
        .modify(requireAccountScopeOn('lists'), context)
        .select('lists.id', 'lists.name');
}

/** Builds a `(SELECT ... UNION ALL ...) AS u` derived table across every given list's subscription table. */
function buildContactsUnion(tx, permittedLists) {
    const parts = [];
    const bindings = [];

    for (const list of permittedLists) {
        const table = subscriptions.getSubscriptionTableName(list.id);
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
                let query = builder.from(unionSource)
                    // Contacts have no company_id of their own (they live in per-list
                    // subscription__X tables, not a single contacts table), so a
                    // company is inferred purely by matching the email's domain —
                    // the account_id check lives in the ON clause (not a WHERE) so a
                    // LEFT JOIN with no matching company still returns the contact row.
                    // Joined as a derived table exposing only (domain, name, account_id)
                    // rather than the raw `companies` table — the full table also has a
                    // `created` column, which collides with the union's own `created`
                    // and makes dt-helpers' generic unqualified search clause ambiguous.
                    .leftJoin(
                        tx('companies').select('domain', 'name', 'account_id').as('companies'),
                        function () {
                            this.on(knex.raw("SUBSTRING_INDEX(u.email, '@', -1)"), '=', 'companies.domain');
                            if (context.account && context.account.id) {
                                this.andOn('companies.account_id', '=', knex.raw('?', [context.account.id]));
                            }
                        }
                    );
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
                { name: 'lists', raw: 'group_concat(distinct u.list_name separator \';\') as `lists`' },
                { name: 'company_name', raw: 'min(companies.name) as `company_name`' }
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

/** Streams every distinct contact (by email) across every list the user may view, for CSV export. Keyset-paginated by hash_email, same convention as subscriptions.js:listIterator. */
async function* contactsIterator(context, status) {
    const permittedLists = await knex.transaction(tx => getPermittedListsTx(tx, context));
    if (permittedLists.length === 0) {
        return;
    }

    let lastHash = '';

    while (true) {
        const rows = await knex.transaction(async tx => {
            const unionSource = buildContactsUnion(tx, permittedLists);

            let query = tx.from(unionSource).where('u.hash_email', '>', lastHash);
            if (status) {
                query = query.where('u.status', status);
            }

            return await query
                .groupBy('u.hash_email')
                .orderBy('u.hash_email', 'asc')
                .limit(500)
                .select([
                    tx.raw('u.hash_email as `hash_email`'),
                    tx.raw('min(u.email) as `email`'),
                    tx.raw('min(u.status) as `status`'),
                    tx.raw('min(u.created) as `created`'),
                    tx.raw('group_concat(distinct u.list_name separator \';\') as `lists`')
                ]);
        });

        if (rows.length === 0) {
            break;
        }

        for (const row of rows) {
            yield row;
        }

        lastHash = rows[rows.length - 1].hash_email;
    }
}

module.exports.listDTAjax = listDTAjax;
module.exports.getTotalCount = getTotalCount;
module.exports.contactsIterator = contactsIterator;
