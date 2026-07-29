// Splits contacts.name into first_name/last_name so it can line up with a
// list's own MERGE_FIRST_NAME/MERGE_LAST_NAME fields when a contact is added
// to a list (server/models/contacts.js's addToList) — today that mapping is
// dropped entirely because there's nothing on the contact side to map from.
// Existing values are split on the first space (best effort); anything past
// the first two tokens stays wholly in last_name.
exports.up = (knex, Promise) => (async () => {
    await knex.schema.table('contacts', table => {
        table.string('first_name').nullable();
        table.string('last_name').nullable();
    });

    const rows = await knex('contacts').whereNotNull('name').select('id', 'name');
    for (const row of rows) {
        const trimmed = (row.name || '').trim();
        if (!trimmed) {
            continue;
        }

        const spaceIdx = trimmed.indexOf(' ');
        const firstName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
        const lastName = spaceIdx === -1 ? null : (trimmed.slice(spaceIdx + 1).trim() || null);

        await knex('contacts').where('id', row.id).update({ first_name: firstName, last_name: lastName });
    }

    await knex.schema.table('contacts', table => {
        table.dropColumn('name');
    });
})();

exports.down = (knex, Promise) => (async () => {
    await knex.schema.table('contacts', table => {
        table.string('name').nullable();
    });

    const rows = await knex('contacts').select('id', 'first_name', 'last_name');
    for (const row of rows) {
        const combined = [row.first_name, row.last_name].filter(Boolean).join(' ') || null;
        await knex('contacts').where('id', row.id).update({ name: combined });
    }

    await knex.schema.table('contacts', table => {
        table.dropColumn('first_name');
        table.dropColumn('last_name');
    });
})();
