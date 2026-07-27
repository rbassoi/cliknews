# Cliker → SaaS multi-tenant — development plan

## Context

`Cliker_SaaS_Detalhamento_Completo.md` (repo root) describes converting Cliker into a
commercial multi-tenant SaaS: schema + hard account isolation, plan-limit enforcement,
billing, per-account sending isolation (DKIM/IP pools), a public API, and a separate
marketing landing page — 8 phases, in that order, with phases 1–2 (schema + isolation) as
the explicit prerequisite for everything else.

Scope for this round (agreed with the user): phases 1–2, plus starting the landing page
project in parallel. Billing (Mercado Pago, to be wired in later) and everything phases
4–6 depend on (sending-domain DKIM, dedicated IPs, API keys) are **not** in this round.

## Architecture decision: `account_id` is parallel to `namespaces`, not derived from it

Cliker already has a permission system: a single shared `namespaces` tree (root `id=1`)
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
  `-develop.yml`), pointing at `http://cliker:3004/api/public/plans` (container-network
  hostname, not `localhost`) for the plans fetch.
- Verified: `npm install` + `npm run build` succeed; `npm run dev` against the live
  `public-plans` endpoint renders all 4 real plans (Grátis/Starter/Business/Enterprise).

## Done: round 2 (sending isolation, dedicated IPs, public API, child-table isolation, usage-alert e-mail)

Closes almost everything the "Not done yet" section below used to list.
Billing (Mercado Pago) is still deliberately out of scope.

- **Central account-isolation hardening** — the actual finding that reshaped
  this round's approach: `server/models/shares.js:_checkPermissionTx` never
  checked `account_id`, only that a `permissions_<type>` row existed. Every
  "child" table (`triggers`, custom fields/`fields.js`, imports, `files_*`)
  already calls `enforceEntityPermissionTx` on its **parent** entity
  (campaign/list) before touching child rows — so hardening
  `_checkPermissionTx` once, to also verify (for any entity type in
  `ACCOUNT_SCOPED_ENTITY_TYPES`) that the entity belongs to the caller's
  account, closes the child-table gap everywhere at once, without adding
  `account_id` to any of those tables or touching those model files. This
  also means `enforceEntityPermissionTx` now **throws** immediately on a
  cross-account access attempt instead of allowing a later
  `requireAccountScope`-filtered query to silently return nothing — a
  stricter, earlier failure, not a behavior regression (see
  `docs/redesign-plan.md`'s round-2 note on the updated test assertion).
- **Wave 2 of "first-class" account-scoped tables** —
  `20260726120000_account_scope_wave_2.js` adds `account_id` (nullable →
  backfilled to Legacy → `NOT NULL` + indexed) to `channels`,
  `mosaico_templates`, `reports`, `report_templates`, `custom_forms` — the 5
  remaining tables confirmed (by reading each model file) to have their own
  `namespace` column + `permissions_<type>`/`shares_<type>` tables, same
  shape as the original 7. `tenant-scope.js`'s `ACCOUNT_SCOPED_ENTITY_TYPES`
  extended to match; the 5 model files (`channels.js`, `mosaico-templates.js`,
  `reports.js`, `report-templates.js`, `forms.js`) scoped following the same
  pattern as the original 7.
- **Suppression list** — new `suppression_list` table, per account,
  deliberately **separate** from the pre-existing global `blacklist` (which
  stays install-wide/manual, used by `/api/blacklist`). Auto-populated in
  `campaigns.js:_changeStatusByMessageTx` when a message flips to
  `BOUNCED`/`COMPLAINED`/`UNSUBSCRIBED`. Checked in
  `message-sender.js` right next to the existing `blacklist.isBlacklisted`
  check, same silent-skip behavior.
- **DKIM per account** — this codebase already resolves DKIM keys
  dynamically per outgoing message (a real Zone-MTA mechanism,
  `envelope.dkim.keys`, injected via the `x-cliker-dkim` header consumed
  by `zone-mta/plugins/cliker-receiver.js`); the only gap was the "source
  of truth" being embedded in `mailer_settings` instead of a real table.
  New `sending_domains` table (`account_id, domain, dkim_selector,
  dkim_private_key, dkim_public_key, spf_verified, dkim_verified,
  dmarc_verified, verified_at`); `server/models/sending-domains.js`
  generates the RSA keypair on `create`; `server/services/dns-verification.js`
  (hourly, same style as `usage-alerts.js`) checks the `<selector>._domainkey.<domain>`
  TXT record via `dns.promises.resolveTxt`; `mailers.js:_addDkimKeys` (now
  async) resolves the account's verified sending domain first, falling back
  to the legacy embedded-key mechanism. REST + `client/src/settings/SendingDomains.js`
  (add domain, see the expected TXT record, verified/pending status).
  **Caught in review**: `listByAccount`/`create` initially returned every
  column, including `dkim_private_key`, to the client — fixed to explicitly
  `.select()` only the safe columns.
- **Priority send queue** — no new dependency. `sender-master.js`'s
  `selectNextTask()` (the single function deciding which idle worker gets
  the next task) now weighs candidates by the owning account's priority
  (dedicated-IP accounts first) before falling back to the existing
  fairness tie-break (fewest `existingWorkers`). Priority is resolved once
  per campaign/send-configuration and cached in memory
  (`sendConfigurationPriority`), same pattern already used for
  `sendConfigurationStatuses`.
- **Dedicated IP pools (code side only)** — `accounts.dedicated_ip_address`
  (nullable) added alongside the pre-existing `accounts.ip_pool`.
  `builtin-zone-mta.js:createConfig()` now generates one extra Zone-MTA
  pool+zone per account with `ip_pool='dedicated'` AND a real
  `dedicated_ip_address` set, alongside the `default` pool everyone else
  uses; `mailers.js` sets `X-Sending-Zone` to the resolved zone for every
  send (generalizing the pattern already used for transactional mail),
  only overriding the header when a real dedicated zone applies.
  **Deliberately not done**: no IP is actually provisioned/bound by this
  work — that requires a real network interface on the sending host, which
  doesn't exist in this dev environment. The code activates automatically
  once `dedicated_ip_address` is filled in (manually, or by a future
  provisioning script) and the server is restarted (zones are regenerated
  on boot, not hot-reloaded).
- **Public API with keys + rate limiting** — the existing `/api/*`
  (`server/routes/api.js`) authenticates by **user** access-token
  (`passport.authByAccessToken`, applied blanket to all of `/api/*`); an
  API key belongs to the **account**, not a user, so this is a fully
  parallel path rather than an extension: `server/lib/middleware/api-key-auth.js`
  populates `req.account`/`req.apiScopes` from an `Api-Key` header (never
  touches `req.user`), authorizing downstream model calls via a "scoped
  admin" context (`{user: {admin: true, id: 0}, account: req.account}` —
  same pattern as `getAdminContext(accountId)`, bypasses the namespaces/
  shares ACL since there's no real user, stays hard-scoped by `account_id`).
  New `api_keys` table (`account_id, key_hash, key_prefix, scopes,
  last_used_at, revoked_at` — only a SHA-256 hash is stored, the raw key is
  shown exactly once on creation). Rate limiting via `rate-limiter-flexible`
  (new dependency), `RateLimiterMemory` (not Redis-backed — `config.redis.enabled`
  is `false` by default here, and each app-type runs as a single process, so
  there's no second instance to keep in sync), limits keyed by plan code.
  New routes mounted at **`/api-v1`** (`server/routes/api-v1.js`) — a
  routing collision forced this off the more natural `/api/v1`:
  `app.all('/api/*', passport.authByAccessToken)` in `app-builder.js` runs
  unconditionally on all of `/api/*` and 403s any request without a
  user-level access token, which would reject every API-key request before
  it ever reached the new router. `server/routes/rest/api-keys.js` (session-
  authenticated CRUD, DataTables-ajax listing) + `client/src/settings/ApiKeys.js`.
- **Usage-alert e-mail (the real thing)** — `server/services/usage-alerts.js`
  now sends an actual e-mail (`server/views/account/usage-alert-80-{html,text}.hbs`,
  via `messageSender.queueSubscriptionMessage(getSystemSendConfigurationId(), ...)`,
  same convention as `users.js`'s password-reset e-mail) instead of only
  logging a warning. Recipient is the account's earliest-created user
  (there's no dedicated owner/billing-contact field yet).
- **Redesign phases 5–6** (Estatísticas opens-by-day chart, Importar
  drag-and-drop) landed in the same round — see `docs/redesign-plan.md`.

**Verified**: `npm run test:tenant-isolation` — 5/5 passing (3 original +
1 new hardened-check test + 1 updated assertion). Full container restart,
then an HTTP-level smoke test against the real dev server: session login,
`rest/sending-domains` (empty list, 200), `rest/api-keys-table` (DT-ajax,
200), created a real API key, called `/api-v1/account` and
`/api-v1/contacts/count` with it (200, correct account-scoped data),
confirmed an invalid key is rejected (401) and a revoked key stops working
immediately, burst-tested the rate limiter (20 rapid calls, no errors,
enterprise-plan limit of 2000/min not hit — exhausting a limit that high
wasn't practical to test directly). Client rebuilt successfully
(`SendingDomains.js`/`ApiKeys.js`/sidebar wiring included).

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

## Not done yet

- **Billing** (doc §5) — deferred; user is integrating Mercado Pago later. No
  gateway-specific code exists yet; `accounts.gateway_customer_id`/`gateway_subscription_id`
  are intentionally generic. `billing_events` table from the doc's §1.1 still not created.
- **Dedicated IP pools — physical provisioning** — the code side (Zone-MTA pool/zone
  generation, `X-Sending-Zone` routing) is done (see round 2 above); no IP is actually
  bound to a network interface by any of this work, since that requires real
  infrastructure this dev environment doesn't have. Needs a manual step (or a future
  provisioning script) to fill in `accounts.dedicated_ip_address`, then a server restart.
- **`account_id` on "child" tables** (`triggers`, custom fields, `imports`, `files_*`,
  `blacklist`) — still indirect (via the parent entity's `account_id`, enforced by the
  hardened `_checkPermissionTx`), not a direct column. This was a deliberate choice this
  round (see "Central account-isolation hardening" above) rather than a gap — direct
  columns would be redundant with the central check, only worth adding later for query
  performance if these tables ever need to be queried/filtered by account_id directly
  (e.g. a per-account analytics rollup), not for isolation correctness.
- **`server/lib/models/segments.js:getQueryGeneratorTx`** and a couple of other
  `context`-less internal helpers (`campaigns.js:lockByIdTx`) were left unscoped — they're
  always called immediately after (or before relying on) an already-scoped read, so the
  actual account boundary is enforced by their caller, not by these helpers themselves.
  Worth tightening if they ever get a new call site that doesn't already do that.
- **API-key rate limiter is in-memory per app-type process** — fine today (single
  process per app-type), but if this app is ever horizontally scaled (multiple
  instances behind a load balancer), the limiter would need to move to Redis
  (`rate-limiter-flexible` supports a `RateLimiterRedis` drop-in) to stay accurate
  across instances.
- **Dedicated-IP zone lookup (`builtin-zone-mta.js:getZoneNameForAccountId`) is
  uncached** — one query per send-configuration resolution; noted as a known
  scaling caveat in the code, fine at current volume.
