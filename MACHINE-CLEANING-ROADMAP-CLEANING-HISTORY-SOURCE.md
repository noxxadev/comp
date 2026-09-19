# Change Log — Cleaning History uses Work History

Date: 2026-09-20

## Change

`cleaning-history.html` / `cleaning-history.js` now read the permanent `Work History` sheet for the displayed list.

The page now reads:

```text
GET ?action=getWorkHistory
```

## Displayed fields

The existing table structure is retained:

```text
IP
Nama DC
Zona
Repeat Zero
Serial Number
Cleaning Count
Worker / Engineer
Status
Timestamp
Catatan
```

For Work History records, `Nama DC` is displayed from `Location ID`, because the permanent history schema stores the location identifier rather than the Work Items `Nama DC` field.

`Cleaning Count` remains available from the backend's historical count calculation keyed by Serial Number.

## Data-role separation

```text
Work Items
  → current / active work state
  → not the source for Cleaning History

Work History
  → permanent append-only cleaning event archive
  → source for cleaning-history.html
  → source for historical Cleaning Count calculation
```

This allows the page to show multiple cleaning events for the same Serial Number instead of only the latest/current Work Item.

## Scope protection

No changes were made to:

- `ip-repeat-analyzer.html`
- `ip-repeat-analyzer.js`
- `machine-resolver.js`
- `master-data.js`
- MinerPlus calculation logic
- Machine List schema
- Work History schema

## Deployment requirement

No new Apps Script endpoint is required because `getWorkHistory` already exists.

The live Apps Script deployment must contain the existing `getWorkHistory` function before testing.
