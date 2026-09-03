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
Status: COMPLETED

Implemented on the current `main` branch:

- `Cleaning History` now has a hamburger button on mobile and a slide-in sidebar using the same `active`/overlay state convention as the shared tool navigation.
- `Cleaning History` menu links close the mobile sidebar after navigation.
- `Machine List` mobile navigation was aligned to the same `active` sidebar state used by the other tool pages.
- `Machine List` overlay state now uses the shared `.sidebar-overlay.active` behavior.
- Existing menu destinations and application IDs/classes required by the tool logic were preserved.
- No application/data-processing logic, Google Sheets behavior, or analyzer calculations were changed.

Files changed in M2:
- `cleaning-history.html`
- `machine-list.html`
- `machine-list.css`

Notes:
- The existing `theme-toggle.js` navigation synchronization remains intact.
- `Theme Preview` remains a standalone page and is not forced into the shared tool-sidebar implementation.
- The current M2 implementation is intentionally minimal so later phases can standardize visual spacing without rewriting working tool behavior.

## Phase M3 — Shared Mobile Layout Rules
Status: COMPLETED

Implemented on the current `main` branch:

- Added page-level `overflow-x: hidden` to the shared light Tools Hub shell so wide content cannot push the entire viewport sideways.
- Added `min-width: 0` safeguards to shared main/container/card/hero elements so long content can shrink inside mobile grid/flex layouts.
- Standardized mobile heading wrapping with `overflow-wrap:anywhere` for page titles and card content that may contain long filenames or labels.
- Tuned shared phone/tablet breakpoints at 1050px, 780px, and 480px for more predictable spacing and card/grid behavior.
- Reduced mobile page/card spacing consistently while keeping the existing desktop layout intact.
- Standardized mobile card footer stacking to avoid cramped metadata/action rows.
- Increased the `Sub Account` mobile menu button to a 44px touch target.
- No analyzer calculations, file parsing, localStorage, API, export, or navigation destination logic was changed.

Files changed in M3:
- `index-hub.css`
- `excel-analyzer.css`

Verification:
- Compared M2 completion commit `64f32ef72dbd2de3bd72e8a468e152ab362cb799` against the M3 head.
- Only the two expected CSS files changed.
- Changes are CSS-only.

## Phase M4 — Controls & Forms
Status: COMPLETED

Implemented on the current `main` branch:

- File upload controls use larger mobile-friendly touch targets where the page already exposes file selectors.
- Search inputs and select controls are given stable mobile heights and width behavior.
- Checkbox/selection rows in Bulk Compare are easier to tap on narrow screens.
- Filter buttons wrap and expand appropriately instead of becoming cramped.
- Action buttons become full-width/stacked where needed on phones.
- Manual IP input and validation controls remain readable and usable on narrow screens.
- Machine List upload, clear, resolver, and action controls were tightened for phone widths.
- Long upload filenames and helper text are constrained so they do not force horizontal page overflow.

Files changed in M4:
- `data-matcher-ui.css`
- `bulk-compare-ui.css`
- `iplocationvalidator.css`
- `machine-list.css`

Verification:
- Compared M3 completion commit `21cc4f6a36a518b5395feab6f03169a52713dc85` against the final M4 head.
- Only the four expected CSS files changed during M4.
- No application JavaScript, calculations, parsing, persistence, API calls, Google Sheets behavior, or navigation logic were modified.

## Phase M5 — Tables
Status: COMPLETED

Implemented on the current `main` branch:

- Added a shared mobile table override layer through `mobile-tables.css`.
- Table wrappers remain constrained to the card/page width and provide horizontal scrolling inside the table region.
- Wide operational tables remain wide enough to preserve column readability instead of being compressed into unusable narrow columns.
- Mobile table cell/header padding is reduced moderately at phone widths to show more data per screen without changing table content.
- Horizontal scrolling uses touch-friendly momentum scrolling and contains horizontal overscroll inside the table region where supported.
- Covered the existing table wrapper patterns used by Offline Analyzer, IP Validator, Pool vs Dashboard, Bulk Compare, IP Repeat, Machine List, Sub Account, and other shared Tools Hub tables.
- No table data, sorting/filtering logic, rendering logic, or application JavaScript was changed.

Files changed in M5:
- `mobile-tables.css`
- `theme-toggle.css`

Implementation note:
- `theme-toggle.css` imports `mobile-tables.css` so the new responsive table rules are loaded alongside the existing shared theme styles without modifying page logic or individual analyzer scripts.

Verification:
- The M5 changes are CSS-only.
- The table rules are scoped to `max-width: 780px`/`560px` and existing table wrapper classes/IDs.
- Application JavaScript, calculations, persistence, API calls, exports, and data-processing code were not changed by M5.

## Phase M6 — Page-by-page responsive pass
Status: COMPLETED

Reviewed all pages in the frozen scope:

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

Implemented:

- Added the final responsive polish as a shared CSS layer in `theme-toggle.css`, which is already loaded by the operational Tools Hub pages.
- Tightened page/card width constraints so mobile content stays inside the viewport.
- Standardized long-title, description, helper-text, and filename wrapping.
- Standardized mobile control widths and minimum touch-friendly heights.
- Normalized upload/action/filter/search behavior across the operational pages at phone widths.
- Added final phone-width adjustments for stats, selection actions, repeat-analysis controls, and compact upload content.
- Confirmed `Theme Preview` already has its own responsive breakpoints: sidebar hides at mobile width, main content expands to full width, the stats grid collapses, and the header stacks. No additional markup/logic change was necessary there.
- No application JavaScript, data calculations, persistence, API, export, or processing logic was modified in M6.

Files changed in M6:
- `theme-toggle.css`

Verification:
- Compared M5 head `e977afa653478d6996cf8e81285b2933dd2f9b1a` against M6 head `e8972860214dce4fd9f53a4473d1969e6b42aed6`.
- The implementation diff contains only the expected shared CSS change.
- All page-specific behavior remains controlled by the existing HTML/JavaScript.
- This verification is source-level; no real-device browser automation/screenshot test was available in this environment.

## Phase M7 — Cross-page consistency review
Status: COMPLETED

Cross-page review completed against the actual current `main` branch pages.

Verified:

- Navigation destinations are consistent with the frozen 10-page scope; `history-viewer.html` is not part of the mobile plan.
- Operational pages use the shared Tools Hub navigation/theme layer while preserving the standalone `Theme Preview` layout.
- Mobile spacing, heading hierarchy, card treatment, and control sizing are consistent with the shared responsive rules introduced in M3–M6.
- Wide tables remain inside dedicated scroll containers rather than intentionally widening the page.
- `Cleaning History` keeps its dedicated mobile sidebar while remaining compatible with the shared active/overlay navigation convention.
- `Theme Preview` intentionally remains visually independent and retains its own mobile behavior.
- Light/dark theme handling remains connected to the shared theme layer; no theme persistence behavior was altered.

Review outcome:
- No additional responsive code changes were necessary in M7.
- M7 is documentation/verification-only.
- No JavaScript, data processing, API, persistence, export, or calculation logic was changed.

## Phase M8 — Logic safety verification
Status: COMPLETED

Final source-level safety verification completed against the mobile-work baseline and the current `main` branch.

Verification performed:

- Compared mobile-work baseline `9ce13156bef1d3e46db9207473f6d3b2a86505b8` with the current `main` branch.
- The resulting change set contains only the responsive-plan document plus UI/responsive files: `bulk-compare-ui.css`, `cleaning-history.html`, `data-matcher-ui.css`, `excel-analyzer.css`, `index-hub.css`, `iplocationvalidator.css`, `machine-list.css`, `machine-list.html`, `mobile-tables.css`, and `theme-toggle.css`.
- No analyzer/processing JavaScript file appears in the mobile-work diff.
- No changes were detected to the core logic areas listed below: Excel/CSV parsing, IP validation/repeat calculations, zone logic, engineer selection/localStorage behavior, Google Sheets persistence, work/history processing, machine resolver logic, exports, or existing API endpoints.
- `Cleaning History` and `Machine List` contain only the narrowly scoped mobile menu interaction added for responsive navigation; their data logic remains in the existing application scripts.
- `theme-toggle.js` and the operational analyzer scripts were not modified by the mobile-responsive work.
- The repository `main` branch is currently identical to M7 completion commit `ceb83c276ecdb914e25ec3bc189bd44933034d92` before this documentation-only M8 update.

Safety conclusion:
- No business/data-processing logic was changed as part of the mobile-responsive implementation.
- M8 requires no application-code rollback or corrective patch.
- The remaining limitation is testing scope: this is a source-level safety verification; a real-device browser regression test was not available in this environment.

## Phase M9 — Mobile Sidebar Refinement: Burger → Left Sidebar
Status: COMPLETED

Requirement:

- On mobile, all 10 in-scope pages must follow the same navigation concept: **burger button → fixed sidebar from the left**.
- The sidebar must never become a normal/static section above the page content.
- The sidebar is hidden off-canvas by default on mobile and opens from the left when the burger is pressed.
- A backdrop/overlay appears while the sidebar is open.
- Tapping the overlay or a navigation link closes the sidebar.
- Desktop sidebar behavior remains unchanged.

Implemented:

- `index.html`: added the mobile burger trigger, overlay, accessible `aria-expanded` state, and close-on-navigation behavior for the Tools Hub.
- `index-hub.css`: replaced the previous mobile top-section sidebar layout with a fixed 260px left off-canvas sidebar and burger/overlay presentation.
- `theme-preview.html`: aligned the standalone preview page to the same burger → left off-canvas sidebar pattern while preserving its standalone theme-preview content and theme toggle.
- Existing operational pages that already use the burger/left-sidebar pattern were not unnecessarily rewritten.
- No analyzer calculations, parsing, data processing, persistence, API endpoints, exports, or localStorage behavior were intentionally changed.

Files changed in M9:
- `index.html`
- `index-hub.css`
- `theme-preview.html`

Verification:

- `index.html` now exposes `#menuToggle`, `#sidebar`, and `#sidebarOverlay` for the mobile navigation pattern.
- Tools Hub mobile CSS keeps the sidebar fixed to the left and off-canvas until `.active` is applied.
- `theme-preview.html` now has its own mobile menu trigger, overlay, and `.active` sidebar state.
- Existing operational-page navigation logic was preserved.
- Source-level verification only; real-device/browser screenshot testing remains to be performed manually.

## Phase M10 — Burger Position & Interaction Standardization
Status: COMPLETED

Requirement:

- All 10 in-scope pages use the same mobile burger position and touch target.
- The sidebar must continue to open from the left as an off-canvas panel.
- Bulk Compare must have a responsive burger that actually opens/closes its sidebar and overlay.
- Desktop layout and application/data-processing behavior must remain unchanged.

Implemented:

- Added shared mobile burger rules in `theme-toggle.css` covering Tools Hub, Sub Account, Offline, IP Validator, Pool vs Dashboard, Bulk Compare, IP Repeat, Machine List, and Cleaning History.
- Standardized the mobile burger to `44px × 44px` with consistent visual treatment and navigation z-index.
- Bulk Compare received its own narrow navigation handler using the existing `#menuToggle`, `#sidebar`, and `#sidebarOverlay` elements; no Bulk Compare matching/data logic was modified.
- Existing standalone Theme Preview already uses a fixed top-left mobile burger and remains visually independent.

Files changed in M10:
- `theme-toggle.css`
- `bulk-compare.html`

Verification:

- Source-level review confirmed the shared operational-page burger selectors use one mobile position and size.
- Bulk Compare has a click handler that toggles `.active` on the sidebar and overlay, updates `aria-expanded`, closes on overlay/navigation-link click, and closes when returning to desktop width.
- `bulk-compare.js` was not modified.
- No analyzer calculations, parsing, data processing, persistence, API endpoints, exports, localStorage behavior, or navigation destinations were changed.
- Real-device/browser interaction testing should still be performed manually after deployment.

## Phase M11 — Burger Position: Right of Page Title
Status: COMPLETED

Requirement:

- On mobile, move the burger from the left side to the **right side of the page header**, aligned vertically with the page title/header area.
- Keep the burger position consistent across the shared tool pages.
- Keep the mobile sidebar exactly where it is: hidden off-canvas and opening from the **left**.
- Desktop layout remains unchanged.
- Do not modify application/data-processing logic.

Implemented:

- Updated the shared mobile burger rule in `theme-toggle.css` from `left:14px` to `right:14px`.
- The burger remains fixed at `top:14px` with a `44px × 44px` touch target.
- Shared mobile headers now reserve space on the right with `padding-right:58px`, while the previous left reservation is removed.
- The sidebar z-index, off-canvas behavior, and left-side opening direction were not changed.
- No JavaScript, analyzer calculations, parsing, persistence, API calls, exports, or data-processing logic was changed.

Files changed in M11:
- `theme-toggle.css`
- `MOBILE-RESPONSIVE-PLAN.md`

Verification:

- CSS-only UI adjustment for the burger placement.
- Burger remains associated with the existing navigation controls and sidebar state.
- Sidebar remains on the left.
- Desktop styles are outside the mobile `max-width:780px` rules and therefore unchanged.

## Implementation rule

Prefer CSS-only changes. Markup changes are allowed only when required to provide responsive UI behavior, and any such change must preserve existing IDs/classes used by application logic. JavaScript changes are avoided unless a navigation/UI interaction cannot be fixed safely in CSS alone.
