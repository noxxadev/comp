# COMP — Machine Cleaning Tracker Roadmap

## Purpose

This document is the **current/frozen roadmap** for the Machine Cleaning Tracker project.

The objective is to identify machines that need cleaning, prioritize them from MinerPlus zero-hashrate frequency, resolve their physical location and Serial Number, and prevent repeated cleaning of the same physical machine without visibility of its previous cleaning history.

> **Important:** This roadmap replaces the previous Phase 6A–6G Machine Identity roadmap. The old Phase 6 plan is not used for the current implementation.

---

# Core Data Flow

```text
MinerPlus
   ↓
IP + Repeat Zero
   ↓
master-data.js
   ↓
Location / Nama DC
   ↓
Google Sheets — Machine List Current
   ↓
Serial Number (SN)
   ↓
Cleaning History
   ↓
Cleaning Count
```

## Identity Rules

| Data | Meaning | Role |
|---|---|---|
| IP | Current network address | Operational observation |
| Location | Physical machine location/slot | Lookup reference |
| Serial Number | Physical machine identity | Main cleaning-history identity |
| Repeat Zero | Zero-hashrate frequency | Cleaning priority signal |
| Machine List Current | Current machine snapshot | Temporary/current state |
| Cleaning History | Completed cleaning events | Permanent history |

**Serial Number is the preferred identity for a physical machine.** IP and Location must never be treated as permanent machine identity.

---

# Phase 1 — MinerPlus Analysis

**Status: EXISTING / LOGIC FIXED**

Keep the current working logic unchanged.

- Read MinerPlus `.xlsx/.xls` input.
- Detect and normalize the IP column.
- Validate IPv4 values.
- Count occurrences / Repeat Zero per unique IP.
- Sort by Repeat Zero descending.
- Use the existing output structure.

**Rule:** No unnecessary changes to the existing analyzer logic.

---

# Phase 2 — IP → Location

**Status: EXISTING / LOGIC FIXED**

Use the existing `master-data.js` mapping:

```text
IP → Nama DC / Location
```

Confirmed rule:

- `master-data.js` location name matches Machine List `location_id`.
- `master-data.js` must not be changed for this roadmap unless explicitly agreed.

---

# Phase 3 — Machine List Upload

**Status: IMPLEMENTED / USER VALIDATION PENDING**

## Objective

Provide a dedicated Machine List upload and validation function without changing the existing MinerPlus analyzer.

## Required Machine List columns

Minimum required fields:

- `serial_number`
- `location_id`

The Machine List may also contain other operational fields. `installed_date` and `uninstalled_date` are supported when present, but are **optional** for Phase 3.

## Phase 3 implementation

Implemented in `machine-list.js` only.

Changes made:

1. `serial_number` is required.
2. `location_id` is required.
3. `installed_date` is optional.
4. `uninstalled_date` is optional.
5. Header detection remains alias-based and is not tied to fixed column positions.
6. Existing text normalization is preserved.
7. Existing `location_id` normalization to uppercase is preserved.
8. Fully empty rows continue to be ignored.
9. Existing preview, localStorage persistence, clear-data action, and public `window.CompMachineList` API are preserved.
10. `ip-repeat-analyzer.js` was not modified.

## Phase 3 does NOT do yet

- No Google Sheets replacement.
- No Cleaning History.
- No Cleaning Count.
- No integration into the MinerPlus result table.
- No modification of existing MinerPlus calculation logic.

## Phase 3 success criteria

A valid Machine List containing at least `serial_number` and `location_id` can be uploaded and previewed in the browser, even when the two date columns are absent.

An invalid file missing either required column is rejected clearly.

## Validation to perform

User should test at least:

- `.xlsx` containing `serial_number` + `location_id` only.
- `.xlsx` containing all four known columns.
- `.xls` containing the two required columns.
- Invalid spreadsheet missing `serial_number`.
- Invalid spreadsheet missing `location_id`.
- Confirm existing preview and localStorage behavior still work.

Phase 3 will be marked **COMPLETED** after user confirms these tests pass.

---

# Phase 4 — Machine List Temporary Database

**Status: PLANNED**

Google Sheets will be used as the shared temporary database for the current Machine List.

## Sheet

`Machine List Current`

## Replacement strategy

**Option A — Delete & Insert**

```text
Upload new Machine List
        ↓
Validate completely
        ↓
If valid:
  delete old Machine List Current
  insert new Machine List
        ↓
New snapshot becomes active
```

If validation fails:

```text
Keep old Machine List Current unchanged
```

This validation-before-delete rule is mandatory so a bad upload cannot leave the shared database empty.

## Important

- Do not append new Machine List snapshots.
- The sheet represents only the current/realtime Machine List.
- The old snapshot is discarded after a valid replacement.
- Cleaning History must never be deleted when Machine List is replaced.

Optional metadata:

- `machine_list_updated_at`
- `machine_list_row_count`

---

# Phase 5 — Shared Machine List Loading

**Status: PLANNED**

All users read the same current Machine List from Google Sheets.

Target usage:

- Approximately 5 engineers/users.
- No need for each engineer to upload the same Machine List separately.
- Browser cache/localStorage may be used as a cache, but Google Sheets remains the source of truth.
- A newly uploaded Machine List becomes active for all users after they reload/read the current data.

---

# Phase 6 — IP → Location → Serial Number

**Status: PLANNED**

Combine the existing MinerPlus result with the shared Machine List.

```text
MinerPlus IP
    ↓
master-data.js
    ↓
Location
    ↓
Machine List Current.location_id
    ↓
serial_number
```

Example:

```text
IP: 10.10.10.25
Repeat Zero: 17
Location: GBE.A05
Serial Number: SN001234
```

## Identity rule

Never merge machine identity by IP alone.

If an IP/location is later used by another physical machine, its new Serial Number must represent a different machine in history.

---

# Phase 7 — Cleaning History

**Status: PLANNED**

Create a permanent append-only cleaning history.

Suggested fields:

```text
Timestamp
Serial Number
IP
Location
Worker
```

Each cleaning action creates a new event.

Machine List replacement must not remove or rewrite historical cleaning events.

---

# Phase 8 — Cleaning Count

**Status: PLANNED**

Calculate how many times each physical machine has been cleaned using Serial Number.

Example:

```text
SN001234 → 3 cleaning events
```

Target display:

```text
IP | Repeat Zero | Location | SN | Cleaning Count
```

This directly addresses the original problem of workers repeatedly cleaning the same machine without knowing its previous cleaning count.

---

# Phase 9 — Cleaning Action

**Status: PLANNED**

Allow an engineer to select a prioritized machine and record the cleaning action.

Record at minimum:

```text
Serial Number
IP
Location
Worker
Timestamp
```

The event is appended to Cleaning History.

Cleaning Count then updates automatically from the history.

---

# Phase 10 — Multi-user

**Status: PLANNED**

Target approximately 5 simultaneous users.

Requirements:

- Shared Machine List.
- Shared Cleaning History.
- Different workers can record cleaning events.
- No IP locking.
- Stable engineer identity.
- Avoid duplicate history events and race-condition issues where practical.
- A new valid Machine List replaces the current shared snapshot.

---

# Final Architecture

```text
MinerPlus
   ↓
IP Repeat Analyzer
   ↓
master-data.js
   ↓
Google Sheets: Machine List Current
   ↓
Serial Number
   ↓
Cleaning History
   ↓
Cleaning Count
```

## Google Sheets data categories

### Machine List Current

- Current/realtime snapshot.
- Replaced entirely when a new valid Machine List is uploaded.
- Temporary operational data.

### Cleaning History

- Permanent event history.
- Append-only.
- Never deleted when Machine List is replaced.
- Identity based primarily on Serial Number.

---

# Implementation Order

```text
Phase 1  → Existing / Fixed
Phase 2  → Existing / Fixed
Phase 3  → Machine List Upload
Phase 4  → Machine List Google Sheets
Phase 5  → Shared Machine List
Phase 6  → IP → Location → SN
Phase 7  → Cleaning History
Phase 8  → Cleaning Count
Phase 9  → Cleaning Action
Phase 10 → Multi-user Hardening
```

Every phase must be tested before the next phase is implemented.

---

# Fixed Architecture Rules

1. Existing working logic must not be changed unless explicitly agreed.
2. MinerPlus analysis remains the priority source for identifying machines requiring attention.
3. `master-data.js` remains the IP → Location mapping source.
4. Machine List is a separate source from MinerPlus.
5. Machine List contains the current/realtime machine state.
6. Google Sheets is the selected shared persistence layer for this workflow unless explicitly revised.
7. Machine List replacement uses **validate first, then delete old snapshot and insert new snapshot**.
8. Machine List snapshots are not appended as historical snapshots.
9. Cleaning History is separate from Machine List Current.
10. Cleaning History is append-only.
11. IP is not a permanent machine identity.
12. Location is not a permanent machine identity.
13. Serial Number is the preferred physical-machine identity.
14. No IP locking.
15. No guessed Serial Number when lookup data is missing or invalid.
16. A Machine List replacement must never delete Cleaning History.
17. Each phase is validated before proceeding to the next.
18. Every implementation must be recorded in this roadmap/change log.

---

# Change Log

## 2026-09-04 — Phase 3 implementation

**Change:** Updated `machine-list.js` so Phase 3 requires only `serial_number` and `location_id`.

**Optional fields:** `installed_date` and `uninstalled_date` remain supported when present but are no longer required.

**Preserved behavior:** File type validation, header scanning, normalization, empty-row handling, preview, localStorage storage, clear action, and `CompMachineList` API remain intact.

**Scope protection:** `ip-repeat-analyzer.js`, `master-data.js`, and the existing MinerPlus calculation logic were not changed.

**Commit:** `5163c81a8251fe0bdb3f693e69229b54f4713de3`

**Status:** Implementation complete; user validation required before Phase 3 is marked completed.

## 2026-09-04 — New Machine Cleaning Tracker Roadmap

**Change:** Replaced the previously proposed Phase 6A–6G direction with a new roadmap focused specifically on the machine cleaning workflow.

**Reason:** The project objective is machine cleaning optimization, using MinerPlus Repeat Zero as the priority signal and Serial Number as the physical-machine identity.

**New architecture:**

`MinerPlus → master-data.js → Machine List Current → Serial Number → Cleaning History → Cleaning Count`

**Important decisions recorded:**

- Machine List is a realtime/current snapshot.
- Machine List is uploaded manually because no API is available.
- Google Sheets is used as the shared temporary Machine List database.
- New Machine List uses validated Delete & Insert replacement.
- `serial_number` + `location_id` are the required Machine List fields for the immediate workflow.
- `master-data.js` location names are compatible with Machine List `location_id`.
- Cleaning History is permanent and append-only.
- Serial Number is the preferred machine identity.
- Approximately 5 users are expected.
- Supabase is not required for this architecture.

**Implementation status:** Phase 3 code implemented; user validation pending.
