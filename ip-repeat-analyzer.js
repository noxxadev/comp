(() => {
  'use strict';

  const state = {
    file: null,
    rows: [],
    filteredRows: [],
    sortDesc: true,
    sourceColumn: ''
  };

  const $ = (id) => document.getElementById(id);

  const fileInput = $('excelFile');
  const uploadArea = $('fileUploadArea');
  const fileName = $('fileName');
  const processBtn = $('processBtn');
  const uploadError = $('uploadError');
  const loading = $('loading');
  const resultsSection = $('resultsSection');
  const resultsBody = $('resultsBody');
  const emptyResults = $('emptyResults');
  const searchInput = $('searchInput');
  const sortBtn = $('sortBtn');
  const exportBtn = $('exportBtn');
  const resultSummary = $('resultSummary');
  const masterDataStatus = $('masterDataStatus');
  const menuToggle = $('menuToggle');
  const sidebar = $('sidebar');
  const sidebarOverlay = $('sidebarOverlay');

  function normalizeIp(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, '').trim();
  }

  function isIpv4(value) {
    const parts = value.split('.');
    return parts.length === 4 && parts.every(part => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const number = Number(part);
      return number >= 0 && number <= 255;
    });
  }

  function findIpColumn(headers) {
    const normalized = headers.map(header => String(header ?? '').replace(/\uFEFF/g, '').replace(/\s+/g, '').toLowerCase());
    let index = normalized.findIndex(header => header === 'ip');
    if (index !== -1) return index;

    index = normalized.findIndex(header => header === 'ipaddress' || header === 'ipaddr');
    if (index !== -1) return index;

    return -1;
  }

  function getZoneFromMasterName(name) {
    if (!name) return '-';

    // Master Data menggunakan format lokasi seperti GBE.A1.A.1.1.
    // Zona adalah huruf pertama setelah "GBE.".
    const match = String(name).trim().match(/^GBE\.([A-Z])/i);
    return match ? `Line ${match[1].toUpperCase()}` : '-';
  }

  function showError(message) {
    uploadError.textContent = message;
    uploadError.classList.add('visible');
  }

  function clearError() {
    uploadError.textContent = '';
    uploadError.classList.remove('visible');
  }

  function setFile(file) {
    clearError();
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xls', 'xlsx'].includes(extension)) {
      state.file = null;
      processBtn.disabled = true;
      fileName.textContent = 'Belum ada file';
      showError('Format file tidak didukung. Gunakan file .xls atau .xlsx.');
      return;
    }

    state.file = file;
    fileName.textContent = file.name;
    processBtn.disabled = false;
    uploadArea.classList.add('has-file');
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();

    state.filteredRows = state.rows.filter(row =>
      row.ip.toLowerCase().includes(query) ||
      row.name.toLowerCase().includes(query)
    );

    state.filteredRows.sort((a, b) => {
      const repeatDiff = b.repeat - a.repeat;
      if (repeatDiff !== 0) return state.sortDesc ? repeatDiff : -repeatDiff;
      return a.ip.localeCompare(b.ip, undefined, { numeric: true });
    });

    resultsBody.innerHTML = '';

    if (!state.filteredRows.length) {
      emptyResults.hidden = false;
      return;
    }

    emptyResults.hidden = true;

    const fragment = document.createDocumentFragment();
    state.filteredRows.forEach((row, index) => {
      const tr = document.createElement('tr');

      const no = document.createElement('td');
      no.className = 'col-no';
      no.textContent = String(index + 1);

      const ip = document.createElement('td');
      ip.className = 'ip-cell';
      ip.textContent = row.ip;

      const repeat = document.createElement('td');
      repeat.className = 'repeat-cell';
      repeat.textContent = String(row.repeat);

      const name = document.createElement('td');
      name.className = row.isMaster ? 'name-cell' : 'name-cell not-master';
      name.textContent = row.name;

      const zone = document.createElement('td');
      zone.className = row.isMaster && row.zone !== '-' ? 'zone-cell' : 'zone-cell not-master';
      zone.textContent = row.zone;

      tr.append(no, ip, repeat, name, zone);
      fragment.appendChild(tr);
    });

    resultsBody.appendChild(fragment);
  }

  async function processFile() {
    if (!state.file) return;

    clearError();
    loading.classList.add('visible');
    resultsSection.hidden = true;
    processBtn.disabled = true;

    try {
      const buffer = await state.file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

      if (!workbook.SheetNames.length) {
        throw new Error('File Excel tidak memiliki worksheet.');
      }

      let sheet = workbook.Sheets[workbook.SheetNames[0]];
      let matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

      let headerRowIndex = -1;
      let ipColumnIndex = -1;

      // Cari header IP pada beberapa baris pertama untuk menangani worksheet dengan baris pembuka.
      const scanLimit = Math.min(matrix.length, 20);
      for (let i = 0; i < scanLimit; i++) {
        const candidate = findIpColumn(matrix[i] || []);
        if (candidate !== -1) {
          headerRowIndex = i;
          ipColumnIndex = candidate;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Kolom IP tidak ditemukan. Pastikan file memiliki header bernama IP.');
      }

      state.sourceColumn = String(matrix[headerRowIndex][ipColumnIndex] ?? 'IP').trim() || 'IP';

      const counts = new Map();
      let validIpRows = 0;

      for (let i = headerRowIndex + 1; i < matrix.length; i++) {
        const ip = normalizeIp(matrix[i]?.[ipColumnIndex]);
        if (!ip || !isIpv4(ip)) continue;

        validIpRows++;
        counts.set(ip, (counts.get(ip) || 0) + 1);
      }

      state.rows = Array.from(counts, ([ip, repeat]) => {
        const masterName = window.masterData && Object.prototype.hasOwnProperty.call(window.masterData, ip)
          ? String(window.masterData[ip] ?? '').trim()
          : null;

        return {
          ip,
          repeat,
          name: masterName || 'Bukan IP DC',
          isMaster: Boolean(masterName),
          zone: getZoneFromMasterName(masterName)
        };
      });

      resultSummary.textContent =
        `${validIpRows.toLocaleString('id-ID')} data IP valid dari kolom "${state.sourceColumn}" → ${state.rows.length.toLocaleString('id-ID')} IP unik.`;

      resultsSection.hidden = false;
      searchInput.value = '';
      state.sortDesc = true;
      sortBtn.dataset.order = 'desc';
      sortBtn.innerHTML = '<i class="fas fa-arrow-down-wide-short"></i><span>Repeat Terbanyak</span>';
      render();
    } catch (error) {
      console.error(error);
      showError(error.message || 'Gagal memproses file Excel.');
    } finally {
      loading.classList.remove('visible');
      processBtn.disabled = !state.file;
    }
  }

  function exportResults() {
    if (!state.rows.length) return;

    const exportRows = state.rows
      .slice()
      .sort((a, b) => {
        const diff = b.repeat - a.repeat;
        if (diff !== 0) return diff;
        return a.ip.localeCompare(b.ip, undefined, { numeric: true });
      })
      .map((row, index) => ({
        No: index + 1,
        IP: row.ip,
        'Repeat Zero': row.repeat,
        'Nama DC': row.name,
        Zona: row.zone
      }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 7 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 12 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'IP Repeat');
    XLSX.writeFile(workbook, 'IP_Repeat_Analysis.xlsx');
  }

  fileInput.addEventListener('change', event => {
    setFile(event.target.files?.[0]);
  });

  ['dragenter', 'dragover'].forEach(type => {
    uploadArea.addEventListener(type, event => {
      event.preventDefault();
      uploadArea.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(type => {
    uploadArea.addEventListener(type, event => {
      event.preventDefault();
      uploadArea.classList.remove('drag-over');
    });
  });

  uploadArea.addEventListener('drop', event => {
    setFile(event.dataTransfer.files?.[0]);
  });

  processBtn.addEventListener('click', processFile);
  searchInput.addEventListener('input', render);

  sortBtn.addEventListener('click', () => {
    state.sortDesc = !state.sortDesc;
    sortBtn.dataset.order = state.sortDesc ? 'desc' : 'asc';
    sortBtn.innerHTML = state.sortDesc
      ? '<i class="fas fa-arrow-down-wide-short"></i><span>Repeat Terbanyak</span>'
      : '<i class="fas fa-arrow-up-short-wide"></i><span>Repeat Tersedikit</span>';
    render();
  });

  exportBtn.addEventListener('click', exportResults);

  menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
  });

  sidebarOverlay?.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    }
  });

  masterDataStatus.textContent = window.masterData && typeof window.masterData === 'object'
    ? `${Object.keys(window.masterData).length.toLocaleString('id-ID')} IP`
    : 'Tidak tersedia';
})();
