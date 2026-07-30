// Custom Forms' GrapesJS visual builder (client/src/lists/forms/CUD.js) already
// requests rest/files-list/customForm/file/:id for its asset manager — that route
// enforces the entity type/subtype pair from entity-settings.js exists (see
// server/models/files.js:24), but "customForm" never had a `files` config or a
// backing table, so opening the visual editor 500'd with
// "File type customForm:file does not exist". Same shape as files_template_file
// (server/setup/knex/migrations/20170506102634_v1_to_v2.js's addFiles, plus the
// delete_pending/lock_count columns added generically in
// 20190615000000_generalization_of_queued_and_file_locking.js).
exports.up = (knex, Promise) => (async () => {
    await knex.schema.createTable('files_custom_form_file', table => {
        table.increments('id').primary();
        table.integer('entity').unsigned().notNullable().references('custom_forms.id');
        table.string('filename');
        table.string('originalname');
        table.string('mimetype');
        table.integer('size');
        table.timestamp('created').defaultTo(knex.fn.now());
        table.boolean('delete_pending').notNullable().defaultTo(false);
        table.integer('lock_count').notNullable().defaultTo(0);
        table.index(['entity', 'originalname']);
    });
})();

exports.down = (knex, Promise) => (async () => {
    await knex.schema.dropTable('files_custom_form_file');
})();
