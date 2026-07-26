'use strict';

const apiKeysModel = require('../../models/api-keys');
const accountsModel = require('../../models/accounts');

// Deliberately separate from passport.authByAccessToken (server/lib/passport.js),
// which authenticates a USER by their personal access token and populates
// req.user for the existing /api/* routes. An API key belongs to an ACCOUNT,
// not a user, so this never touches req.user — it populates req.account/
// req.apiScopes instead, and downstream model calls use a "scoped admin"
// context ({user: {admin: true}, account: req.account}) that bypasses the
// namespaces/shares ACL (there's no user to check it against) while still
// being hard-scoped by account_id. See docs/saas-plan.md Part K.
async function apiKeyAuth(req, res, next) {
    const rawKey = req.headers['api-key'];
    if (!rawKey) {
        return res.status(401).json({error: 'missing_api_key'});
    }

    try {
        const keyRecord = await apiKeysModel.getByRawKey(rawKey);
        if (!keyRecord) {
            return res.status(401).json({error: 'invalid_api_key'});
        }

        const account = await accountsModel.getByIdWithPlan(keyRecord.account_id);
        if (!account || (account.status !== 'active' && account.status !== 'trial')) {
            return res.status(402).json({error: 'account_inactive'});
        }

        req.account = account;
        req.apiScopes = keyRecord.scopes;
        next();
    } catch (err) {
        next(err);
    }
}

function requireScope(scope) {
    return (req, res, next) => {
        if (!req.apiScopes || !req.apiScopes.includes(scope)) {
            return res.status(403).json({error: 'insufficient_scope'});
        }
        next();
    };
}

module.exports.apiKeyAuth = apiKeyAuth;
module.exports.requireScope = requireScope;
