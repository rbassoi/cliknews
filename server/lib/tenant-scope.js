'use strict';

// Mandatory account-level isolation, layered on top of (not replacing) the
// existing namespaces/shares ACL system. That system was designed for trusted
// internal users sharing resources with each other; it is not a hard boundary
// between SaaS customers who must never see each other's data even if a
// namespace-sharing rule is ever misconfigured. Every query against a
// tenant-scoped table must go through here.

// The synthetic admin context (contextHelpers.getAdminContext()) bypasses
// scoping entirely, same as it already bypasses shares.js's ACL checks —
// UNLESS it was given an explicit account (getAdminContext(accountId), used
// by background jobs that operate within one specific account), in which
// case that account is enforced like any other.
function isBypassed(context) {
    return !!(context.user && context.user.admin && !context.account);
}

function requireAccountScope(query, context) {
    if (isBypassed(context)) {
        return query;
    }

    if (!context.account || !context.account.id) {
        throw new Error('SECURITY: query executed without a resolved account — blocked');
    }

    return query.andWhere('account_id', context.account.id);
}

// Used when inserting a new row: there is no existing account_id to compare
// against, so this just resolves the account a new row must be stamped with.
function requireAccountId(context) {
    if (!context.account || !context.account.id) {
        throw new Error('SECURITY: insert executed without a resolved account — blocked');
    }

    return context.account.id;
}

function requireAccountScopeOn(tableName) {
    return (query, context) => {
        if (isBypassed(context)) {
            return query;
        }

        if (!context.account || !context.account.id) {
            throw new Error('SECURITY: query executed without a resolved account — blocked');
        }

        return query.andWhere(`${tableName}.account_id`, context.account.id);
    };
}

// Entity types (per server/lib/entity-settings.js) whose base table already
// carries a mandatory account_id column. Kept as an explicit allowlist so
// dt-helpers never assumes a column that doesn't exist yet on tables not
// migrated to per-account isolation in this pass (see docs/saas-plan.md).
const ACCOUNT_SCOPED_ENTITY_TYPES = new Set([
    'namespace', 'list', 'campaign', 'template', 'sendConfiguration', 'user',
    'channel', 'mosaicoTemplate', 'report', 'reportTemplate', 'customForm', 'company'
]);

module.exports = {
    requireAccountScope,
    requireAccountScopeOn,
    requireAccountId,
    ACCOUNT_SCOPED_ENTITY_TYPES
};
