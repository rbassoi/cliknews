'use strict';

const knex = require('../lib/knex');
const crypto = require('crypto');
const dtHelpers = require('../lib/dt-helpers');
const { requireAccountId } = require('../lib/tenant-scope');

const VALID_SCOPES = ['read', 'campaigns', 'contacts', 'transactional'];

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function generateRawKey() {
    return 'cn_' + crypto.randomBytes(24).toString('hex');
}

async function listDTAjax(context, params) {
    const accountId = requireAccountId(context);

    return await dtHelpers.ajaxList(
        params,
        builder => builder.from('api_keys').where('account_id', accountId),
        ['id', 'key_prefix', 'scopes', 'last_used_at', 'revoked_at', 'created_at']
    );
}

// Returns the raw key exactly once — only the hash is ever stored, so it
// can't be shown again after this call returns.
async function create(context, scopes) {
    const accountId = requireAccountId(context);

    const validScopes = (scopes || []).filter(s => VALID_SCOPES.includes(s));

    const rawKey = generateRawKey();
    const keyHash = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const ids = await knex('api_keys').insert({
        account_id: accountId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: validScopes.join(',')
    });

    return {
        id: ids[0],
        key_prefix: keyPrefix,
        scopes: validScopes,
        raw_key: rawKey
    };
}

async function revoke(context, id) {
    await knex('api_keys').where({id, account_id: requireAccountId(context)}).update({revoked_at: knex.fn.now()});
}

async function getByRawKey(rawKey) {
    const keyHash = sha256(rawKey);
    const row = await knex('api_keys').where({key_hash: keyHash}).whereNull('revoked_at').first();

    if (!row) {
        return null;
    }

    await knex('api_keys').where('id', row.id).update({last_used_at: knex.fn.now()});

    return {
        ...row,
        scopes: (row.scopes || '').split(',').filter(Boolean)
    };
}

module.exports.VALID_SCOPES = VALID_SCOPES;
module.exports.listDTAjax = listDTAjax;
module.exports.create = create;
module.exports.revoke = revoke;
module.exports.getByRawKey = getByRawKey;
