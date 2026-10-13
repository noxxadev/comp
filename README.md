## 2026-10-14 — CSI Daily Report: WhatsApp newline dan template cetak berlogo
- **Status:** IMPLEMENTED IN MAIN — DEPLOYMENT / LIVE VALIDATION PENDING.
- Memperbaiki pemisah baris pesan WhatsApp agar menggunakan newline nyata, bukan karakter literal `\\n`.
- Snapshot Daily Report kini menyimpan dua representasi: teks pesan WhatsApp yang dapat diedit dan HTML template cetak A4 portrait dengan logo CSI, tabel treatment, detail site/personil, serta area tanda tangan.
- Halaman Admin menampilkan template berlogo yang tersimpan dan tombol cetak menggunakan dokumen snapshot tersebut; laporan tidak dibentuk ulang dari riwayat yang mungkin berubah.
- Kolom baru `Print Report HTML` ditambahkan ke `CSI Daily Reports`. Backend mengenali header lama 17 kolom dan menambahkan kolom ke-18 tanpa menghapus/mengubah baris yang sudah ada.
- Laporan lama tidak memiliki snapshot HTML berlogo; untuk mendapatkan format baru, laporan perlu dibuat ulang dari halaman CSI. Snapshot lama tetap dipertahankan dan masih dapat ditinjau sebagai teks.
- File yang berubah: `csi.js`, `csi.html`, `csi-apps-script/Code.gs`, `csi-daily-reports.html`.
- **Deployment wajib:** update/deploy ulang Apps Script CSI dari `csi-apps-script/Code.gs`. Setelah itu buka halaman CSI, hard refresh, buat laporan baru, cek pesan WhatsApp dan buka link sebagai Admin. Pastikan tab `CSI Daily Reports` mendapat header `Print Report HTML` secara otomatis ketika backend membaca sheet; jangan hapus data lama.
- Validasi sumber kode dilakukan; uji browser/WhatsApp/print PDF live masih pending.

## 2026-10-13 — Sidebar Daily Report CSI berdasarkan role
- **Status:** IMPLEMENTED IN MAIN — VALIDASI BROWSER PENDING.
- Sidebar Tools Hub (`index.html`) menyembunyikan tautan **CSI Cleaning** untuk role `ADMIN`; tautan **Daily Report CSI** dipertahankan satu kali.
- Sidebar halaman **Daily Report CSI** (`csi-daily-reports.html`) menyembunyikan tautan **CSI Cleaning** untuk role `ADMIN`.
- Tautan/kartu Daily Report CSI yang duplikat di `index.html` sudah dihapus; satu tautan sidebar dan satu kartu tool pendukung tetap tersedia.
- Role selain `ADMIN` tidak terkena filter baru; navigasi CSI Cleaning tetap tersedia pada halaman CSI.
- Perubahan hanya menyentuh navigasi dan duplikasi tautan/kartu. Tidak mengubah mekanisme login, validasi sesi, backend, atau logika fitur.
- **Validasi browser wajib:** login sebagai Admin dan CSI, cek sidebar desktop/mobile dan setelah hard refresh. Pastikan akses halaman tetap mengikuti guard/backend yang sudah ada; penyembunyian link bukan pengganti kontrol akses.

## 2026-10-13 — CSI Daily Report: snapshot dan halaman Admin
- **Status:** IMPLEMENTED IN MAIN — DEPLOYMENT / LIVE VALIDATION PENDING.
- Menambahkan API backend Daily Report dan sheet baru `CSI Daily Reports`; sheet dibuat oleh fungsi `setupCsiSheets()` tanpa mengubah struktur `CSI Work History` atau `CSI Summary`.
- CSI menyimpan snapshot laporan sebelum WhatsApp dibuka. Pesan WhatsApp menyertakan ID dan tautan ke halaman Admin untuk membuka laporan yang tersimpan.
- Menambahkan halaman `csi-daily-reports.html` untuk Admin: daftar laporan, detail snapshot, minta revisi, setujui, dan cetak A4 portrait. API daftar/detail/review/cetak memvalidasi role ADMIN di backend.
- Status awal `Menunggu Review`; status review `Perlu Revisi` atau `Disetujui`; status `Sudah Dicetak` dicatat setelah aksi cetak. Snapshot laporan tidak bergantung pada perubahan riwayat berikutnya.
- **Langkah wajib sebelum pengujian:** perbarui deployment Web App proyek Apps Script CSI dari `csi-apps-script/Code.gs`; jalankan `setupCsiSheets()` sekali dari editor Apps Script untuk membuat tab baru; pastikan akun Admin memakai role persis `ADMIN`; hard refresh halaman.
- **Validasi belum dilakukan di browser / Apps Script live.** Pastikan alur simpan snapshot, tautan WhatsApp, akses role, review, revisi, dan cetak bekerja sebelum dipakai operasional.

## 2026-10-13 — CSI personnel field sizing
- Set Nama Personil textbox to the same initial height as adjacent print-form inputs (42px, one visible row); multiline/comma-separated parsing and optional vertical resize remain unchanged. Updated CSI asset cache-busters. Frontend-only; browser validation pending.

## 2026-10-13 — CSI: reset formulir dan penyederhanaan tampilan
- **Status:** IMPLEMENTED — LIVE VALIDATION PENDING.
- Setelah saveWork berhasil dikonfirmasi backend, formulir pekerjaan kembali ke default: Nama DC kosong, tanggal pekerjaan hari ini, sisi A, jenis Cleaning, semua Treatment tidak dicentang, dan Catatan kosong. Jika penyimpanan gagal, input tetap dipertahankan untuk koreksi. Form reset tetap dilakukan meskipun pemuatan ulang riwayat berikutnya gagal, karena penyimpanan sudah dikonfirmasi.
- Field tetap Nama Site (CWUP Karawang) dan Alamat Site (Karawang) dihilangkan dari kartu Formulir Cetak; nilai tetap digunakan secara konstan di output cetak. Field manual lainnya tidak diubah.
- Tombol Muat Ulang pada header Riwayat Pekerjaan CSI diganti label Refresh dan dipindah berdampingan dengan Reset Filter. Aksi pemuatan ulang dan filter tidak diubah.
- Cache-buster CSI HTML diperbarui. Tidak ada perubahan backend, autentikasi, format laporan, atau struktur Google Sheets.
- **Uji browser:** simpan sukses, gagal simpan, kedua sisi, refresh history, reset filter, cetak dengan site/alamat tetap, dan tampilan mobile.

## 2026-10-13 — DC HighTemp: panel Kondisi Terkini pada Progress
- **Status:** IMPLEMENTED — LIVE VALIDATION PENDING.
- Menambahkan panel **Kondisi Terkini DC** di bawah ringkasan Progress dan sebelum grafik IP.
- Saat Progress DC dibuka, frontend meminta ulang ringkasan **Mesin Cleaning** dari COMP Apps Script dan **Detail Celldeck sisi A/B** dari CSI Apps Script. Panel menampilkan jumlah SN unik cleaning/total dan persentase; status sisi A/B; tanggal cleaning terakhir; umur cleaning; tanggal replace terakhir; serta waktu pemuatan data.
- Data panel bersifat **live/current**, bukan kondisi historis per snapshot. Jika salah satu sumber gagal, panel menampilkan status tidak tersedia tanpa menghentikan grafik atau riwayat IP.
- Tidak mengubah perhitungan IP, baseline, rate/perubahan snapshot, aksi Record Data Snapshot, maupun struktur Google Sheets.
- **Live validation required:** deploy versi terbaru backend COMP hanya jika backend mesin yang digunakan belum diperbarui; refresh halaman dengan Ctrl+F5, buka Progress DC tanpa upload baru, lalu pastikan data mesin dan CSI diperbarui. Frontend CSI memakai endpoint getHighTempSummary yang sudah ada.

## 2026-10-13 — DC HighTemp: perbaikan pembacaan lokasi Mesin Cleaning
- **Status:** IMPLEMENTED — DEPLOYMENT & LIVE VALIDATION PENDING.
- Memperbaiki regex backend agar normalisasi spasi dan pembacaan lokasi `GBE.A1...` berjalan benar. Regex sebelumnya memakai escape berlebih sehingga lokasi mesin tidak dikenali dan ringkasan per DC dapat kosong.
- Mesin tetap dihitung berdasarkan SN unik di **Machine List Current**; riwayat cleaning tetap berasal dari **Work History** berstatus `Selesai`. Lokasi workshop `GBE_RC.A-1` dan `GBE_RC.A-3` tetap dikecualikan.
- Tidak mengecualikan mesin hanya karena kolom `Uninstalled Date` terisi, sesuai keputusan audit sebelumnya.
- **Wajib:** deploy versi terbaru `google-apps-script/Code.gs` pada Apps Script yang dipakai aplikasi; perubahan GitHub saja tidak memperbarui deployment.

## 2026-10-13 — DC HighTemp: perbaikan urutan kolom
- **Status:** IMPLEMENTED — LIVE VALIDATION PENDING.
- Memperbaiki urutan sel pada tabel TOP 5 agar kolom **Mesin Cleaning** menampilkan ringkasan jumlah mesin yang sudah cleaning dan **Detail Celldeck** menampilkan ringkasan CSI sisi A/B.
- Perubahan hanya pada urutan rendering kolom di `dc-hightemp.js`; tidak mengubah sumber data, perhitungan Top 5, snapshot, baseline, Progress, atau struktur Google Sheets.
- Validasi browser diperlukan setelah hard refresh untuk memastikan data muncul di kolom yang benar.

## 2026-10-13 — DC HighTemp: jumlah mesin yang sudah cleaning
- **Status:** IMPLEMENTED — LIVE VALIDATION PENDING.
- Menambahkan kolom **Mesin Cleaning** pada TOP 5 DC HIGHTEMP dengan format jumlah SN unik yang memiliki riwayat Selesai dibanding total SN unik aktif per DC, beserta persentase cleaning.
- Total mesin bersumber dari **Machine List Current**; SN yang sama hanya dihitung satu kali. Lokasi workshop `GBE_RC.A-1` / `GBE_RC.A-3` dikecualikan dari daftar mesin per DC; kolom Uninstalled Date tidak menjadi filter.
- Backend memindai seluruh Work History dan membuat himpunan SN unik berstatus `Selesai`, bukan memakai jumlah event atau batas hasil API 5.000 baris.
- Jika API ringkasan gagal, kolom menampilkan status data tidak tersedia; tidak memakai cache lokal yang berpotensi kedaluwarsa.
- Tidak mengubah ranking IP, Rate, Detail Celldeck CSI, snapshot, baseline, Progress, atau struktur Google Sheets.
- **Validasi live diperlukan:** deploy versi baru `google-apps-script/Code.gs`, lalu uji TOP 5 dengan beberapa SN yang memiliki beberapa riwayat Selesai, SN tanpa riwayat, mesin dengan Uninstalled Date terisi, serta lokasi workshop.

## 2026-10-13 — CSI WhatsApp Report: Nama Personil
- **Status:** IMPLEMENTED — LIVE VALIDATION PENDING.
- Menambahkan kolom **Nama Personil** pada kartu Report CSI. Nama dapat dipisahkan dengan koma, titik koma, atau baris baru.
- Report menampilkan jumlah personil otomatis dan daftar nama bernomor; nama duplikat tidak dihitung dua kali (pencocokan tanpa membedakan huruf besar/kecil).
- Pembuatan laporan membutuhkan minimal satu nama personil. Nama personil hanya digunakan untuk report WhatsApp dan tidak mengubah penyimpanan riwayat CSI, struktur Google Sheets, login, atau integrasi DC HighTemp.
- Cache-buster aset CSI diperbarui agar GitHub Pages memuat revisi terbaru.
- **Live validation required:** uji nama satu/beberapa personil, nama duplikat, laporan tanggal custom, dan pesan WhatsApp yang terisi.

## 2026-10-13 — CSI Daily WhatsApp Report
- **Status:** FRONTEND IMPLEMENTED — LIVE VALIDATION PENDING.
- Added a daily report section to the CSI page. The date defaults to the user's local current date and can be changed for an occasional custom-date report.
- The report refreshes saved CSI history, filters strictly by the selected Work Date, groups records by Nama DC and job type, and lists Frame Side A/B plus optional notes.
- Counts are based on saved side-level records. Identical entries on the same work date (same Nama DC, side, job type, and notes) are counted once to avoid accidental double counting. Selecting Both remains represented by the separate A and B rows already written by the CSI backend; the report does not invent a separate celldeck identifier.
- **Buat Report WhatsApp** generates a preview; **Kirim via WhatsApp** opens WhatsApp with the message prefilled. The user must choose the destination group and press Send manually. Direct automatic group delivery is not provided by a normal wa.me link.
- Frontend-only feature: no CSI Apps Script, spreadsheet schema, authentication, or DC HighTemp integration changes.
- **Live validation required:** test today's data, a custom date, an empty date, multiple DCs, A/B/Both, Cleaning/Replace, notes, and WhatsApp opening.

## 2026-10-13 — DC HighTemp Phase 4: detail pekerjaan CSI
- **Status:** COMPLETED — USER VALIDATED
- Detail Celldeck pada tabel Top 5 sekarang menampilkan jenis dan tanggal pekerjaan terakhir untuk tiap sisi frame, selain status, umur sejak Cleaning terakhir, tanggal Cleaning terakhir, dan tanggal Replace terakhir.
- Umur cleaning tetap dihitung dari riwayat bertipe `Cleaning`; pekerjaan `Replace` tidak mereset umur cleaning.
- Perubahan hanya pada rendering detail CSI di `dc-hightemp.js` dan cache-buster di `dc-hightemp.html`.
- Perhitungan Top 5, Record Data Snapshot, baseline/progress, struktur Google Sheets, dan backend CSI tidak diubah.
- Validasi browser masih diperlukan untuk memeriksa tampilan tanggal/jenis pekerjaan dan regresi Top 5, Snapshot, serta Progress.

## 2026-10-13 — CSI DC name format correction
- CSI dropdown now stores and displays DC codes without the `GBE.` prefix (for example, `A1`). The list still derives from `master-data.js`.
- CSI backend normalizes incoming names and accepts both bare names and legacy `GBE.` names, but new history and summary records use the bare format.
- Existing history rows with `GBE.` remain readable; CSI history filtering and DC HighTemp summary normalize legacy values so older records continue matching.
- DC HighTemp continues matching both formats. No changes to authentication, IP counting, Top 5 ranking, snapshots, or Progress logic.
- Deployment note: publish the updated `main` frontend and manually update/redeploy `csi-apps-script/Code.gs` in the existing Apps Script Web App; GitHub does not deploy Apps Script automatically.

## 2026-10-13 — Integrasi ringkasan CSI ke DC HighTemp (Phase 3)
- Menambahkan kolom **Detail Celldeck** pada tabel Top 5 DC HighTemp untuk menampilkan status sisi A dan B, umur sejak Cleaning terakhir, tanggal Cleaning terakhir, dan tanggal Replace terakhir jika tersedia.
- DC HighTemp mengambil ringkasan melalui action baca `getHighTempSummary` pada backend CSI. Endpoint memvalidasi sesi COMP dan akun aktif; endpoint ini hanya mengembalikan ringkasan, bukan catatan lengkap atau notes.
- Kegagalan memuat ringkasan CSI tidak menghentikan perhitungan Top 5, penyimpanan snapshot, atau fitur Progress. Kolom akan menampilkan pesan bahwa detail CSI tidak tersedia.
- Menambahkan cache-busting untuk aset halaman DC HighTemp. Tidak ada perubahan pada mekanisme hitung IP, ranking Top 5, snapshot, atau Progress.
- **Status: kode frontend sudah di `main`; belum dianggap selesai diuji live.** Web App CSI harus menggunakan deployment yang memuat action `getHighTempSummary`. Setelah memperbarui Apps Script, deploy versi baru lalu uji halaman dengan akun COMP aktif.

## 2026-10-11 — CSI frontend routing
- Added a `CSI Cleaning` link to the COMP hub sidebar on `feature/csi-foundation`; the existing `main` branch is unchanged.
- Added cache-busting version strings to CSI page assets to reduce stale-browser-cache issues during testing.

## 2026-10-11 — CSI frontend and cleaning-age refinement
- Added `csi.html`, `csi.css`, and `csi.js` on `feature/csi-foundation`, including a responsive page and mobile sidebar toggle. The `main` branch and existing COMP authentication backend were not changed.
- The page supports work date, DC from `master-data.js`, side A/B/Both, Cleaning/Replace, notes, history, DC/date/job filters, and a filter for sides whose most recent Cleaning is at least 30 days old.
- Backend summary keeps the latest work date/type, but computes age/status from the latest `Cleaning` record. If no Cleaning record exists, status is `Belum ada data cleaning`.
- Static JavaScript syntax checks passed for `csi.js` and `csi-apps-script/Code.gs`. Browser UI, live API, access-denial, and real spreadsheet save/read tests remain outstanding.
- Before live testing, the deployed CSI Web App URL must be set in `csi-google-sheets-config.js`; do not commit spreadsheet IDs or private configuration. Keep changes on `feature/csi-foundation` until validation is complete.

## 2026-10-11 — CSI page frontend (Phase 2 in progress)
- Added `csi.html`, `csi.css`, and `csi.js` on `feature/csi-foundation`; the existing `main` branch and legacy COMP backend remain unchanged.
- The page includes a Cleaning/Replace work form, DC options derived from `master-data.js`, A/B/Both side selection, work date, optional notes, history table, date/DC/job filters, and a filter for frame sides whose latest Cleaning is at least 30 days old.
- Frontend access calls the CSI backend's `validateAccess` action, while each backend request independently verifies the COMP session and CSI role. Saving Both is intended to create two separate history records.
- Fixed the CSI backend's DC/date validation regex patterns while auditing the integration.
- Validation so far: JavaScript and Apps Script source passed a JavaScript syntax parse check. Live browser/save/history/role tests have not yet been run.
- Remaining before user setup: review the page visually and test the API end-to-end; then update `csi-google-sheets-config.js` with the user's deployed CSI `/exec` URL (never commit spreadsheet IDs or private settings). Do not merge into `main` until tested.

# COMP — Roadmap & Change Log

## 2026-10-11 — CSI setup diagnostics
- Improved `setupCsiSheets()` to log the destination spreadsheet name and URL in the private Apps Script execution log.
- After creating the two CSI tabs, the function re-reads the spreadsheet and verifies both tabs exist; it throws a clear error if verification fails.
- The returned/logged result includes the actual tab list and header-column counts, making it easier to distinguish a wrong spreadsheet ID from a tab-creation issue.
- No existing COMP backend, spreadsheet, authentication, or DC HighTemp logic was changed.
- Validation status: source updated on `feature/csi-foundation`; user must copy the updated file into the CSI Apps Script project and run setup again.

## 2026-10-11 — CSI work form and history API (Phase 2 in progress)
- Extended the isolated CSI Apps Script backend with the protected `saveWork` action. Every write revalidates the COMP session and requires an active account with role `CSI`.
- Saving a single side creates one history row. Selecting both sides creates two rows (A and B) so each side can have its own cleaning age.
- Each saved event refreshes the corresponding DC + frame-side row in `CSI Summary`; age is calculated from the latest work date, with `Perlu Cleaning` at 30 days or more.
- Added server-side validation for DC format, work date, side, job type, future dates, notes length, and concurrent writes.
- Existing COMP Apps Script and DC HighTemp logic remain untouched. Frontend page creation and live tests are still pending.

## 2026-10-11 — CSI foundation (Phase 1)
- Created an isolated CSI Apps Script backend at `csi-apps-script/Code.gs`; the existing `google-apps-script/Code.gs` remains untouched.
- Added `csi-google-sheets-config.js` as a public endpoint configuration template. The CSI Web App URL is filled in only after deployment.
- CSI backend configuration uses Apps Script Script Properties: `CSI_SPREADSHEET_ID` and `COMP_WEB_APP_URL`. Neither spreadsheet ID nor private configuration is stored in GitHub.
- Added manual setup function `setupCsiSheets()` to initialize the dedicated `CSI Work History` and `CSI Summary` tabs without modifying COMP sheets.
- Added server-side CSI role enforcement: every protected request validates the submitted session against the existing COMP authentication Web App and requires an active user with role `CSI`. Browser-side role checks alone are not treated as security.
- Added protected `validateAccess` and read-only `getHistory` actions as backend foundation.
- No changes to `auth.js`, `page-guard.js`, the existing COMP Apps Script backend, DC HighTemp logic, or existing spreadsheets.
- Status: source added to branch `feature/csi-foundation`; deployment and live validation have not yet been performed. Save/write action and the CSI page are planned for later phases.

### CSI Phase 1 setup checklist
1. Create a separate, initially empty Google Spreadsheet for CSI.
2. In the new Apps Script project, add Script Properties `CSI_SPREADSHEET_ID` (the new spreadsheet ID) and `COMP_WEB_APP_URL` (the active COMP Web App `/exec` URL).
3. Run `setupCsiSheets()` manually and approve the requested Google permissions.
4. Deploy the CSI project as a Web App executing as the owner. The endpoint must be reachable by signed-in COMP users; every protected action still validates the session and CSI role server-side.
5. Copy the new deployment's `/exec` URL into `csi-google-sheets-config.js` only when the CSI frontend is added.
6. Test with one active CSI-role account and one account with a different role. The second account must be denied by the backend.

## 2026-10-06 — Machine List workshop location exception
- Updated Machine List validation so `GBE_RC.A-1` and `GBE_RC.A-3` may contain multiple Serial Numbers because both are workshop/repair locations.
- Location IDs other than those two remain protected by the existing duplicate-location validation.
- Duplicate Serial Numbers remain rejected.
- No changes were made to Cleaning Count calculation, Work History storage, or Work Item identity logic.
- The Google Apps Script source in `google-apps-script/Code.gs` must be deployed as a new version before the live endpoint uses this validation change.

## 2026-10-03 — Collapsible sidebar groups
- Added hide/show behavior to the **Pool Vs Dashboard** and **IP Repeat** sidebar groups.
- Clicking a group header collapses or expands only that group's child pages.
- The collapsed/expanded state is persisted in browser `localStorage`, so it remains when navigating between pages.
- The active page remains highlighted when its group is open.
- Added keyboard support (`Enter` / `Space`) and ARIA state for the group headers.
- No page feature logic, authentication, security mechanism, or backend logic was changed.

## Purpose
Fixed roadmap for the IP Repeat Analyzer and Engineer Work Tracking project.

The roadmap is executed phase-by-phase. Completed phases are not changed casually; fixes and new requirements are recorded in the change log. Existing application logic must not be modified unless explicitly agreed.

## 2026-10-03 — Grouped sidebar navigation
- Grouped `Data Matcher` and `Bulk Compare` under **Pool Vs Dashboard**.
- Grouped `IP Repeat Analyzer`, `Machine List`, and `Cleaning History` under **IP Repeat**.
- Kept the existing standalone tools and page behavior unchanged.
- Group headers collapse to icon-only in the desktop collapsed sidebar and remain fully visible on mobile.

## 2026-10-05 — Cleaning Count reset from latest uploaded dashboard
- Added the agreed reset rule to IP Repeat Analyzer: the uploaded MinerPlus dashboard is treated as the latest/current location snapshot.
- For each uploaded IP, the analyzer reads the location from the uploaded Excel file and resolves the current Serial Number from Machine List Current.
- The analyzer reads existing Serial Numbers from **Work Items**. If the resolved SN is already present in Work Items and its location in the latest uploaded file is exactly `GBE_RC.A-1` or `GBE_RC.A-3`, the displayed **Cleaning Count is reset to 0**.
- If the SN is not present in Work Items, or the latest uploaded location is not `GBE_RC.A-1` / `GBE_RC.A-3`, Cleaning Count continues to use completed events from **Work History**.
- Uploading/processing an Excel file does **not** create a Work History record. Work History remains recorded only when the user manually saves the selected IP as a work event.
- Existing Work History records are never deleted or modified by the reset rule; the reset is a derived display value for the current uploaded snapshot.
- Added reading of the existing `getWorkItems` endpoint; no Google Apps Script backend schema or save logic was changed.
- Updated IP Repeat cache-busting versions so the browser loads the new analyzer/resolver logic.
- SN matching for the reset rule uses the dashboard/Work Items value as-is after trimming; no additional SN normalization was introduced for this rule.

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

## 2026-09-27 — Work History Phase 5 performance audit
- Audited backend Work History retrieval and Cleaning History request flow after Phase 3.
- Current bottleneck: `getWorkHistory()` reads the full Work History sheet on every request before applying filters.
- Response size is already bounded to a maximum of 2,000 returned rows, and filters are applied in the backend before that limit.
- No safe low-complexity optimization is required at the current dataset size; indexing/cache would add complexity and require additional invalidation logic.
- Performance optimization should be revisited when Work History volume becomes materially larger or measured response time degrades.
- No application code was changed in this audit.

## 2026-09-27 — Work History Phase 6 regression audit
- Source regression checks passed for Serial Number, Engineer, Date, and combined filters.
- Confirmed backend applies matching before the 2,000-row response limit and returns the filtered total count.
- Confirmed Cleaning History sends all active filters directly to the backend and no longer performs the old client-side filtering step.
- Confirmed direct-open behavior defaults to today's date when no SN is selected, while an SN URL does not force today's date.
- Confirmed the existing SN filter reset flow remains intact.
- Live validation for a record beyond event 2,000 / around event 2,500 remains pending until the dataset is large enough.
- No application code was changed during this regression audit.

## 2026-10-03 — DC Progress XLSX export
- Changed the DC Progress Download output from CSV to Excel `.xlsx`.
- Export columns are exactly `Record At`, `Nama DC`, `Baseline`, `Perubahan`, and `Perubahan %`.
- `Baseline` uses the saved baseline count for the selected DC; `Perubahan` and `Perubahan %` use the recorded progress history values.
- `Perubahan %` is stored as a real Excel percentage value with `0.00%` formatting.

## 2026-10-03 — DC Progress save confirmation + download
- Removed the non-functional Exit/Close control from the DC Progress card.
- Fixed `Recorded At` display to Indonesian date/time format `DD/MM/YYYY HH:mm:ss WIB` using Asia/Jakarta timezone, including CSV downloads.
- Added a visible success indicator after a DC is successfully saved to Progress.
- Added a Download button in the DC Progress card to export the currently displayed DC progress history as CSV.
- Download uses the history already displayed for the selected DC; no backend schema or progress calculation logic was changed.

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

### Phase 7 — Search Serial Number di IP Repeat
- **Status:** DONE
- Search pada ip-repeat-analyzer sekarang mendukung **IP, Nama DC, dan Serial Number**.
- Dukungan multi-IP tetap dipertahankan.
- Filter Zona dan sorting tidak diubah.
- Serial Number tetap berasal dari Machine List yang sudah digunakan oleh fitur SN / Cleaning Count sebelumnya; tidak membuat sumber data baru.
- Cache-buster frontend diperbarui agar perubahan JavaScript termuat di GitHub Pages.
- Tidak ada perubahan pada logic penyimpanan, Work Tracking, Cleaning History, atau sumber data IP Repeat.
## 2026-09-27 — IP Repeat Cleaning Count / SN render race fix
- **Status:** FIXED — VALIDATION PENDING
- Diperbaiki regresi setelah Phase 7: event `comp:ip-repeat-serials-ready` sebelumnya dipanggil dari `augmentIpRepeatTable()`.
- Event tersebut memicu `render()`, sedangkan `render()` mengosongkan dan membuat ulang `tbody`, sehingga kolom Serial Number, Cleaning Count, dan Last Cleaning yang baru saja ditambahkan dapat terhapus.
- Serial Number map sekarang dipublish **sekali setelah resolver siap**, bukan setiap kali tabel di-augment.
- MutationObserver tetap digunakan untuk menambahkan kembali kolom SN/Cleaning Count/Last Cleaning setiap kali hasil tabel dirender ulang.
- Logic perhitungan Cleaning Count tetap sama: hanya Work History dengan Status `Selesai` yang dihitung berdasarkan Serial Number.
- Cache-buster `machine-resolver.js` dinaikkan ke `20260927-2`.
- Tidak mengubah schema Google Sheets, logic Work Tracking, logic Cleaning History, atau sumber data Machine List/Work History.
- Live validation yang perlu dilakukan: pastikan SN tampil, Cleaning Count sesuai Work History berstatus `Selesai`, Last Cleaning tampil, dan pencarian SN tetap bekerja.



### 2026-10-03 — DC Progress visibility fix
- Moved `Progress yang Sedang Dipantau` and the progress detail panel outside `resultsSection` so existing tracked DCs can be selected immediately on page load without uploading a file.
- Preserved the existing Top 5 calculation and automatic snapshot logic.
- Corrected DC progress text whitespace normalization in `google-apps-script/Code.gs`.

## 2026-10-02 — DC HighTemp Analyzer
- **Status:** IMPLEMENTED — LIVE VALIDATION PENDING
- Added standalone `dc-hightemp.html`, `dc-hightemp.css`, and `dc-hightemp.js`.
- The page accepts `.xls`, `.xlsx`, and `.csv` MinerPlus history files and detects the IP column automatically.
- IPs are normalized and counted by occurrence; duplicate history rows therefore contribute to the DC frequency.
- IP → location mapping uses the existing `master-data.js` only. `master-data.js` was not modified.
- Nama DC is extracted strictly from the first segment after `GBE.`: for example `GBE.A1.A.1.1` → `A1` and `GBE.A10.B.1.2` → `A10`.
- The result shows the **TOP 5 DC HIGHTEMP** ranking plus summary counts for total valid IPs, unique IPs, recognized IP occurrences, and unmapped IP occurrences.
- Unmapped IPs are excluded from the DC ranking and are reported separately as **Bukan IP DC**.
- The new page uses the existing COMP shell, sidebar, theme system, responsive behavior, authentication/page guard, and SheetJS loader.
- Added **DC HighTemp** to the Tools Hub navigation.
- No existing analyzer, Work Tracking, Google Sheets, authentication, or master-data logic was changed.

Live validation required:
- Upload a real MinerPlus history file and confirm IP column detection.
- Confirm duplicate IP occurrences are counted individually.
- Confirm Nama DC extraction uses only the segment immediately after `GBE.`.
- Confirm TOP 5 ordering and counts against a manual sample.
- Confirm unmapped IP handling.
- Confirm Light/Dark theme and mobile navigation.


## 2026-10-03 — DC HighTemp Progress Viewer tanpa Upload
- **Status:** IMPLEMENTED — VALIDATION PENDING
- Kartu **Progress yang Sedang Dipantau** sekarang dimuat secara independen dari hasil upload.
- Saat halaman dibuka, daftar DC yang sedang dipantau diambil dari penyimpanan progress yang sudah ada.
- User dapat memilih DC dari dropdown dan membuka detail progress, termasuk summary, grafik, dan history snapshot, tanpa perlu meng-upload file baru.
- Upload file tetap hanya digunakan untuk membuat/memperbarui snapshot progress; tidak diperlukan untuk melihat history yang sudah tersimpan.
- Tidak ada perubahan pada perhitungan Top 5, baseline, snapshot, atau schema Google Sheets.

## 2026-10-03 — DC HighTemp Progress Tracking
- **Status:** IMPLEMENTED — END-TO-END VALIDATION PENDING
- Simplified the Progress model to use **automatic upload snapshots**; lifecycle, checkpoint, and period concepts were removed.
- The existing **TOP 5 DC HIGHTEMP** calculation is unchanged.
- A Top 5 row has a **Progress** button. Clicking it registers that DC and immediately stores the current upload as its baseline snapshot.
- Every later upload that is successfully calculated automatically records the latest count/rate for every tracked DC in Google Sheets.
- A tracked DC is still recorded even when it drops outside the current Top 5; if it does not appear in the current ranking, its count is stored as `0`.
- The current progress state is stored in **DC Progress**.
- Every upload snapshot is stored in **DC Progress History**.
- Duplicate processing of the same browser file is prevented with a snapshot identifier based on file name, size, and last-modified timestamp.
- The Progress view shows baseline/current count, absolute change, percentage change, status, a count trend graph, and snapshot history.
- **Progress %** represents the reduction from baseline: `(Baseline Count - Current Count) / Baseline Count × 100%`. A positive value means the current occurrence count is lower than baseline.
- **Status** is descriptive only:
  - **Berkurang** = current count below baseline.
  - **Bertambah** = current count above baseline.
  - **Tetap** = current count equal to baseline.
- Existing old lifecycle rows in the two Progress sheets are preserved but are not included in the new simplified tracking view unless they contain the new snapshot-model status/snapshot identifiers.
- No changes were made to authentication, Work History, Work Items, Cleaning History, master-data, or the existing Top 5 occurrence-counting mechanism.

Validation required:
- Upload a real MinerPlus history file and confirm the existing Top 5 counts/rates.
- Click **Progress** on one Top 5 DC and confirm one baseline row appears in both Progress sheets.
- Upload a second file and confirm the tracked DC is automatically recorded without clicking Save/Checkpoint.
- Confirm the tracked DC is still recorded when it leaves Top 5.
- Confirm a tracked DC that disappears from the file is recorded with count `0`.
- Confirm the graph follows the uploaded snapshots and the percentage/change values match the baseline.
- Recalculate the same file and confirm no duplicate snapshot is created.
- Confirm existing upload/reset/theme/mobile behavior remains intact.



## 2026-10-03 — DC High Zero Workflow di Tools Hub
- Added **DC High Zero Workflow** to `index.html`.
- Workflow order: **Upload History MinerPlus → Otomatis Snapshot → Klik Progress untuk DC yang akan dikerjakan → Lihat Grafik & Data → Upload History Berikutnya untuk melihat performance DC**.
- The workflow uses the existing `dc-hightemp.html` page; no new feature logic or backend flow was introduced.
- The workflow nodes remain draggable on desktop/tablet and static on mobile, following the existing Tools Hub workflow behavior.
- Added connector lines between the five workflow steps.
- Updated `index-hub.css` only for the new workflow canvas height; existing workflow styling and behavior remain unchanged.


## 2026-10-03 — DC High Zero Workflow step update
- Renamed the second workflow step from **Otomatis Snapshot** to **Pilih Top 5 DC**.
- Updated the step description and icon to reflect the actual workflow.
- No feature logic or backend behavior was changed.


## 2026-10-03 — DC High Zero snapshot recording control
- Separated file analysis from snapshot recording.
- Uploading and calculating a file no longer automatically writes progress snapshots.
- Added **Record Data Snapshot** to explicitly record the current analyzed data for DCs that are already being monitored.
- Existing Top 5 analysis and Progress baseline behavior remain unchanged.
- No authentication, security, or unrelated feature logic was changed.
## 2026-10-05 — Work Items mengikuti Serial Number terbaru
- **Status:** IMPLEMENTED — DEPLOYMENT REQUIRED
- Work Items sekarang menggunakan **Serial Number sebagai identitas utama** saat melakukan upsert jika Serial Number berhasil di-resolve dari Machine List Current.
- Jika SN sudah ada di Work Items, baris tersebut diperbarui dengan **IP dan Nama DC terbaru**, sehingga perubahan IP/lokasi tidak membuat Work Item baru untuk mesin yang sama.
- Jika SN belum ada, sistem tetap membuat Work Item baru seperti sebelumnya.
- Jika SN tidak dapat di-resolve, mekanisme lama berbasis IP tetap digunakan sebagai fallback.
- Work History tetap append-only dan tidak diubah/dihapus oleh perubahan ini.
- Cleaning Count tetap dihitung dari Work History seperti mekanisme yang sudah berjalan.
- Data Work Items lama yang sudah terlanjur memiliki duplicate SN **tidak dihapus otomatis**.
- Authentication, security, frontend, dan fitur lain tidak diubah.

Validation required:
- Simpan SN yang sama dengan IP/lokasi lama, lalu simpan lagi setelah IP/lokasi berubah.
- Pastikan Work Items tetap hanya memakai satu baris untuk SN tersebut dan IP/Nama DC menjadi data terbaru.
- Pastikan Work History tetap membuat event baru setiap kali pekerjaan disimpan.
- Pastikan Cleaning Count tetap mengikuti riwayat Work History.


## 2026-10-13 — CSI mengikuti tema dan sidebar bersama COMP
- CSI memuat `theme-toggle.js` agar tema Light/Dark dan navigasi sidebar menggunakan sistem bersama COMP.
- Menambahkan **CSI Cleaning** ke navigasi sidebar bersama, termasuk penanda menu aktif.
- Tombol menu pada layar kecil CSI menggunakan kelas dan ID toggle bersama.
- Hanya perubahan tampilan dan navigasi; login, validasi role, penyimpanan CSI, filter riwayat, serta koneksi Google Sheets tidak diubah.
- **Validasi browser masih diperlukan:** cek sidebar desktop/mobile, pilihan Light/Dark, akses halaman CSI, dan simpan satu catatan uji.

## 2026-10-13 — Posisi tombol Reset Filter CSI
- Tombol **Reset Filter** diposisikan di sisi paling kanan pada baris filter untuk desktop dan tetap di sisi kanan pada layout tablet/mobile.
- Hanya tata letak CSS yang diubah; fungsi reset filter dan logika CSI tidak diubah.
- Validasi visual browser masih diperlukan.

## 2026-10-13 — CSI Phase 2: penanganan hasil simpan dan muat ulang
- Memisahkan hasil penyimpanan pekerjaan dari hasil pemuatan ulang riwayat.
- Jika penyimpanan berhasil tetapi pemuatan ulang riwayat gagal, halaman sekarang menyatakan bahwa catatan sudah tersimpan dan menyarankan **Muat Ulang**; pengguna diperingatkan agar tidak menyimpan pekerjaan yang sama kembali.
- Tidak mengubah endpoint backend, validasi sesi/role CSI, struktur spreadsheet, atau format catatan.
- Pemeriksaan kode sumber selesai; pengujian langsung di browser dan Google Sheets tetap diperlukan untuk memastikan hasil save/read, pilihan kedua sisi, filter, dan status 30 hari.

## 2026-10-13 — Sidebar berdasarkan role CSI/Admin
- Sidebar bersama membaca role dari sesi COMP yang tersimpan setelah login.
- Role **CSI** hanya menampilkan menu **CSI Cleaning**; role **Admin** tetap melihat seluruh menu COMP.
- Role lain mempertahankan navigasi yang sudah ada.
- Perubahan terbatas pada tampilan navigasi; mekanisme login, validasi sesi, backend, dan fitur tiap halaman tidak diubah.
- Validasi browser diperlukan dengan login sebagai CSI dan Admin, termasuk hard refresh.


## 2026-10-13 — CSI login routing dan pembatasan halaman
- Setelah login, akun dengan role **CSI** diarahkan langsung ke `csi.html`; role lain tetap diarahkan ke `index.html`.
- `page-guard.js` memeriksa role dari hasil validasi sesi sebelum menampilkan halaman. Jika role CSI membuka `index.html` atau halaman COMP lain secara langsung, halaman diarahkan ke `csi.html`.
- Halaman COMP yang ada telah diperiksa dan semuanya memuat `auth.js` serta `page-guard.js`.
- Sidebar role CSI tetap hanya menampilkan **CSI Cleaning**. Perubahan ini tidak mengubah logika fitur, backend CSI, atau penyimpanan.
- **Validasi browser masih diperlukan:** login sebagai CSI, pastikan masuk ke CSI; coba buka `index.html` dan URL halaman fitur secara langsung; lalu login sebagai Admin dan pastikan navigasi tetap seperti sebelumnya.


## 2026-10-13 — CSI Treatment Checklist dan Daily Report cetak
- Menambahkan tujuh pilihan treatment pada form pekerjaan CSI; minimal satu treatment wajib dipilih.
- Pilihan treatment disimpan sebagai JSON pada kolom `Treatments` di `CSI Work History`; ketika sisi `Both` dipilih, daftar treatment yang sama tersimpan pada catatan sisi A dan B.
- Header `CSI Work History` diperbarui menjadi 10 kolom. `setupCsiSheets()` atau akses backend berikutnya akan menambahkan header `Treatments` otomatis jika header yang ditemukan persis cocok dengan struktur lama 9 kolom; baris lama tetap dipertahankan dengan treatment kosong. Header lain yang tidak dikenali tetap ditolak.
- Riwayat CSI menampilkan treatment tersimpan tanpa mengubah perhitungan status cleaning 30 hari atau ringkasan DC HighTemp.
- Menambahkan form Daily Report cetak berdasarkan tanggal pekerjaan yang tersimpan, nama site/alamat, maksimal empat personil, serta nama PIC dan Site Leader.
- Area Cleaning dibentuk dari Nama DC + sisi A/B + jenis pekerjaan. Daftar treatment pada setiap area menampilkan centang sesuai data tersimpan; layout cetak A4 landscape mengikuti bagian utama template PDF.
- Fitur Report WhatsApp yang sudah ada tetap dipertahankan.
- Pemeriksaan kode sumber dilakukan; **validasi browser, Google Sheets, dan deployment Apps Script masih diperlukan**.


## 2026-10-13 — CSI Daily Report portrait dan popup WhatsApp
- Daily Report cetak diubah ke A4 portrait dengan penyesuaian lebar kolom dan ruang penulisan.
- Nama Site dan Alamat dikunci menjadi **CWUP Karawang** dan **Karawang** agar tidak perlu diisi manual.
- Menambahkan field manual **Nama TIM CSI** untuk nama pada bagian tanda tangan DIBUAT.
- Menghapus card WhatsApp terpisah; tombol **Buat Report WhatsApp** sekarang berada di card Daily Report.
- Report WhatsApp ditampilkan dalam popup dengan tombol **Edit** dan **Kirim via WhatsApp**. Isi pesan dapat diedit sebelum membuka WhatsApp; pengiriman tetap dilakukan oleh pengguna di WhatsApp.
- Validasi sumber: pemeriksaan sintaks JavaScript dan pemeriksaan struktur HTML/CSS; uji browser, print PDF portrait, serta alur popup masih perlu dilakukan.
