(() => {
  'use strict';

  const state = {
    file: null,
    rows: [],
    ipColumn: -1,
    ranking: [],
    allRanking: [],
    total: 0,
    totalUniqueIps: 0,
    unmappedIps: [],
    progressRows: [],
    selectedDc: '',
    progressHistory: [],
    csiSummaryByDc: new Map(),
    csiSummaryError: '',
    machineCleaningByDc: new Map(),
    machineCleaningError: ''
  };

  const $ = (id) => document.getElementById(id);
  const historyFile = $('historyFile');
  const uploadArea = $('uploadArea');
  const fileName = $('fileName');
  const fileStatus = $('fileStatus');
  const processBtn = $('processBtn');
  const recordSnapshotBtn = $('recordSnapshotBtn');
  const clearBtn = $('clearBtn');
  const errorMessage = $('errorMessage');
  const loading = $('loading');
  const resultsSection = $('resultsSection');
  const rankingBody = $('rankingBody');
  const emptyRanking = $('emptyRanking');
  const resultNote = $('resultNote');
  const progressPanel = $('progressPanel');
  const progressTitle = $('progressTitle');
  const downloadProgressBtn = $('downloadProgressBtn');
  const progressSaveStatus = $('progressSaveStatus');
  const progressSummary = $('progressSummary');
  const progressChart = $('progressChart');
  const progressHistoryBody = $('progressHistoryBody');
  const progressEmpty = $('progressEmpty');
  const trackedProgressCard = $('trackedProgressCard');
  const trackedAccess = $('trackedAccess');
  const trackedDcSelect = $('trackedDcSelect');
  const openTrackedBtn = $('openTrackedBtn');
  const targetDcSearch = $('targetDcSearch');
  const targetDcList = $('targetDcList');
  const recordTargetBtn = $('recordTargetBtn');
  const targetDcInfo = $('targetDcInfo');

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

  const loadCsiSummary = async () => {
    const config = window.CompCsiConfig || {};
    const session = window.CompAuth?.getSession?.() || localStorage.getItem('comp.auth.session') || '';
    if (!config.webAppUrl || !session) throw new Error('Endpoint CSI atau sesi login belum tersedia.');
    const response = await fetch(config.webAppUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ action: 'getHighTempSummary', session }), cache: 'no-store', credentials: 'omit', redirect: 'follow' });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) { throw new Error('Respons ringkasan CSI tidak valid.'); }
    if (!response.ok || !result?.ok) throw new Error(result?.error || 'Gagal memuat ringkasan CSI.');
    state.csiSummaryError = '';
    state.csiSummaryByDc = new Map();
    (Array.isArray(result.rows) ? result.rows : []).forEach(row => {
      // CSI stores bare names such as "A1"; accept legacy "GBE.A1" records too.
      const rawName = String(row.dcName || '').trim().toUpperCase();
      const key = rawName.replace(/^GBE\./i, '');
      if (!key) return;
      if (!state.csiSummaryByDc.has(key)) state.csiSummaryByDc.set(key, {});
      state.csiSummaryByDc.get(key)[String(row.frameSide || '').trim().toUpperCase()] = row;
    });
    renderCsiSummaryCells();
  };

  const loadMachineCleaningSummary = async () => {
    try {
      const result = await apiGet('getDcMachineCleaningSummary');
      state.machineCleaningByDc = new Map();
      (Array.isArray(result.rows) ? result.rows : []).forEach(row => {
        const key = String(row.dcName || '').trim().toUpperCase();
        if (key) state.machineCleaningByDc.set(key, row);
      });
      state.machineCleaningError = '';
    } catch (error) {
      state.machineCleaningByDc = new Map();
      state.machineCleaningError = 'Data mesin tidak tersedia';
      console.warn('Ringkasan mesin dibersihkan belum dapat dimuat:', error);
    }
    renderMachineCleaningCells();
  };

  const renderMachineCleaningCells = () => {
    rankingBody.querySelectorAll('[data-machine-cleaning-dc]').forEach(cell => {
      const dc = String(cell.getAttribute('data-machine-cleaning-dc') || '').trim().toUpperCase();
      if (state.machineCleaningError) {
        cell.innerHTML = '<span class="dc-machine-cleaning-unavailable">' + escapeHtml(state.machineCleaningError) + '</span>';
        return;
      }
      const item = state.machineCleaningByDc.get(dc);
      if (!item) {
        cell.textContent = '—';
        cell.title = 'Tidak ada SN aktif untuk DC ini pada Machine List Current.';
        return;
      }
      cell.innerHTML = '<strong>' + formatNumber(item.cleanedMachines) + ' / ' + formatNumber(item.totalMachines) +
        '</strong><small>' + formatRate(item.cleaningRate) + ' sudah cleaning</small>';
      cell.title = formatNumber(item.notCleanedMachines) + ' mesin belum memiliki riwayat Selesai.';
    });
  };

  const formatCsiDate = value => {
    const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + '/' + match[2] + '/' + match[1] : '—';
  };

  const renderCsiSummaryCells = () => {
    rankingBody.querySelectorAll('[data-csi-dc]').forEach(cell => {
      const dc = String(cell.getAttribute('data-csi-dc') || '').trim().toUpperCase();
      const sides = state.csiSummaryByDc.get(dc) || {};
      if (state.csiSummaryError) {
        cell.innerHTML = '<span class="dc-csi-error">' + escapeHtml(state.csiSummaryError) + '</span>';
        return;
      }
      const line = side => {
        const item = sides[side];
        if (!item) return '<div><strong>' + side + ':</strong> Belum ada data</div>';
        const age = item.ageDays === null || item.ageDays === '' ? '' : ' · ' + escapeHtml(item.ageDays) + ' hari';
        const cleaning = item.lastCleaningDate ? 'Cleaning ' + formatCsiDate(item.lastCleaningDate) : 'Belum ada cleaning';
        const replace = item.lastReplaceDate ? ' · Replace ' + formatCsiDate(item.lastReplaceDate) : '';
        const lastWork = item.lastWorkDate
          ? 'Pekerjaan terakhir: ' + String(item.lastJobType || 'Pekerjaan') + ' ' + formatCsiDate(item.lastWorkDate)
          : 'Belum ada pekerjaan';
        return '<div><strong>' + side + ':</strong> ' + escapeHtml(item.status || 'Belum ada data') + age +
          '<small class="dc-csi-date">' + escapeHtml(lastWork) + '</small>' +
          '<small class="dc-csi-date">' + escapeHtml(cleaning + replace) + '</small></div>';
      };
      cell.innerHTML = line('A') + line('B');
    });
  };

  const formatRate = (v) =>
    Number(v || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

  const formatDcRate = (count, machineCount) =>
    Number(machineCount || 0) > 0 ? formatRate(Number(count || 0) / Number(machineCount) * 100) : '—';

  const formatNumber = (v) => Number(v || 0).toLocaleString('id-ID');

  const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const parts = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(date);
    const get = (type) => parts.find(part => part.type === type)?.value || '';
    return get('day') + '/' + get('month') + '/' + get('year') + ' ' +
      get('hour') + ':' + get('minute') + ':' + get('second') + ' WIB';
  };

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

  const extractDcName = (location) => {
    const parts = String(location ?? '').trim().split('.');
    if (parts.length >= 2 && parts[0].toUpperCase() === 'GBE' && parts[1].trim()) return parts[1].trim();
    return '';
  };

  const calculateSnapshot = () => {
    const dcCounts = new Map();
    const uniqueIps = new Set();
    const unmappedIps = new Set();
    let total = 0;

    for (const row of state.rows) {
      const ip = normalizeIP(row[state.ipColumn]);
      if (!ip) continue;
      total++;
      uniqueIps.add(ip);

      const location = window.masterData && window.masterData[ip];
      const dcName = extractDcName(location);
      if (!dcName) {
        unmappedIps.add(ip);
        continue;
      }

      const key = dcName.toUpperCase();
      if (!dcCounts.has(key)) dcCounts.set(key, { name: dcName, ips: new Set(), occurrences: 0 });
      const entry = dcCounts.get(key);
      entry.ips.add(ip);
      entry.occurrences++;
    }

    state.total = total;
    state.totalUniqueIps = uniqueIps.size;
    state.unmappedIps = [...unmappedIps].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const allRanking = [...dcCounts.values()].map(entry => {
      const machineData = state.machineCleaningByDc.get(entry.name.toUpperCase());
      const machineCount = Number(machineData?.totalMachines || 0);
      const count = entry.ips.size;
      return {
        name: entry.name,
        count,
        occurrences: entry.occurrences,
        machineCount,
        rate: machineCount > 0 ? count / machineCount * 100 : 0
      };
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { numeric: true }));

    state.allRanking = allRanking;
    state.ranking = allRanking.slice(0, 5);

    rankingBody.innerHTML = state.ranking.map((item, index) =>
      '<article class="dc-top-card">' +
        '<div class="dc-top-card-head">' +
          '<span class="dc-top-rank">#' + (index + 1) + '</span>' +
          '<span class="dc-top-label">TOP ' + (index + 1) + '</span>' +
          '<span class="dc-top-ip">' + formatNumber(item.occurrences) + ' Kemunculan IP</span>' +
        '</div>' +
        '<h3 class="dc-top-name">' + escapeHtml(item.name) + '</h3>' +
        '<div class="dc-top-rate"><span>Rasio mesin tercatat</span><strong>' + formatDcRate(item.count, item.machineCount) + '</strong></div>' +
        '<div class="dc-top-section"><span class="dc-top-section-label">IP Zero · Total Mesin</span>' +
          '<div class="dc-top-ip-occurrences">' + formatNumber(item.count) + ' IP Zero · ' + formatNumber(item.machineCount) + ' mesin tercatat</div>' +
        '</div>' +
        '<div class="dc-top-section"><span class="dc-top-section-label">Mesin Cleaning</span>' +
          '<div class="dc-machine-cleaning" data-machine-cleaning-dc="' + escapeHtml(item.name) + '">Memuat data...</div>' +
        '</div>' +
        '<div class="dc-top-section dc-top-celldeck"><span class="dc-top-section-label">Detail Celldeck</span>' +
          '<div class="dc-csi-detail" data-csi-dc="' + escapeHtml(item.name) + '">Memuat detail...</div>' +
        '</div>' +
        '<button class="dc-progress-btn" type="button" data-progress-dc="' + encodeURIComponent(item.name) + '"><i class="fas fa-chart-line"></i> Buka Progress</button>' +
      '</article>'
    ).join('');

    emptyRanking.hidden = state.ranking.length !== 0;
    const noRankingNote = state.ranking.length
      ? ''
      : '<p>Tidak ada Nama DC yang dapat diambil dari mapping master-data.js.</p>';
    const unmappedNote = state.unmappedIps.length
      ? '<details class="dc-unmapped-ips"><summary>' +
        formatNumber(state.unmappedIps.length) + ' IP unik tidak terpetakan ke DC</summary><p>' +
        escapeHtml(state.unmappedIps.join(', ')) + '</p></details>'
      : '';
    resultNote.innerHTML = noRankingNote + unmappedNote;

    resultsSection.hidden = false;
    renderMachineCleaningCells();
    updateTrackedAccess();
    updateTargetDc();
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
      const machineData = state.machineCleaningByDc.get(dcName.toUpperCase());
      const count = item ? item.count : 0;
      const occurrences = item ? item.occurrences : 0;
      const machineCount = item ? item.machineCount : Number(machineData?.totalMachines || 0);
      const rate = machineCount > 0 ? count / machineCount * 100 : 0;
      const rank = rankMap.get(item?.name || dcName) || 0;

      return {
        dcName,
        count,
        occurrences,
        machineCount,
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
      showError('Snapshot progress belum tersimpan: ' + e.message);
      throw e;
    }
  };

  const getTargetDcItem = () => {
    const value = String(targetDcSearch?.value || '').trim();
    if (!value) return null;
    return state.allRanking.find(item => item.name.toLowerCase() === value.toLowerCase()) || null;
  };

  const updateTargetDc = () => {
    if (!targetDcSearch || !recordTargetBtn) return;
    const hasData = Boolean(state.file && state.allRanking.length);
    targetDcSearch.disabled = !hasData;

    targetDcList.innerHTML = state.allRanking.map(item =>
      '<option value="' + escapeHtml(item.name) + '"></option>'
    ).join('');

    const item = getTargetDcItem();
    if (!item) {
      targetDcInfo.textContent = '';
      recordTargetBtn.disabled = true;
      return;
    }

    const tracked = state.progressRows.some(row =>
      String(row.dcName || '').toLowerCase() === item.name.toLowerCase()
    );

    const rank = state.allRanking.findIndex(row => row.name === item.name) + 1;
    targetDcInfo.textContent =
      item.name + ' • ' + formatNumber(item.count) + ' IP unik • ' +
      formatDcRate(item.count, item.machineCount) + ' • Rank #' + rank +
      (tracked ? ' • Sedang dipantau' : ' • Belum masuk Progress');

    recordTargetBtn.disabled = false;
  };

  const recordTargetSnapshot = async () => {
    const item = getTargetDcItem();
    if (!item || !state.file?.name || !state.total) return;

    const progress = state.progressRows.find(row =>
      String(row.dcName || '').toLowerCase() === item.name.toLowerCase()
    );
    if (!progress) {
      // addDcProgress records the initial baseline; do not save it a second time.
      showError('');
      recordTargetBtn.disabled = true;
      recordTargetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Merekam...';
      try {
        await addProgress(item.name);
      } finally {
        updateTargetDc();
        recordTargetBtn.innerHTML = '<i class="fas fa-camera"></i> Record Data DC';
      }
      return;
    }

    const rank = state.allRanking.findIndex(row => row.name === item.name) + 1;
    const isTop5 = rank > 0 && rank <= 5;

    showError('');
    recordTargetBtn.disabled = true;
    recordTargetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Merekam...';

    try {
      const result = await apiPost({
        action: 'saveDcProgressSnapshot',
        sourceFile: state.file.name,
        snapshotId: makeSnapshotId(),
        total: state.total,
        items: [{
          dcName: progress.dcName,
          count: item.count,
          occurrences: item.occurrences,
          machineCount: item.machineCount,
          total: state.total,
          rate: item.rate,
          rank,
          isTop5
        }]
      });

      await loadProgress();
      await renderProgress(progress.dcName);

      if (result.saved) {
        targetDcInfo.textContent = item.name + ' • ' + formatNumber(item.count) + ' IP unik • ' +
          formatDcRate(item.count, item.machineCount) + ' • Rank #' + rank + ' • Data berhasil direcord.';
        progressSaveStatus.innerHTML = '<i class="fas fa-circle-check"></i> Data ' +
          escapeHtml(item.name) + ' berhasil direcord.';
        progressSaveStatus.classList.add('visible');
      } else {
        targetDcInfo.textContent = item.name + ' • Data pada file ini sudah pernah direcord.';
        progressSaveStatus.innerHTML = '<i class="fas fa-circle-check"></i> Data ' +
          escapeHtml(item.name) + ' sudah pernah direcord dari file ini.';
        progressSaveStatus.classList.add('visible');
      }
    } catch (e) {
      showError('Data ' + item.name + ' belum tersimpan: ' + e.message);
    } finally {
      updateTargetDc();
      recordTargetBtn.innerHTML = '<i class="fas fa-camera"></i> Record Data DC';
    }
  };

  const normalizeDcKey = value => String(value || '').trim().toUpperCase().replace(/^GBE\./, '');

  const renderCurrentDcCondition = (dcName) => {
    const title = $('currentDcConditionTitle');
    const updated = $('currentDcConditionUpdated');
    const machine = $('currentDcMachine');
    const celldeck = $('currentDcCelldeck');
    if (!title || !updated || !machine || !celldeck) return;

    const key = normalizeDcKey(dcName);
    title.textContent = 'Kondisi Terkini DC ' + dcName;
    updated.textContent = 'Memuat sumber terbaru…';
    machine.innerHTML = '<div class="dc-condition-loading">Memuat data mesin…</div>';
    celldeck.innerHTML = '<div class="dc-condition-loading">Memuat detail CSI…</div>';

    const render = () => {
      const machineRow = [...state.machineCleaningByDc.entries()]
        .find(([name]) => normalizeDcKey(name) === key)?.[1];

      if (state.machineCleaningError) {
        machine.innerHTML = '<div class="dc-condition-unavailable">' + escapeHtml(state.machineCleaningError) + '</div>';
      } else if (!machineRow) {
        machine.innerHTML = '<div class="dc-condition-unavailable">Data mesin tidak ditemukan untuk DC ini.</div>';
      } else {
        machine.innerHTML =
          '<div class="dc-condition-machine-number">' + formatNumber(machineRow.cleanedMachines) + ' / ' + formatNumber(machineRow.totalMachines) + '</div>' +
          '<div class="dc-condition-subtitle">' + formatRate(machineRow.cleaningRate) + ' mesin sudah cleaning</div>' +
          '<div class="dc-condition-note">' + formatNumber(machineRow.notCleanedMachines) + ' mesin belum memiliki riwayat status Selesai.</div>';
      }

      if (state.csiSummaryError) {
        celldeck.innerHTML = '<div class="dc-condition-unavailable">' + escapeHtml(state.csiSummaryError) + '</div>';
      } else {
        const sides = state.csiSummaryByDc.get(key) || {};
        const sideMarkup = side => {
          const item = sides[side];
          if (!item) {
            return '<div class="dc-condition-side"><div class="dc-condition-side-head"><strong>Sisi ' + side + '</strong><span class="dc-condition-status unknown">Belum ada data</span></div><div class="dc-condition-note">Belum ada catatan pekerjaan CSI.</div></div>';
          }
          const status = String(item.status || 'Belum ada data');
          const statusClass = status === 'Normal' ? 'normal' : status === 'Perlu Cleaning' ? 'warning' : 'unknown';
          const age = item.ageDays === null || item.ageDays === '' || item.ageDays === undefined ? '—' : escapeHtml(item.ageDays) + ' hari';
          const lastWork = item.lastWorkDate
            ? escapeHtml(String(item.lastJobType || 'Pekerjaan')) + ' · ' + formatCsiDate(item.lastWorkDate)
            : 'Belum ada pekerjaan';
          return '<div class="dc-condition-side">' +
            '<div class="dc-condition-side-head"><strong>Sisi ' + side + '</strong><span class="dc-condition-status ' + statusClass + '">' + escapeHtml(status) + '</span></div>' +
            '<div class="dc-condition-facts">' +
              '<div><span>Cleaning terakhir</span><strong>' + escapeHtml(formatCsiDate(item.lastCleaningDate)) + '</strong></div>' +
              '<div><span>Umur cleaning</span><strong>' + age + '</strong></div>' +
              '<div><span>Replace terakhir</span><strong>' + escapeHtml(formatCsiDate(item.lastReplaceDate)) + '</strong></div>' +
            '</div><div class="dc-condition-note">Pekerjaan terakhir: ' + lastWork + '</div></div>';
        };
        celldeck.innerHTML = sideMarkup('A') + sideMarkup('B');
      }
      updated.textContent = 'Sumber data terbaru dimuat ' + formatDateTime(new Date().toISOString()) + '. Kondisi live, bukan rekaman historis snapshot IP.';
    };

    const refresh = async () => {
      const csiRefresh = loadCsiSummary().catch(error => {
        state.csiSummaryByDc = new Map();
        state.csiSummaryError = 'Detail CSI tidak tersedia';
        renderCsiSummaryCells();
        console.warn('Ringkasan CSI di Progress gagal dimuat:', error);
      });
      await Promise.all([loadMachineCleaningSummary(), csiRefresh]);
      render();
    };
    refresh().catch(error => {
      machine.innerHTML = '<div class="dc-condition-unavailable">Data mesin tidak tersedia.</div>';
      celldeck.innerHTML = '<div class="dc-condition-unavailable">Detail CSI tidak tersedia.</div>';
      updated.textContent = 'Gagal memperbarui kondisi terkini.';
      console.warn('Kondisi terkini DC gagal dimuat:', error);
    });
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

    // Backend returns newest first. Keep the table's original array unchanged.
    const ordered = history.map((row, index) => ({ row, index })).sort((a, b) => {
      const at = Date.parse(a.row.recordedAt);
      const bt = Date.parse(b.row.recordedAt);
      if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at - bt;
      return b.index - a.index;
    }).map(item => item.row);
    const values = ordered.map(row => Number(row.count));
    if (ordered.some((row, i) => row.count === '' || row.count === null || row.count === undefined || !Number.isFinite(values[i]) || values[i] < 0)) {
      progressChart.innerHTML = '<div class="dc-chart-empty">Jumlah IP pada history tidak valid.</div>';
      return;
    }

    const width = 760;
    const height = 280;
    const pad = { left: 52, right: 20, top: 22, bottom: 48 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const max = Math.max(...values, 1);
    const x = i => ordered.length === 1 ? pad.left + plotW / 2 : pad.left + i / (ordered.length - 1) * plotW;
    const y = v => pad.top + (max - v) / max * plotH;
    const points = values.map((value, i) => x(i) + ',' + y(value)).join(' ');
    const grid = [max, max / 2, 0].map(v =>
      '<line x1="' + pad.left + '" y1="' + y(v) + '" x2="' + (width - pad.right) + '" y2="' + y(v) + '" class="dc-chart-grid"></line>' +
      '<text x="' + (pad.left - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="dc-chart-label">' + formatNumber(v) + '</text>'
    ).join('');
    const labelStep = Math.max(1, Math.ceil(ordered.length / 5));
    const labels = ordered.map((row, i) => {
      if (i % labelStep !== 0 && i !== ordered.length - 1) return '';
      const time = formatDateTime(row.recordedAt);
      const label = time === '-' ? 'Snapshot ' + (i + 1) : time;
      return '<text x="' + x(i) + '" y="' + (height - 15) + '" text-anchor="middle" class="dc-chart-label">' + escapeHtml(label) + '</text>';
    }).join('');
    const dots = ordered.map((row, i) =>
      '<circle cx="' + x(i) + '" cy="' + y(values[i]) + '" r="4" class="dc-chart-dot"><title>' +
      escapeHtml(formatDateTime(row.recordedAt) + ' | ' + String(row.sourceFile || 'Snapshot') + ': ' + formatNumber(values[i]) + ' IP') + '</title></circle>'
    ).join('');
    progressChart.innerHTML =
      '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Trend jumlah IP dari snapshot terlama hingga terbaru">' +
      grid + '<polyline points="' + points + '" class="dc-chart-line" fill="none"></polyline>' + dots + labels + '</svg>';
  };

  const renderProgress = async (dcName = state.selectedDc) => {
    state.selectedDc = dcName;
    const row = state.progressRows.find(x => String(x.dcName || '').toLowerCase() === String(dcName || '').toLowerCase());

    progressTitle.textContent = 'Progress ' + dcName;
    progressSaveStatus.textContent = '';

    if (!row) {
      progressSummary.innerHTML = '';
      progressChart.innerHTML = '';
      progressHistoryBody.innerHTML = '';
      state.progressHistory = [];
      progressEmpty.hidden = false;
      downloadProgressBtn.disabled = true;
      return;
    }

    renderSummary(row);
    renderCurrentDcCondition(dcName);

    try {
      const x = await apiGet('getDcProgressHistory', { progressId: row.progressId });
      const history = Array.isArray(x.rows) ? x.rows : [];
      renderChart(history);

      progressHistoryBody.innerHTML = history.map(item =>
        '<tr>' +
        '<td title="' + escapeHtml(item.sourceFile || '') + '">' + escapeHtml(item.sourceFile || '-') + '</td>' +
        '<td class="dc-count">' + formatNumber(item.count) + '</td>' +
        '<td>' + formatNumber(item.occurrences) + '</td>' +
        '<td>' + formatNumber(item.machineCount) + '</td>' +
        '<td class="dc-rate">' + (Number(item.machineCount || 0) > 0 ? formatRate(item.rate) : '—') + '</td>' +
        '<td class="' + (Number(item.countChange || 0) < 0 ? 'decrease' : Number(item.countChange || 0) > 0 ? 'increase' : '') + '">' +
          (Number(item.countChange || 0) > 0 ? '+' : '') + formatNumber(item.countChange) +
        '</td>' +
        '<td>' + (Number(item.percentChange || 0) > 0 ? '+' : '') + formatRate(item.percentChange) + '</td>' +
        '<td class="' + (item.isTop5 ? 'yes' : 'no') + '">' + (item.isTop5 ? 'Ya' : 'Tidak') + '</td>' +
        '<td>' + escapeHtml(formatDateTime(item.recordedAt)) + '</td>' +
        '</tr>'
      ).join('');

      state.progressHistory = history;
      progressEmpty.hidden = history.length !== 0;
      downloadProgressBtn.disabled = history.length === 0;
    } catch (e) {
      state.progressHistory = [];
      progressHistoryBody.innerHTML = '';
      progressChart.innerHTML = '<div class="dc-chart-empty">History belum dapat dimuat.</div>';
      progressEmpty.hidden = false;
      downloadProgressBtn.disabled = true;
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
        baselineOccurrences: item.occurrences,
        baselineMachines: item.machineCount,
        baselineRank: rank,
        baselineTop5: rank <= 5,
        baselineFile: state.file.name,
        snapshotId: makeSnapshotId()
      });

      await loadProgress();
      await openProgress(item.name);

      if (x.duplicate) {
        resultNote.textContent = item.name + ' sudah ada di daftar Progress.';
        progressSaveStatus.innerHTML = '<i class="fas fa-circle-check"></i> ' + escapeHtml(item.name) + ' sudah tersimpan dan sedang dipantau.';
      } else {
        resultNote.textContent = item.name + ' sekarang dipantau. Snapshot baseline sudah tersimpan.';
        progressSaveStatus.innerHTML = '<i class="fas fa-circle-check"></i> ' + escapeHtml(item.name) + ' berhasil disimpan ke Progress.';
      }
      progressSaveStatus.classList.add('visible');
    } catch (e) {
      showError(e.message);
    } finally {
      const button = rankingBody.querySelector('[data-progress-dc="' + encodeURIComponent(dc) + '"]');
      if (button) button.disabled = false;
    }
  };

  const updateTrackedAccess = () => {
    const rows = state.progressRows || [];
    trackedProgressCard.hidden = rows.length === 0;
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

  openTrackedBtn.addEventListener('click', () => openProgress(trackedDcSelect.value));

  targetDcSearch.addEventListener('input', updateTargetDc);
  recordTargetBtn.addEventListener('click', recordTargetSnapshot);

  downloadProgressBtn.addEventListener('click', () => {
    const dcName = state.selectedDc || 'DC';
    const history = Array.isArray(state.progressHistory) ? state.progressHistory : [];
    if (!history.length) return;

    if (typeof XLSX === 'undefined') {
      showError('Library Excel belum termuat. Refresh halaman lalu coba lagi.');
      return;
    }

    const progress = state.progressRows.find(row =>
      String(row.dcName || '').toLowerCase() === String(dcName || '').toLowerCase()
    );
    const baseline = Number(progress?.baselineCount || history[0]?.count || 0);

    const headers = ['Record At', 'Nama DC', 'Baseline IP Unik', 'IP Unik', 'Kemunculan IP', 'Mesin Tercatat', 'Rasio HighTemp', 'Perubahan IP Unik', 'Perubahan %'];
    const rows = history.map(item => [
      formatDateTime(item.recordedAt),
      item.dcName || dcName,
      baseline,
      Number(item.count || 0),
      Number(item.occurrences || 0),
      Number(item.machineCount || 0),
      Number(item.machineCount || 0) > 0 ? Number(item.rate || 0) / 100 : '',
      Number(item.countChange || 0),
      Number(item.percentChange || 0) / 100
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [
      { wch: 22 }, { wch: 18 }, { wch: 17 }, { wch: 12 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 }
    ];

    for (let rowIndex = 2; rowIndex <= rows.length + 1; rowIndex++) {
      const rateCell = worksheet['G' + rowIndex];
      const percentCell = worksheet['I' + rowIndex];
      if (rateCell) rateCell.z = '0.00%';
      if (percentCell) percentCell.z = '0.00%';
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Progress');
    XLSX.writeFile(workbook, 'DC-Progress-' + dcName.replace(/[^a-z0-9_-]+/gi, '-') + '.xlsx');
  });


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

  recordSnapshotBtn.addEventListener('click', async () => {
    if (!state.file || !state.progressRows.length || !state.allRanking.length) return;

    showError('');
    recordSnapshotBtn.disabled = true;
    recordSnapshotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Merekam Snapshot...';

    try {
      await persistTrackedSnapshot();
      progressSaveStatus.innerHTML = '<i class="fas fa-circle-check"></i> Data snapshot berhasil direcord untuk DC yang sedang dipantau.';
      progressSaveStatus.classList.add('visible');
    } catch (e) {
      showError(e.message || 'Gagal merecord snapshot.');
    } finally {
      recordSnapshotBtn.disabled = false;
      recordSnapshotBtn.innerHTML = '<i class="fas fa-camera"></i> Record Data Snapshot';
    }
  });

  processBtn.addEventListener('click', async () => {
    if (!state.file || state.ipColumn < 0) return;

    showError('');
    loading.hidden = false;
    processBtn.disabled = true;

    try {
      await loadMachineCleaningSummary();
      calculateSnapshot();
      await loadProgress();
      try {
        await loadCsiSummary();
      } catch (csiError) {
        state.csiSummaryError = 'Detail CSI tidak tersedia';
        renderCsiSummaryCells();
        console.warn('Detail CSI belum dapat dimuat:', csiError);
      }
      recordSnapshotBtn.disabled = !(state.file && state.progressRows.length && state.allRanking.length);
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
    state.totalUniqueIps = 0;
    state.unmappedIps = [];
    historyFile.value = '';
    fileName.textContent = 'Belum ada file dipilih';
    fileStatus.textContent = 'Belum ada data.';
    processBtn.disabled = true;
    recordSnapshotBtn.disabled = true;
    resultsSection.hidden = true;
    progressPanel.hidden = true;
    targetDcSearch.value = '';
    targetDcInfo.textContent = '';
    targetDcSearch.disabled = true;
    recordTargetBtn.disabled = true;
    state.progressHistory = [];
    progressSaveStatus.classList.remove('visible');
    progressSaveStatus.textContent = '';
    downloadProgressBtn.disabled = true;
    updateTrackedAccess();
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