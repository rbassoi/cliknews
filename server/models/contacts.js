'use strict';

const knex = require('../lib/knex');
const hasher = require('node-object-hash')();
const dtHelpers = require('../lib/dt-helpers');
// Not destructured: subscriptions.js sits in a circular require chain (subscriptions ->
// campaigns -> plan-limits -> contacts), and whichever module gets loaded first can end
// up destructuring this before subscriptions.js has finished assigning its exports.
// Accessing it as a property at call time (below) always sees the final export.
const subscriptions = require('./subscriptions');
const interoperableErrors = require('../../shared/interoperable-errors');
const { filterObject } = require('../lib/helpers');
const shares = require('./shares');
const namespaceHelpers = require('../lib/namespace-helpers');
const { EntityActivityType } = require('../../shared/activity-log');
const activityLog = require('../lib/activity-log');
const { requireAccountScope, requireAccountScopeOn, requireAccountId } = require('../lib/tenant-scope');

const allowedKeys = new Set(['name', 'email', 'company_id', 'custom_fields', 'namespace']);

function hash(entity) {
    return hasher.hash(filterObject(entity, allowedKeys));
}

/** Lists the current user may view subscribers of. Used only to build the informational "which lists" / status columns below — contact rows themselves are now permission-controlled via shares_contact/permissions_contact, same as companies. */
async function getPermittedListsTx(tx, context) {
    if (context.user.admin) {
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
        parts.push('select `email`, `status`, ? as `list_name` from `' + table + '` where `email` is not null');
        bindings.push(list.name);
    }

    const sql = '(' + parts.join(' union all ') + ') as u';
    return tx.raw(sql, bindings);
}

async function listDTAjax(context, status, params) {
    return await knex.transaction(async tx => {
        const permittedLists = await getPermittedListsTx(tx, context);
        const unionSource = permittedLists.length > 0 ? buildContactsUnion(tx, permittedLists) : null;

        return await dtHelpers.ajaxListWithPermissionsTx(
            tx,
            context,
            [{ entityTypeId: 'contact', requiredOperations: ['view'] }],
            params,
            builder => {
                let query = builder
                    .from('contacts')
                    .leftJoin('companies', 'companies.id', 'contacts.company_id');

                if (unionSource) {
                    let subsBuilder = tx
                        .select([
                            'u.email as email',
                            knex.raw('group_concat(distinct u.list_name separator \';\') as list_names'),
                            knex.raw('min(u.status) as min_status')
                        ])
                        .from(unionSource);

                    if (status) {
                        subsBuilder = subsBuilder.where('u.status', status);
                    }

                    subsBuilder = subsBuilder.groupBy('u.email').as('subs');

                    query = status
                        ? query.innerJoin(subsBuilder, 'subs.email', 'contacts.email')
                        : query.leftJoin(subsBuilder, 'subs.email', 'contacts.email');
                } else if (status) {
                    query = query.whereRaw('FALSE');
                }

                return query;
            },
            [
                'contacts.id',
                'contacts.email',
                'contacts.name',
                'contacts.created',
                unionSource ? { name: 'lists', raw: 'subs.list_names' } : { name: 'lists', raw: 'NULL' },
                unionSource ? { name: 'status', raw: 'subs.min_status' } : { name: 'status', raw: 'NULL' },
                'companies.name'
            ]
        );
    });
}

async function _getByTx(tx, context, id, withPermissions = true) {
    const entity = await tx('contacts').where('contacts.id', id)
        .modify(requireAccountScope, context)
        .select(['contacts.id', 'contacts.email', 'contacts.name', 'contacts.company_id', 'contacts.custom_fields', 'contacts.namespace'])
        .first();

    if (!entity) {
        shares.throwPermissionDenied();
    }

    entity.custom_fields = entity.custom_fields ? JSON.parse(entity.custom_fields) : {};

    if (withPermissions) {
        entity.permissions = await shares.getPermissionsTx(tx, context, 'contact', id);
    }

    return entity;
}

async function getByIdTx(tx, context, id, withPermissions = true) {
    await shares.enforceEntityPermissionTx(tx, context, 'contact', id, 'view');
    return await _getByTx(tx, context, id, withPermissions);
}

async function getById(context, id, withPermissions = true) {
    return await knex.transaction(async tx => {
        return await getByIdTx(tx, context, id, withPermissions);
    });
}

async function create(context, entity) {
    return await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'namespace', entity.namespace, 'createContact');

        await namespaceHelpers.validateEntity(tx, entity);

        const accountId = requireAccountId(context);
        if (await tx('contacts').where({ account_id: accountId, email: entity.email }).first()) {
            throw new interoperableErrors.DuplicitEmailError();
        }

        const filteredEntity = filterObject(entity, allowedKeys);
        filteredEntity.account_id = accountId;
        if (filteredEntity.custom_fields) {
            filteredEntity.custom_fields = JSON.stringify(filteredEntity.custom_fields);
        }

        const ids = await tx('contacts').insert(filteredEntity);
        const id = ids[0];

        await shares.rebuildPermissionsTx(tx, { entityTypeId: 'contact', entityId: id });

        await activityLog.logEntityActivity('contact', EntityActivityType.CREATE, id);

        return id;
    });
}

async function updateWithConsistencyCheck(context, entity) {
    await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'contact', entity.id, 'edit');

        const existing = await _getByTx(tx, context, entity.id, false);

        const existingHash = hash(existing);
        if (existingHash !== entity.originalHash) {
            throw new interoperableErrors.ChangedError();
        }

        await namespaceHelpers.validateEntity(tx, entity);
        await namespaceHelpers.validateMoveTx(tx, context, entity, existing, 'contact', 'createContact', 'delete');

        if (entity.email !== existing.email) {
            const accountId = requireAccountId(context);
            if (await tx('contacts').where({ account_id: accountId, email: entity.email }).whereNot('id', entity.id).first()) {
                throw new interoperableErrors.DuplicitEmailError();
            }
        }

        const filteredEntity = filterObject(entity, allowedKeys);
        if (filteredEntity.custom_fields) {
            filteredEntity.custom_fields = JSON.stringify(filteredEntity.custom_fields);
        }

        await tx('contacts').where('id', entity.id).modify(requireAccountScope, context).update(filteredEntity);

        await shares.rebuildPermissionsTx(tx, { entityTypeId: 'contact', entityId: entity.id });

        await activityLog.logEntityActivity('contact', EntityActivityType.UPDATE, entity.id);
    });
}

async function remove(context, id) {
    await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'contact', id, 'delete');

        await tx('contacts').where('id', id).modify(requireAccountScope, context).del();

        await activityLog.logEntityActivity('contact', EntityActivityType.REMOVE, id);
    });
}

/** Total number of contacts visible to the given context (their own account's contacts table). */
async function getTotalCount(context) {
    const row = await knex('contacts').modify(requireAccountScope, context).count('id as cnt').first();
    return Number(row.cnt) || 0;
}

/** Streams every contact for the account, joined with its list subscriptions, for CSV export. Keyset-paginated by id. */
async function* contactsIterator(context, status) {
    let lastId = 0;

    while (true) {
        const rows = await knex.transaction(async tx => {
            const permittedLists = await getPermittedListsTx(tx, context);
            const unionSource = permittedLists.length > 0 ? buildContactsUnion(tx, permittedLists) : null;

            let query = tx.from('contacts').modify(requireAccountScope, context).where('contacts.id', '>', lastId);

            if (unionSource) {
                let subsBuilder = tx
                    .select(['u.email as email', knex.raw('group_concat(distinct u.list_name separator \';\') as list_names'), knex.raw('min(u.status) as min_status')])
                    .from(unionSource);

                if (status) {
                    subsBuilder = subsBuilder.where('u.status', status);
                }

                subsBuilder = subsBuilder.groupBy('u.email').as('subs');

                query = status
                    ? query.innerJoin(subsBuilder, 'subs.email', 'contacts.email')
                    : query.leftJoin(subsBuilder, 'subs.email', 'contacts.email');
            } else if (status) {
                query = query.whereRaw('FALSE');
            }

            return await query
                .orderBy('contacts.id', 'asc')
                .limit(500)
                .select([
                    'contacts.id as id',
                    'contacts.email as email',
                    'contacts.name as name',
                    'contacts.created as created',
                    unionSource ? knex.raw('subs.list_names as `lists`') : knex.raw('NULL as `lists`'),
                    unionSource ? knex.raw('subs.min_status as `status`') : knex.raw('NULL as `status`')
                ]);
        });

        if (rows.length === 0) {
            break;
        }

        for (const row of rows) {
            yield row;
        }

        lastId = rows[rows.length - 1].id;
    }
}

module.exports.hash = hash;
module.exports.listDTAjax = listDTAjax;
module.exports.getByIdTx = getByIdTx;
module.exports.getById = getById;
module.exports.create = create;
module.exports.updateWithConsistencyCheck = updateWithConsistencyCheck;
module.exports.remove = remove;
module.exports.getTotalCount = getTotalCount;
module.exports.contactsIterator = contactsIterator;
