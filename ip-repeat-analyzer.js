(() => {
  'use strict';

  const state = {
    file: null,
    rows: [],
    filteredRows: [],
    sortDesc: true,
    zoneFilter: 'all',
    sourceColumn: '',
    selectedIps: new Set(),
    engineerId: ''
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
  const zoneFilter = $('zoneFilter');
  const exportBtn = $('exportBtn');
  const resultSummary = $('resultSummary');
  const masterDataStatus = $('masterDataStatus');
  const menuToggle = $('menuToggle');
  const sidebar = $('sidebar');
  const sidebarOverlay = $('sidebarOverlay');
  const selectedCount = $('selectedCount');
  const selectAllBtn = $('selectAllBtn');
  const clearSelectionBtn = $('clearSelectionBtn');
  const engineerSelect = $('engineerSelect');
  const workTargetCount = $('workTargetCount');
  const workStatus = $('workStatus');
  const workNote = $('workNote');
  const saveWorkBtn = $('saveWorkBtn');
  const workMessage = $('workMessage');

  const ENGINEER_STORAGE_KEY = 'comp.selectedEngineerId';

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

  function loadEngineerCatalog() {
    const catalog = Array.isArray(window.engineerData) ? window.engineerData : [];
    engineerSelect.innerHTML = '<option value="">Pilih engineer</option>';

    catalog.forEach(engineer => {
      if (!engineer?.id || !engineer?.displayName) return;
      const option = document.createElement('option');
      option.value = engineer.id;
      option.textContent = engineer.displayName;
      engineerSelect.appendChild(option);
    });

    const storedId = window.localStorage?.getItem(ENGINEER_STORAGE_KEY) || '';
    if (catalog.some(engineer => engineer?.id === storedId)) {
      state.engineerId = storedId;
      engineerSelect.value = storedId;
    }
  }

  function updateWorkUi() {
    const targetCount = state.selectedIps.size;
    workTargetCount.textContent = `${targetCount.toLocaleString('id-ID')} IP target`;
    saveWorkBtn.disabled = targetCount === 0 || !state.engineerId;
  }

  function showWorkMessage(message, isError = false) {
    workMessage.textContent = message;
    workMessage.classList.toggle('error', isError);
    workMessage.classList.toggle('visible', Boolean(message));
  }

  function updateSelectionUi() {
    selectedCount.textContent = state.selectedIps.size.toLocaleString('id-ID');
    clearSelectionBtn.disabled = state.selectedIps.size === 0;

    const visibleIps = state.filteredRows.map(row => row.ip);
    const allVisibleSelected = visibleIps.length > 0 && visibleIps.every(ip => state.selectedIps.has(ip));
    selectAllBtn.disabled = visibleIps.length === 0;
    selectAllBtn.innerHTML = allVisibleSelected
      ? '<i class="fas fa-square-minus"></i><span>Batalkan Semua</span>'
      : '<i class="fas fa-check-double"></i><span>Pilih Semua</span>';

    updateWorkUi();
  }

  function toggleSelection(ip, checked) {
    if (checked) {
      state.selectedIps.add(ip);
    } else {
      state.selectedIps.delete(ip);
    }
    updateSelectionUi();
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();

    state.filteredRows = state.rows.filter(row => {
      const matchesQuery =
        row.ip.toLowerCase().includes(query) ||
        row.name.toLowerCase().includes(query);
      const matchesZone =
        state.zoneFilter === 'all' || row.zone === state.zoneFilter;
      return matchesQuery && matchesZone;
    });

    state.filteredRows.sort((a, b) => {
      const repeatDiff = b.repeat - a.repeat;
      if (repeatDiff !== 0) return state.sortDesc ? repeatDiff : -repeatDiff;
      return a.ip.localeCompare(b.ip, undefined, { numeric: true });
    });

    resultsBody.innerHTML = '';

    if (!state.filteredRows.length) {
      emptyResults.hidden = false;
      updateSelectionUi();
      return;
    }

    emptyResults.hidden = true;

    const fragment = document.createDocumentFragment();
    state.filteredRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      if (state.selectedIps.has(row.ip)) tr.classList.add('is-selected');

      const selection = document.createElement('td');
      selection.className = 'selection-cell';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'repeat-row-checkbox';
      checkbox.checked = state.selectedIps.has(row.ip);
      checkbox.setAttribute('aria-label', `Pilih IP ${row.ip}`);
      checkbox.addEventListener('change', event => {
        toggleSelection(row.ip, event.target.checked);
        tr.classList.toggle('is-selected', event.target.checked);
      });
      selection.appendChild(checkbox);

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

      tr.append(selection, no, ip, repeat, name, zone);
      fragment.appendChild(tr);
    });

    resultsBody.appendChild(fragment);
    updateSelectionUi();
  }

  async function processFile() {
    if (!state.file) return;

    clearError();
    showWorkMessage('');
    loading.classList.add('visible');
    resultsSection.hidden = true;
    processBtn.disabled = true;

    try {
      const buffer = await state.file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

      if (!workbook.SheetNames.length) {
        throw new Error('File Excel tidak memiliki worksheet.');
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

      let headerRowIndex = -1;
      let ipColumnIndex = -1;

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

      state.selectedIps.clear();
      showWorkMessage('');
      resultSummary.textContent =
        `${validIpRows.toLocaleString('id-ID')} data IP valid dari kolom "${state.sourceColumn}" → ${state.rows.length.toLocaleString('id-ID')} IP unik.`;

      resultsSection.hidden = false;
      searchInput.value = '';
      if (zoneFilter) zoneFilter.value = 'all';
      state.zoneFilter = 'all';
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

  function saveWorkForSelected() {
    if (!state.selectedIps.size) {
      showWorkMessage('Pilih minimal satu IP terlebih dahulu.', true);
      return;
    }

    if (!state.engineerId) {
      showWorkMessage('Pilih engineer terlebih dahulu.', true);
      return;
    }

    const workApi = window.CompWorkTracking;
    if (!workApi) {
      showWorkMessage('Modul Work Tracking tidak tersedia.', true);
      return;
    }

    const selectedRows = state.rows.filter(row => state.selectedIps.has(row.ip));
    const items = workApi.loadWorkItems();
    const timestamp = new Date().toISOString();

    selectedRows.forEach(row => {
      const existing = items[row.ip] || {};
      items[row.ip] = {
        ip: row.ip,
        name: row.name,
        zone: row.zone,
        repeat: row.repeat,
        engineerId: state.engineerId,
        status: workStatus.value,
        timestamp,
        note: workNote.value.trim()
      };

      if (existing.status && workStatus.value === 'Belum Dikerjakan' && !workNote.value.trim()) {
        items[row.ip].note = existing.note || '';
      }
    });

    try {
      workApi.saveWorkItems(items);
      showWorkMessage(`${selectedRows.length.toLocaleString('id-ID')} IP berhasil disimpan untuk pekerjaan.`);
    } catch (error) {
      console.error(error);
      showWorkMessage('Gagal menyimpan data pekerjaan di browser.', true);
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

  fileInput.addEventListener('change', event => setFile(event.target.files?.[0]));

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

  uploadArea.addEventListener('drop', event => setFile(event.dataTransfer.files?.[0]));

  processBtn.addEventListener('click', processFile);
  searchInput.addEventListener('input', render);

  zoneFilter?.addEventListener('change', () => {
    state.zoneFilter = zoneFilter.value;
    render();
  });

  sortBtn.addEventListener('click', () => {
    state.sortDesc = !state.sortDesc;
    sortBtn.dataset.order = state.sortDesc ? 'desc' : 'asc';
    sortBtn.innerHTML = state.sortDesc
      ? '<i class="fas fa-arrow-down-wide-short"></i><span>Repeat Terbanyak</span>'
      : '<i class="fas fa-arrow-up-short-wide"></i><span>Repeat Tersedikit</span>';
    render();
  });

  selectAllBtn?.addEventListener('click', () => {
    const visibleIps = state.filteredRows.map(row => row.ip);
    const allVisibleSelected = visibleIps.length > 0 && visibleIps.every(ip => state.selectedIps.has(ip));

    if (allVisibleSelected) {
      visibleIps.forEach(ip => state.selectedIps.delete(ip));
    } else {
      visibleIps.forEach(ip => state.selectedIps.add(ip));
    }
    render();
  });

  clearSelectionBtn?.addEventListener('click', () => {
    state.selectedIps.clear();
    render();
  });

  engineerSelect?.addEventListener('change', () => {
    state.engineerId = engineerSelect.value;
    showWorkMessage('');

    if (state.engineerId) {
      window.localStorage?.setItem(ENGINEER_STORAGE_KEY, state.engineerId);
    } else {
      window.localStorage?.removeItem(ENGINEER_STORAGE_KEY);
    }

    updateWorkUi();
  });

  workStatus?.addEventListener('change', () => showWorkMessage(''));
  workNote?.addEventListener('input', () => showWorkMessage(''));
  saveWorkBtn?.addEventListener('click', saveWorkForSelected);

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

  loadEngineerCatalog();
  updateSelectionUi();
})();
