'use strict';

const knex = require('../lib/knex');
const hasher = require('node-object-hash')();
const dtHelpers = require('../lib/dt-helpers');
const interoperableErrors = require('../../shared/interoperable-errors');
const { filterObject } = require('../lib/helpers');
const shares = require('./shares');
const namespaceHelpers = require('../lib/namespace-helpers');
const { EntityActivityType } = require('../../shared/activity-log');
const activityLog = require('../lib/activity-log');
const { requireAccountScope, requireAccountId } = require('../lib/tenant-scope');

const allowedKeys = new Set(['name', 'domain', 'phone', 'namespace']);


function hash(entity) {
    return hasher.hash(filterObject(entity, allowedKeys));
}

async function listDTAjax(context, params) {
    return await dtHelpers.ajaxListWithPermissions(
        context,
        [{ entityTypeId: 'company', requiredOperations: ['view'] }],
        params,
        builder => builder
            .from('companies')
            .innerJoin('namespaces', 'namespaces.id', 'companies.namespace'),
        ['companies.id', 'companies.name', 'companies.domain', 'companies.phone', 'namespaces.name']
    );
}

async function _getByTx(tx, context, id, withPermissions = true) {
    const entity = await tx('companies').where('companies.id', id)
        .modify(requireAccountScope, context)
        .select(['companies.id', 'companies.name', 'companies.domain', 'companies.phone', 'companies.namespace'])
        .first();

    if (!entity) {
        shares.throwPermissionDenied();
    }

    if (withPermissions) {
        entity.permissions = await shares.getPermissionsTx(tx, context, 'company', id);
    }

    return entity;
}

async function getByIdTx(tx, context, id, withPermissions = true) {
    await shares.enforceEntityPermissionTx(tx, context, 'company', id, 'view');
    return await _getByTx(tx, context, id, withPermissions);
}

async function getById(context, id, withPermissions = true) {
    return await knex.transaction(async tx => {
        return await getByIdTx(tx, context, id, withPermissions);
    });
}

async function create(context, entity) {
    return await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'namespace', entity.namespace, 'createCompany');

        await namespaceHelpers.validateEntity(tx, entity);

        const filteredEntity = filterObject(entity, allowedKeys);
        filteredEntity.account_id = requireAccountId(context);

        const ids = await tx('companies').insert(filteredEntity);
        const id = ids[0];

        await shares.rebuildPermissionsTx(tx, { entityTypeId: 'company', entityId: id });

        await activityLog.logEntityActivity('company', EntityActivityType.CREATE, id);

        return id;
    });
}

async function updateWithConsistencyCheck(context, entity) {
    await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'company', entity.id, 'edit');

        const existing = await _getByTx(tx, context, entity.id, false);

        const existingHash = hash(existing);
        if (existingHash !== entity.originalHash) {
            throw new interoperableErrors.ChangedError();
        }

        await namespaceHelpers.validateEntity(tx, entity);
        await namespaceHelpers.validateMoveTx(tx, context, entity, existing, 'company', 'createCompany', 'delete');

        await tx('companies').where('id', entity.id).modify(requireAccountScope, context).update(filterObject(entity, allowedKeys));

        await shares.rebuildPermissionsTx(tx, { entityTypeId: 'company', entityId: entity.id });

        await activityLog.logEntityActivity('company', EntityActivityType.UPDATE, entity.id);
    });
}

async function remove(context, id) {
    await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'company', id, 'delete');

        await tx('companies').where('id', id).modify(requireAccountScope, context).del();

        await activityLog.logEntityActivity('company', EntityActivityType.REMOVE, id);
    });
}


module.exports.hash = hash;
module.exports.listDTAjax = listDTAjax;
module.exports.getByIdTx = getByIdTx;
module.exports.getById = getById;
module.exports.create = create;
module.exports.updateWithConsistencyCheck = updateWithConsistencyCheck;
module.exports.remove = remove;
