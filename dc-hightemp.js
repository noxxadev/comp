(() => {
  'use strict';

  const state = {
    file: null,
    rows: [],
    ipColumn: -1,
    ranking: [],
    allRanking: [],
    total: 0,
    progressRows: [],
    selectedDc: ''
  };

  const $ = (id) => document.getElementById(id);
  const historyFile = $('historyFile');
  const uploadArea = $('uploadArea');
  const fileName = $('fileName');
  const fileStatus = $('fileStatus');
  const processBtn = $('processBtn');
  const clearBtn = $('clearBtn');
  const errorMessage = $('errorMessage');
  const loading = $('loading');
  const resultsSection = $('resultsSection');
  const stats = $('stats');
  const rankingBody = $('rankingBody');
  const emptyRanking = $('emptyRanking');
  const resultNote = $('resultNote');
  const progressPanel = $('progressPanel');
  const progressTitle = $('progressTitle');
  const closeProgressBtn = $('closeProgressBtn');
  const progressSummary = $('progressSummary');
  const progressChart = $('progressChart');
  const progressHistoryBody = $('progressHistoryBody');
  const progressEmpty = $('progressEmpty');
  const trackedAccess = $('trackedAccess');
  const trackedDcSelect = $('trackedDcSelect');
  const openTrackedBtn = $('openTrackedBtn');

  const getConfig = () => window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };

  const apiGet = async (action, extra = {}) => {
    const c = getConfig();
    if (!c.webAppUrl) throw new Error('Google Sheets belum dikonfigurasi.');
    const p = new URLSearchParams({ action, ...extra });
    if (c.requestKey) p.set('requestKey', String(c.requestKey));
    const r = await fetch(c.webAppUrl + (c.webAppUrl.includes('?') ? '&' : '?') + p.toString(), { cache: 'no-store' });
    const raw = await r.text();
    let x;
    try { x = JSON.parse(raw); } catch (_) { throw new Error('Google Apps Script mengembalikan response tidak valid.'); }
    if (!r.ok || !x?.ok) throw new Error(x?.error || 'Request gagal.');
    return x;
  };

  const apiPost = async (payload) => {
    const c = getConfig();
    if (!c.webAppUrl) throw new Error('Google Sheets belum dikonfigurasi.');
    const r = await fetch(c.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ ...payload, requestKey: String(c.requestKey || '') })
    });
    const raw = await r.text();
    let x;
    try { x = JSON.parse(raw); } catch (_) { throw new Error('Google Apps Script mengembalikan response tidak valid.'); }
    if (!r.ok || !x?.ok) throw new Error(x?.error || 'Request gagal.');
    return x;
  };

  const formatRate = (v) =>
    Number(v || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

  const formatNumber = (v) => Number(v || 0).toLocaleString('id-ID');

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  const loadProgress = async () => {
    try {
      const x = await apiGet('getDcProgress');
      state.progressRows = Array.isArray(x.rows) ? x.rows : [];
      updateTrackedAccess();
    } catch (e) {
      console.warn('DC Progress belum tersedia:', e);
      state.progressRows = [];
      updateTrackedAccess();
    }
  };

  const showError = (message) => {
    errorMessage.textContent = message || '';
    errorMessage.classList.toggle('visible', Boolean(message));
  };

  const normalizeHeader = (value) => String(value ?? '')
    .trim().toLowerCase()
    .replace(/[\s_\-]+/g, '');

  const isIPv4 = (value) => {
    const parts = String(value ?? '').trim().split('.');
    return parts.length === 4 && parts.every(part => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  };

  const normalizeIP = (value) => {
    const ip = String(value ?? '').trim().replace(/\s+/g, '');
    return isIPv4(ip) ? ip : '';
  };

  const findIpColumn = (headers, rows) => {
    const preferred = new Set(['ip', 'ipaddress', 'ipaddr', 'minerip', 'ipminer', 'ipaddressminer']);
    const normalized = headers.map(normalizeHeader);
    const preferredIndex = normalized.findIndex(value => preferred.has(value));
    if (preferredIndex >= 0) return preferredIndex;

    const containsIndex = normalized.findIndex(value => value.includes('ip') && !value.includes('zipcode'));
    if (containsIndex >= 0) return containsIndex;

    let bestIndex = -1;
    let bestScore = 0;
    for (let col = 0; col < headers.length; col++) {
      let score = 0;
      for (let row = 0; row < Math.min(rows.length, 100); row++) {
        if (normalizeIP(rows[row][col])) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIndex = col;
      }
    }
    return bestScore > 0 ? bestIndex : -1;
  };

  const readWorkbook = async (file) => {
    if (typeof XLSX === 'undefined') throw new Error('Library Excel belum termuat. Refresh halaman lalu coba lagi.');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: true });
    if (!workbook.SheetNames.length) throw new Error('File tidak memiliki sheet.');

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    if (!matrix.length) throw new Error('File kosong.');

    let headerIndex = matrix.findIndex(row => row.some(cell => normalizeHeader(cell).includes('ip')));
    if (headerIndex < 0) headerIndex = 0;

    const headers = matrix[headerIndex] || [];
    const dataRows = matrix.slice(headerIndex + 1).filter(row => row.some(cell => String(cell ?? '').trim() !== ''));
    const ipColumn = findIpColumn(headers, dataRows);
    if (ipColumn < 0) throw new Error('Kolom IP tidak ditemukan. Pastikan file memiliki kolom IP atau IP Address.');

    state.rows = dataRows;
    state.ipColumn = ipColumn;
    state.file = file;

    const validCount = dataRows.reduce((count, row) => count + (normalizeIP(row[ipColumn]) ? 1 : 0), 0);
    fileName.textContent = file.name;
    fileStatus.textContent = `Kolom IP: ${headers[ipColumn] || `Kolom ${ipColumn + 1}`} • ${validCount.toLocaleString('id-ID')} IP valid dari ${dataRows.length.toLocaleString('id-ID')} baris`;
    processBtn.disabled = validCount === 0;
    showError('');
    resultsSection.hidden = true;
  };

  const renderStats = (values) => {
    const cards = [
      ['Total IP', values.total.toLocaleString('id-ID'), 'Seluruh IP valid yang dibaca'],
      ['Unique IP', values.unique.toLocaleString('id-ID'), 'IP unik dalam history'],
      ['DC Teridentifikasi', values.recognized.toLocaleString('id-ID'), 'Kemunculan IP yang punya mapping'],
      ['Bukan IP DC', values.unrecognized.toLocaleString('id-ID'), 'Kemunculan IP tanpa mapping']
    ];
    stats.innerHTML = cards.map(([label, value, sub]) =>
      `<div class="dc-stat"><span class="dc-stat-label">${label}</span><strong class="dc-stat-value">${value}</strong><span class="dc-stat-sub">${sub}</span></div>`
    ).join('');
  };

  const extractDcName = (location) => {
    const parts = String(location ?? '').trim().split('.');
    if (parts.length >= 2 && parts[0].toUpperCase() === 'GBE' && parts[1].trim()) return parts[1].trim();
    return '';
  };

  const calculateSnapshot = () => {
    const counts = new Map();
    const uniqueIps = new Set();
    let total = 0;
    let recognized = 0;

    for (const row of state.rows) {
      const ip = normalizeIP(row[state.ipColumn]);
      if (!ip) continue;
      total++;
      uniqueIps.add(ip);

      const location = window.masterData && window.masterData[ip];
      const dcName = extractDcName(location);
      if (!dcName) continue;

      recognized++;
      counts.set(dcName, (counts.get(dcName) || 0) + 1);
    }

    const unrecognized = total - recognized;
    state.total = total;

    const allRanking = [...counts.entries()]
      .map(([name, count]) => ({ name, count, rate: total ? count / total * 100 : 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { numeric: true }));

    state.allRanking = allRanking;
    state.ranking = allRanking.slice(0, 5);

    renderStats({ total, unique: uniqueIps.size, recognized, unrecognized });

    rankingBody.innerHTML = state.ranking.map((item, index) =>
      '<tr>' +
      '<td class="dc-rank">#' + (index + 1) + '</td>' +
      '<td class="dc-name">' + escapeHtml(item.name) + '</td>' +
      '<td class="dc-count">' + formatNumber(item.count) + '</td>' +
      '<td class="dc-rate">' + formatRate(item.rate) + '</td>' +
      '<td><button class="dc-progress-btn" type="button" data-progress-dc="' + encodeURIComponent(item.name) + '"><i class="fas fa-chart-line"></i> Progress</button></td>' +
      '</tr>'
    ).join('');

    emptyRanking.hidden = state.ranking.length !== 0;
    resultNote.textContent = state.ranking.length
      ? `Menampilkan 5 DC teratas dari ${counts.size.toLocaleString('id-ID')} Nama DC yang teridentifikasi. Perhitungan menggunakan setiap kemunculan IP, bukan hanya IP unik.`
      : 'Tidak ada Nama DC yang dapat diambil dari mapping master-data.js.';

    resultsSection.hidden = false;
    updateTrackedAccess();
  };

  const getRankMap = () => {
    const map = new Map();
    state.allRanking.forEach((item, index) => map.set(item.name, index + 1));
    return map;
  };

  const makeSnapshotId = () => {
    const f = state.file;
    if (!f) return '';
    return [f.name, f.size, f.lastModified].join('|').slice(0, 500);
  };

  const persistTrackedSnapshot = async () => {
    if (!state.progressRows.length || !state.file?.name) return;

    const rankMap = getRankMap();
    const items = state.progressRows.map(progress => {
      const dcName = String(progress.dcName || '').trim();
      const item = state.allRanking.find(row => row.name.toLowerCase() === dcName.toLowerCase());
      const count = item ? item.count : 0;
      const rate = state.total ? count / state.total * 100 : 0;
      const rank = rankMap.get(item?.name || dcName) || 0;

      return {
        dcName,
        count,
        total: state.total,
        rate,
        rank,
        isTop5: rank > 0 && rank <= 5
      };
    });

    try {
      await apiPost({
        action: 'saveDcProgressSnapshot',
        sourceFile: state.file.name,
        snapshotId: makeSnapshotId(),
        total: state.total,
        items
      });
      await loadProgress();
      if (state.selectedDc && !progressPanel.hidden) await renderProgress(state.selectedDc);
    } catch (e) {
      console.warn('Snapshot DC Progress gagal disimpan:', e);
      showError('Hasil Top 5 berhasil dihitung, tetapi snapshot progress belum tersimpan: ' + e.message);
    }
  };

  const renderSummary = (row) => {
    const status = String(row.status || 'Tetap');
    const statusClass = status === 'Berkurang' ? 'decrease' : status === 'Bertambah' ? 'increase' : 'same';
    progressSummary.innerHTML = [
      ['Baseline', formatNumber(row.baselineCount)],
      ['Current', formatNumber(row.currentCount)],
      ['Perubahan', (row.countChange > 0 ? '+' : '') + formatNumber(row.countChange)],
      ['% Perubahan', (row.percentChange > 0 ? '+' : '') + formatRate(row.percentChange)],
      ['Progress', formatRate(row.progressPercent)],
      ['Status', '<span class="dc-progress-status ' + statusClass + '">' + escapeHtml(status) + '</span>']
    ].map(([label, value]) =>
      '<div class="dc-progress-metric"><span>' + label + '</span><strong>' + value + '</strong></div>'
    ).join('');
  };

  const renderChart = (history) => {
    if (!history.length) {
      progressChart.innerHTML = '<div class="dc-chart-empty">Belum ada data grafik.</div>';
      return;
    }

    const width = 760;
    const height = 280;
    const pad = { left: 52, right: 20, top: 22, bottom: 48 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const values = history.map(row => Number(row.count || 0));
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const x = (i) => history.length === 1 ? pad.left + plotW / 2 : pad.left + (i / (history.length - 1)) * plotW;
    const y = (v) => pad.top + (max - v) / range * plotH;
    const points = history.map((row, i) => x(i) + ',' + y(Number(row.count || 0))).join(' ');
    const gridValues = [max, min === max ? 0 : min + range / 2, min];

    const grid = gridValues.map(v =>
      '<line x1="' + pad.left + '" y1="' + y(v) + '" x2="' + (width - pad.right) + '" y2="' + y(v) + '" class="dc-chart-grid"></line>' +
      '<text x="' + (pad.left - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="dc-chart-label">' + formatNumber(v) + '</text>'
    ).join('');

    const labels = history.map((row, i) => {
      const label = String(row.sourceFile || ('Snapshot ' + (i + 1)));
      const short = label.length > 18 ? label.slice(0, 15) + '…' : label;
      return '<text x="' + x(i) + '" y="' + (height - 15) + '" text-anchor="middle" class="dc-chart-label" title="' + escapeHtml(label) + '">' + escapeHtml(short) + '</text>';
    }).join('');

    const dots = history.map((row, i) =>
      '<circle cx="' + x(i) + '" cy="' + y(Number(row.count || 0)) + '" r="4" class="dc-chart-dot"><title>' +
      escapeHtml(String(row.sourceFile || 'Snapshot')) + ': ' + formatNumber(row.count) + ' IP</title></circle>'
    ).join('');

    progressChart.innerHTML =
      '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' +
      grid +
      '<polyline points="' + points + '" class="dc-chart-line" fill="none"></polyline>' +
      dots +
      labels +
      '</svg>';
  };

  const renderProgress = async (dcName = state.selectedDc) => {
    state.selectedDc = dcName;
    const row = state.progressRows.find(x => String(x.dcName || '').toLowerCase() === String(dcName || '').toLowerCase());

    progressTitle.textContent = 'Progress ' + dcName;

    if (!row) {
      progressSummary.innerHTML = '';
      progressChart.innerHTML = '';
      progressHistoryBody.innerHTML = '';
      progressEmpty.hidden = false;
      return;
    }

    renderSummary(row);

    try {
      const x = await apiGet('getDcProgressHistory', { progressId: row.progressId });
      const history = Array.isArray(x.rows) ? x.rows : [];
      renderChart(history);

      progressHistoryBody.innerHTML = history.map(item =>
        '<tr>' +
        '<td title="' + escapeHtml(item.sourceFile || '') + '">' + escapeHtml(item.sourceFile || '-') + '</td>' +
        '<td class="dc-count">' + formatNumber(item.count) + '</td>' +
        '<td class="dc-rate">' + formatRate(item.rate) + '</td>' +
        '<td class="' + (Number(item.countChange || 0) < 0 ? 'decrease' : Number(item.countChange || 0) > 0 ? 'increase' : '') + '">' +
          (Number(item.countChange || 0) > 0 ? '+' : '') + formatNumber(item.countChange) +
        '</td>' +
        '<td>' + (Number(item.percentChange || 0) > 0 ? '+' : '') + formatRate(item.percentChange) + '</td>' +
        '<td class="' + (item.isTop5 ? 'yes' : 'no') + '">' + (item.isTop5 ? 'Ya' : 'Tidak') + '</td>' +
        '<td>' + escapeHtml(item.recordedAt || '-') + '</td>' +
        '</tr>'
      ).join('');

      progressEmpty.hidden = history.length !== 0;
    } catch (e) {
      progressHistoryBody.innerHTML = '';
      progressChart.innerHTML = '<div class="dc-chart-empty">History belum dapat dimuat.</div>';
      progressEmpty.hidden = false;
      showError('Progress ' + dcName + ' ditemukan, tetapi history belum dapat dimuat: ' + e.message);
    }
  };

  const openProgress = async (dc) => {
    if (!dc) return;
    state.selectedDc = dc;
    progressPanel.hidden = false;
    await renderProgress(dc);
    progressPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const addProgress = async (dc) => {
    try {
      const item = state.allRanking.find(x => x.name === dc);
      if (!item) throw new Error('DC tidak ditemukan pada hasil snapshot.');
      if (!state.file?.name) throw new Error('File snapshot belum tersedia.');

      const button = rankingBody.querySelector('[data-progress-dc="' + encodeURIComponent(dc) + '"]');
      if (button) button.disabled = true;

      const rank = state.allRanking.findIndex(x => x.name === item.name) + 1;
      const x = await apiPost({
        action: 'addDcProgress',
        dcName: item.name,
        baselineCount: item.count,
        baselineTotal: state.total,
        baselineRate: item.rate,
        baselineRank: rank,
        baselineTop5: rank <= 5,
        baselineFile: state.file.name,
        snapshotId: makeSnapshotId()
      });

      await loadProgress();
      await openProgress(item.name);

      if (x.duplicate) {
        resultNote.textContent = item.name + ' sudah ada di daftar Progress.';
      } else {
        resultNote.textContent = item.name + ' sekarang dipantau. Snapshot baseline sudah tersimpan.';
      }
    } catch (e) {
      showError(e.message);
    } finally {
      const button = rankingBody.querySelector('[data-progress-dc="' + encodeURIComponent(dc) + '"]');
      if (button) button.disabled = false;
    }
  };

  const updateTrackedAccess = () => {
    const rows = state.progressRows || [];
    trackedAccess.hidden = rows.length === 0;
    trackedDcSelect.innerHTML = rows.map(row =>
      '<option value="' + escapeHtml(row.dcName) + '">' + escapeHtml(row.dcName) + '</option>'
    ).join('');
    if (rows.length && (!state.selectedDc || !rows.some(row => row.dcName === state.selectedDc))) {
      state.selectedDc = rows[0].dcName;
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = /\.(xls|xlsx|csv)$/i.test(file.name);
    if (!allowed) {
      showError('Format file tidak didukung. Gunakan .xls, .xlsx, atau .csv.');
      return;
    }

    try {
      processBtn.disabled = true;
      fileStatus.textContent = 'Membaca file...';
      await readWorkbook(file);
    } catch (error) {
      state.file = null;
      state.rows = [];
      state.ipColumn = -1;
      fileName.textContent = file.name;
      fileStatus.textContent = 'File belum siap diproses.';
      showError(error instanceof Error ? error.message : 'Gagal membaca file.');
    }
  };

  rankingBody.addEventListener('click', (event) => {
    const button = event.target.closest('[data-progress-dc]');
    if (!button) return;
    addProgress(decodeURIComponent(button.dataset.progressDc || ''));
  });

  closeProgressBtn.addEventListener('click', () => { progressPanel.hidden = true; });

  openTrackedBtn.addEventListener('click', () => openProgress(trackedDcSelect.value));

  trackedDcSelect.addEventListener('change', () => {
    if (trackedDcSelect.value) openProgress(trackedDcSelect.value);
  });

  loadProgress();

  historyFile.addEventListener('change', (event) => handleFile(event.target.files?.[0]));

  ['dragenter', 'dragover'].forEach(type => uploadArea.addEventListener(type, (event) => {
    event.preventDefault();
    uploadArea.classList.add('drag-over');
  }));

  ['dragleave', 'drop'].forEach(type => uploadArea.addEventListener(type, (event) => {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
  }));

  uploadArea.addEventListener('drop', (event) => handleFile(event.dataTransfer?.files?.[0]));

  processBtn.addEventListener('click', async () => {
    if (!state.file || state.ipColumn < 0) return;

    showError('');
    loading.hidden = false;
    processBtn.disabled = true;

    try {
      calculateSnapshot();
      await loadProgress();
      await persistTrackedSnapshot();
    } catch (e) {
      showError(e.message || 'Gagal menghitung snapshot.');
    } finally {
      loading.hidden = true;
      processBtn.disabled = false;
    }
  });

  clearBtn.addEventListener('click', () => {
    state.file = null;
    state.rows = [];
    state.ipColumn = -1;
    state.ranking = [];
    state.allRanking = [];
    state.total = 0;
    historyFile.value = '';
    fileName.textContent = 'Belum ada file dipilih';
    fileStatus.textContent = 'Belum ada data.';
    processBtn.disabled = true;
    resultsSection.hidden = true;
    progressPanel.hidden = true;
    stats.innerHTML = '';
    rankingBody.innerHTML = '';
    emptyRanking.hidden = true;
    resultNote.textContent = '';
    showError('');
  });

  const menuToggle = $('menuToggle');
  const sidebar = $('sidebar');
  const overlay = $('sidebarOverlay');

  if (menuToggle && sidebar && overlay) {
    const closeSidebar = () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    };

    menuToggle.addEventListener('click', () => {
      const active = sidebar.classList.toggle('active');
      overlay.classList.toggle('active', active);
      menuToggle.setAttribute('aria-expanded', String(active));
    });

    overlay.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));
    window.addEventListener('resize', () => { if (window.innerWidth > 780) closeSidebar(); });
  }
})();