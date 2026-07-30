exports.up = (knex, Promise) => (async() => {
    await knex.schema.alterTable('campaigns', table => {
        table.timestamp('finished_notified_at').nullable();
    });
})();

exports.down = (knex, Promise) => (async() => {
    await knex.schema.alterTable('campaigns', table => {
        table.dropColumn('finished_notified_at');
    });
})();
