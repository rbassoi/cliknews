'use strict';

const knex = require('./knex');

function getRequestContext(req) {
    const context = {
        user: req.user,
        account: req.account
    };

    return context;
}

const adminContext = {
    user: {
        admin: true,
        id: 0,
        username: '',
        name: '',
        email: ''
    }
};

// The admin context bypasses both the ACL system (shares.js) and account
// scoping (tenant-scope.js) — it's used for login/session resolution and
// internal background jobs that run outside any single request's account.
// Some background jobs (e.g. a future per-account sending job) do need to
// operate within one specific account's scope without a real user context;
// they can pass accountId here rather than bypassing scoping entirely.
function getAdminContext(accountId) {
    if (accountId === undefined) {
        return adminContext;
    }

    return {
        user: adminContext.user,
        account: {id: accountId}
    };
}

module.exports = {
    getRequestContext,
    getAdminContext
};