# Handoff: Cliker Dashboard & Landing Redesign

## Overview
A visual refresh of the Cliker app dashboard (contacts/lists/campaigns admin UI) plus a new marketing landing page, both restyled onto the "Nocturne" design system (a compact dark interface, Inter typeface, single purple accent).

## About the Design Files
The two `.dc.html` files in this bundle are **design references built as self-contained HTML prototypes** — they show the intended look, layout, copy and interaction states, not production code to copy verbatim. The task is to **recreate these designs in the target codebase's existing framework** (React, Vue, whatever the app already uses) using its established components/patterns — the HTML/inline-style approach here is a prototyping technique, not the shipping architecture. If no frontend framework exists yet, choose the one that best fits the codebase and rebuild the designs there.

## Fidelity
**High-fidelity.** Colors, typography, spacing and component states below are final — implement pixel-for-pixel using the token values listed in Design Tokens.

## Screens / Views

### 1. Dashboard (`Cliker Dashboard.dc.html`)
**Purpose**: Admin home — overview of contacts/lists/campaigns, primary nav.

**Layout**: Two-column flex shell, `min-height:100vh`.
- Left sidebar: fixed `248px` wide, flex column, padding `16.8px` (space-6) all sides, `1px` right border, background `linear-gradient(180deg, neutral-900, bg 60%)`.
- Right side: flex column — top breadcrumb bar (`13px` text, bottom border), then `<main>` padded `22.4px` (space-8) vertical / `16.8px` horizontal, `16.8px` gap between blocks.

**Sidebar contents (top → bottom)**:
- Brand row: `28×28px` accent-filled square (radius `4px`) + "Cliker" wordmark, Inter 500, `16px`.
- Nav list, `2px` row gap. Each item: icon (18×18 stroke SVG, stroke-width 16, `256×256` viewbox) + label, `14px` text, `8.4px/11.2px` (space-3/4) padding, `8px` radius.
  - Flat items: Dashboard (active), Empresas, Formulários, Channels, Relatórios.
  - **Tree items with collapsible submenus** (chevron rotates 90° on open, animated `transform 0.15s`): Contatos → Todos os contatos, Segmentos. Listas → Todas as listas, Importar. Modelos → E-mail, Landing pages. Campanhas → Todas, Automações. Submenu rows indent by `16.8px` (space-6), font-size `13px`.
  - "Administração" section: uppercase `11px` letter-spaced label button with its own chevron, same expand pattern, revealing Usuários / Integrações / Configurações.
- Divider, then a spacer (`flex:1`) pushing the footer down.
- Footer block: locale "BR" + admin user row (avatar icon + "admin"); theme toggle button (sun/moon icon + "Escuro"/"Claro" label, full-width ghost button) next to a "Sair" (log out) ghost button; copyright line "© 2026 Cliker. Fonte no GitHub" (`11px`, muted, link underlined on hover).

**Main content**:
- Breadcrumb bar: "Início", `13px`, muted.
- Header row: "Dashboard" H1 (Inter 500, `28px`) + subtitle "Visão geral das suas listas e campanhas" (`14px`, muted) on the left; "+ Nova campanha" primary button top-right.
- 4-column metric card grid (`16.8px` gap): Total de contatos / Listas ativas / Newsletters enviadas / Taxa média de abertura — each a card with an uppercase accent kicker label + large `32px` Inter-500 number (all currently "0" / "0%" — zero/empty state).
- "Suas listas" section: H2 (`16px`, 500) + an empty-state card (icon, "Nenhuma lista ainda" + helper line, "Criar lista" secondary button).
- "Campanhas recentes" section: same empty-state pattern with a "Nova campanha" button.

**Light/dark theme toggle**: Clicking the sidebar toggle switches CSS custom-property overrides on the page root (see Design Tokens → Light mode overrides below) — everything else (markup, components) is identical between modes.

**Icons**: hand-drawn 16–18px stroke icons (stroke-width 16–20 on a 256×256 viewBox), not a bundled icon font — swap for the codebase's icon set (Phosphor, per the design system) at equivalent sizes.

### 2. Landing page (`Cliker Landing.dc.html`)
**Purpose**: Marketing/acquisition page for the Cliker product.

**Layout**: Single scrolling page, `max-width:1200px` centered content column, side gutter `clamp(20px, 5vw, 72px)`. Page background carries two radial-gradient blooms (accent-tinted top right, black falloff lower-left) over the base dark ground.

**Sections top → bottom**:
1. **Nav bar** — brand "Cliker" + text links (Produto / Recursos / Começar) + right-aligned "Começar agora" primary button.
2. **Hero** — two-column layout (`6fr/6fr`, stacks on narrow widths): left column has a kicker ("E-mail marketing open source"), two-line display headline (each sentence its own line): "E-mail marketing sem letra miúda." / "Seus contatos, sob seu controle.", Inter 500, `clamp(38px,5vw,64px)`, line-height 1.12, `-0.015em` letter-spacing; subline (`17px`/`28px`, max-width `52ch`); CTA row (primary "Começar grátis", tweakable, + ghost "Ver no GitHub"); a small trust line below ("Grátis para sempre até 500 contatos · Sem cartão de crédito"). Right column: a bordered, elevated (`elev-lg`) product screenshot placeholder (`image-slot`, 4:3, `lighten`-blended) with a soft accent-tinted radial glow behind it.
3. **Sticky nav** — the top nav is `position: sticky; top:0`, semi-opaque background (`color-mix(bg 84%, transparent)`) with `backdrop-filter: blur(14px)` and a bottom divider, so it stays visible while scrolling and content doesn't show through it.
4. **Stat band** — full-bleed section (currently a flat brand-teal fill `#2F816DEB`, set via direct edit — was the deep-indigo `--color-section` ground in the original design-system pattern), 4-column stat grid: 100% "Seus dados, seu servidor" / 6 "Canais de envio integrados" / R$0 "Taxa por contato" / "Tempo real" "Aberturas e cliques". Numbers `clamp(36px,3.6vw,52px)` Inter 500; labels `13px` uppercase, muted.
4. **Feature rows** ("O que o Cliker faz" kicker) — 3 numbered rows (01/02/03) in a `160px / 420px / 1fr` grid, separated by a fading 1px rule: Contatos & Listas, Campanhas & Automação, Formulários & Canais, each with a title + supporting paragraph.
5. **Image split** (toggleable via `showImageSection` prop) — 5/7 column split: copy block ("Painel" kicker, "Um painel, todos os números" title, supporting note) beside an image placeholder (`image-slot`, blended with `mix-blend-mode:lighten`, 1600:1261 aspect ratio) — drop in an actual product screenshot here.
6. **Close/signup** — "Comece a usar o Cliker" heading, supporting line, email input + "Criar conta" primary button (decorative in the prototype — wire to the real signup endpoint).
7. **Footer** — "© 2026 Cliker. Fonte no GitHub" link.

**Copy is final Portuguese marketing copy** — carry it verbatim unless product/marketing asks for changes.

## Interactions & Behavior
- Dashboard: sidebar submenus and the Administração group expand/collapse independently (accordion-per-item, not mutually exclusive); chevron rotates 90° with a 0.15s transition. Theme toggle flips light/dark instantly, no persistence implemented in the prototype (recommend persisting the user's choice, e.g. localStorage or user prefs, in production).
- All buttons/links use the design system's built-in hover/active/focus states (outlined buttons tint on hover; `:focus-visible` gets a 2px accent outline) — no custom hover CSS was written, don't add any.
- Landing page nav links smooth-scroll to in-page anchors (`#produto`, `#recursos`, `#comecar`).
- No client-side validation is wired on the email/signup input — add real validation + submission handling.

## State Management
- Dashboard: `theme` ('dark' | 'light'), and one boolean per collapsible nav group (`contatos`, `listas`, `modelos`, `campanhas`, `administracao`).
- Landing: no page state; two content props (`ctaLabel` string, `showImageSection` boolean) act as the only configurable inputs.
- All dashboard metrics/lists currently render a **zero/empty state** by design request — wire real data in when available; the empty-state copy and CTAs (see Screens above) should still show whenever a list/campaign collection is actually empty.

## Design Tokens
Source of truth: Nocturne design system (`styles.css` / `theme.json`), with the accent re-hued to the Cliker brand (see Brand colors below) — spacing, type, radius and structural tokens are unchanged from Nocturne.

**Brand colors (from the Cliker logo)**
- Primary (teal green): logo mark `#12735c`-ish; UI accent tuned brighter for dark-ground legibility (see accent ramp below).
- Secondary (orange cursor accent): `#e0703b` — used sparingly as a second color, per the design system's "accent as a line/glow, never a flood" rule. Currently wired only on the landing page's primary hero CTA hover state. Do not flood it across the UI.
- Logo assets: `assets/cliker-icon.png` (square icon mark, used at 24–28px in both nav bars) and `assets/cliker-logo.png` (full horizontal lockup with wordmark + tagline, not currently placed in either screen — available if a fuller lockup is wanted somewhere, e.g. a footer or auth screen).

**Color — dark (default) mode**
- `--color-bg`: `#161826`
- `--color-surface` (cards/inputs): `#232532`
- `--color-text`: `#e9e9ed`
- `--color-accent` (brand teal, dark-ground step): `#2ba98a`
- Neutral ramp 100→900: `#f3f5fe, #e4e7f5, #cfd3e5, #b2b6ca, #9397ab, #75798c, #595d6c, #3f424d, #292b31`
- Accent ramp 100→900 (teal): `#eafaf4, #cdf0e2, #a3e2c9, #6cc9a8, #239478, #1c7d65, #15654f, #124f3f, #0c3529`
- Accent-2 ramp 100→900 (brand orange, secondary): `#fdece2, #fad1b8, #f4ac81, #ea8452, #e0703b, #bf5a2c, #984522, #6e3119, #452010`
- Section (deck/landing saturated ground): `--color-section #262a60`, `--color-section-glow #353b80`, `--color-section-ghost #4c5397`
- Divider: `color-mix(in srgb, #e9e9ed 16%, transparent)`

**Color — light mode overrides** (applied as CSS custom-property overrides on the page root; everything else inherits unchanged)
- `--color-bg: #eef0f8`
- `--color-surface: #f8f9fc`
- `--color-text: #242631`
- `--color-divider: color-mix(in srgb, #242631 16%, transparent)`
- `--color-neutral-200: #3a3d4a` (nav-link default text)
- `--color-neutral-400: #585c6d` (muted body copy)
- `--color-neutral-500: #6b6f80` (tertiary/meta text)
- `--color-neutral-800: #dfe2ef` (borders, hover fills)
- `--color-neutral-900: #e4e7f5` (sidebar gradient stop)
- `--color-accent` and `--color-accent-100: #15654f` (the deep teal step — needed for legible accent text/borders on a light ground; the bright `#2ba98a` dark-mode accent is too light to read on a light background)
- Also re-set `color: var(--color-text)` on the themed root element itself — a custom-property override only affects *descendants* that re-resolve `var(--color-text)`; without also setting `color` on the root, elements up the tree keep the dark-mode literal.

**Type**: Inter throughout — `--font-heading` / `--font-body` both `"Inter", system-ui, sans-serif`; heading weight `500` (never bolder — hierarchy is size/space, not weight).

**Spacing scale** (0.7× density): `--space-1: 2.8px, --space-2: 5.6px, --space-3: 8.4px, --space-4: 11.2px, --space-6: 16.8px, --space-8: 22.4px`

**Radius**: `--radius-sm: 4px, --radius-md: 8px, --radius-lg: 14px`

**Elevation**: `--shadow-sm/md/lg` — hairline edge + ambient darkness, tuned for the dark ground (see `styles.css`); re-derive equivalents for light mode if elevation is added there (soft ink-tinted shadow instead of a hairline).

**Icons**: Phosphor icon set (regular weight), per the design system — the prototype's hand-drawn stroke SVGs are stand-ins.

## Assets
- No photographs are final — the landing page's image-slot is an empty placeholder (`Foto do painel do Cliker`); drop in a real product screenshot before shipping.
- Cliker "logo" is a plain accent-colored rounded square + wordmark, no bundled logomark — check with brand/product for an actual mark before shipping.

## Files
- `Cliker Dashboard.dc.html` — dashboard/admin screen, full sidebar + light/dark toggle.
- `Cliker Landing.dc.html` — marketing landing page.
- Both are standalone HTML (open directly in a browser) built against the Nocturne design system bundle; treat them as the visual/behavioral spec, not as code to lift into the app.
