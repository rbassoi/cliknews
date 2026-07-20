# Handoff: App de Contatos e Newsletter

## Overview
Protótipo interativo de um app de gerenciamento de contatos e newsletter para equipes maiores. Cinco telas navegáveis via menu lateral: Dashboard, Contatos, Editor de Newsletter, Estatísticas, Importar Contatos.

## About the Design Files
The file in this bundle (`Contatos e Newsletter.dc.html`) is a **design reference built in HTML** — a working prototype showing intended look, layout, and navigation behavior. It is NOT production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, etc.) using its established component library, state management, and data layer — or, if no environment exists yet, choose the most appropriate framework and implement there.

## Fidelity
**High-fidelity (hifi)**: final colors, typography, spacing and layout are intentional and should be recreated pixel-close. All data shown (contact names, numbers, stats) is placeholder sample data — replace with real data bindings.

## Screens / Views

### 1. Sidebar navigation (persistent, all screens)
- Fixed left column, 240px wide, background `oklch(0.975 0.004 90)`, right border `1px solid oklch(0.9 0.005 90)`, padding 24px 16px, flex column, gap 24px.
- Logo row: 28×28px square, border-radius 8px, background accent blue `oklch(0.55 0.18 250)`, plus wordmark "Correio" (17px, weight 800).
- Nav list: 5 items — Dashboard, Contatos, Newsletters, Estatísticas, Importar. Each item: 9px 12px padding, border-radius 8px, 14px font. Active item: background `oklch(0.94 0.03 250)`, text color `oklch(0.4 0.15 250)`, weight 700, plus a 6×6px accent dot. Inactive: transparent bg, `oklch(0.3 0.01 90)` text, weight 500, hover background `oklch(0.94 0.006 90)`.
- Bottom plan card: rounded 10px, background `oklch(0.94 0.006 90)`, shows "Plano Equipe", usage text, and a thin progress bar (accent blue fill).

### 2. Dashboard
- Header: title "Dashboard" (26px/800) + subtitle (14px, muted gray) left; "+ Nova campanha" button right (accent blue bg, white text, 10px 18px, radius 8).
- 4 stat cards in a grid (4 columns, 16px gap): label (13px muted), value (24px/800), delta text (12px/600, green for positive `oklch(0.5 0.15 150)`).
- "Suas listas" section: 4-column grid of list cards — colored dot + name, big count (20px/800), growth text.
- "Campanhas recentes" table: 5-column grid header (Campanha / Lista / Data / Status / Abertura) then rows with a status pill (green = Enviada, blue = Agendada).

### 3. Contatos (table view)
- Header with title/subtitle and two actions: "Importar" (outline button) and "+ Adicionar contato" (filled accent button).
- Filter row: search input (flex:1), "Todas as listas ▾" and "Status ▾" dropdown-style buttons.
- Table: checkbox column, Nome, E-mail, Listas (tag pills, light blue bg `oklch(0.95 0.02 250)` / text `oklch(0.45 0.15 250)`), Status pill (Ativo=green, Inativo=gray, Pendente=amber), Adicionado (date).
- Footer: "Mostrando 8 de 12.480 contatos" + Anterior/Próxima pagination buttons.

### 4. Editor de Newsletter
- Header: breadcrumb "Newsletters / Nova campanha" + campaign title, plus "Salvar rascunho" (outline) and "Enviar teste" (filled accent) buttons.
- Two-column layout: left panel (320px, white card) with form fields — Assunto, Texto de pré-visualização, Remetente (read-only), Lista de destino (dropdown-style).
- Right panel: light gray canvas containing a centered 480px-wide email preview card — header image placeholder (striped pattern, monospace label "imagem de cabeçalho 480×180"), heading, body paragraph, CTA button, divider, footer unsubscribe text.

### 5. Estatísticas
- Header + 4 overview stat cards (Enviados, Taxa de abertura, Taxa de clique, Descadastros).
- Bar chart: 7 daily bars (CSS divs, height % + opacity encode intensity), labels Seg–Dom, accent-blue fill.
- Campaign performance table: Campanha / Enviados / Abertura / Cliques / Descadastros.

### 6. Importar Contatos
- Dashed-border dropzone (14px radius, 48px padding) with icon square, "Arraste um arquivo CSV aqui" + helper text. Hover: border turns accent blue.
- Field-mapping card: shows detected file + row count, then CSV-column → App-field rows (3-col grid: source pill → arrow → target dropdown).
- List-assignment card: dropdown to choose destination list.
- Primary "Importar 1.240 contatos" button, bottom-right, accent blue.

## Interactions & Behavior
- Sidebar nav switches the visible screen (client-side state, no page reload); active item is visually highlighted.
- "+ Nova campanha" (Dashboard) and "Importar" (Contatos) buttons navigate to the Newsletter editor / Import screens respectively.
- All other buttons/inputs are visual only in the prototype (no real submit/save/send logic, no live CSV parsing, no real search/filter) — implement real behavior in the target app:
  - Search/filter contacts table (client or server-side).
  - CSV upload + parsing + column auto-mapping.
  - Campaign draft save / test send / schedule / send now.
  - Real chart data for opens over time.
  - Pagination for contacts table.

## State Management
- `activeScreen`: enum of the 5 screens, drives which view renders.
- Contacts table: needs list of contacts (id, name, email, list memberships, status, createdAt), search query, list filter, status filter, pagination cursor/page.
- Newsletter editor: campaign draft object (subject, previewText, sender, targetListId, content blocks).
- Import flow: uploaded file, parsed CSV rows, column→field mapping, target list selection, import progress/result.
- Stats: per-campaign metrics (sent, openRate, clickRate, unsubscribeRate) and a time series for the chart.

## Design Tokens
- **Colors**
  - Background: `oklch(0.985 0.004 90)` (page), `white` (cards)
  - Sidebar bg: `oklch(0.975 0.004 90)`; borders: `oklch(0.91 0.005 90)` / `oklch(0.94 0.004 90)`
  - Text primary: `oklch(0.22 0.01 90)`; muted: `oklch(0.5 0.01 90)`; secondary dark: `oklch(0.4 0.01 90)`
  - Accent (primary blue): `oklch(0.55 0.18 250)`, hover `oklch(0.48 0.18 250)`, light tint `oklch(0.94-0.95 0.02-0.03 250)`, dark text tint `oklch(0.4-0.45 0.15 250)`
  - List category colors (dots): blue `oklch(0.55 0.18 250)`, green `oklch(0.55 0.18 150)`, orange `oklch(0.55 0.18 40)`, pink `oklch(0.55 0.18 320)`
  - Status pills: green (Ativo/Enviada) `bg oklch(0.94 0.05 150)` / `text oklch(0.4 0.12 150)`; gray (Inativo) `bg oklch(0.95 0.01 90)` / `text oklch(0.5 0.01 90)`; amber (Pendente) `bg oklch(0.95 0.05 80)` / `text oklch(0.5 0.13 80)`
- **Typography**: Inter (Google Fonts), weights 400/500/600/700/800. Titles 26px/800, section headers 16px/700, card values 20-24px/800, body/table 13-14px/500-600, labels/muted 11-13px.
- **Radius**: 6-8px buttons/inputs, 10-14px cards, 20px pills (full).
- **Spacing scale**: 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40px used throughout gaps/padding.
- **Shadows**: minimal — only a subtle `0 1px 3px oklch(0.2 0.01 90 / 0.08)` on the email preview card.

## Assets
No external images. One placeholder (striped/repeating-gradient pattern with monospace label) marks where a real header image should go in the newsletter editor — replace with actual uploaded imagery in production.

## Files
- `Contatos e Newsletter.dc.html` — full interactive prototype (all 5 screens + sidebar nav), included in this folder.
