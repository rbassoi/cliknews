'use strict';

// Defines *which* custom fields exist on a contact (e.g. "Telefone" / key "telefone");
// actual values live in contacts.custom_fields JSON keyed by `key`. Deliberately much
// lighter than the per-list custom_fields system (server/models/fields.js), which adds
// a real DB column per field and wires into campaign merge tags — contacts fields don't
// need either of those, so this is just simple account-scoped metadata rows with no
// per-row sharing (gated by the `createContact` namespace permission, same permission
// that gates the contacts themselves).

const knex = require('../lib/knex');
const slugify = require('slugify');
const shares = require('./shares');
const interoperableErrors = require('../../shared/interoperable-errors');
const { requireAccountScope, requireAccountId } = require('../lib/tenant-scope');

async function getRootNamespaceIdTx(tx, context) {
    const accountId = requireAccountId(context);
    const ns = await tx('namespaces').where({ account_id: accountId, namespace: null }).first();
    if (!ns) {
        throw new interoperableErrors.NotFoundError();
    }
    return ns.id;
}

async function list(context) {
    return await knex('contact_fields').modify(requireAccountScope, context).orderBy('id', 'asc').select(['id', 'name', 'key', 'type']);
}

async function getById(context, id) {
    const entity = await knex('contact_fields').where('id', id).modify(requireAccountScope, context).select(['id', 'name', 'key', 'type']).first();
    if (!entity) {
        throw new interoperableErrors.NotFoundError();
    }
    return entity;
}

function toKey(name) {
    return slugify(name, { lower: true, strict: true, replacement: '_' });
}

async function create(context, entity) {
    return await knex.transaction(async tx => {
        const namespaceId = await getRootNamespaceIdTx(tx, context);
        await shares.enforceEntityPermissionTx(tx, context, 'namespace', namespaceId, 'createContact');

        const key = toKey(entity.name);
        if (!key) {
            throw new interoperableErrors.DuplicitKeyError('Invalid field name');
        }

        const existing = await tx('contact_fields').where({ account_id: requireAccountId(context), key }).first();
        if (existing) {
            throw new interoperableErrors.DuplicitKeyError();
        }

        const ids = await tx('contact_fields').insert({
            account_id: requireAccountId(context),
            namespace: namespaceId,
            name: entity.name,
            key,
            type: 'text'
        });

        return ids[0];
    });
}

async function updateName(context, id, name) {
    await knex.transaction(async tx => {
        const namespaceId = await getRootNamespaceIdTx(tx, context);
        await shares.enforceEntityPermissionTx(tx, context, 'namespace', namespaceId, 'createContact');

        await tx('contact_fields').where('id', id).modify(requireAccountScope, context).update({ name });
    });
}

async function remove(context, id) {
    await knex.transaction(async tx => {
        const namespaceId = await getRootNamespaceIdTx(tx, context);
        await shares.enforceEntityPermissionTx(tx, context, 'namespace', namespaceId, 'createContact');

        await tx('contact_fields').where('id', id).modify(requireAccountScope, context).del();
    });
}

module.exports.list = list;
module.exports.getById = getById;
module.exports.create = create;
module.exports.updateName = updateName;
module.exports.remove = remove;
