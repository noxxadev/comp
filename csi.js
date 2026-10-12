(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('csiWorkForm');
  const saveButton = $('saveWorkBtn');
  const historyBody = $('historyBody');
  const notice = $('csiNotice');
  let allRows = [];
  let busy = false;

  function showNotice(message, kind) {
    notice.textContent = message;
    notice.dataset.kind = kind || 'info';
    notice.hidden = !message;
  }
  function session() {
    return window.CompAuth?.getSession?.() || localStorage.getItem('comp.auth.session') || '';
  }
  function configUrl() {
    const url = String(window.CompCsiConfig?.webAppUrl || '').trim();
    if (!url) throw new Error('URL Web App CSI belum diatur di csi-google-sheets-config.js.');
    if (!/^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+\/s|macros\/s)\/[^/]+\/exec(?:\?.*)?$/.test(url)) throw new Error('URL Web App CSI tidak valid. Gunakan URL deployment yang berakhiran /exec.');
    return url;
  }
  async function request(action, payload = {}) {
    const response = await fetch(configUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action, session: session(), ...payload }),
      cache: 'no-store', credentials: 'omit', redirect: 'follow'
    });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) { throw new Error('Respons CSI tidak valid. Pastikan URL Web App sudah benar dan deployment terbaru sudah aktif.'); }
    if (!response.ok || !result?.ok) throw new Error(result?.error || 'Permintaan CSI gagal.');
    return result;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function dcList() {
    const names = new Set();
    Object.values(window.masterData || {}).forEach(location => {
      const match = String(location || '').trim().toUpperCase().match(/^(GBE\.[A-F]\d+[A-Z]?)(?:\.|$)/);
      if (match) names.add(match[1].replace(/^GBE\./, ''));
    });
    return [...names].sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
  }
  function populateDcOptions() {
    const list = dcList();
    if (!list.length) throw new Error('Nama DC tidak ditemukan dari master-data.js.');
    const options = list.map(dc => '<option value="' + escapeHtml(dc) + '">' + escapeHtml(dc) + '</option>').join('');
    $('dcName').innerHTML = '<option value="">Pilih Nama DC</option>' + options;
    $('filterDc').innerHTML = '<option value="">Semua DC</option>' + options;
  }
  function asDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function dateText(value, withTime = false) {
    const date = asDate(value);
    if (!date) return value ? String(value) : '—';
    const opts = withTime
      ? {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}
      : {day:'2-digit',month:'short',year:'numeric'};
    return new Intl.DateTimeFormat('id-ID', opts).format(date);
  }
  function ageDays(value) {
    const date = asDate(value);
    if (!date) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    return Math.max(0, Math.floor((today - date) / 86400000));
  }
  function latestCleaningFor(dc, side) {
    return allRows.filter(row => String(row[3]) === dc && String(row[4]) === side && String(row[5]) === 'Cleaning')
      .sort((a,b) => new Date(b[2]).getTime() - new Date(a[2]).getTime() || new Date(b[1]).getTime() - new Date(a[1]).getTime())[0] || null;
  }
  function oldSideKeys() {
    const keys = new Set();
    const pairs = new Set(allRows.map(row => String(row[3]) + '|' + String(row[4])));
    pairs.forEach(key => {
      const [dc, side] = key.split('|');
      const last = latestCleaningFor(dc, side);
      const age = last ? ageDays(last[2]) : null;
      if (age !== null && age >= 30) keys.add(key);
    });
    return keys;
  }
  function renderHistory() {
    const dc = $('filterDc').value, job = $('filterJob').value;
    const from = $('filterFrom').value, to = $('filterTo').value, oldOnly = $('filterOld').checked;
    const oldKeys = oldSideKeys();
    const rows = allRows.filter(row => {
      const workDate = String(row[2] || '').slice(0,10);
      if (dc && row[3] !== dc) return false;
      if (job && row[5] !== job) return false;
      if (from && workDate < from) return false;
      if (to && workDate > to) return false;
      if (oldOnly && !oldKeys.has(String(row[3]) + '|' + String(row[4]))) return false;
      return true;
    }).sort((a,b) => new Date(b[2]).getTime() - new Date(a[2]).getTime() || new Date(b[1]).getTime() - new Date(a[1]).getTime());
    $('historyCount').textContent = rows.length + ' catatan ditampilkan · ' + allRows.length + ' total catatan';
    if (!rows.length) {
      historyBody.innerHTML = '<tr><td colspan="7" class="csi-empty">Tidak ada riwayat yang sesuai filter.</td></tr>';
      return;
    }
    historyBody.innerHTML = rows.map(row => {
      const cleaning = latestCleaningFor(String(row[3]), String(row[4]));
      const age = cleaning ? ageDays(cleaning[2]) : null;
      const status = !cleaning ? '<span class="csi-pill normal">Belum ada cleaning</span>' : age >= 30 ? '<span class="csi-pill old">Perlu Cleaning · ' + age + ' hari</span>' : '<span class="csi-pill normal">Normal · ' + age + ' hari</span>';
      const jobClass = row[5] === 'Replace' ? 'replace' : 'cleaning';
      return '<tr><td>' + escapeHtml(dateText(row[1], true)) + '</td><td>' + escapeHtml(dateText(row[2])) + '</td><td><strong>' + escapeHtml(row[3]) + '</strong></td><td>' + escapeHtml(row[4]) + '</td><td><span class="csi-pill ' + jobClass + '">' + escapeHtml(row[5]) + '</span></td><td>' + escapeHtml(row[8] || '—') + '</td><td>' + status + '</td></tr>';
    }).join('');
  }
  async function loadHistory() {
    $('refreshHistoryBtn').disabled = true;
    try {
      const result = await request('getHistory');
      allRows = Array.isArray(result.rows) ? result.rows.map(row => {
        const normalized = Array.isArray(row) ? row.slice() : row;
        if (Array.isArray(normalized)) normalized[3] = String(normalized[3] || '').trim().replace(/^GBE\./i, '');
        return normalized;
      }) : [];
      renderHistory();
      $('reportPreview').value = '';
      $('sendReportBtn').disabled = true;
    } finally { $('refreshHistoryBtn').disabled = false; }
  }

  function localDateValue(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function reportDateText(value) {
    const parts = String(value || '').split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : String(value || '');
  }
  function buildDailyReport(dateValue) {
    const rows = allRows.filter(row => String(row[2] || '').slice(0, 10) === dateValue)
      .sort((a, b) => String(a[3]).localeCompare(String(b[3]), undefined, {numeric: true}) ||
        String(a[5]).localeCompare(String(b[5])) || String(a[4]).localeCompare(String(b[4])));
    if (!rows.length) return '';
    const dcGroups = new Map();
    const totals = { Cleaning: 0, Replace: 0 };
    rows.forEach(row => {
      const dc = String(row[3] || '').trim() || 'DC tidak diketahui';
      const job = String(row[5] || '').trim();
      const side = String(row[4] || '').trim();
      const notes = String(row[8] || '').trim();
      if (!dcGroups.has(dc)) dcGroups.set(dc, new Map());
      const jobGroups = dcGroups.get(dc);
      const groupKey = job + '|' + notes;
      if (!jobGroups.has(groupKey)) jobGroups.set(groupKey, { job, notes, sides: { A: 0, B: 0 } });
      const group = jobGroups.get(groupKey);
      if (side === 'A' || side === 'B') {
        group.sides[side] += 1;
        if (job === 'Cleaning' || job === 'Replace') totals[job] += 1;
      }
    });
    const lines = ['Daily Report CSI', 'Tanggal: ' + reportDateText(dateValue), ''];
    [...dcGroups.keys()].sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).forEach(dc => {
      lines.push('Nama DC: ' + dc);
      [...dcGroups.get(dc).values()].forEach(group => {
        const sideParts = ['A', 'B'].filter(side => group.sides[side] > 0).map(side =>
          'Sisi ' + side + (group.sides[side] > 1 ? ' (' + group.sides[side] + ' catatan)' : ''));
        if (!sideParts.length) return;
        lines.push('- ' + group.job + ': ' + sideParts.join(', '));
        if (group.notes) lines.push('  Catatan: ' + group.notes);
      });
      lines.push('');
    });
    lines.push('Rekap pekerjaan:');
    lines.push('- Cleaning: ' + totals.Cleaning + ' sisi');
    lines.push('- Replace: ' + totals.Replace + ' sisi');
    lines.push('- Total: ' + (totals.Cleaning + totals.Replace) + ' sisi');
    return lines.join('\n');
  }
  async function init() {
    if (!session()) { location.replace('login.html'); return; }
    populateDcOptions();
    $('workDate').value = localDateValue();
    $('reportDate').value = localDateValue();
    await request('validateAccess');
    await loadHistory();
    showNotice('Akses CSI terverifikasi. Riwayat berhasil dimuat.', 'success');
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true; saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    showNotice('', '');
    let savedCount = 0;
    try {
      const result = await request('saveWork', {
        dcName: $('dcName').value, workDate: $('workDate').value,
        frameSide: $('frameSide').value, jobType: $('jobType').value,
        notes: $('notes').value.trim()
      });
      savedCount = Number(result.saved) || 0;
      $('notes').value = '';
    } catch (error) {
      showNotice(error.message || 'Gagal menyimpan pekerjaan.', 'error');
      busy = false; saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-floppy-disk"></i> Simpan Pekerjaan';
      return;
    }
    try {
      await loadHistory();
      showNotice('Berhasil menyimpan ' + savedCount + ' catatan pekerjaan.', 'success');
    } catch (error) {
      showNotice('Pekerjaan tersimpan (' + savedCount + ' catatan), tetapi riwayat belum berhasil dimuat ulang. Tekan Muat Ulang; jangan simpan ulang pekerjaan yang sama.', 'error');
    } finally {
      busy = false; saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-floppy-disk"></i> Simpan Pekerjaan';
    }
  });
  $('refreshHistoryBtn').addEventListener('click', async () => {
    try { await loadHistory(); showNotice('Riwayat berhasil diperbarui.', 'success'); }
    catch (error) { showNotice(error.message, 'error'); }
  });
  $('generateReportBtn').addEventListener('click', async () => {
    const button = $('generateReportBtn');
    const dateValue = $('reportDate').value;
    if (!dateValue) { showNotice('Pilih tanggal laporan terlebih dahulu.', 'error'); return; }
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyiapkan laporan...';
    try {
      await loadHistory();
      const message = buildDailyReport(dateValue);
      if (!message) {
        $('reportPreview').value = 'Tidak ada pekerjaan CSI yang tersimpan pada tanggal ' + reportDateText(dateValue) + '.';
        $('sendReportBtn').disabled = true;
        showNotice('Tidak ada pekerjaan tersimpan pada tanggal tersebut. Laporan WhatsApp belum dapat dikirim.', 'info');
      } else {
        $('reportPreview').value = message;
        $('sendReportBtn').disabled = false;
        showNotice('Report harian berhasil dibuat. Periksa pesan sebelum membuka WhatsApp.', 'success');
      }
    } catch (error) {
      showNotice('Gagal membuat report: ' + (error.message || 'periksa koneksi CSI.'), 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-file-lines"></i> Buat Report WhatsApp';
    }
  });
  $('sendReportBtn').addEventListener('click', () => {
    const message = $('reportPreview').value;
    if (!message || $('sendReportBtn').disabled) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
  });
  $('reportDate').addEventListener('change', () => {
    $('reportPreview').value = '';
    $('sendReportBtn').disabled = true;
  });
  ['filterDc','filterJob','filterFrom','filterTo','filterOld'].forEach(id => $(id).addEventListener('change', renderHistory));
  $('clearFiltersBtn').addEventListener('click', () => {
    $('filterDc').value = ''; $('filterJob').value = ''; $('filterFrom').value = ''; $('filterTo').value = ''; $('filterOld').checked = false; renderHistory();
  });
  const menuToggle = $('menuToggle');
  const sidebar = $('sidebar');
  const sidebarOverlay = $('sidebarOverlay');
  function closeSidebar() {
    sidebar?.classList.remove('active');
    sidebarOverlay?.classList.remove('active');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }
  menuToggle?.addEventListener('click', () => {
    const isOpen = sidebar?.classList.toggle('active') || false;
    sidebarOverlay?.classList.toggle('active', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  sidebarOverlay?.addEventListener('click', closeSidebar);
  sidebar?.querySelectorAll('.hub-nav a').forEach(link => link.addEventListener('click', closeSidebar));

  init().catch(error => {
    showNotice(error.message || 'CSI gagal dimuat.', 'error');
    historyBody.innerHTML = '<tr><td colspan="7" class="csi-empty">Gagal memuat data. Periksa konfigurasi dan deployment CSI.</td></tr>';
  });
})();