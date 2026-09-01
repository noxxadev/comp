# COMP — Roadmap & Change Log

## Purpose
Fixed roadmap for the IP Repeat Analyzer and Engineer Work Tracking project in this repository.

The roadmap is executed phase-by-phase. Completed phases are not changed casually; fixes are recorded in the change log. Existing tool logic must not be modified unless explicitly agreed.

# Roadmap

## Phase 0 — Requirement Freeze
- Input: MinerPlus result data in .xlsx; .xls may also be accepted where supported.
- Excel may contain many columns; only the IP column is processed.
- Automatically detect the IP column.
- Normalize whitespace so equivalent IP addresses are counted as the same IP.
- Use existing master-data.js for IP → Nama DC.
- Missing IP: Nama DC = Bukan IP DC; Zona = -.
- Zone rule: first letter after GBE. determines the line: A→Line A, B→Line B, C→Line C, D→Line D, E→Line E, F→Line F.
- Core output: No | IP | Repeat Zero | Nama DC | Zona.
- Default sorting: Repeat Zero descending.
- Statistics are postponed until the core workflow is stable.

## Phase 1 — IP Repeat Analyzer
Status: COMPLETED / LOGIC FIXED

Features:
1. Upload Excel.
2. Auto-detect IP column.
3. Normalize IP whitespace.
4. Validate IPv4.
5. Count occurrences of each unique IP.
6. Match IP against master-data.js.
7. Show Bukan IP DC for unmapped IPs.
8. Derive Line A–F from the master-data name.
9. Show one row per unique IP.
10. Sort by Repeat Zero.
11. Export analysis to .xlsx.

Hardening completed:
- Header matching handles BOM and whitespace more safely.
- Master-data values are trimmed before use.
- Zone parsing follows the fixed GBE.<letter> rule.
- A compatibility/safety layer exists for the Zone column.

Known maintenance item:
- Exported Excel contains Zone data, but the live GitHub Pages table has previously shown a case where Zone was not rendered. This remains a Phase 1 UI/runtime verification item.

## Phase 2 — Filtering & Sorting
Status: IN PROGRESS

Implement and verify:
- Filter: All, Line A, Line B, Line C, Line D, Line E, Line F.
- Search by IP.
- Search by Nama DC.
- Repeat Zero sorting.
- Search, filtering and sorting work together.
- Result numbering remains correct after filtering.
- Phase 1 calculation logic remains unchanged.

No engineer tracking or database workflow is added in this phase.

### Phase 2 implementation — 2026-09-01
- Added a Zone filter control with All, Line A, Line B, Line C, Line D, Line E, Line F.
- Zone filtering operates on the already-derived `row.zone` value; IP counting and master-data mapping remain unchanged.
- Search by IP/Nama DC continues to work together with the Zone filter.
- Existing Repeat Zero sorting continues to operate on the filtered result set.
- Resetting/reprocessing an Excel file resets the Zone filter to All.
- Affected files: `ip-repeat-analyzer.html`, `ip-repeat-analyzer.js`, `ip-repeat-analyzer.css`.
- Validation performed: code-level verification of filter state, combined search/filter flow, and sorting integration. Live browser validation remains to be performed before Phase 2 is marked DONE.

### Phase 2 validation attempt — 2026-09-01
- Re-checked the current `ip-repeat-analyzer.html` and `ip-repeat-analyzer.js` implementation on the repository default branch.
- Confirmed the Zone selector is wired to `state.zoneFilter` and `render()`.
- Confirmed search and Zone filtering are applied together before sorting.
- Confirmed result numbering is regenerated from the filtered result set.
- Confirmed sorting is applied after filtering and supports both descending and ascending Repeat Zero order.
- Confirmed processing a new Excel file resets search, Zone filter and Repeat Zero sorting state.
- Confirmed Phase 1 counting, IPv4 validation, master-data mapping and zone derivation are not altered by the Phase 2 filter logic.
- Live GitHub Pages/browser interaction could not be executed from the current validation environment; therefore this validation pass does **not** mark Phase 2 as DONE.
- Required final validation remains: open the deployed page in a real browser, process a representative Excel file, and verify Zone filter, search, combined filtering, sorting and numbering visually/behaviorally.

## Phase 3 — Engineer Selection
Status: COMPLETED
- Checkbox per result row.
- Select all / clear selection.
- Show selected-IP count.
- Multiple IP selection.
- Selection does not lock an IP.

### Phase 3 implementation — 2026-09-01
- Added a selection checkbox to every IP result row.
- Added a selected-IP counter.
- Added `Pilih Semua` / `Batalkan Semua` behavior for the currently visible filtered result set.
- Added `Clear` to remove all selections.
- Selection state is stored by IP in a `Set`, so selected IPs persist while search, Zone filtering, and Repeat Zero sorting change the visible rows.
- Reprocessing a new Excel file clears the prior selection state.
- The existing IP counting, validation, master-data mapping, Zone derivation, search, filtering and sorting logic remains intact.
- No IP locking or engineer identity/database workflow is introduced in this phase.
- Affected files: `ip-repeat-analyzer.html`, `ip-repeat-analyzer.js`, `ip-repeat-analyzer.css`.

### Phase 3 validation — 2026-09-01
- User completed live browser validation of the Phase 3 implementation and confirmed the behavior is correct.
- Verified per-row checkbox selection.
- Verified selected-IP counter.
- Verified Select All / Batalkan Semua behavior.
- Verified Clear selection.
- Verified multiple IP selection.
- Verified selection remains correct when Search, Zone filtering, and Repeat Zero sorting are changed.
- Verified selection is cleared when a new Excel file is processed.
- Verified no IP locking was introduced.
- Verified existing IP, Repeat Zero, Nama DC and Zone output remains correct.
- Phase 3 is now marked **COMPLETED**.

## Phase 4 — Engineer Identity
Status: PLANNED
- Initial identity method: engineer dropdown, not password login.
- Engineer records use stable internal IDs.
- Display name is separate from the ID.
- Browser may remember the last selected engineer.

## Phase 5 — Work Tracking
Status: PLANNED

Minimum work data:
- IP
- Nama DC
- Zona
- Engineer ID
- Status
- Timestamp
- Note

Initial statuses:
- Belum Dikerjakan
- In Progress
- Selesai
- Problem
- Skipped

IP is never locked; multiple engineers may work on the same IP.

## Phase 6 — Work History
Status: PLANNED

Every meaningful work action/status change is recorded as history. Latest state and historical activity are separate concepts.

## Phase 7 — Supabase / Multi-user
Status: PLANNED

The user has connected the project to Supabase. Before database writes are implemented, the actual repository-side client/configuration must be verified.

Target data:
- engineers
- work_items
- work_history

Target:
- Approximately 5 simultaneous engineers.
- Shared persisted work data.
- No IP locking.
- Appropriate Row Level Security (RLS).
- Stable engineer IDs.

## Phase 8 — Work Export
Status: PLANNED

Analysis export:
No | IP | Repeat Zero | Nama DC | Zona

Work export:
No | IP | Repeat Zero | Nama DC | Zona | Engineer | Status | Waktu | Catatan

## Phase 9 — Shift Report Integration
Status: PLANNED

Future Shift Report can use work history for:
- IP worked per shift.
- Completed / In Progress / Problem counts.
- Work by Line A–F.
- Work by engineer.
- Outstanding IPs.

# Fixed Architecture Rules
1. IP Repeat has its own HTML, JS and CSS files.
2. Existing tools retain their application logic.
3. Shared UI changes must not alter tool logic.
4. New requirements are added to this roadmap before implementation.
5. Each phase is tested before moving to the next.
6. No IP locking.
7. Initial engineer identity is dropdown-based.
8. Statistics are postponed until the core workflow is stable.
9. Every implementation update must be recorded in this README.

# Detailed Change Log

## 2026-09-01 — Roadmap established
- Requirement freeze created for IP Repeat Analyzer and Engineer Work Tracking.
- Phase 0–9 defined.
- Flexible/non-locking engineer workflow defined.
- Supabase planned for persisted multi-user work tracking.
- Zone rule fixed to first letter after GBE.

## 2026-09-01 — Phase 1 hardening
- Improved Excel header normalization.
- Improved master-data value normalization.
- Preserved unique-IP counting and mapping behavior.
- Confirmed zone derivation rule.
- No existing tool logic intentionally changed.

## 2026-09-01 — Sidebar maintenance
- Added IP Repeat navigation where applicable.
- Desktop sidebar auto-collapse/hover-expand behavior introduced.
- Sidebar icon sizing and spacing refined.
- Theme label visibility during collapsed state addressed.
- These are shared UI changes only; application logic remains separate.

## 2026-09-01 — Phase 2 validation attempt
- Revalidated the Phase 2 implementation at code level.
- Verified filter/search/sort integration and state reset behavior.
- No application logic changes were made during this validation.
- Live browser validation could not be executed in the current environment.
- Phase 2 remains IN PROGRESS until deployed-page behavior is verified in a real browser.

## 2026-09-01 — Phase 3 implementation and validation
- Implemented Phase 3 Engineer Selection.
- Changes were initially isolated in `phase-3-engineer-selection` and then merged into `main`.
- Added per-row IP selection using a `Set` keyed by normalized IP.
- Added selected counter, Select All/Cancel All, and Clear controls.
- Preserved selection through render/filter/search/sort operations.
- Cleared selection when a new Excel file is processed.
- User completed live browser validation and confirmed the implementation is correct.
- Phase 3 marked COMPLETED.

# Current Status

| Phase | Status |
|---|---|
| Phase 0 — Requirement Freeze | DONE |
| Phase 1 — IP Repeat Analyzer | DONE, with live-table zone verification |
| Phase 2 — Filtering & Sorting | IN PROGRESS — awaiting live browser validation |
| Phase 3 — Engineer Selection | DONE — live browser validation confirmed by user |
| Phase 4 — Engineer Identity | PLANNED |
| Phase 5 — Work Tracking | PLANNED |
| Phase 6 — Work History | PLANNED |
| Phase 7 — Supabase / Multi-user | PLANNED |
| Phase 8 — Work Export | PLANNED |
| Phase 9 — Shift Report Integration | PLANNED |

Rule: before declaring a phase complete, record the phase, exact changes, reason, affected files, validation result, and remaining issues here.
