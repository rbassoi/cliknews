'use strict';

const dns = require('dns').promises;
const log = require('../lib/log');
const sendingDomainsModel = require('../models/sending-domains');

const checkPeriod = 60 * 60 * 1000; // hourly

async function checkPendingDomains() {
    const pending = await sendingDomainsModel.listAllPending();

    for (const sendingDomain of pending) {
        const recordName = sendingDomainsModel.getDnsTxtRecordName(sendingDomain);
        const expectedValue = sendingDomainsModel.getDnsTxtRecordValue(sendingDomain);

        try {
            const records = await dns.resolveTxt(recordName);
            const found = records.some(chunks => chunks.join('').trim() === expectedValue);

            if (found) {
                await sendingDomainsModel.markVerified(sendingDomain.id);
                log.info('DnsVerification', `Sending domain "${sendingDomain.domain}" (#${sendingDomain.id}) verified`);
            }
        } catch (err) {
            // NXDOMAIN or similar — the record just isn't there yet, retry next cycle.
        }
    }
}

async function run() {
    while (true) {
        try {
            await checkPendingDomains();
        } catch (err) {
            log.error('DnsVerification', err);
        }

        await new Promise(resolve => setTimeout(resolve, checkPeriod));
    }
}

function start() {
    log.info('DnsVerification', 'Starting sending-domain DNS verification service');
    run().catch(err => log.error('DnsVerification', err));
}

module.exports.start = start;
module.exports.checkPendingDomains = checkPendingDomains;
