'use strict';
const contextHelpers = require('./lib/context-helpers');
const lists = require('./models/lists');
const sendConfigurations = require('./models/send-configurations');
const knex = require('./lib/knex');

async function main() {
    const ctx = contextHelpers.getAdminContext();

    const listRows = await knex('lists').where('name', 'Test List A').select('id');
    for (const row of listRows) {
        await lists.remove(ctx, row.id);
        console.log('removed list', row.id);
    }

    const scRows = await knex('send_configurations').where('name', 'Test Send Config').select('id');
    for (const row of scRows) {
        await sendConfigurations.remove(ctx, row.id);
        console.log('removed send configuration', row.id);
    }

    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
