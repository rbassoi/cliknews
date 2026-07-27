# Cliker redesign — development plan

## Context

The client (`client/src`) is being redesigned to match the hi-fi prototype in
[`design_handoff_contacts_newsletter/`](../design_handoff_contacts_newsletter/README.md)
("Correio"): a 5-screen contacts/newsletter app (Dashboard, Contatos,
Newsletters, Estatísticas, Importar) with a persistent left sidebar and an
oklch-based flat design system (Inter font, white cards, light borders, blue
accent, pill badges).

Scope decisions (confirmed):
1. The new visual system (sidebar, colors, typography, cards, pills) applies
   to the **whole app**, not just the 5 mockup screens — every existing area
   (Templates, Channels, Users, Namespaces, Settings, Send Configurations,
   Blacklist, Reports, API) stays reachable in the new sidebar.
2. Where the mockup implies data/features that don't exist yet (a unified
   "Contacts" view across all lists, a daily opens chart), we build the real
   backend for it rather than faking it with placeholder data.
3. Nothing gets removed — this is additive/visual, not a feature cut.

## Done: phases 1–3

- **Phase 1 — design tokens & shell.** `client/src/scss/_tokens.scss` (oklch
  palette, spacing/radius scale), Inter font, `client/src/lib/page.js`
  (`renderFrameWithContent` rewritten to a persistent left sidebar instead of
  the old top navbar), `client/src/root.js` (`MainMenu` renders the sidebar
  nav + a collapsible `NavGroup` for "Administration"), new `Pill` and
  `StatCard` primitives in `client/src/lib/bootstrap-components.js`.
  Note: Bootstrap/CoreUI SCSS variables (`$primary`, `$link-color`, etc.)
  keep plain hex fallbacks in `variables.scss` — LibSass's `darken()`/
  `lighten()` (used all over Bootstrap's own SCSS) can't parse `oklch()`, so
  the real oklch palette only lives in the app's own `.cn-*` classes, never
  in Bootstrap-consumed variables.
- **Phase 2 — Dashboard.** `server/models/dashboard.js` + `server/routes/rest/dashboard.js`
  (`GET rest/dashboard-stats`), rewritten `client/src/Home.js` (stat cards,
  "your lists" grid, "recent campaigns" table — all real data).
- **Phase 3 — Contacts.** `server/models/contacts.js` (cross-list `UNION ALL`
  over every list's `subscription__<id>` table the user can view, grouped by
  `hash_email`, permission-filtered via `permissions_list`/`viewSubscriptions`),
  `server/routes/rest/contacts.js` (`POST rest/contacts-table/:listId?`,
  optional `?status=` query filter), new `client/src/contacts/{root,List}.js`
  wired into the sidebar as a new top-level "Contatos" item. Verified
  end-to-end against real data (created a list + subscriber, confirmed the
  cross-list aggregation and dashboard totals update correctly).

Reusable pieces later phases should build on: `Pill`, `StatCard`
(`client/src/lib/bootstrap-components.js`), the `.cn-*` CSS classes in
`client/src/scss/cliker.scss` (`.cn-card`, `.cn-page-header`, `.cn-btn*`,
`.cn-pill*`, `.cn-stat-card`, `.cn-grid-4`), and the existing `Table`/`Form`/
`Dropdown` component kit (unchanged, just restyled).

## Done: phase 4

- **Phase 4 — Newsletters editor.** `campaigns/CUD.js` reskinned into a
  two-column layout: `.cn-editor-settings.cn-card` (left, every existing
  field unchanged — lists/segments, send configuration, subject, tracking,
  content source/engine) and `.cn-editor-preview` (right, sticky canvas).
  Page header replaced with `.cn-page-header`/`.cn-page-title` (was the old
  `<Title>` `<h2>`).
  Preview panel reuses the **real** test-user preview mechanism from
  `Status.js`'s "Preview as test user" modal: a `TableSelect` bound to
  `rest/campaigns-test-users-table/:id` (same dataUrl/value format —
  `listCid:subscriptionCid`), then an `<iframe>` pointed at
  `archive/:cid/:listCid/:subscriptionCid` (or the sandboxed RSS-preview URL
  + restricted-access-token for `CampaignType.RSS`). No fabricated preview
  data. Empty states: "save the campaign first" (create mode), "not
  available for triggered campaigns", "pick a test subscriber" (no
  selection yet). The `testUser` picker is a form-tracked-but-not-submitted
  field (`filterData` in `submitFormValuesMutator` already drops anything
  not on its whitelist, so this needed no server change); its value
  survives a "Save" (not "Save and leave") via `oldFormValues.testUser` in
  `getFormValuesMutator`.
  `Content.js` (the WYSIWYG host) untouched — out of scope, no live-preview
  hookup needed there since `CUD.js`'s panel already covers it.
  Extracted `campaignStatusPill(t, campaignStatusLabels, status)` to
  `campaigns/helpers.js` (green/blue/gray `Pill` mapping), used by both
  `Home.js` and `campaigns/List.js`'s status column (now a `Pill` instead of
  plain text). This also fixed a latent bug in `Home.js`: it was indexing
  `getCampaignLabels(t)`'s wrapper object (`{campaignStatusLabels,
  campaignTypeLabels}`) directly by status code instead of its
  `.campaignStatusLabels` sub-map, so the dashboard's recent-campaigns pill
  text was always blank.
  New translation keys (`previewAvailableAfterYouSaveTheCampaign`,
  `previewIsNotAvailableForTriggeredCampaigns`,
  `selectATestSubscriberAboveToPreviewThe`) added to `en-US` and `pt-BR`
  only, matching the precedent set by phases 2–3 (other locales not
  touched).
  Verified: client build succeeds in the dev container; server unchanged
  this phase so no restart was needed. Full click-through in a browser
  was **not** performed — this environment has no headless-browser tool
  available, so visual/interactive verification (picking a test user,
  confirming the iframe renders real content, checking layout at
  different viewport widths) is still outstanding and should be done
  manually before calling phase 4 done.

## Done: phases 5–6

### Phase 5 — Estatísticas (`client/src/campaigns/Statistics.js`)
- `getOpensByDay(context, id)` in `server/models/campaigns.js`: queries
  `campaign_links WHERE campaign=? AND link=OPEN AND created >= NOW()-7d
  GROUP BY DATE(created)`, zero-fills missing days, protected by the
  existing `enforceEntityPermissionTx(tx, context, 'campaign', id, 'viewStats')`
  (and, since Part H below, that check is now also account-scoped).
- New route `GET rest/campaigns-opens-by-day/:campaignId` in
  `server/routes/rest/campaigns.js`, next to `campaigns-stats`.
- Frontend: 4 overview numbers reskinned into `StatCard`s (sent/openRate/
  clickRate/unsubscribed), a 7-bar CSS chart (height%/opacity divs, no new
  chart library) fed by the new route. The original `renderMetrics`/
  `renderMetricsWithProgress` drill-down links (delivered/blacklisted/
  bounced/complained/unsubscribed/opened/clicks) were kept intact — those
  sub-routes still exist in `campaigns/root.js`.

### Phase 6 — Importar (`client/src/lists/imports/CUD.js`)
- Frontend-only: the native `<input type=file>` replaced by a real
  drag-and-drop dropzone (HTML5 drag events, `DataTransfer`-based
  click-to-browse fallback wired to the same hidden `this.csvFile` ref),
  styled per the mockup (`.cn-card`, dashed border, accent-blue on hover,
  selected-filename display). Same `multipart/form-data` POST to
  `rest/imports/:listId` — no backend change.

Verified: client build succeeded (webpack, clean) before any backend work
in the following round started.

## Round 2: SaaS backlog (isolation, DKIM/IP, priority queue, API, usage alerts)

Done alongside phases 5–6, per the user's request to clear the rest of the
SaaS backlog in one pass. Full detail lives in `docs/saas-plan.md`'s "Done:
round 2" section — this note is just the redesign-plan pointer, since none
of it touches `client/src` except the two new admin pages below.

- New admin-facing client pages, following the existing sidebar/settings
  pattern (`client/src/settings/root.js`, `client/src/root.js`):
  `client/src/settings/SendingDomains.js` (add a sending domain, see the
  expected DNS TXT record, verified/pending status) and
  `client/src/settings/ApiKeys.js` (scope checkboxes, generate/revoke,
  one-time raw-key display since only the hash is stored server-side).
- Central account-isolation hardening (`server/models/shares.js`) meant the
  tenant-isolation test suite's first test needed its assertion updated:
  `lists.getByIdTx` now **throws** on a cross-account access attempt (fails
  at the permission-check step) instead of silently returning `undefined`
  (which used to happen one query later, at the scoped fetch) — stricter,
  not a regression. `server/test/tenant-isolation/index.js` updated
  accordingly, plus a new test for the hardened check protecting a "child"
  table (`fields.js`/custom fields) via its parent list.

## Verification approach (same for each phase)
1. Rebuild the client inside the dev container (`mailtrain-cliker-1`):
   `npm run build` in `/app/client`.
2. If server-side files changed (new/edited files under `server/`), restart
   the node process so `app-builder.js`'s route wiring picks up changes —
   the dev entrypoint doesn't hot-reload the backend.
3. Click through the actual screen in a browser (not just "it compiles").
   For anything touching real data (Contacts, the opens-by-day chart), test
   against a real created list/campaign, not just the empty-state — the
   cross-table/aggregate SQL is the highest-risk part of this whole redesign.
4. Spot-check that unrelated pages (Templates, Users, existing Campaign
   tabs) still render correctly after each change, since `page.js`/`root.js`
   are shared by the whole app.

## Known pre-existing bug (found during phase 1–3 verification, not caused by the redesign)
`client/src/login/Login.js` around line 78–79 does
`qs.parse(this.props.location.search).next.replace(...)` without checking
whether `next` exists — throws a `TypeError` (caught, swallowed, but the
post-login client-side redirect doesn't happen) whenever `/login` is opened
directly rather than via a redirect that appends `?next=`. The login itself
still succeeds server-side; only the client-side "where to send you after
login" logic is affected. Worth a follow-up fix: `const unsafeUrl = qs.parse(...).next || '';`.
