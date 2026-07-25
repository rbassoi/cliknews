'use strict';

const accountsModel = require('../../models/accounts');
const interoperableErrors = require('../../../shared/interoperable-errors');

// Runs right after req.context is built (see app-builder.js), before any
// /rest or /api router is mounted, so every model call downstream sees a
// resolved req.account without each route having to remember to look it up.
async function resolveAccount(req, res, next) {
    if (!req.user) {
        // Not logged in yet — passport.loggedIn (which runs per-route, after
        // this middleware) is what actually rejects these.
        return next();
    }

    try {
        const account = await accountsModel.getByIdWithPlan(req.user.account_id);

        if (!account || account.status === 'suspended' || account.status === 'canceled') {
            return next(new interoperableErrors.AccountInactiveError());
        }

        req.account = account;
        next();
    } catch (err) {
        next(err);
    }
}

module.exports = resolveAccount;
