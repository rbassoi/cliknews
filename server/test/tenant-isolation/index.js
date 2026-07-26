'use strict';

// First automated test in this codebase that exercises server/models/*.js
// directly (everything else is Selenium e2e against a real browser). It runs
// against whatever database server/lib/knex.js is configured for — there is
// no separate `test` config in server/config/, so by default that is the
// same database the dev container serves from. Every fixture row it creates
// is cleaned up in `after`, and no existing data is touched.
//
// What this actually proves: tenant-scope.js's account_id filter blocks
// cross-account access even in the adversarial case where the OLD
// namespaces/shares ACL system would have allowed it (a permissions_list row
// granting the other account's user 'view' on this account's list). That's
// the exact scenario the architecture doc (docs/saas-plan.md) is defending
// against — two accounts sharing the same namespace tree with an ACL grant
// that crosses the account boundary.

const { expect } = require('chai');
const knex = require('../../lib/knex');
const lists = require('../../models/lists');
const fields = require('../../models/fields');

const ROOT_NAMESPACE_ID = 1;

describe('tenant isolation', function () {
    this.timeout(30000);

    let accountAId, accountBId;
    let userAId, userBId;
    let listAId, listBId;

    before(async () => {
        const plan = await knex('plans').where('code', 'free').first();
        expect(plan, 'the multi_tenant_accounts migration must have run (no "free" plan found)').to.exist;

        const suffix = Date.now();

        accountAId = (await knex('accounts').insert({
            name: 'Test Tenant A', slug: `test-tenant-a-${suffix}`, status: 'active', plan_id: plan.id
        }))[0];
        accountBId = (await knex('accounts').insert({
            name: 'Test Tenant B', slug: `test-tenant-b-${suffix}`, status: 'active', plan_id: plan.id
        }))[0];

        userAId = (await knex('users').insert({
            username: `test_tenant_a_${suffix}`, email: `test-tenant-a-${suffix}@example.com`,
            namespace: ROOT_NAMESPACE_ID, account_id: accountAId, role: 'master'
        }))[0];
        userBId = (await knex('users').insert({
            username: `test_tenant_b_${suffix}`, email: `test-tenant-b-${suffix}@example.com`,
            namespace: ROOT_NAMESPACE_ID, account_id: accountBId, role: 'master'
        }))[0];

        listAId = (await knex('lists').insert({
            cid: `test-list-a-${suffix}`, name: 'Test List A', namespace: ROOT_NAMESPACE_ID, account_id: accountAId
        }))[0];
        listBId = (await knex('lists').insert({
            cid: `test-list-b-${suffix}`, name: 'Test List B', namespace: ROOT_NAMESPACE_ID, account_id: accountBId
        }))[0];

        // Simulate the ACL system granting user B 'view' on account A's list —
        // e.g. a namespace-sharing misconfiguration. The old permission check
        // alone would allow this; account_id scoping must block it anyway.
        await knex('permissions_list').insert({entity: listAId, user: userBId, operation: 'view'});
        await knex('permissions_list').insert({entity: listAId, user: userAId, operation: 'view'});
    });

    after(async () => {
        await knex('permissions_list').where('entity', listAId).del();
        await knex('lists').whereIn('id', [listAId, listBId]).del();
        await knex('users').whereIn('id', [userAId, userBId]).del();
        await knex('accounts').whereIn('id', [accountAId, accountBId]).del();
    });

    it('blocks a user from fetching another account\'s list even with a matching ACL grant', async () => {
        const contextForUserB = {user: {id: userBId, admin: false}, account: {id: accountBId}};

        let threw = false;
        try {
            await knex.transaction(tx => lists.getByIdTx(tx, contextForUserB, listAId));
        } catch (err) {
            threw = true;
        }

        expect(threw).to.equal(true);
    });

    it('still lets a user fetch their own account\'s list', async () => {
        const contextForUserA = {user: {id: userAId, admin: false}, account: {id: accountAId}};

        const entity = await knex.transaction(tx => lists.getByIdTx(tx, contextForUserA, listAId));

        expect(entity).to.exist;
        expect(entity.id).to.equal(listAId);
    });

    it('throws instead of silently querying when context.account is missing', async () => {
        const contextWithNoAccount = {user: {id: userBId, admin: false}};

        let threw = false;
        try {
            await knex.transaction(tx => lists.getByIdTx(tx, contextWithNoAccount, listAId));
        } catch (err) {
            threw = true;
        }

        expect(threw).to.equal(true);
    });

    describe('hardened permission check protects "child" tables via their parent', () => {
        // custom_fields has no account_id of its own — every function in
        // fields.js only checks permission on the parent 'list'. This proves
        // that hardening shares.js:_checkPermissionTx (rather than adding
        // account_id to every child table individually) is enough: it blocks
        // access here purely because the parent list belongs to another
        // account, with zero changes to fields.js itself.
        let fieldId;

        before(async () => {
            fieldId = (await knex('custom_fields').insert({
                list: listAId, key: 'TEST_FIELD', type: 'text', column: 'test_field'
            }))[0];

            // Simulate the ACL system granting user B 'viewFields' on account
            // A's list — same adversarial scenario as the 'view' grant above,
            // just for a different operation. User A also needs its own
            // grant (unrelated to account scoping) to legitimately read it.
            await knex('permissions_list').insert({entity: listAId, user: userBId, operation: 'viewFields'});
            await knex('permissions_list').insert({entity: listAId, user: userAId, operation: 'viewFields'});
        });

        after(async () => {
            await knex('permissions_list').where({entity: listAId, operation: 'viewFields'}).del();
            await knex('custom_fields').where('id', fieldId).del();
        });

        it('blocks a user from fetching a custom field on another account\'s list', async () => {
            const contextForUserB = {user: {id: userBId, admin: false}, account: {id: accountBId}};

            let threw = false;
            try {
                await fields.getById(contextForUserB, listAId, fieldId);
            } catch (err) {
                threw = true;
            }

            expect(threw).to.equal(true);
        });

        it('still lets a user fetch a custom field on their own account\'s list', async () => {
            const contextForUserA = {user: {id: userAId, admin: false}, account: {id: accountAId}};

            const entity = await fields.getById(contextForUserA, listAId, fieldId);

            expect(entity).to.exist;
            expect(entity.id).to.equal(fieldId);
        });
    });
});
