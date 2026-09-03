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

The supplied Notion representation confirms the normal Machine List structure. A malformed third sample row was identified as an export-data bug; the normal schema is represented by the correctly aligned rows, and the parser must not silently repair or shift malformed data.

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

New Phase 6A files:
- `machine-list.html`
- `machine-list.css`
- `machine-list.js`

Realtime snapshot rule:
- Each newly processed Machine List replaces the active local dataset under `comp.machineList.v1`.
- The active Machine List cache must represent one current/realtime snapshot, not an appended collection of old snapshots.
- Replacing the active snapshot does not delete any append-only `Work History` events already stored in Google Sheets.

Live validation completed 2026-09-03:
- User confirmed `machine-list.html` successfully reads Serial Number, Location ID, Installed Date and Uninstalled Date from the real Machine List file used operationally.
- Phase 6A is therefore considered complete.

Phase 6A does **not** yet:
- Persist machine history to Google Sheets.
- Replace the Phase 5 Work Items schema.
- Merge IP into machine identity.

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
- An unparseable non-blank `uninstalled_date` is not treated as open-ended, preventing unsafe identity guesses.

Resolution outcomes:
- Exactly 1 match → `RESOLVED` and return Serial Number.
- 0 matches → `UNRESOLVED`.
- More than 1 match → `AMBIGUOUS` and no Serial Number is returned.
- Missing Location ID → `MISSING LOCATION`.
- Invalid event timestamp → `INVALID TIME`.

Rules:
- Never assume the current Serial Number was always the historical Serial Number of a location.
- Never carry forward an old Serial Number after a location becomes unassigned.
- Never guess a Serial Number when the Machine List cannot resolve it.
- Ambiguous or missing resolution must remain explicitly unresolved.
- Reused IP must never merge different machines' histories.

Live validation completed 2026-09-03:
- User successfully tested a currently occupied Location ID and confirmed that the resolver returns the expected Serial Number.
- User successfully tested a timestamp after the machine's `uninstalled_date` and confirmed that the resolver returns an unresolved result rather than incorrectly carrying forward the machine identity.
- The historical replacement scenario could not be directly tested from the current operational Machine List because the Machine List is a **realtime snapshot**, not a historical dataset. A single current Machine List file therefore does not contain both the old and replacement Serial Numbers for a location that has already changed machines.
- This is a data-source limitation, not a failed resolver test.
- The replacement scenario remains a validation item for when historical Machine List records become available, or when sufficient Work History has been accumulated by the application itself.

Important data-source clarification:
- Machine List represents the current/realtime machine state.
- Machine List should not be treated as a permanent historical record of every machine previously occupying a location.
- Historical machine identity must progressively be captured by the application's append-only Work History once Phase 6C is implemented.
- Until historical evidence exists, the resolver must continue to return unresolved/ambiguous rather than invent a previous Serial Number.

Phase 6B intentionally does **not** yet write Serial Number into Google Sheets. This kept resolution validation separate from Phase 6C persistence and protected the already-validated Phase 5 Work Items behavior.

### Phase 6C — Append-only Work History
Status: IMPLEMENTED — VALIDATION PENDING

`Work Items`
- Latest operational/current state.
- Existing Phase 5 IP-keyed upsert remains intact.
- Updating an IP continues to replace the current-state row rather than create a duplicate.

`Work History`
- Separate append-only event log in the same Google Spreadsheet.
- Each saved work event receives a unique `Event ID`.
- Serial Number is the preferred machine-history identity when Phase 6B resolves it.
- IP, Location ID and Nama DC are contextual snapshots and are never used as the historical identity key.
- `Resolution Status` and `Resolution Message` preserve unresolved/ambiguous identity instead of guessing.
- History events are appended and are not updated by IP.

History schema:
`Event ID | Timestamp | IP | Serial Number | Location ID | Nama DC | Zona | Repeat Zero | Engineer ID | Status | Catatan | Resolution Status | Resolution Message | Source`

Save flow:
1. Existing Phase 5 `Work Items` upsert runs first.
2. The same work payload is converted into append-only history events.
3. Phase 6B resolver determines Serial Number using the saved event timestamp and local Machine List cache.
4. A resolved event stores Serial Number; unresolved/ambiguous/missing-location cases remain explicit.
5. History events are appended to `Work History`.
6. Failure of the history append does not invalidate the already-successful `Work Items` save. The frontend logs the history failure; partial history saves are also reported by the backend response for diagnostics.

Backend safeguards:
- `appendWorkHistory` is a separate Apps Script action and does not change `upsertWorkItems` semantics.
- Event IDs are checked to avoid duplicate append of the same event.
- Apps Script uses a script lock around history append operations to reduce concurrent-write collisions.
- The repository `Code.gs` remains a template; the deployed Apps Script copy must be updated and redeployed before live 6C validation.

Validation required before Phase 6C is complete:
- Updated Apps Script is deployed and reachable through the existing `/exec` URL.
- Saving one selected IP creates one row in `Work History`.
- Saving the same IP again creates a **new history event** rather than updating the previous history row.
- A resolvable Location ID stores the expected Serial Number.
- An unresolved/ambiguous Location ID keeps Serial Number blank and preserves the resolution state/message.
- Phase 5 `Work Items` still upserts by IP without duplicate current-state rows.

### Phase 6D — History Viewer
Status: IMPLEMENTED — VALIDATION PENDING

Purpose:
Provide a dedicated read-only page for searching and reviewing append-only Work History without changing historical rows.

Implemented components:
- `history-viewer.html` provides the Work History page and shared COMP navigation.
- `history-viewer.css` provides responsive filtering/table styles.
- `history-viewer.js` loads history from the Apps Script endpoint and performs client-side filtering.
- Search is primarily centered on Serial Number, with IP, Location ID/Nama DC, Engineer, Status and date range as additional filters.
- History is displayed newest-first based on the append order returned by the backend.
- Resolution state and resolution message are visible so unresolved/ambiguous identity is not hidden.
- `index.html` now exposes Work History in the Tools Hub.
- `machine-list.html` now links to Work History from the shared sidebar.

Backend read endpoint:
- `doGet` now supports `action=getWorkHistory`.
- The endpoint reads from `Work History` only and returns up to 5,000 events per request, with the viewer requesting 2,000 by default.
- The backend does not update, merge or rewrite history rows.
- Existing `doPost` behavior for Phase 5 and Phase 6C remains separate.

Phase 6D validation required:
- Redeploy the updated Apps Script `Code.gs`.
- Open `history-viewer.html` through GitHub Pages.
- Confirm existing Work History events load successfully.
- Confirm Serial Number filtering returns only the expected machine history.
- Confirm additional IP/location/engineer/status/date filters work.
- Confirm unresolved/ambiguous events remain visible with blank Serial Number where appropriate.
- Confirm opening or refreshing the viewer does not modify the Google Sheet.

### Phase 6 validation requirements
Before Phase 6 is marked complete:
- Same location before/after replacement resolves to the correct different Serial Numbers when historical source data is available.
- A removed machine with no replacement results in an unassigned state.
- Reused IP does not merge different machines.
- Old machine history stays attached to the old Serial Number once history is captured.
- Missing/ambiguous Machine List resolution is visible and never guessed.
- Phase 5 current Work Items upsert behavior remains unchanged.
- Phase 6C and Phase 6D live validations are completed.

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
13. Phase 6A local browser storage is an intermediate Machine List cache only; it is not the final Work Tracking persistence layer.
14. Machine List export anomalies must not be silently corrected by shifting values between columns.
15. Phase 6B resolution must remain separate from Phase 6C persistence until resolution is live-validated.
16. Machine List realtime snapshots must not be assumed to contain complete historical replacement data.
17. Work History is append-only; historical events must not be updated or merged by IP.
18. Every Work History event requires a unique Event ID; duplicate Event IDs must not create duplicate history rows.
19. The active Machine List browser cache represents one realtime snapshot; a newer upload replaces the previous active snapshot.
20. Work History is never deleted as a side effect of replacing the active Machine List snapshot.
21. Phase 6D is read-only with respect to Work History; the viewer must never mutate historical rows.

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
- Revised Serial Number resolution to be time-aware using Machine List occupancy timing.
- Added validation rules for replacement, removal, reused IP, ambiguous/missing matches and unresolved history.

## 2026-09-03 — Phase 6A implementation
- Added `machine-list.html` as a dedicated Machine List ingestion page.
- Added `machine-list.css` for the Phase 6A UI.
- Added `machine-list.js` for `.xls/.xlsx` reading, header detection, normalization and dataset preview.
- Required fields for the Phase 6A parser: `serial_number`, `location_id`, `installed_date`, `uninstalled_date`.
- Normalized Serial Number and location values and preserved installation/removal date values for future time-aware mapping.
- Added browser storage key `comp.machineList.v1` as an intermediate local dataset cache for Phase 6B.
- Added dataset clear control and persistent dataset status.
- User live-validated the real Machine List import and confirmed Serial Number, Location ID, Installed Date and Uninstalled Date are read correctly.
- Phase 6A marked COMPLETED.
- No MinerPlus analyzer logic or Phase 5 Work Items behavior was intentionally modified.

## 2026-09-03 — Phase 6B implementation
- Added `machine-resolver.js` as a separate time-aware location-to-machine resolution engine.
- Implemented exact normalized `location_id` matching.
- Implemented installation/removal interval matching using `installed_date <= event_timestamp < uninstalled_date`.
- Implemented explicit `resolved`, `unresolved`, `ambiguous`, missing-location and invalid-time outcomes.
- Prevented unparseable non-blank `uninstalled_date` values from being treated as open-ended.
- Added a Phase 6B test interface to `machine-list.html` so resolution can be live-validated without changing Phase 5 persistence.
- Added responsive styling for the Phase 6B test interface in `machine-list.css`.
- Phase 6B implementation is complete and has passed the currently testable realtime-data scenarios.

## 2026-09-03 — Phase 6B live validation update
- User confirmed successful resolution for a Location ID that is currently occupied by a machine.
- User confirmed successful unresolved behavior for a Location ID queried at a timestamp after its `uninstalled_date`.
- User could not test the machine-replacement scenario because the operational Machine List is a realtime snapshot and does not retain the previous machine in the same file after replacement.
- Recorded this as a data-source limitation rather than a resolver failure.
- Confirmed that the replacement scenario must not be simulated by guessing historical data.
- Clarified that append-only Work History in Phase 6C will become the application's own historical evidence for machine identity going forward.
- Phase 6B remains partially live-validated; Phase 6C is the next implementation stage.

## 2026-09-03 — Phase 6C implementation
- Extended `google-apps-script/Code.gs` with a separate `Work History` sheet and `appendWorkHistory` action.
- Preserved the existing `Work Items` upsert path and schema.
- Added append-only history fields for Event ID, event context, Serial Number and resolver status/message.
- Added Event ID de-duplication and a script lock around history append operations.
- Updated `work-tracking.js` so successful Work Items saves also attempt to append Work History events.
- Integrated the Phase 6B resolver into history enrichment using the event timestamp.
- Added explicit handling for resolved, unresolved, ambiguous and missing-location history states.
- Updated `ip-repeat-analyzer.html` to load `machine-resolver.js` before `work-tracking.js` and refreshed the cache-buster.
- Removed the temporary Phase 6C placeholder file created during implementation.
- Phase 6C implementation is complete, but live validation remains required before Phase 6C is considered complete.

## 2026-09-04 — Phase 6D implementation
- Added `history-viewer.html` as a dedicated read-only Work History viewer.
- Added `history-viewer.js` for loading up to 2,000 events and filtering by Serial Number, IP, Location ID/Nama DC, Engineer, Status and date range.
- Added `history-viewer.css` for responsive filter controls, table layout and resolution badges.
- Added `getWorkHistory` to `google-apps-script/Code.gs` as a read-only `doGet` action.
- The backend returns history newest-first and caps a single request at 5,000 events.
- Added Work History to the Tools Hub and the Machine List sidebar navigation.
- Viewer does not write to or modify Work History.
- Phase 6D implementation is complete; live validation is pending Apps Script redeployment and user verification.

# Current Status

| Phase | Status |
|---|---|
| Phase 0 — Requirement Freeze | DONE |
| Phase 1 — IP Repeat Analyzer | DONE |
| Phase 2 — Filtering & Sorting | DONE — live validation confirmed |
| Phase 3 — Engineer Selection | DONE — live validation confirmed |
| Phase 4 — Engineer Identity | DONE — live validation confirmed |
| Phase 5 — Work Tracking + Google Sheets Persistence | DONE — end-to-end validation and upsert verified |
| Phase 6 — Machine Identity + Work History | IN PROGRESS — Phase 6A completed, Phase 6B partially live-validated, Phase 6C and 6D live validation pending |
| Phase 7 — Multi-user / Google Sheets Hardening | PLANNED |
| Phase 8 — Work Export | PLANNED |
| Phase 9 — Shift Report Integration | PLANNED |

Rule: before declaring a phase complete, record the exact changes, affected files, validation result and remaining issues here.
