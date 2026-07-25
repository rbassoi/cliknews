# ClikNews → SaaS multi-tenant — development plan

## Context

`ClikNews_SaaS_Detalhamento_Completo.md` (repo root) describes converting ClikNews into a
commercial multi-tenant SaaS: schema + hard account isolation, plan-limit enforcement,
billing, per-account sending isolation (DKIM/IP pools), a public API, and a separate
marketing landing page — 8 phases, in that order, with phases 1–2 (schema + isolation) as
the explicit prerequisite for everything else.

Scope for this round (agreed with the user): phases 1–2, plus starting the landing page
project in parallel. Billing (Mercado Pago, to be wired in later) and everything phases
4–6 depend on (sending-domain DKIM, dedicated IPs, API keys) are **not** in this round.

## Architecture decision: `account_id` is parallel to `namespaces`, not derived from it

ClikNews already has a permission system: a single shared `namespaces` tree (root `id=1`)
plus `shares_<type>`/`permissions_<type>` tables, materialized by
`server/models/shares.js:rebuildPermissionsTx` and checked by `_checkPermissionTx`. That
system was built for trusted internal users delegating access to each other — it is not a
hard boundary suitable for mutually-untrusting SaaS tenants (a namespace-sharing
misconfiguration could in principle leak across what should be a tenant boundary).

So `account_id` is a **second, independent, mandatory filter** added directly to the base
tables (`server/lib/tenant-scope.js`), checked in the same place every ACL check already
runs, but never trusting the ACL result alone. This is why the isolation test
(`server/test/tenant-isolation/index.js`) deliberately sets up a `permissions_list` grant
*across* the account boundary and proves the account_id filter blocks it anyway — that's
the scenario this design is defending against.

## Done: phases 1–2

- **Schema** — `server/setup/knex/migrations/20260725150000_multi_tenant_accounts.js`:
  `plans` (seeded free/starter/business/enterprise — placeholder limits/prices, adjust
  before launch), `accounts` (one row, `Legacy`, on the `enterprise` plan — owns all
  pre-existing data), `account_usage` (per-account-per-month counters). `account_id`
  added (nullable → backfilled to Legacy → `NOT NULL` + indexed) to `namespaces`, `users`,
  `lists`, `campaigns`, `templates`, `segments`, `send_configurations` — the 7 tables that
  already have their own `namespace` column and permission table.
- **Isolation layer**:
  - `server/lib/tenant-scope.js` — `requireAccountScope`/`requireAccountScopeOn(table)`
    (query modifiers, `.modify(requireAccountScope, context)`) and `requireAccountId(context)`
    (for stamping new rows on create). Bypassed only for the synthetic admin context
    (`contextHelpers.getAdminContext()`, used for login/session-resolution and background
    jobs) — same bypass semantics `shares.js` already uses for ACL checks. Passing an
    explicit account into `getAdminContext(accountId)` (e.g. for a background job scoped
    to one account) still gets scoped, not bypassed.
  - `server/lib/middleware/resolve-account.js` + `server/models/accounts.js` — resolves
    `req.account` (with plan limits joined in) from `req.user.account_id` right before
    `req.context` is built in `server/app-builder.js`, so every REST/API route sees it
    with no per-route changes. Returns `AccountInactiveError` (402) for
    suspended/canceled accounts.
  - `server/lib/context-helpers.js` — `context` is now `{ user, account }`.
  - `server/lib/dt-helpers.js` — `ajaxListWithPermissionsTx` (the shared DataTables-listing
    helper used by nearly every `listDTAjax`) auto-applies `requireAccountScopeOn` for any
    fetch spec whose entity type is in `tenant-scope.js`'s `ACCOUNT_SCOPED_ENTITY_TYPES` —
    this is what makes most `listDTAjax` functions correct without touching each one.
  - Models directly touched (single-row get/create/update/delete, where the central
    dt-helpers fix doesn't reach): `namespaces.js`, `lists.js`, `campaigns.js`
    (incl. `rawGetByTx`, whose signature gained a `context` param — updated its two
    external callers in `server/lib/message-sender.js` and `server/services/feedcheck.js`,
    the latter now passing the RSS parent campaign's own `account_id` via
    `getAdminContext(accountId)` rather than a bare admin bypass), `users.js` (also added
    `account_id` to `_getByTx`'s column list — this is the function behind login/session
    deserialization, so this had to stay correct), `templates.js`, `send-configurations.js`,
    `segments.js`, `contacts.js` (the Phase-3-redesign cross-list contacts query).
- **Security test** — `server/test/tenant-isolation/index.js` (first unit-test-harness in
  this codebase; everything else is Selenium e2e). Creates two real accounts/users/lists,
  grants a cross-account ACL permission on purpose, and asserts `lists.getByIdTx` still
  returns nothing for the wrong account — plus a same-account sanity check and a
  missing-context-throws check. Cleans up its own fixtures in `after()`. Run via
  `npm run test:tenant-isolation` (`server/package.json`). 3/3 passing against the real
  dev DB.
- **Plan limits** — `server/lib/plan-limits.js`: `checkContactLimit` (hooked into
  `imports.js:start()`, using the cross-list count from `contacts.js:getTotalCount`,
  already built in the Phase-3 redesign) and `checkEmailSendLimit` (hooked into
  `campaigns.js:start()`, estimated from the `lists.subscribers` count of the campaign's
  target lists — an estimate at enqueue time, not a per-message count, to avoid touching
  `sender-master.js`'s child-process pipeline). Both throw the new
  `interoperableErrors.PlanLimitError` (402).
  `server/models/account-usage.js` tracks per-account-per-month `emails_sent`.
- **Usage alerts** — `server/services/usage-alerts.js`, hourly, following the existing
  house style (`services/gdpr-cleanup.js`/`tzupdate.js` — no queue/cron framework exists
  in this codebase, Redis is only used for sessions + Zone-MTA internals). Flags accounts
  ≥80% of their monthly email quota once per period (`account_usage.alert_80_sent`).
  **Known gap**: logs a warning (`log.warn`) instead of sending a real notification
  e-mail — no template exists yet for that; the threshold-detection/no-repeat-alert logic
  is fully implemented and is the part that actually mattered for this pass.
- **Public plans endpoint** — `server/routes/public-plans.js`
  (`GET /api/public/plans`, CORS-open, mounted on `AppType.PUBLIC` in `app-builder.js`
  next to `subscription`/`links`/`archive`/`files`), backed by the new
  `server/models/plans.js`.

**Verified live** (not just unit-tested): restarted the real dev server, and the existing
authenticated browser session successfully hit Dashboard/Namespaces/Settings/Send
Configurations/Blacklist through the new account-scoped code paths with zero errors.
`curl http://localhost:3104/api/public/plans` returns real seeded plan data.

## Done: landing page (`landing/`)

Separate Next.js 14 (App Router, TypeScript) project — confirmed there's no existing
monorepo/workspace tooling in this repo (`client/`, `server/`, `shared/`, `zone-mta/`,
`mvis/` are each independent), so `landing/` follows the same convention: own
`package.json`, own `Dockerfile` (Node 20, not the root `Dockerfile`'s Node 10 — Next.js
needs it), own `.env.example`.

- Sections: Header, Hero (CTA → app login, per the user's call — self-service
  signup/billing isn't built yet), social proof, features, **plans table** (Server
  Component, fetches `PLANS_API_URL` server-side — no CORS needed for this path, the
  CORS on `public-plans.js` is there for a possible future client-side widget),
  comparison, FAQ, footer. Copy in Portuguese, reusing the app's own oklch/Inter design
  tokens (`app/globals.css`, ported from `client/src/scss/_tokens.scss`) for brand
  consistency between the marketing site and the logged-in app.
- `landing` service added to all 3 compose files (`docker-compose.yml`, `-local.yml`,
  `-develop.yml`), pointing at `http://cliknews:3004/api/public/plans` (container-network
  hostname, not `localhost`) for the plans fetch.
- Verified: `npm install` + `npm run build` succeed; `npm run dev` against the live
  `public-plans` endpoint renders all 4 real plans (Grátis/Starter/Business/Enterprise).

## Verification approach (same for each future phase)

1. Before any schema change: `mysqldump` the dev DB (kept in the session's scratchpad
   this round — do this again next time).
2. Run migrations inside the dev container:
   `docker exec -e NODE_ENV=production <container> node -e "require('./lib/knex').migrate.latest()..."`
   from `/app/server` (the app also runs this automatically on boot, but running it
   standalone first lets you catch failures without a full restart).
3. `npm run test:tenant-isolation` (`server/`) — must pass before touching any more models.
4. Restart the server and confirm a real logged-in session still works — the account
   scoping must be invisible to the Legacy account's normal usage.
5. For `landing/`: `npm run build` locally (Node 18.18+ required — the rest of the repo
   is pinned to Node 10, this is intentionally a separate floor), then `npm run dev`
   against the real `public-plans` endpoint to confirm pricing isn't hardcoded/stale.

## Not done yet (next phases, per the doc's own ordering)

- **Billing** (doc §5) — deferred; user is integrating Mercado Pago later. No
  gateway-specific code exists yet; `accounts.gateway_customer_id`/`gateway_subscription_id`
  are intentionally generic.
- **Sending isolation** (doc §4) — per-account sending-domain DKIM, priority queues,
  per-account suppression list. `sending_domains`/`suppression_list`/`api_keys`/
  `billing_events` tables from the doc's §1.1 were **not** created this round (no code
  uses them yet — creating unused schema seemed worse than adding it when the feature
  actually lands).
- **Dedicated IP pools** (doc §4.1) — depends on physical/network provisioning, not just code.
- **Public API with keys + rate limiting** (doc §6) — needs `api_keys` (not yet created).
- **`account_id` on "child" tables** (`channels`, `triggers`, `blacklist`, `custom_fields`,
  `imports`, `reports`, `mosaico_templates`, `custom_forms`, `files_*`) — isolation for
  these today is indirect (via their parent list/campaign/template, which *is*
  account-scoped), not a direct column + filter. Fine for now, but should get the same
  treatment eventually for defense-in-depth and query performance.
- **`server/lib/models/segments.js:getQueryGeneratorTx`** and a couple of other
  `context`-less internal helpers (`campaigns.js:lockByIdTx`) were left unscoped — they're
  always called immediately after (or before relying on) an already-scoped read, so the
  actual account boundary is enforced by their caller, not by these helpers themselves.
  Worth tightening if they ever get a new call site that doesn't already do that.
