# Machine Cleaning Tracker — Roadmap Addendum

## 2026-09-06 — Work History Schema Cleanup

**Status: IMPLEMENTED IN REPO / GOOGLE APPS SCRIPT DEPLOYMENT PENDING**

The `Work History` schema has been simplified to keep only operationally useful fields.

### Final schema

```text
Event ID
Timestamp
IP
Serial Number
Location ID
Zona
Repeat Zero
Engineer ID
Status
Catatan
Resolution Status
```

### Removed fields

- `Nama DC` — duplicates `Location ID` and is not needed because `Location ID` is the canonical location reference.
- `Resolution Message` — technical resolver detail is removed from permanent history; operator-facing notes use `Catatan`.
- `Source` — currently fixed to the application source and adds no operational value.

### Data migration safety

`google-apps-script/Code.gs` now contains `ensureHistorySchema()`.

When the existing `Work History` sheet still uses the old 14-column schema, the backend maps existing rows by header name into the new 11-column schema before continuing. Existing values for the retained fields are preserved; only the three explicitly removed fields are discarded.

This avoids shifted-column corruption when the new backend starts writing history.

### Backend changes

- `HISTORY_HEADERS` updated to the 11-column schema.
- `appendWorkHistory()` writes only the retained fields.
- `getWorkHistory()` reads the new column positions.
- History Event ID idempotency and Script Lock remain unchanged.
- Existing `resolutionStatus` validation remains in place.

### UI changes

`cleaning-history.html` now labels the columns explicitly as `Location ID` and `Resolution Status`.

No changes were made to `master-data.js`.
No changes were made to MinerPlus calculation logic.

### Deployment note

The updated repository file does **not** automatically update an already deployed Google Apps Script Web App. The current `google-apps-script/Code.gs` must be copied/deployed to the existing Apps Script deployment before end-to-end testing.

### Validation checklist

1. Deploy the updated `Code.gs`.
2. Open `Cleaning History` and confirm existing records still display correctly.
3. Confirm the `Work History` header now contains exactly 11 columns shown above.
4. Submit a new cleaning event.
5. Confirm the new row contains `Location ID`, `Catatan`, and `Resolution Status`.
6. Confirm `Nama DC`, `Resolution Message`, and `Source` are no longer present.
7. Confirm Cleaning Count still increments from completed events.
8. Confirm another concurrent user can submit/read history normally.
