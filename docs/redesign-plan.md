# ClikNews redesign — development plan

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
`client/src/scss/cliknews.scss` (`.cn-card`, `.cn-page-header`, `.cn-btn*`,
`.cn-pill*`, `.cn-stat-card`, `.cn-grid-4`), and the existing `Table`/`Form`/
`Dropdown` component kit (unchanged, just restyled).

## Next: phases 4–6

### Phase 4 — Newsletters editor (`client/src/campaigns/CUD.js`, `Content.js`)
- Reskin `CUD.js` into the mockup's two-column layout: left = settings card
  (`.cn-card`), right = a live preview canvas. **Keep every existing field**
  (lists/segments, send configuration, subject, tracking, content
  source/engine) — this is a visual pass, not a feature cut.
- Preview panel: reuse the **existing** test-user preview render mechanism
  already used by `Status.js`'s "Preview as test user" modal (an iframe
  pointed at the real rendered-campaign URL) instead of fabricating preview
  data. Show the actual current content once it exists, or a friendly empty
  state before content is set.
- `Content.js` (the WYSIWYG host: Mosaico/GrapesJS/CKEditor/CodeEditor,
  sandboxed iframes) keeps its current structure/engines — only spacing/
  colors/buttons change to match the new tokens.
- List view (`campaigns/List.js`): swap the plain-text status column for a
  `Pill` (reuse the `green`/`blue`/`gray` mapping pattern already used in
  `Home.js`'s `statusPill()` helper — consider extracting it to
  `campaigns/helpers.js` so both files share it instead of duplicating).

### Phase 5 — Estatísticas (`client/src/campaigns/Statistics.js`)
- New backend: `getOpensByDay(context, campaignId)` in `server/models/campaigns.js`
  (same file/pattern as the existing `getStatisticsOpened`), querying
  `campaign_links WHERE campaign=? AND link=-1 GROUP BY DATE(created)` for
  the last 7 days. This is a real daily-**unique**-opens series (the `created`
  column reflects each subscriber's *first* open only — repeat opens just
  bump a `count`, they don't get a new timestamped row) — no schema
  migration needed, the `created_index` already exists.
- New route `GET rest/campaigns-opens-by-day/:campaignId` in
  `server/routes/rest/campaigns.js`, next to the existing `campaigns-stats`
  route.
- Frontend: reskin the 4 overview numbers into `StatCard`s, add the 7-bar
  CSS chart (plain height%/opacity divs like the mockup — no new chart
  library needed for a 7-bar chart; `react-google-charts` stays reserved for
  the pie/geo charts on `StatisticsOpened.js`, untouched). Add a "campaign
  performance" table below (reuse the existing per-campaign stat columns
  already on the `campaigns` table: `delivered`/`opened`/`clicks`/
  `unsubscribed` — check whether the existing `campaigns-table` query
  already exposes these or needs a small column addition).

### Phase 6 — Importar (`client/src/lists/imports/CUD.js`)
- Frontend-only, no backend change: replace the native `<input type=file>`
  in the create step with a real drag-and-drop dropzone (HTML5 drag events +
  hidden input fallback for click-to-browse), styled per the mockup
  (`.cn-card`, dashed border, accent-blue on hover). Same
  `multipart/form-data` POST to the existing `rest/imports/:listId` endpoint.
- Reskin the column-mapping section (phase 2 of the form, once the CSV is
  parsed) into the mockup's 3-column grid (CSV column pill → arrow → target
  field dropdown) — reuses the exact same mapping data/state already in
  `CUD.js`, purely a layout/style change.

## Verification approach (same for each phase)
1. Rebuild the client inside the dev container (`mailtrain-cliknews-1`):
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
