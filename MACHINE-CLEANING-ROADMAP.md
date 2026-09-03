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

**Status: NEXT / PLANNED**

## Objective

Add a dedicated Machine List upload function without changing the existing MinerPlus analyzer.

## Required Machine List columns

Minimum required fields:

- `serial_number`
- `location_id`

The Machine List may also contain other operational fields, but Phase 3 only needs to establish reliable upload and validation of the required fields.

## Phase 3 responsibilities

1. Select Machine List `.xls` / `.xlsx` file.
2. Read the spreadsheet.
3. Detect required columns by header name, not fixed column position.
4. Validate that `serial_number` exists.
5. Validate that `location_id` exists.
6. Normalize text values by trimming whitespace.
7. Normalize `location_id` consistently for lookup.
8. Ignore fully empty rows.
9. Show upload/validation result.
10. Show a preview of the parsed Machine List.

## Phase 3 does NOT do yet

- No Google Sheets replacement.
- No Cleaning History.
- No Cleaning Count.
- No integration into the MinerPlus result table.
- No modification of existing MinerPlus calculation logic.

## Phase 3 success criteria

A valid Machine List can be uploaded and its `serial_number` + `location_id` values can be verified in the browser.

An invalid file must be rejected clearly without affecting existing MinerPlus functionality.

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

**Current next step:** Phase 3 — Machine List Upload.

**Implementation status:** Roadmap frozen; no Phase 3 code changes included in this commit.
