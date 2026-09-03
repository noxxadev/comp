# COMP — Mobile Responsive Work Plan

This document is the active plan for making the current `main` branch comfortable and reliable to use on phones and tablets.

## Scope

- Source of truth: the actual files/pages currently present on branch `main`.
- `history-viewer.html` is not part of this plan.
- UI/responsive improvements only.
- Do not change application logic, calculations, persistence, APIs, exports, localStorage behavior, or data-processing rules.

## Current pages in scope

1. `index.html` — Tools Hub
2. `excel-analyzer.html` — Sub Account
3. `offline-analyzer.html` — Offline
4. `iplocationvalidator.html` — IP Validator
5. `data-matcher.html` — Pool vs Dashboard
6. `bulk-compare.html` — Bulk Compare
7. `ip-repeat-analyzer.html` — IP Repeat
8. `machine-list.html` — Machine List
9. `cleaning-history.html` — Cleaning History
10. `theme-preview.html` — Theme Preview

## Phase M1 — Mobile Audit
Status: COMPLETED

Findings from the current `main` branch:

- All major operational pages already include a mobile viewport and at least one responsive breakpoint.
- `index.html`/`index-hub.css` uses a different mobile navigation pattern from the tool pages: the sidebar becomes a normal top section on small screens.
- Several tool pages use a hamburger + slide-in sidebar pattern through the shared `script.js` interaction.
- `Cleaning History` is usable on small screens but its history table intentionally remains wide (`min-width: 1050px`) and relies on horizontal scrolling.
- Data-heavy tables in `Machine List`, `IP Repeat`, `IP Validator`, and other tools also rely on controlled horizontal scrolling where a narrow mobile table would reduce readability.
- `Offline Analyzer` and several tool pages already have useful mobile-specific layout rules, but spacing, controls, and navigation behavior are not yet fully standardized.
- `Theme Preview` is a standalone preview page and uses its own layout/CSS rather than the shared Tools Hub shell, so it requires a separate responsive pass.
- `script.js` currently provides a reusable mobile sidebar interaction for pages that expose `#menuToggle`, `#sidebar`, and `#sidebarOverlay`.

## Phase M2 — Navigation Standardization
Status: NEXT

Target behavior:

- Desktop: existing sidebar behavior remains intact.
- Tablet/mobile: consistent hamburger + slide-in sidebar + overlay for operational tool pages.
- Keep existing menu destinations unchanged.
- Do not alter application/data logic.
- Keep Tools Hub visually coherent while preserving its current role as the launcher.

## Phase M3 — Shared Mobile Layout Rules
Status: PLANNED

Target:

- Consistent mobile page padding.
- Prevent page-level horizontal overflow.
- Consistent heading sizing and wrapping.
- Consistent card spacing.
- Consistent touch-friendly control sizing.
- Breakpoints tuned for phone and tablet widths.

## Phase M4 — Controls & Forms
Status: PLANNED

Review and improve:

- File upload areas.
- Inputs and textareas.
- Select/dropdown controls.
- Checkboxes and selection controls.
- Primary/secondary buttons.
- Filter and search controls.
- Action rows that currently become crowded on narrow screens.

## Phase M5 — Tables
Status: PLANNED

Rules:

- Keep wide data tables as horizontal-scroll regions when necessary.
- Prevent the whole page from horizontally scrolling because of a table.
- Improve table readability with mobile-appropriate padding/font sizes.
- Add controlled/stable scrolling behavior where useful.
- Do not change table data or rendering logic.

## Phase M6 — Page-by-page responsive pass
Status: PLANNED

Order:

1. Tools Hub
2. Sub Account
3. Offline
4. IP Validator
5. Pool vs Dashboard
6. Bulk Compare
7. IP Repeat
8. Machine List
9. Cleaning History
10. Theme Preview

## Phase M7 — Cross-page consistency review
Status: PLANNED

Verify:

- Navigation pattern is consistent.
- Mobile spacing and typography are coherent.
- Cards and controls align consistently.
- No unintended horizontal page overflow.
- Light/dark theme behavior remains intact.

## Phase M8 — Logic safety verification
Status: PLANNED

Verify that responsive work did not alter:

- Excel/CSV parsing.
- IP validation/repeat calculation.
- Zone logic.
- Engineer selection/localStorage behavior.
- Google Sheets persistence.
- Work Items/Work History behavior.
- Machine resolver behavior.
- Export behavior.
- Existing API endpoints.

## Implementation rule

Prefer CSS-only changes. Markup changes are allowed only when required to provide responsive UI behavior, and any such change must preserve existing IDs/classes used by application logic. JavaScript changes are avoided unless a navigation/UI interaction cannot be fixed safely in CSS alone.
