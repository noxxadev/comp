# COMP — Roadmap & Change Log

## Purpose
Fixed roadmap for the IP Repeat Analyzer and Engineer Work Tracking project.

The roadmap is executed phase-by-phase. Completed phases are not changed casually; fixes and new requirements are recorded in the change log. Existing application logic must not be modified unless explicitly agreed.

# Roadmap

## Phase 0 — Requirement Freeze
Status: DONE

- MinerPlus `.xlsx` is the current analysis input.
- Auto-detect and normalize the IP column.
- Validate IPv4 and count occurrences per unique IP.
- Use `master-data.js` for IP → Nama DC.
- Missing IP mapping: `Bukan IP DC`, Zona `-`.
- Zone rule: first letter after `GBE.` determines Line A–F.
- Core output: No | IP | Repeat Zero | Nama DC | Zona.

## Phase 1 — IP Repeat Analyzer
Status: COMPLETED / LOGIC FIXED

Implemented and hardened:
- Excel upload and IP column detection.
- IP normalization/validation and repeat counting.
- IP → Nama DC mapping.
- Zone derivation.
- Unique-IP result table.
- Repeat Zero sorting.
- `.xlsx` export.
- Safer BOM/whitespace header matching.
- Trimmed master-data values.
- Fixed `GBE.<letter>` zone parsing.
- Zone compatibility/safety layer.

## Phase 2 — Filtering & Sorting
Status: COMPLETED

Implemented and live-validated:
- All / Line A–F filters.
- Search by IP and Nama DC.
- Repeat Zero sorting.
- Combined search/filter/sort.
- Correct numbering after filtering.
- Phase 1 calculation logic preserved.

## Multi-IP Search Enhancement — IP Repeat Analyzer
Status: IMPLEMENTED — VALIDATION PENDING

Implemented:
- Search input accepts multiple IP addresses in one query.
- IPs may be separated by spaces, new lines, commas, or any combination of these separators.
- When the input consists entirely of valid IPv4 tokens, matching uses exact IP equality so a requested IP does not also match similarly prefixed IPs.
- A single Nama DC search remains supported using the existing search behavior.
- Zone filtering remains independent and unchanged.
- Existing IP counting, master-data mapping, selection, engineer and Work Tracking logic was not intentionally changed.

Examples of accepted multi-IP input:
- 10.1.1.11 10.1.1.12 10.1.1.13
- 10.1.1.11,10.1.1.12,10.1.1.13
- One IP per line.

Live validation required:
- Test multiple IPs separated by spaces.
- Test multiple IPs separated by new lines.
- Test comma-separated IPs.
- Confirm exact matching does not include similarly prefixed IPs.
- Confirm single Nama DC search still behaves as before.
- Confirm Zone filter still combines correctly with search.

## Phase 3 — Engineer Selection
Status: COMPLETED

Implemented and live-validated:
- Per-row selection checkbox.
- Select All / Batalkan Semua / Clear.
- Selected-IP counter.
- Multiple selection.
- Selection persists across filtering/search/sort.
- Selection resets on new Excel.
- No IP locking.

## Phase 4 — Engineer Identity
Status: COMPLETED

Implemented and live-validated:
- Dropdown-based engineer identity.
- Stable engineer IDs `ENG-001`–`ENG-005`.
- Display name separated from internal ID.
- Browser persistence through `localStorage` key `comp.selectedEngineerId`.
- Engineer selection does not alter analyzer logic.
- No password login or IP locking.

## Phase 5 — Work Tracking + Google Sheets Persistence
Status: COMPLETED

Current Work Items data:
- IP
- Nama DC
- Zona
- Repeat Zero
- Engineer ID
- Status
- Timestamp
- Catatan

Initial statuses:
- Belum Dikerjakan
- In Progress
- Selesai
- Problem
- Skipped

Architecture:
- GitHub Pages frontend → Google Apps Script Web App → Google Sheets.
- `google-sheets-config.js` contains only the deployed `/exec` URL and optional request key.
- `google-apps-script/Code.gs` is the backend template.
- `Work Items` is the current-state sheet.
- Save performs an upsert keyed by IP.
- IP is never locked.
- Supabase is not part of the mandatory architecture.

Save confirmation hardening:
- Replaced fire-and-forget `sendBeacon()` with awaited `fetch()`.
- Frontend validates Apps Script JSON response and `ok`.
- Frontend checks backend `saved` count before reporting success.

Validation completed 2026-09-03:
- Apps Script `/exec` returned `configured: true`.
- `doPost` completed successfully.
- Data appeared in `Work Tracking` → `Work Items`.
- Updating an existing IP changed that row and did not create a duplicate.
- Persistence and upsert behavior passed.

## Phase 6 — Machine Identity + Work History
Status: IN PROGRESS — Phase 6A COMPLETED, Phase 6B PARTIALLY LIVE-VALIDATED, Phase 6C VALIDATION PENDING, Phase 6D IMPLEMENTED / VALIDATION PENDING

### Primary goal
Build reliable machine history based on **Serial Number**, not IP and not `location_id` alone.

### Identity model
- **IP** = current/observed network address; may later be reused by another machine.
- **location_id** = physical location/slot; can retain the same value while the installed machine changes.
- **Serial Number** = physical-machine identity and preferred history key.

A valid lifecycle is:

`location_id → Serial A → machine removed/replaced → Serial B`

or:

`location_id → Serial A → machine removed without replacement → empty/unassigned`

Therefore, machine resolution for history must be time-aware.

### Separate Machine List source
Machine List is a separate input from the MinerPlus upload. Confirmed columns in the supplied structure include:
- `serial_number`
- `machine_type_name`
- `hashrate`
- `type_brand`
- `status`
- `install_status`
- `data_center_parent_name`
- `data_center_name`
- `storeroom_name`
- `rack`
- `row`
- `unit_no`
- `location_id`
- `power`
- `power_mode`
- `warranty_status`
- `warranty_date`
- `repair_warranty_status`
- `repair_warranty`
- `warranty_period_tollerance`
- `installed_date`
- `uninstalled_date`
- `opname_date`

### Phase 6A — Machine List import / reading / normalization
Status: COMPLETED — LIVE VALIDATION CONFIRMED

Purpose:
- Keep Machine List ingestion separate from MinerPlus analysis.
- Read `.xls` / `.xlsx` Machine List files.
- Detect the required Machine List columns without relying on fixed column positions.
- Normalize `serial_number` text.
- Normalize `location_id` text to uppercase and trim whitespace.
- Preserve `installed_date` and `uninstalled_date` values for later time-aware resolution.
- Ignore fully empty rows.
- Keep source row information for traceability.
- Store the normalized dataset locally in the browser under `comp.machineList.v1` so Phase 6B can consume the loaded dataset without changing the existing MinerPlus analyzer logic.
- Show a preview of the normalized dataset (up to the first 200 records).
- Allow the stored Machine List dataset to be cleared.

### Phase 6B — Time-aware location-to-machine resolution
Status: IMPLEMENTED — PARTIALLY LIVE-VALIDATED

Purpose:
Resolve the Serial Number occupying a `location_id` at a specific event timestamp without guessing.

Implemented components:
- `machine-resolver.js` provides the time-aware resolution engine.
- `machine-list.html` contains a Phase 6B resolution test interface.
- The resolver reads the normalized Machine List dataset from `comp.machineList.v1`.
- Matching uses exact normalized `location_id` equality.
- Installation/removal periods are evaluated as a half-open interval: `installed_date <= event_timestamp < uninstalled_date`.
- A blank `uninstalled_date` is treated as open-ended only when the value is genuinely blank.
- An unparseable non-blank `uninstalled_date` is not treated as open-ended.

### Phase 6C — Append-only Work History
Status: IMPLEMENTED — VALIDATION PENDING

`Work Items`
- Latest operational/current state.
- Existing Phase 5 IP-keyed upsert remains intact.

`Work History`
- Separate append-only event log in the same Google Spreadsheet.
- Each saved work event receives a unique `Event ID`.
- Serial Number is the preferred machine-history identity when Phase 6B resolves it.
- IP, Location ID and Nama DC are contextual snapshots.

### Phase 6D — History Viewer
Status: IMPLEMENTED — VALIDATION PENDING

Purpose:
Provide a dedicated read-only page for searching and reviewing append-only Work History.

## Phase 7 — Multi-user / Google Sheets Hardening
Status: PLANNED

## Phase 8 — Work Export
Status: PLANNED

## Phase 9 — Shift Report Integration
Status: PLANNED

# Security Roadmap

Purpose:
Protect internal COMP pages and data from unauthorized access while preserving the existing application logic.

Target architecture:

`User → Login Page → Authentication → Tools Hub/Internal Pages → Apps Script API → Google Sheets`

## Security Phase 1 — Simple Authentication
Status: COMPLETED — LIVE VALIDATION CONFIRMED

## Security Phase 2 — Page Protection
Status: COMPLETED — LIVE VALIDATION CONFIRMED

## Security Phase 3 — Apps Script / API Authentication
Status: PLANNED

## Security Phase 4 — Authorization & Roles
Status: PLANNED

## Security Phase 5 — Security Hardening & Final Audit
Status: PLANNED

# Detailed Change Log

## 2026-09-24 — Mobile header spacing adjustment
- Reduced mobile-only top spacing in the shared `index-hub.css` header area.
- Desktop header values were not changed.
- No JavaScript, business logic, sidebar behavior, hamburger dimensions, or hero structure was changed.

## 2026-09-24 — Shared authentication session across browser tabs
- Changed the client authentication storage from per-tab `sessionStorage` to shared `localStorage`.
- Existing server validation, login/logout behavior and session TTL were preserved.
- Live validation is required.

## 2026-09-24 — Tools Hub operational check workflows + draggable nodes
- Added the **IP Offline Workflow**: **IP Offline → IP Validator → Pool Vs Dashboard → Sub Account → Pool Vs Dashboard → Single Compare / Bulk Compare**.
- Added the **Cek IP Repeat Workflow**: **Machine List → IP Repeat Analyzer → Cek & Search IP → Save Pekerjaan (status wajib SELESAI) → Cleaning History**.
- Workflow nodes were made draggable on desktop/tablet and constrained inside their workflow canvas.
- Connector lines redraw as nodes move.
- Normal node clicks still navigate to the existing pages.
- No backend or business logic was changed.

## 2026-09-24 — Pool Vs Dashboard workflow spacing fix
- Reduced desktop workflow node width.
- Repositioned the Pool Vs Dashboard branch nodes to separate Single Compare and Bulk Compare.
- Adjusted tablet sizing consistently.
- Mobile workflow structure remained vertical.

## 2026-09-24 — Mobile workflow nodes made static
- Disabled node dragging at widths up to 780px.
- Mobile workflow nodes remain in the existing vertical arrangement and continue to work as normal links.
- Changed the mobile workflow canvas from `touch-action: none` to normal touch behavior so page scrolling is not blocked.
- Desktop/tablet dragging remains enabled.
- No workflow navigation, authentication, backend, or business logic was changed.


## 2026-09-27 — Work History >2,000 data plan revision
- Phase 1 audit confirmed that Work History currently returns the latest 2,000 events before Cleaning History applies Serial Number, Engineer, and Date filters in the browser.
- The plan was revised so the backend applies the relevant filters before the result limit.
- Planned backend filters: Serial Number, Engineer, and Date.
- Direct open keeps the existing default of today's date.
- Opening Cleaning History from an SN link keeps the date empty so history across dates can be found.
- Pagination remains a later phase only if a filtered result set itself becomes very large.
- No code or Google Sheet schema changes are part of this plan revision.

### Revised Work History >2,000 Plan
1. Phase 1 — Audit system: COMPLETED.
2. Phase 2 — Backend filtering: IMPLEMENTED — VALIDATION PENDING.
3. Phase 3 — Cleaning History integration: IMPLEMENTED — VALIDATION PENDING.
4. Phase 4 — Pagination / large filtered result: add only if required after Phase 2–3 validation.
5. Phase 5 — Performance: keep requests batched and avoid per-row API calls.
6. Phase 6 — Regression testing: verify direct open, SN history, Engineer search, old dates, and combined filters.

## 2026-09-27 — Work History backend filtering Phase 2
- Updated `google-apps-script/Code.gs` so `getWorkHistory` can filter by Serial Number, Engineer ID/name, and date before applying the result limit.
- The response `total` now represents the number of rows matching the active backend filters.
- The existing default limit remains 2,000; pagination is intentionally deferred until a filtered result set is proven to require it.
- No Cleaning History frontend behavior was changed in this phase, so existing browser-side behavior remains unchanged until Phase 3.
- Validation confirmed the backend filtering logic is present and the result limit is applied after filtering.
- Live Apps Script validation is still required.

## 2026-09-27 — Work History Cleaning History integration Phase 3
- Updated `cleaning-history.js` to send the active Serial Number, Engineer, and Date filters to the backend.
- Removed the previous client-side filtering dependency on the latest 2,000 downloaded events.
- Existing direct-open date behavior is preserved: when no SN is selected, the page defaults to today's date; an SN URL leaves the date empty.
- Existing rendering, statistics cards, filter UI, and refresh behavior were preserved.
- Validation confirmed the frontend now sends all three supported backend filters.
- Live end-to-end validation with records beyond event 2,000 is still required.

## 2026-09-27 — Work History Phase 4 deferred
- Phase 4 (Pagination / large-result handling) is deferred because backend filtering now searches the full Work History before applying the 2,000-row response limit.
- No application code was changed for this decision.
- Pagination can be revisited if a single filter eventually produces more than 2,000 matching events.

# Current Status

| Phase | Status |
|---|---|
| Phase 0 — Requirement Freeze | DONE |
| Phase 1 — IP Repeat Analyzer | DONE |
| Phase 2 — Filtering & Sorting | DONE — live validation confirmed |
| Phase 3 — Engineer Selection | DONE — live validation confirmed |
| Phase 4 — Engineer Identity | DONE — live validation confirmed |
| Phase 5 — Work Tracking + Google Sheets Persistence | DONE — end-to-end validation and upsert verified |
| Phase 6 — Machine Identity + Work History | IN PROGRESS |
| Phase 7 — Multi-user / Google Sheets Hardening | PLANNED |
| Phase 8 — Work Export | PLANNED |
| Phase 9 — Shift Report Integration | PLANNED |

## Security Status

| Security Phase | Status |
|---|---|
| Security Phase 1 — Simple Authentication | COMPLETED — live validation confirmed |
| Security Phase 2 — Page Protection | COMPLETED — live validation confirmed |
| Security Phase 3 — Apps Script / API Authentication | PLANNED |
| Security Phase 4 — Authorization & Roles | PLANNED |
| Security Phase 5 — Security Hardening & Final Audit | PLANNED |

Rule: before declaring a phase complete, record the exact changes, affected files, validation result and remaining issues here.
