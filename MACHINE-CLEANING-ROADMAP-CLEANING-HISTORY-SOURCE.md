# Change Log — Cleaning History uses Work Items

Date: 2026-09-06

## Change

`cleaning-history.html` / `cleaning-history.js` no longer read the `Work History` sheet for the displayed list.

The page now reads the current `Work Items` sheet through the Google Apps Script endpoint:

```text
GET ?action=getWorkItems
```

## Displayed Work Items fields

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

`Resolution Status` is no longer displayed on this page because that field belongs to the permanent `Work History` record and is not part of `Work Items`.

## Backend

`google-apps-script/Code.gs` now exposes `getWorkItems()` through `doGet()`.

The endpoint reads the shared `Work Items` sheet and returns the current rows using the current Work Items schema.

## Data-role separation

```text
Work Items
  → current / active work list
  → source for cleaning-history.html display

Work History
  → permanent append-only cleaning archive
  → source for historical Cleaning Count calculation
```

The `Work History` sheet is not deleted or disabled. It continues to be written by completed work events and remains the permanent archive.

## Scope protection

No changes were made to:

- `master-data.js`
- MinerPlus calculation logic
- Machine List schema
- Work History schema

## Deployment requirement

Because `google-apps-script/Code.gs` is deployed separately from GitHub Pages, the current Apps Script version must be redeployed before testing the new `getWorkItems` endpoint from the live site.
