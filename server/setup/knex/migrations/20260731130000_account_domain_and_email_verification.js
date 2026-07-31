exports.up = (knex, Promise) => (async() => {
    await knex.schema.alterTable('accounts', table => {
        // Every existing account has domain=NULL, and MySQL allows multiple NULLs
        // under a UNIQUE index, so this is safe to add without a backfill conflict -
        // unlike accounts.name, which already has real duplicate data (see
        // server/models/accounts.js's _validateAccountUniqueness comment) and so is
        // only enforced at the application layer, not here.
        table.string('domain', 255).nullable().unique();
    });

    await knex.schema.alterTable('users', table => {
        table.string('email_verify_token').nullable().index();
        table.dateTime('email_verify_expire').nullable();
        table.dateTime('email_verified_at').nullable();
    });

    // Every pre-existing user predates this gate - backfill them as verified so
    // nobody already using the system gets retroactively locked out of anything
    // that starts checking email_verified_at.
    await knex('users').whereNull('email_verified_at').update({email_verified_at: knex.fn.now()});
})();

exports.down = (knex, Promise) => (async() => {
    await knex.schema.alterTable('accounts', table => {
        table.dropColumn('domain');
    });

    await knex.schema.alterTable('users', table => {
        table.dropColumn('email_verify_token');
        table.dropColumn('email_verify_expire');
        table.dropColumn('email_verified_at');
    });
})();
