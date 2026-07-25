'use strict';

const knex = require('../lib/knex');

async function getById(id) {
    return await knex('plans').where('id', id).first();
}

async function getByCode(code) {
    return await knex('plans').where('code', code).first();
}

async function listActive() {
    return await knex('plans').where('is_active', true).orderBy('price_monthly_cents', 'asc');
}

module.exports.getById = getById;
module.exports.getByCode = getByCode;
module.exports.listActive = listActive;
