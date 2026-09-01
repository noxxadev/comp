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

## Phase 2 — Filtering & Sorting
Status: COMPLETED

Implemented and verified:
- Filter: All, Line A, Line B, Line C, Line D, Line E, Line F.
- Search by IP.
- Search by Nama DC.
- Repeat Zero sorting.
- Search, filtering and sorting work together.
- Result numbering remains correct after filtering.
- Phase 1 calculation logic remains unchanged.

### Phase 2 live validation — 2026-09-01
- User verified the deployed/main version in the browser.
- Confirmed Zone is visibly rendered in the result output.
- Confirmed Zone filter works with All and Line A–F selections.
- Confirmed search by IP and Nama DC works.
- Confirmed search, Zone filtering and Repeat Zero sorting work together.
- Confirmed result numbering remains correct after filtering.
- Confirmed the previously reported Zone display issue is no longer present in `main`.
- Phase 2 marked COMPLETED.

## Phase 3 — Engineer Selection
Status: COMPLETED
- Checkbox per result row.
- Select all / clear selection.
- Show selected-IP count.
- Multiple IP selection.
- Selection does not lock an IP.

### Phase 3 validation — 2026-09-01
- User completed live browser validation and confirmed the behavior is correct.
- Verified per-row checkbox selection, selected counter, Select All / Batalkan Semua, Clear, multiple selection, persistence across filtering/search/sort, reset on new Excel, and no IP locking.
- Phase 3 marked COMPLETED.

## Phase 4 — Engineer Identity
Status: COMPLETED
- Initial identity method: engineer dropdown, not password login.
- Engineer records use stable internal IDs.
- Display name is separate from the ID.
- Browser may remember the last selected engineer.

### Phase 4 implementation — 2026-09-01
- Added `engineer-data.js` containing a local engineer catalog with stable IDs `ENG-001` through `ENG-005`.
- Current display names are placeholders `Engineer 1` through `Engineer 5`; the IDs are intended to remain stable when real names are assigned.
- Added Engineer dropdown to the IP Repeat result header.
- Engineer selection is stored in `state.engineerId` and does not alter IP calculations or selection behavior.
- Last selected engineer ID is stored in browser `localStorage` under `comp.selectedEngineerId` and restored when the catalog still contains that ID.
- Clearing the Engineer dropdown removes the stored selection.
- No password login, database write, work-item creation, or IP locking is introduced in Phase 4.
- Affected files: `engineer-data.js`, `ip-repeat-analyzer.html`, `ip-repeat-analyzer.js`, `ip-repeat-analyzer.css`.

### Phase 4 validation — 2026-09-01
- User verified the Engineer dropdown and confirmed it works in the browser.
- Confirmed engineer selection is restored after reload using the browser's localStorage.
- Confirmed the selected engineer does not alter existing IP analysis or selection behavior.
- Phase 4 marked COMPLETED.

## Phase 5 — Work Tracking + Google Sheets Persistence
Status: IN PROGRESS

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

### Phase 5 revised architecture — 2026-09-01
- Google Sheets is the persistent data store for current Work Items.
- Google Apps Script is used as the web endpoint between GitHub Pages and Google Sheets.
- No Google OAuth credential or service-account key is placed in the public GitHub Pages JavaScript.
- `google-sheets-config.js` holds only the deployed Apps Script `/exec` URL and optional request key.
- `google-apps-script/Code.gs` provides the backend template and creates the `Work Items` sheet/header automatically when needed.
- Current Work Items schema: IP | Nama DC | Zona | Repeat Zero | Engineer ID | Status | Timestamp | Catatan.
- Saving selected IPs performs an upsert keyed by IP, so the sheet keeps the latest work state for each IP.
- A single save can apply to multiple selected IPs.
- Work history/event logging is intentionally postponed to Phase 6.
- Supabase is removed from the mandatory roadmap; Google Sheets is the selected persistence approach for this project.
- No IP locking is introduced.

### Google Sheets setup required
1. Create a Google Spreadsheet for Work Tracking and copy its Spreadsheet ID.
2. Open Apps Script and copy `google-apps-script/Code.gs` from this repository into the script project.
3. Replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE` with the Spreadsheet ID.
4. Optionally set a lightweight `REQUEST_KEY` in both `Code.gs` and `google-sheets-config.js`. This is an application-level request filter, not a secret, because the public frontend can expose it.
5. Deploy the Apps Script as a Web App and use its `/exec` URL.
6. Put that `/exec` URL in `google-sheets-config.js` under `webAppUrl`.
7. Test saving one or more selected IPs and verify the `Work Items` sheet.

### Phase 5 validation status
- Code-level verification completed for multi-IP payload construction, selected engineer requirement, status/note fields, and Google Sheets endpoint wiring.
- The repository contains the Apps Script backend template, but it cannot be considered fully operational until the user deploys the script and configures the `/exec` URL.
- Live end-to-end Google Sheets validation remains pending.

## Phase 6 — Work History
Status: PLANNED

Every meaningful work action/status change is recorded as history. Latest state and historical activity are separate concepts.

## Phase 7 — Multi-user / Google Sheets Hardening
Status: PLANNED

Target:
- Approximately 5 simultaneous engineers.
- Shared persisted work data.
- No IP locking.
- Stable engineer IDs.
- Access and write behavior appropriate for the intended internal users.
- Google Sheets remains the persistence layer unless a later requirement justifies a database migration.

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
10. Google Sheets is the selected persistence layer for Work Tracking unless the roadmap is explicitly revised later.

# Detailed Change Log

## 2026-09-01 — Roadmap established
- Requirement freeze created for IP Repeat Analyzer and Engineer Work Tracking.
- Phase 0–9 defined.
- Flexible/non-locking engineer workflow defined.
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

## 2026-09-01 — Phase 2 implementation and validation
- Implemented Zone filter, search and Repeat Zero sorting integration.
- User performed live browser validation and confirmed Zone is visible and all Phase 2 interactions work correctly.
- Previously reported Zone display issue is considered resolved in `main`.
- Phase 2 marked COMPLETED.

## 2026-09-01 — Phase 3 implementation and validation
- Implemented Phase 3 Engineer Selection.
- Added per-row IP selection using a `Set` keyed by normalized IP.
- Added selected counter, Select All/Cancel All, and Clear controls.
- Preserved selection through render/filter/search/sort operations.
- Cleared selection when a new Excel file is processed.
- User completed live browser validation and confirmed the implementation is correct.
- Phase 3 marked COMPLETED.

## 2026-09-01 — Phase 4 implementation and validation
- Implemented local engineer identity catalog with stable IDs `ENG-001`–`ENG-005`.
- Added Engineer dropdown to the results header.
- Added state-based engineer selection and browser persistence using `localStorage`.
- Preserved existing analyzer and selection logic.
- User verified the feature in the browser and confirmed it works.
- Phase 4 marked COMPLETED.

## 2026-09-01 — Phase 5 persistence revision and implementation
- Revised Phase 5 to use Google Sheets instead of browser localStorage as the persistent Work Tracking store.
- Added `google-sheets-config.js` for the Apps Script `/exec` URL and optional request key.
- Added `google-apps-script/Code.gs` backend template for Work Items upsert.
- Updated `work-tracking.js` to send Work Items to the configured Apps Script endpoint instead of local browser storage.
- Updated the Work Tracking description to indicate Google Sheets persistence.
- Removed Supabase from the mandatory roadmap and changed Phase 7 to Google Sheets multi-user hardening.
- Phase 5 remains IN PROGRESS until the Apps Script is deployed, configured, and verified end-to-end in the browser and Google Sheet.

# Current Status

| Phase | Status |
|---|---|
| Phase 0 — Requirement Freeze | DONE |
| Phase 1 — IP Repeat Analyzer | DONE |
| Phase 2 — Filtering & Sorting | DONE — live browser validation confirmed by user |
| Phase 3 — Engineer Selection | DONE — live browser validation confirmed by user |
| Phase 4 — Engineer Identity | DONE — live browser validation confirmed by user |
| Phase 5 — Work Tracking + Google Sheets Persistence | IN PROGRESS — code implemented, Apps Script deployment/configuration and live end-to-end validation pending |
| Phase 6 — Work History | PLANNED |
| Phase 7 — Multi-user / Google Sheets Hardening | PLANNED |
| Phase 8 — Work Export | PLANNED |
| Phase 9 — Shift Report Integration | PLANNED |

Rule: before declaring a phase complete, record the phase, exact changes, reason, affected files, validation result, and remaining issues here.
