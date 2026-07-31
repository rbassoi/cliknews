exports.up = (knex, Promise) => (async() => {
    // accounts.status was created as a MySQL ENUM (20260725150000_multi_tenant_accounts.js)
    // restricted to ['trial', 'active', 'past_due', 'suspended', 'canceled'] - 'pending'
    // (new signups awaiting admin approval) needs to be added to that list. Knex has no
    // enum-alter helper, so this goes through a raw ALTER TABLE.
    await knex.raw("ALTER TABLE `accounts` MODIFY COLUMN `status` ENUM('trial', 'active', 'past_due', 'suspended', 'canceled', 'pending') NOT NULL DEFAULT 'trial'");
})();

exports.down = (knex, Promise) => (async() => {
    await knex.raw("ALTER TABLE `accounts` MODIFY COLUMN `status` ENUM('trial', 'active', 'past_due', 'suspended', 'canceled') NOT NULL DEFAULT 'trial'");
})();
