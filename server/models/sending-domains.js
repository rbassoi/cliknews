'use strict';

const knex = require('../lib/knex');
const crypto = require('crypto');
const dtHelpers = require('../lib/dt-helpers');
const interoperableErrors = require('../../shared/interoperable-errors');
const { requireAccountId } = require('../lib/tenant-scope');

function generateSelector() {
    return 'cn' + Date.now().toString(36);
}

function getDnsTxtRecordName(sendingDomain) {
    return `${sendingDomain.dkim_selector}._domainkey.${sendingDomain.domain}`;
}

function getDnsTxtRecordValue(sendingDomain) {
    // DNS wants the raw base64 body, without the PEM header/footer/newlines.
    const base64 = sendingDomain.dkim_public_key
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s+/g, '');

    return `v=DKIM1; k=rsa; p=${base64}`;
}

async function listDTAjax(context, params) {
    const accountId = requireAccountId(context);

    return await dtHelpers.ajaxList(
        params,
        builder => builder.from('sending_domains').where('account_id', accountId),
        ['id', 'domain', 'dkim_selector', 'dkim_verified', 'verified_at', 'created_at']
    );
}

// Never selects dkim_private_key — this backs the client-facing REST GET,
// and the private key must never leave the server.
async function listByAccount(context) {
    const accountId = requireAccountId(context);
    return await knex('sending_domains')
        .where('account_id', accountId)
        .select(['id', 'account_id', 'domain', 'dkim_selector', 'dkim_public_key', 'spf_verified', 'dkim_verified', 'dmarc_verified', 'verified_at', 'created_at'])
        .orderBy('created_at', 'desc');
}

async function getVerifiedByAccountAndDomain(accountId, domain) {
    return await knex('sending_domains').where({account_id: accountId, domain, dkim_verified: true}).first();
}

async function create(context, domain) {
    const accountId = requireAccountId(context);

    const existing = await knex('sending_domains').where({account_id: accountId, domain}).first();
    if (existing) {
        throw new interoperableErrors.DuplicitNameError();
    }

    const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {type: 'spki', format: 'pem'},
        privateKeyEncoding: {type: 'pkcs8', format: 'pem'}
    });

    const ids = await knex('sending_domains').insert({
        account_id: accountId,
        domain,
        dkim_selector: generateSelector(),
        dkim_private_key: privateKey,
        dkim_public_key: publicKey
    });

    return await knex('sending_domains')
        .where('id', ids[0])
        .select(['id', 'account_id', 'domain', 'dkim_selector', 'dkim_public_key', 'spf_verified', 'dkim_verified', 'dmarc_verified', 'verified_at', 'created_at'])
        .first();
}

async function remove(context, id) {
    await knex('sending_domains').where({id, account_id: requireAccountId(context)}).del();
}

async function markVerified(id) {
    await knex('sending_domains').where('id', id).update({
        dkim_verified: true,
        spf_verified: true,
        verified_at: knex.fn.now()
    });
}

async function listAllPending() {
    return await knex('sending_domains').where('dkim_verified', false);
}

module.exports.listDTAjax = listDTAjax;
module.exports.listByAccount = listByAccount;
module.exports.getVerifiedByAccountAndDomain = getVerifiedByAccountAndDomain;
module.exports.create = create;
module.exports.remove = remove;
module.exports.markVerified = markVerified;
module.exports.listAllPending = listAllPending;
module.exports.getDnsTxtRecordName = getDnsTxtRecordName;
module.exports.getDnsTxtRecordValue = getDnsTxtRecordValue;
