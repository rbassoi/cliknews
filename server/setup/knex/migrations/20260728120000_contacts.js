// Turns "Contatos" from a read-only cross-list aggregate view into a real, editable
// entity — see docs discussion in the redesign session: previously a contact was just
// whichever rows happened to match by email across every list's subscription__X
// table, with no row of its own to edit. This adds that row, plus a small
// user-manageable custom-fields system (contact_fields defines the fields that exist;
// values live in contacts.custom_fields JSON — no per-field schema migration needed,
// unlike the heavier per-list custom_fields/subscription__X column system).
exports.up = (knex, Promise) => (async () => {
    await knex.schema.createTable('contacts', table => {
        table.increments('id').primary();
        table.integer('account_id').unsigned().notNullable().references('accounts.id').index('idx_contacts_account');
        table.integer('namespace').unsigned().notNullable().references('namespaces.id');
        table.string('email').notNullable();
        table.string('name').nullable();
        table.integer('company_id').unsigned().nullable().references('companies.id').onDelete('SET NULL');
        table.json('custom_fields').nullable();
        table.timestamp('created').defaultTo(knex.fn.now());
        table.unique(['account_id', 'email'], 'idx_contacts_account_email');
    });

    await knex.schema
        .createTable('shares_contact', table => {
            table.integer('entity').unsigned().notNullable().references('contacts.id').onDelete('CASCADE');
            table.integer('user').unsigned().notNullable().references('users.id').onDelete('CASCADE');
            table.string('role', 128).notNullable();
            table.boolean('auto').defaultTo(false);
            table.primary(['entity', 'user']);
        })
        .createTable('permissions_contact', table => {
            table.integer('entity').unsigned().notNullable().references('contacts.id').onDelete('CASCADE');
            table.integer('user').unsigned().notNullable().references('users.id').onDelete('CASCADE');
            table.string('operation', 128).notNullable();
            table.primary(['entity', 'user', 'operation']);
        });

    await knex.schema.createTable('contact_fields', table => {
        table.increments('id').primary();
        table.integer('account_id').unsigned().notNullable().references('accounts.id').index('idx_contact_fields_account');
        table.integer('namespace').unsigned().notNullable().references('namespaces.id');
        table.string('name').notNullable();
        table.string('key', 100).notNullable();
        table.string('type', 50).notNullable().defaultTo('text');
        table.timestamp('created').defaultTo(knex.fn.now());
        table.unique(['account_id', 'key'], 'idx_contact_fields_account_key');
    });

    // Backfill: one contacts row per distinct email already present across each
    // account's existing list subscriptions, with company pre-filled by the same
    // domain-match the old aggregate view used to compute live. Also seed the two
    // fields the user asked for by name (Telefone/WhatsApp) so the feature isn't
    // empty on first load.
    const accounts = await knex('accounts').select('id');

    for (const account of accounts) {
        const rootNamespace = await knex('namespaces')
            .where({ account_id: account.id, namespace: null })
            .first();

        if (!rootNamespace) {
            continue;
        }

        const lists = await knex('lists').where('account_id', account.id).select('id');

        const byEmail = new Map();
        for (const list of lists) {
            const table = `subscription__${list.id}`;
            const rows = await knex(table).whereNotNull('email').select('email', 'created');
            for (const row of rows) {
                const key = row.email.toLowerCase();
                const existing = byEmail.get(key);
                if (!existing || (row.created && row.created < existing.created)) {
                    byEmail.set(key, { email: row.email, created: row.created });
                }
            }
        }

        if (byEmail.size > 0) {
            const companies = await knex('companies').where('account_id', account.id).select('id', 'domain').whereNotNull('domain');
            const companyByDomain = new Map(companies.map(c => [c.domain.toLowerCase(), c.id]));

            const contactRows = [];
            for (const { email, created } of byEmail.values()) {
                const domain = email.split('@')[1];
                contactRows.push({
                    account_id: account.id,
                    namespace: rootNamespace.id,
                    email,
                    company_id: (domain && companyByDomain.get(domain.toLowerCase())) || null,
                    created: created || knex.fn.now()
                });
            }

            const chunkSize = 500;
            for (let i = 0; i < contactRows.length; i += chunkSize) {
                await knex('contacts').insert(contactRows.slice(i, i + chunkSize));
            }
        }

        await knex('contact_fields').insert([
            { account_id: account.id, namespace: rootNamespace.id, name: 'Telefone', key: 'telefone', type: 'text' },
            { account_id: account.id, namespace: rootNamespace.id, name: 'WhatsApp', key: 'whatsapp', type: 'text' }
        ]);
    }
})();

exports.down = (knex, Promise) => (async () => {
})();
