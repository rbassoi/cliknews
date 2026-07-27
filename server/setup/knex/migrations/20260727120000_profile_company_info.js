exports.up = (knex, Promise) => (async() => {
    // Personal phone number for the logged-in user's own profile (client/src/account/Account.js).
    await knex.schema.table('users', table => {
        table.string('phone', 50).nullable();
    });

    // Company info shown on the same profile page (client/src/account/Company.js) —
    // accounts.name already exists and covers the company/org name field.
    await knex.schema.table('accounts', table => {
        table.string('website', 255).nullable();
        table.string('address', 255).nullable();
        table.string('city', 100).nullable();
        table.string('zip_code', 20).nullable();
        table.string('country', 100).nullable();
        table.string('phone', 50).nullable();
    });
})();

exports.down = (knex, Promise) => (async() => {
})();
