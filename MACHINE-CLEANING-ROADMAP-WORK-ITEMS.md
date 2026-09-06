# Work Items Schema Update

## Status

**IMPLEMENTED IN REPO / USER VALIDATION PENDING**

## Objective

Extend the shared Google Sheets `Work Items` tab so each current work item contains the physical machine identity and its completed cleaning count.

## New Work Items schema

```text
IP
Nama DC
Zona
Repeat Zero
Serial Number
Cleaning Count
Engineer ID
Status
Timestamp
Catatan
```

## Data rules

- `Serial Number` is resolved from the current `Machine List Current` using the Work Item's `Nama DC` / Location mapping.
- `Cleaning Count` is calculated from permanent `Work History`.
- Only `Status = Selesai` events with a valid Serial Number contribute to the count.
- Cleaning Count is keyed by normalized Serial Number, not by IP.
- If the current machine cannot be resolved uniquely, Serial Number is stored as blank and Cleaning Count as `-` rather than guessing.
- Existing Work Items remain IP-keyed and continue to be updated through the existing `upsertWorkItems` workflow.

## Synchronization behavior

When a Work Item is saved:

```text
Work Item
   ↓
Location / Nama DC
   ↓
Machine List Current
   ↓
Serial Number
   ↓
Work History
   ↓
Completed Cleaning Count
```

When a `Selesai` History event is appended, the affected Work Item rows are refreshed so their `Cleaning Count` reflects the newly recorded completed event.

## Migration safety

The Apps Script detects the existing Work Items header schema and migrates by header name. Existing columns are preserved, while the new `Serial Number` and `Cleaning Count` fields are added without shifting unrelated values.

The migration does not delete Work Items records.

## Scope protection

No changes were made to:

- `master-data.js`
- MinerPlus IP/repeat calculation logic
- Machine List snapshot rules
- Work History identity rules

## Deployment note

Because the backend is Google Apps Script, the updated `google-apps-script/Code.gs` must be deployed to the existing Web App deployment before the new Work Items columns become active.

## Validation checklist

1. Deploy the latest `Code.gs`.
2. Save a Work Item whose Location ID exists in `Machine List Current`.
3. Confirm `Serial Number` is populated in `Work Items`.
4. Confirm `Cleaning Count` matches the number of completed (`Selesai`) history events for that Serial Number.
5. Complete one cleaning action and confirm the Work Item `Cleaning Count` increases accordingly.
6. Test an unresolved/ambiguous location and confirm the system does not invent a Serial Number or count.
