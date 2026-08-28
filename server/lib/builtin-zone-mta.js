'use strict';

const config = require('./config');
const fork = require('./fork').fork;
const log = require('./log');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const bluebird = require('bluebird');
const os = require('os');
const knex = require('./knex');
const http = require('http');

let zoneMtaProcess = null;

const zoneMtaDir = path.join(__dirname, '..', '..', 'zone-mta');
const zoneMtaBuiltingConfig = path.join(zoneMtaDir, 'config', 'builtin-zonemta.json');

const password = process.env.BUILTIN_ZONE_MTA_PASSWORD || crypto.randomBytes(20).toString('hex').toLowerCase();

let restartCount = 0;
let lastRestartCount = 0;

let restartBackoffIdx = 0;
const restartBackoff = [0, 30, 60, 300]; // in seconds

setInterval(() => {
    if (restartCount === lastRestartCount) {
        restartBackoffIdx = 0;
    }

    lastRestartCount = restartCount;
}, 300000 /* 5 mins */);

function getUsername() {
    return 'cliker';
}

function getPassword() {
    return password;
}

function getPoolName(accountId) {
    return `dedicated-${accountId}`;
}

// Called per-send from mailers.js (as async, same as the DKIM lookup it sits
// next to) — no caching here yet, see docs/saas-plan.md Part J for the
// known scaling caveat.
async function getZoneNameForAccountId(accountId) {
    if (!accountId) {
        return 'default';
    }

    const account = await knex('accounts').where('id', accountId).select(['ip_pool', 'dedicated_ip_address']).first();

    if (account && account.ip_pool === 'dedicated' && account.dedicated_ip_address) {
        return getPoolName(accountId);
    }

    return 'default';
}

async function createConfig() {
    // Accounts provisioned with a real dedicated outbound IP (see
    // docs/saas-plan.md Part J — dedicated_ip_address is filled in manually
    // or by a future provisioning script, never by this code) get their own
    // pool+zone. Regenerated on every server start, so a newly-provisioned
    // IP needs a restart to take effect — no dynamic hot-reload here.
    const dedicatedAccounts = await knex('accounts')
        .where('ip_pool', 'dedicated')
        .whereNotNull('dedicated_ip_address')
        .select(['id', 'dedicated_ip_address']);

    const pools = {
        default: {
            address: '0.0.0.0',
            name: config.builtinZoneMTA.poolName || os.hostname()
        }
    };

    const zones = {
        default: {
            preferIPv6: false,
            ignoreIPv6: true,
            processes: config.builtinZoneMTA.processes,
            connections: config.builtinZoneMTA.connections,
            pool: 'default'
        }
    };

    for (const account of dedicatedAccounts) {
        const poolName = getPoolName(account.id);

        pools[poolName] = {
            address: account.dedicated_ip_address,
            name: config.builtinZoneMTA.poolName || os.hostname()
        };

        zones[poolName] = {
            preferIPv6: false,
            ignoreIPv6: true,
            processes: config.builtinZoneMTA.processes,
            connections: config.builtinZoneMTA.connections,
            pool: poolName
        };
    }

    const cnf = {    // This is the main config file
        name: 'ZoneMTA',

        // Process identifier
        ident: 'zone-mta',

        // Run as the following user. Only use this if the application starts up as root
        user: config.user,
        group: config.group,

        log: config.builtinZoneMTA.log,

        dbs: {
            // MongoDB connection string
            mongo: config.builtinZoneMTA.mongo,

            // Redis connection string
            redis: config.builtinZoneMTA.redis,

            // Database name for ZoneMTA data in MongoDB. In most cases it should be the same as in the connection string
            sender: 'zone-mta'
        },

        api: {
            maildrop: false,
            user: getUsername(),
            pass: getPassword()
        },

        smtpInterfaces: {
            // Default SMTP interface for accepting mail for delivery
            feeder: {
                enabled: true,

                // How many worker processes to spawn
                processes: 1,

                // Maximum allowed message size 30MB
                maxSize: 31457280,

                // Local IP and port to bind to
                host: config.builtinZoneMTA.host,
                port: config.builtinZoneMTA.port,

                // Set to true to require authentication
                // If authentication is enabled then you need to use a plugin with an authentication hook
                authentication: true,

                // How many recipients to allow per message
                maxRecipients: 1,

                // Set to true to enable STARTTLS. Do not forget to change default TLS keys
                starttls: false,

                // set to true to start in TLS mode if using port 465
                // this probably does not work as TLS support with 465 in ZoneMTA is a bit buggy
                secure: false,
            }
        },

        plugins: {
            "core/email-bounce": false,
            "core/http-bounce": {
                enabled: "main",
                url: `${config.www.trustedUrlBase}/webhooks/zone-mta`
            },
            "core/default-headers": {
                enabled: ["receiver", "main", "sender"],
                futureDate: false,
                xOriginatingIP: false
            },
            'cliker-main': {
                enabled: ['main']
            },
            'cliker-receiver': {
                enabled: ['receiver'],
                username: getUsername(),
                password: getPassword()
            }
        },

        pools,
        zones
    };

    await fs.writeFile(zoneMtaBuiltingConfig, JSON.stringify(cnf, null, 2));
}

function restart(callback) {
    if (zoneMtaProcess) return callback();

    if (restartCount === 0) {
        log.info('ZoneMTA', 'Starting built-in Zone MTA process');
    } else {
        log.info('ZoneMTA', `Restarting built-in Zone MTA process (restart count ${restartCount})`);
    }

    zoneMtaProcess = fork(
        path.join(zoneMtaDir, 'index.js'),
        ['--config=' + zoneMtaBuiltingConfig],
        {
            cwd: zoneMtaDir,
            env: {NODE_ENV: process.env.NODE_ENV}
        }
    );

    zoneMtaProcess.on('message', msg => {
        if (msg) {
            if (msg.type === 'zone-mta-started') {
                log.info('ZoneMTA', 'ZoneMTA process started');

                if (callback) {
                    return callback();
                } else {
                    return;
                }
            }
        }
    });

    zoneMtaProcess.on('close', (code, signal) => {
        log.error('ZoneMTA', 'ZoneMTA process exited with code %s signal %s', code, signal);

        zoneMtaProcess = null;
        restartCount += 1;

        const backoffTimeout = restartBackoff[restartBackoffIdx] * 1000;
        if (restartBackoffIdx < restartBackoff.length - 1) {
            restartBackoffIdx += 1;
        }

        setTimeout(restart, backoffTimeout, callback);
    });
}

function spawn(callback) {
    if (config.builtinZoneMTA.enabled) {

        createConfig().then(() => {
            restart(callback);
        }).catch(err => callback(err));

    } else {
        callback();
    }
}

// ZoneMTA's own admin API, always bound to localhost (see
// node_modules/zone-mta/config/default.js) regardless of what's configured
// above for the SMTP feeder.
const API_HOST = '127.0.0.1';
const API_PORT = 12080;

// Removes one message (all delivery attempts, any recipient/seq) from
// ZoneMTA's own send queue. Best-effort: a message already delivered/gone is
// not an error, and if the built-in MTA isn't running this just resolves.
function removeQueuedMessage(id) {
    return new Promise(resolve => {
        const req = http.request({
            host: API_HOST,
            port: API_PORT,
            path: `/message/${encodeURIComponent(id)}`,
            method: 'DELETE',
            auth: `${getUsername()}:${getPassword()}`,
            timeout: 5000
        }, res => {
            res.resume();
            resolve();
        });
        req.on('error', () => resolve());
        req.on('timeout', () => {
            req.destroy();
            resolve();
        });
        req.end();
    });
}

// Stopping/pausing a campaign in Cliker only stops it from handing NEW
// messages to ZoneMTA — anything already submitted keeps retrying inside
// ZoneMTA's own queue on its own schedule, completely independent of the
// campaign's status. (Incident 2026-08-28: a campaign marked FINISHED days
// earlier was still hammering blocked domains from this leftover queue.)
// Call this with the response_ids of a campaign's still-queued messages
// whenever a campaign is stopped, so the underlying send queue is stopped
// along with it.
async function purgeQueuedMessages(ids) {
    await bluebird.map(ids, removeQueuedMessage, {concurrency: 20});
}

module.exports.spawn = bluebird.promisify(spawn);
module.exports.getUsername = getUsername;
module.exports.getPassword = getPassword;
module.exports.getZoneNameForAccountId = getZoneNameForAccountId;
module.exports.purgeQueuedMessages = purgeQueuedMessages;
