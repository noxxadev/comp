# COMP — Roadmap & Change Log

## Purpose
Fixed roadmap for the IP Repeat Analyzer and Engineer Work Tracking project.

The roadmap is executed phase-by-phase. Completed phases are not changed casually; fixes and new requirements are recorded in the change log. Existing application logic must not be modified unless explicitly agreed.

# Roadmap

## Phase 0 — Requirement Freeze
- MinerPlus `.xlsx` is the current analysis input.
- Auto-detect and normalize the IP column.
- Validate IPv4 and count occurrences per unique IP.
- Use `master-data.js` for IP → Nama DC.
- Missing IP mapping: `Bukan IP DC`, Zona `-`.
- Zone rule: first letter after `GBE.` determines Line A–F.
- Core output: No | IP | Repeat Zero | Nama DC | Zona.

## Phase 1 — IP Repeat Analyzer
Status: COMPLETED / LOGIC FIXED

Implemented:
- Excel upload and IP column detection.
- IP normalization/validation and repeat counting.
- IP → Nama DC mapping.
- Zone derivation.
- Unique-IP result table.
- Repeat Zero sorting.
- `.xlsx` export.

Hardening:
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

Affected files include `engineer-data.js`, `ip-repeat-analyzer.html`, `ip-repeat-analyzer.js`, and `ip-repeat-analyzer.css`.

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
- Updating an existing IP changed the existing row and did not create a duplicate.
- Persistence and upsert behavior passed.

## Phase 6 — Machine Identity + Work History
Status: PLANNED

### Primary goal
Build a reliable machine history based on **Serial Number**, not IP and not `location_id` alone.

### Identity model
- **IP** = current/observed network address; may be reused by another machine.
- **location_id** = physical location/slot; may keep the same value while the machine occupying it changes.
- **Serial Number** = physical-machine identity and the preferred history key.

### Separate Machine List source
Machine List is a separate input from the MinerPlus upload and includes, among others:
- `serial_number`
- `location_id`
- `installed_date`
- `uninstalled_date`
- `opname_date`
- rack/row/unit and other location information.

The sample structure confirmed on 2026-09-03 contains these columns and demonstrates that the source can provide both Serial Number and location/time context.

### Critical mapping rule
`location_id` is a **location/slot identifier**, not a permanent machine identifier.

A location can have this lifecycle:

`location_id → Serial A → machine removed/replaced → Serial B`

or:

`location_id → Serial A → machine removed without replacement → empty/unassigned`

Therefore, mapping must be **time-aware**.

For a work event, the intended resolution is:

`Nama DC → relevant location_id → machine occupying that location at event time → Serial Number`

The Machine List's `installed_date` / `uninstalled_date` (or equivalent valid timing data) should be used when determining the historical occupant.

Rules:
- Never assume the current Serial Number was always the historical Serial Number of that location.
- Never carry forward an old Serial Number after a location becomes unassigned.
- Never guess a Serial Number when the Machine List cannot resolve it.
- If a match is ambiguous or missing, record the event as unresolved and expose that state to the user.
- IP remains a historical snapshot/context field and must not be the machine-history key.

### Source separation
- MinerPlus remains the source for current IP/repeat analysis.
- Machine List is used to enrich work records with machine identity.
- Machine List must not replace or alter existing MinerPlus IP analysis logic.
- Existing `master-data.js` IP → Nama DC logic remains intact.

### Work data model
Current Work Items remains the Phase 5 current-state store.

History events should carry:
- Serial Number (primary machine identity when resolved)
- IP observed at the event
- Nama DC / location context
- Zona
- Engineer ID
- Status
- Timestamp
- Catatan
- Resolution/unresolved state as needed

### Save flow
1. Upload MinerPlus result.
2. Existing IP analysis and selection operate unchanged.
3. Selected row provides IP + Nama DC.
4. Resolve location context from Nama DC.
5. Resolve the machine occupying that location at the work-event time.
6. Attach the matching Serial Number when valid.
7. Update current `Work Items` using existing Phase 5 behavior.
8. Append a new `Work History` event instead of overwriting historical events.

### Sheets
`Work Items`
- Latest operational/current state.
- Existing Phase 5 IP-keyed upsert remains intact unless explicitly revised later.

`Work History`
- Append-only events.
- Serial Number is the preferred machine-history identity.
- IP and location/Nama DC are contextual snapshots.
- Replacement/removal must produce separate machine histories.

Example:
- `SN-A | IP-1 | GBE.A01 | In Progress | 2026-09-03 10:00`
- `SN-A | IP-2 | GBE.A01 | Problem | 2026-09-10 14:00`
- `SN-B | IP-2 | GBE.A01 | Selesai | 2026-09-11 18:00`

The same IP or location can therefore appear with different Serial Numbers across time.

### Phase 6 stages
- **6A** — Machine List import/reading and normalization.
- **6B** — Time-aware location-to-machine resolution and Serial Number enrichment.
- **6C** — Append-only `Work History` persistence in Google Sheets.
- **6D** — History viewer/search by Serial Number with IP, Nama DC/location, Engineer, Status and date as context/filter fields.

### Phase 6 validation requirements
Before Phase 6 is marked complete:
- Same location before/after machine replacement resolves to different correct Serial Numbers.
- Location with machine removed and no replacement becomes unassigned, not the previous Serial Number.
- Reused IP does not merge different machines' histories.
- Old machine history remains attached to the old Serial Number after replacement.
- Missing/ambiguous Machine List resolution is visible and never guessed.
- Phase 5 current Work Items upsert behavior remains unchanged.

## Phase 7 — Multi-user / Google Sheets Hardening
Status: PLANNED

Target:
- Approximately 5 simultaneous engineers.
- Shared persisted work data.
- No IP locking.
- Stable engineer IDs.
- Appropriate internal-user access/write behavior.
- Google Sheets remains the persistence layer unless explicitly revised.
- Serial Number is the historical machine identity after Phase 6.

## Phase 8 — Work Export
Status: PLANNED

Analysis export:
`No | IP | Repeat Zero | Nama DC | Zona`

Work export:
`No | IP | Serial Number | Repeat Zero | Nama DC | Zona | Engineer | Status | Waktu | Catatan`

## Phase 9 — Shift Report Integration
Status: PLANNED

Future Shift Report can use history for:
- Machine/Serial Number worked per shift.
- IP observed during the event.
- Location/Nama DC at the event time.
- Completed / In Progress / Problem counts.
- Work by Line A–F.
- Work by engineer.
- Outstanding machines/work items.

# Fixed Architecture Rules
1. Existing application logic must remain unchanged unless explicitly agreed.
2. Each phase is tested before moving to the next.
3. No IP locking.
4. Engineer identity is initially dropdown-based.
5. Google Sheets is the selected Work Tracking persistence layer unless explicitly revised.
6. IP is an operational attribute, not a permanent physical-machine identity.
7. `location_id` identifies a location/slot, not a permanent machine.
8. Serial Number is the preferred identity for physical-machine history.
9. Machine List is a separate source from MinerPlus input.
10. Machine-to-location resolution must account for replacement/removal over time.
11. Unresolved identity must never be replaced with a guessed Serial Number.
12. Every implementation/change must be recorded in this README.

# Detailed Change Log

## 2026-09-01 — Roadmap established
- Requirement freeze and Phase 0–9 roadmap created.
- Non-locking engineer workflow defined.
- Zone rule fixed to `GBE.<letter>`.

## 2026-09-01 — Phase 1 hardening
- Improved Excel header normalization.
- Improved master-data normalization.
- Preserved unique-IP counting and mapping behavior.
- Confirmed zone derivation rule.

## 2026-09-01 — Sidebar maintenance
- Shared sidebar navigation/hover/icon/theme UI refinements.
- No application logic intentionally changed.

## 2026-09-01 — Phase 2 implementation and validation
- Added Zone filter, search and Repeat Zero sorting integration.
- User live-validated Zone display, filters, search, sorting and numbering.
- Phase 2 marked COMPLETED.

## 2026-09-01 — Phase 3 implementation and validation
- Added per-row selection, Select All/Cancel All, Clear and selected counter.
- Preserved selection across filtering/search/sort.
- User live-validated behavior and Phase 3 marked COMPLETED.

## 2026-09-01 — Phase 4 implementation and validation
- Added stable engineer IDs and dropdown-based identity.
- Added browser persistence for selected engineer.
- User live-validated behavior and Phase 4 marked COMPLETED.

## 2026-09-01 — Phase 5 persistence revision and implementation
- Changed persistent Work Tracking storage from browser localStorage to Google Sheets via Google Apps Script.
- Added `google-sheets-config.js` and backend `google-apps-script/Code.gs`.
- Implemented IP-keyed Work Items upsert.
- Removed Supabase from the mandatory roadmap.

## 2026-09-01 — Phase 5 save confirmation hardening
- Replaced `sendBeacon()` with awaited `fetch()`.
- Added backend JSON/`ok` validation and saved-count verification.

## 2026-09-03 — Phase 5 final validation and completion
- User verified Apps Script configuration and successful `doPost` execution.
- User verified `Work Items` persistence.
- User verified updates do not create duplicate IP rows.
- Phase 5 marked COMPLETED.

## 2026-09-03 — Serial Number / Machine List requirement clarified
- Added Machine List as a separate source for machine identity.
- Confirmed `location_id` can keep the same value while Serial Number changes after machine replacement.
- Confirmed a location can become empty/unassigned after machine removal without replacement.
- Revised Phase 6 so `location_id` is treated as a location/slot, not a permanent machine ID.
- Revised Serial Number resolution to be time-aware using Machine List occupancy timing where available.
- Added validation rules for replacement, removal, reused IP, ambiguous/missing matches and unresolved history.

# Current Status

| Phase | Status |
|---|---|
| Phase 0 — Requirement Freeze | DONE |
| Phase 1 — IP Repeat Analyzer | DONE |
| Phase 2 — Filtering & Sorting | DONE — live validation confirmed |
| Phase 3 — Engineer Selection | DONE — live validation confirmed |
| Phase 4 — Engineer Identity | DONE — live validation confirmed |
| Phase 5 — Work Tracking + Google Sheets Persistence | DONE — end-to-end validation and upsert verified |
| Phase 6 — Machine Identity + Work History | PLANNED — time-aware Serial Number mapping required |
| Phase 7 — Multi-user / Google Sheets Hardening | PLANNED |
| Phase 8 — Work Export | PLANNED |
| Phase 9 — Shift Report Integration | PLANNED |

Rule: before declaring a phase complete, record the exact changes, affected files, validation result and remaining issues here.
