exports.up = (knex, Promise) => (async() => {
    const legacyAccount = await knex('accounts').where('slug', 'legacy').first();
    const legacyAccountId = legacyAccount.id;

    // Same shape/order as the first migration: nullable -> backfill -> NOT NULL + index.
    // These 5 tables are "first-class" entities exactly like the original 7
    // (their own `namespace` column + permissions_<type>/shares_<type> tables).
    const tenantScopedTables = ['channels', 'mosaico_templates', 'reports', 'report_templates', 'custom_forms'];

    for (const tableName of tenantScopedTables) {
        await knex.schema.table(tableName, table => {
            table.integer('account_id').unsigned().nullable();
        });

        await knex(tableName).update({account_id: legacyAccountId});

        await knex.schema.table(tableName, table => {
            table.integer('account_id').unsigned().notNullable().index('idx_account').alter();
        });
    }

    await knex.schema.table('accounts', table => {
        // Filled in manually (or by a future provisioning script) once a real
        // outbound IP is assigned to this account — see docs/saas-plan.md Part J.
        table.string('dedicated_ip_address', 45).nullable();
    });

    await knex.schema.createTable('sending_domains', table => {
        table.increments('id').primary();
        table.integer('account_id').unsigned().notNullable().references('accounts.id');
        table.string('domain', 255).notNullable();
        table.string('dkim_selector', 50).notNullable();
        table.text('dkim_private_key').notNullable();
        table.text('dkim_public_key').notNullable();
        table.boolean('spf_verified').notNullable().defaultTo(false);
        table.boolean('dkim_verified').notNullable().defaultTo(false);
        table.boolean('dmarc_verified').notNullable().defaultTo(false);
        table.timestamp('verified_at').nullable().defaultTo(null);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.unique(['account_id', 'domain'], 'uq_account_domain');
    });

    await knex.schema.createTable('api_keys', table => {
        table.increments('id').primary();
        table.integer('account_id').unsigned().notNullable().references('accounts.id');
        table.string('key_hash', 64).notNullable();
        table.string('key_prefix', 12).notNullable();
        table.specificType('scopes', "SET('read','campaigns','contacts','transactional')").notNullable();
        table.timestamp('last_used_at').nullable().defaultTo(null);
        table.timestamp('revoked_at').nullable().defaultTo(null);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('suppression_list', table => {
        table.bigIncrements('id').primary();
        table.integer('account_id').unsigned().notNullable().references('accounts.id');
        table.string('email', 255).notNullable();
        table.enu('reason', ['bounce', 'spam_complaint', 'unsubscribe', 'manual']).notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.unique(['account_id', 'email'], 'uq_account_email');
    });
})();

exports.down = (knex, Promise) => (async() => {
})();
