(() => {
  'use strict';

  const state = { file: null, rows: [], ipColumn: -1 };

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
    const preferred = new Set(['ip','ipaddress','ipaddr','minerip','ipminer','ipaddressminer']);
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
    if (parts.length >= 2 && parts[0].toUpperCase() === 'GBE' && parts[1].trim()) {
      return parts[1].trim();
    }
    return '';
  };

  const calculate = () => {
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
    const ranking = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { numeric: true }))
      .slice(0, 5);

    renderStats({ total, unique: uniqueIps.size, recognized, unrecognized });
    rankingBody.innerHTML = ranking.map((item, index) =>
      `<tr><td class="dc-rank">#${index + 1}</td><td class="dc-name">${item.name}</td><td class="dc-count">${item.count.toLocaleString('id-ID')}</td></tr>`
    ).join('');

    emptyRanking.hidden = ranking.length !== 0;
    resultNote.textContent = ranking.length
      ? `Menampilkan 5 DC teratas dari ${counts.size.toLocaleString('id-ID')} Nama DC yang teridentifikasi. Perhitungan menggunakan setiap kemunculan IP, bukan hanya IP unik.`
      : 'Tidak ada Nama DC yang dapat diambil dari mapping master-data.js.';

    resultsSection.hidden = false;
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

  processBtn.addEventListener('click', () => {
    if (!state.file || state.ipColumn < 0) return;
    showError('');
    loading.hidden = false;
    processBtn.disabled = true;
    setTimeout(() => {
      try {
        calculate();
      } finally {
        loading.hidden = true;
        processBtn.disabled = false;
      }
    }, 0);
  });

  clearBtn.addEventListener('click', () => {
    state.file = null;
    state.rows = [];
    state.ipColumn = -1;
    historyFile.value = '';
    fileName.textContent = 'Belum ada file dipilih';
    fileStatus.textContent = 'Belum ada data.';
    processBtn.disabled = true;
    resultsSection.hidden = true;
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