exports.up = (knex, Promise) => (async() => {
    await knex.schema.createTable('plans', table => {
        table.increments('id').primary();
        table.string('code', 50).notNullable().unique();
        table.string('name', 100).notNullable();
        table.integer('max_contacts').unsigned().notNullable();
        table.integer('max_emails_per_month').unsigned().notNullable();
        table.integer('max_users').unsigned().notNullable().defaultTo(1);
        table.integer('max_sending_domains').unsigned().notNullable().defaultTo(1);
        table.integer('max_automations').unsigned().notNullable().defaultTo(0);
        table.boolean('api_access').notNullable().defaultTo(false);
        table.boolean('dedicated_ip').notNullable().defaultTo(false);
        table.boolean('custom_dkim').notNullable().defaultTo(false);
        table.integer('price_monthly_cents').unsigned().notNullable().defaultTo(0);
        table.integer('price_yearly_cents').unsigned().notNullable().defaultTo(0);
        table.integer('overage_price_per_1000_cents').unsigned().notNullable().defaultTo(0);
        table.boolean('is_active').notNullable().defaultTo(true);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

    // Placeholder limits — adjust to your real commercial tiers before launch.
    const planIds = await knex('plans').insert([
        { code: 'free', name: 'Free', max_contacts: 500, max_emails_per_month: 2000, max_users: 1, max_sending_domains: 0, max_automations: 0, api_access: false, dedicated_ip: false, custom_dkim: false, price_monthly_cents: 0, price_yearly_cents: 0, overage_price_per_1000_cents: 0 },
        { code: 'starter', name: 'Starter', max_contacts: 5000, max_emails_per_month: 25000, max_users: 3, max_sending_domains: 1, max_automations: 2, api_access: true, dedicated_ip: false, custom_dkim: true, price_monthly_cents: 4900, price_yearly_cents: 49000, overage_price_per_1000_cents: 150 },
        { code: 'business', name: 'Business', max_contacts: 50000, max_emails_per_month: 250000, max_users: 10, max_sending_domains: 5, max_automations: 20, api_access: true, dedicated_ip: false, custom_dkim: true, price_monthly_cents: 19900, price_yearly_cents: 199000, overage_price_per_1000_cents: 100 },
        { code: 'enterprise', name: 'Enterprise', max_contacts: 1000000, max_emails_per_month: 5000000, max_users: 100, max_sending_domains: 50, max_automations: 200, api_access: true, dedicated_ip: true, custom_dkim: true, price_monthly_cents: 99900, price_yearly_cents: 999000, overage_price_per_1000_cents: 50 }
    ]);
    const enterprisePlan = await knex('plans').where('code', 'enterprise').first();

    await knex.schema.createTable('accounts', table => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('slug', 100).notNullable().unique();
        table.enu('status', ['trial', 'active', 'past_due', 'suspended', 'canceled']).notNullable().defaultTo('trial');
        table.integer('plan_id').unsigned().notNullable().references('plans.id');
        table.date('billing_cycle_start');
        table.date('billing_cycle_end');
        table.string('gateway_customer_id', 100);
        table.string('gateway_subscription_id', 100);
        table.timestamp('trial_ends_at').nullable().defaultTo(null);
        table.string('ip_pool', 50).notNullable().defaultTo('shared');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

    const legacyAccountIds = await knex('accounts').insert({
        name: 'Legacy',
        slug: 'legacy',
        status: 'active',
        plan_id: enterprisePlan.id
    });
    const legacyAccountId = legacyAccountIds[0];

    await knex.schema.createTable('account_usage', table => {
        table.bigIncrements('id').primary();
        table.integer('account_id').unsigned().notNullable().references('accounts.id');
        table.date('period_start').notNullable();
        table.date('period_end').notNullable();
        table.integer('emails_sent').unsigned().notNullable().defaultTo(0);
        table.integer('contacts_count').unsigned().notNullable().defaultTo(0);
        table.integer('api_calls_count').unsigned().notNullable().defaultTo(0);
        table.string('alert_80_sent', 10);
        table.unique(['account_id', 'period_start'], 'uq_account_period');
    });

    // account_id is added as a parallel, mandatory column alongside the
    // existing `namespace` column (not a replacement for it — see
    // docs/saas-plan.md). Nullable first, backfilled to the Legacy account
    // (all pre-existing data belongs to it), then locked to NOT NULL.
    const tenantScopedTables = ['namespaces', 'users', 'lists', 'campaigns', 'templates', 'segments', 'send_configurations'];

    for (const tableName of tenantScopedTables) {
        await knex.schema.table(tableName, table => {
            table.integer('account_id').unsigned().nullable();
        });

        await knex(tableName).update({account_id: legacyAccountId});

        await knex.schema.table(tableName, table => {
            table.integer('account_id').unsigned().notNullable().index('idx_account').alter();
        });
    }
})();

exports.down = (knex, Promise) => (async() => {
})();
