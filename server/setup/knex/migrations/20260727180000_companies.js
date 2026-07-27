exports.up = (knex, Promise) => (async() => {
    await knex.schema.createTable('companies', table => {
        table.increments('id').primary();
        table.integer('account_id').unsigned().notNullable().references('accounts.id').index('idx_companies_account');
        table.integer('namespace').unsigned().notNullable().references('namespaces.id');
        table.string('name').notNullable();
        table.string('domain').nullable().index('idx_companies_domain');
        table.string('phone', 50).nullable();
        table.timestamp('created').defaultTo(knex.fn.now());
    });

    await knex.schema
        .createTable('shares_company', table => {
            table.integer('entity').unsigned().notNullable().references('companies.id').onDelete('CASCADE');
            table.integer('user').unsigned().notNullable().references('users.id').onDelete('CASCADE');
            table.string('role', 128).notNullable();
            table.boolean('auto').defaultTo(false);
            table.primary(['entity', 'user']);
        })
        .createTable('permissions_company', table => {
            table.integer('entity').unsigned().notNullable().references('companies.id').onDelete('CASCADE');
            table.integer('user').unsigned().notNullable().references('users.id').onDelete('CASCADE');
            table.string('operation', 128).notNullable();
            table.primary(['entity', 'user', 'operation']);
        });
})();

exports.down = (knex, Promise) => (async() => {
})();
