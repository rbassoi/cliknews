// Lets API clients (e.g. the VoxBase integration) safely retry a
// POST /api-v1/campaigns call without creating duplicate campaigns: a
// retried request that supplies the same idempotency_key returns the
// campaign created by the original request instead of inserting a new
// row. NULL is allowed and not deduplicated (MySQL treats each NULL as
// distinct in a unique index), so campaigns created without a key
// (the admin UI, RSS entries, ...) are unaffected.
exports.up = (knex, Promise) => (async() => {
    await knex.schema.alterTable('campaigns', table => {
        table.string('idempotency_key', 255).nullable();
        table.unique(['account_id', 'idempotency_key'], 'campaigns_account_idempotency_key_unique');
    });
})();

exports.down = (knex, Promise) => (async() => {
    await knex.schema.alterTable('campaigns', table => {
        table.dropUnique(['account_id', 'idempotency_key'], 'campaigns_account_idempotency_key_unique');
        table.dropColumn('idempotency_key');
    });
})();
