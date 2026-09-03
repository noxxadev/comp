(() => {
  'use strict';

  const STORAGE_KEY = 'comp.machineList.v1';
  const REQUIRED_HEADERS = {
    serialNumber: ['serial_number', 'serial number', 'serialnumber'],
    locationId: ['location_id', 'location id', 'locationid']
  };
  const OPTIONAL_HEADERS = {
    installedDate: ['installed_date', 'installed date', 'installeddate'],
    uninstalledDate: ['uninstalled_date', 'uninstalled date', 'uninstalleddate']
  };

  const state = {
    file: null,
    records: [],
    sourceHeaders: [],
    sourceFileName: '',
    loadedAt: '',
    dataSource: 'none'
  };

  const $ = (id) => document.getElementById(id);

  const fileInput = $('machineListFile');
  const uploadArea = $('machineListUploadArea');
  const fileName = $('machineListFileName');
  const processBtn = $('machineListProcessBtn');
  const errorBox = $('machineListError');
  const loading = $('machineListLoading');
  const loadingText = loading?.querySelector('p');
  const summary = $('machineListSummary');
  const tableBody = $('machineListBody');
  const emptyBox = $('machineListEmpty');
  const clearBtn = $('machineListClearBtn');
  const storageStatus = $('machineListStorageStatus');

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  function normalizeHeader(value) {
    return String(value ?? '')
      .replace(/\uFEFF/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function normalizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function normalizeLocationId(value) {
    return normalizeText(value).toUpperCase();
  }

  function normalizeSerialNumber(value) {
    return normalizeText(value);
  }

  function normalizeDateValue(value) {
    return normalizeText(value);
  }

  function findHeaderIndex(headers, aliases) {
    const normalized = headers.map(normalizeHeader);
    for (const alias of aliases) {
      const index = normalized.indexOf(normalizeHeader(alias));
      if (index !== -1) return index;
    }
    return -1;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('visible');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.remove('visible');
  }

  function setLoading(active, message = 'Memproses Machine List...') {
    loading.classList.toggle('visible', active);
    if (loadingText) loadingText.textContent = message;
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
    state.sourceFileName = file.name;
    fileName.textContent = file.name;
    processBtn.disabled = false;
    uploadArea.classList.add('has-file');
  }

  function buildRecords(matrix, headerRowIndex, indexes) {
    const records = [];

    for (let i = headerRowIndex + 1; i < matrix.length; i++) {
      const row = matrix[i] || [];
      const serialNumber = normalizeSerialNumber(row[indexes.serialNumber]);
      const locationId = normalizeLocationId(row[indexes.locationId]);
      const installedDate = indexes.installedDate === -1
        ? ''
        : normalizeDateValue(row[indexes.installedDate]);
      const uninstalledDate = indexes.uninstalledDate === -1
        ? ''
        : normalizeDateValue(row[indexes.uninstalledDate]);

      if (!serialNumber && !locationId && !installedDate && !uninstalledDate) continue;

      records.push({
        serialNumber,
        locationId,
        installedDate,
        uninstalledDate,
        sourceRow: i + 1
      });
    }

    return records;
  }

  function validateAndParse(workbook) {
    if (!workbook.SheetNames.length) {
      throw new Error('File Machine List tidak memiliki worksheet.');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false
    });

    if (!matrix.length) {
      throw new Error('Worksheet Machine List kosong.');
    }

    let indexes = null;
    let headerRowIndex = -1;
    const scanLimit = Math.min(matrix.length, 30);

    for (let i = 0; i < scanLimit; i++) {
      const headers = matrix[i] || [];
      const serialNumber = findHeaderIndex(headers, REQUIRED_HEADERS.serialNumber);
      const locationId = findHeaderIndex(headers, REQUIRED_HEADERS.locationId);
      const installedDate = findHeaderIndex(headers, OPTIONAL_HEADERS.installedDate);
      const uninstalledDate = findHeaderIndex(headers, OPTIONAL_HEADERS.uninstalledDate);

      if (serialNumber !== -1 && locationId !== -1) {
        headerRowIndex = i;
        indexes = { serialNumber, locationId, installedDate, uninstalledDate };
        break;
      }
    }

    if (!indexes) {
      throw new Error('Kolom Machine List tidak lengkap. Wajib ada serial_number dan location_id.');
    }

    const records = buildRecords(matrix, headerRowIndex, indexes);

    if (!records.length) {
      throw new Error('Machine List tidak memiliki record data. Dataset lama tidak akan diubah.');
    }

    return {
      headers: matrix[headerRowIndex].map(value => normalizeText(value)),
      records,
      headerRowIndex
    };
  }

  function saveToStorage() {
    const payload = {
      version: 1,
      sourceFileName: state.sourceFileName,
      loadedAt: state.loadedAt,
      headers: state.sourceHeaders,
      records: state.records
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    updateStorageStatus();
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const payload = JSON.parse(raw);
      if (payload?.version !== 1 || !Array.isArray(payload.records)) return false;

      state.records = payload.records;
      state.sourceHeaders = Array.isArray(payload.headers) ? payload.headers : [];
      state.sourceFileName = payload.sourceFileName || '';
      state.loadedAt = payload.loadedAt || '';
      state.dataSource = 'cache';
      render();
      updateStorageStatus();
      return state.records.length > 0;
    } catch (error) {
      console.warn('Gagal memuat Machine List tersimpan:', error);
      return false;
    }
  }

  function updateStorageStatus() {
    const hasData = state.records.length > 0;
    clearBtn.disabled = !hasData;
    if (!hasData) {
      storageStatus.textContent = 'Belum ada data Machine List';
      return;
    }

    const loaded = state.loadedAt ? new Date(state.loadedAt) : null;
    const stamp = loaded && !Number.isNaN(loaded.getTime())
      ? ` • ${loaded.toLocaleString('id-ID')}`
      : '';
    const source = state.dataSource === 'remote'
      ? 'Google Sheets'
      : state.dataSource === 'cache'
        ? 'Cache lokal (fallback)'
        : 'Lokal';

    storageStatus.textContent = `${state.records.length.toLocaleString('id-ID')} record • ${source}${stamp}`;
  }

  function render() {
    summary.textContent = state.records.length
      ? `${state.records.length.toLocaleString('id-ID')} record Machine List siap digunakan.`
      : 'Belum ada Machine List yang dimuat.';

    tableBody.innerHTML = '';

    if (!state.records.length) {
      emptyBox.hidden = false;
      return;
    }

    emptyBox.hidden = true;
    const fragment = document.createDocumentFragment();
    state.records.slice(0, 200).forEach((record, index) => {
      const tr = document.createElement('tr');
      const values = [
        index + 1,
        record.serialNumber || '—',
        record.locationId || '—',
        record.installedDate || '—',
        record.uninstalledDate || '—'
      ];

      values.forEach((value, valueIndex) => {
        const td = document.createElement('td');
        td.textContent = String(value);
        if (valueIndex === 0) td.className = 'machine-list-no';
        if (valueIndex === 1 || valueIndex === 2) td.classList.add('machine-list-mono');
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });

    tableBody.appendChild(fragment);

    if (state.records.length > 200) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.className = 'machine-list-more';
      td.textContent = `Preview menampilkan 200 record pertama dari ${state.records.length.toLocaleString('id-ID')} record.`;
      tr.appendChild(td);
      tableBody.appendChild(tr);
    }
  }

  async function postToGoogleSheets(payload) {
    const config = getConfig();
    const url = String(config.webAppUrl || '').trim();

    if (!url) {
      throw new Error('Google Sheets belum dikonfigurasi. Isi webAppUrl pada google-sheets-config.js.');
    }

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          ...payload,
          requestKey: String(config.requestKey || '')
        })
      });
    } catch (error) {
      throw new Error(`Gagal terhubung ke Google Sheets: ${error.message || 'network error'}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      throw new Error(`Google Apps Script mengembalikan response tidak valid (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(result?.error || `Google Sheets gagal menerima data (HTTP ${response.status}).`);
    }

    if (!result?.ok) {
      throw new Error(result?.error || 'Google Apps Script menolak penyimpanan Machine List.');
    }

    return result;
  }

  async function getRemoteMachineList() {
    const config = getConfig();
    const baseUrl = String(config.webAppUrl || '').trim();

    if (!baseUrl) {
      throw new Error('Google Sheets belum dikonfigurasi.');
    }

    const params = new URLSearchParams({ action: 'getMachineList' });
    if (config.requestKey) params.set('requestKey', String(config.requestKey));

    let response;
    try {
      response = await fetch(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`, {
        method: 'GET',
        cache: 'no-store'
      });
    } catch (error) {
      throw new Error(`Gagal membaca Machine List dari Google Sheets: ${error.message || 'network error'}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      throw new Error(`Google Apps Script mengembalikan response tidak valid (HTTP ${response.status}).`);
    }

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `Gagal membaca Machine List dari Google Sheets (HTTP ${response.status}).`);
    }

    return result;
  }

  function applyRemoteMachineList(result) {
    const records = Array.isArray(result?.records) ? result.records.map(record => ({
      serialNumber: normalizeSerialNumber(record?.serialNumber),
      locationId: normalizeLocationId(record?.locationId),
      installedDate: normalizeDateValue(record?.installedDate),
      uninstalledDate: normalizeDateValue(record?.uninstalledDate)
    })) : [];

    state.records = records;
    state.sourceHeaders = ['Serial Number', 'Location ID', 'Installed Date', 'Uninstalled Date'];
    state.sourceFileName = normalizeText(result?.sourceFileName);
    state.loadedAt = result?.updatedAt || new Date().toISOString();
    state.dataSource = 'remote';
    saveToStorage();
    render();
  }

  async function loadRemoteMachineList({ silent = false } = {}) {
    if (!silent) setLoading(true, 'Memuat Machine List terbaru dari Google Sheets...');

    try {
      const result = await getRemoteMachineList();
      applyRemoteMachineList(result);
      clearError();
      return true;
    } catch (error) {
      console.error(error);
      const hasCache = state.records.length > 0 || loadFromStorage();
      if (hasCache) {
        state.dataSource = 'cache';
        updateStorageStatus();
        showError(`Tidak dapat membaca Machine List terbaru. Menampilkan cache lokal terakhir. ${error.message}`);
      } else {
        showError(error.message || 'Gagal memuat Machine List dari Google Sheets.');
      }
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function replaceRemoteMachineList(records, sourceFileName) {
    const result = await postToGoogleSheets({
      action: 'replaceMachineList',
      records,
      sourceFileName
    });

    const saved = Number(result.saved || 0);
    if (saved !== records.length) {
      throw new Error(`Google Sheets hanya menyimpan ${saved} dari ${records.length} record. Dataset lokal tidak diubah.`);
    }

    return result;
  }

  async function processFile() {
    if (!state.file) return;

    clearError();
    setLoading(true, 'Membaca dan memvalidasi Machine List...');
    processBtn.disabled = true;

    const previousState = {
      records: state.records,
      sourceHeaders: state.sourceHeaders,
      sourceFileName: state.sourceFileName,
      loadedAt: state.loadedAt,
      dataSource: state.dataSource
    };
    const sourceFileName = state.file.name;

    try {
      const buffer = await state.file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const parsed = validateAndParse(workbook);

      setLoading(true, `Mengganti Machine List Current dengan ${parsed.records.length.toLocaleString('id-ID')} record...`);
      const result = await replaceRemoteMachineList(parsed.records, sourceFileName);

      state.sourceHeaders = parsed.headers;
      state.records = parsed.records;
      state.sourceFileName = sourceFileName;
      state.loadedAt = result.updatedAt || new Date().toISOString();
      state.dataSource = 'remote';
      saveToStorage();
      render();
    } catch (error) {
      console.error(error);
      state.records = previousState.records;
      state.sourceHeaders = previousState.sourceHeaders;
      state.sourceFileName = previousState.sourceFileName;
      state.loadedAt = previousState.loadedAt;
      state.dataSource = previousState.dataSource;
      showError(error.message || 'Gagal menyimpan Machine List. Dataset lama tetap dipertahankan.');
      render();
      updateStorageStatus();
    } finally {
      setLoading(false);
      processBtn.disabled = !state.file;
    }
  }

  function clearStoredData() {
    state.records = [];
    state.sourceHeaders = [];
    state.sourceFileName = '';
    state.loadedAt = '';
    state.dataSource = 'none';
    state.file = null;
    localStorage.removeItem(STORAGE_KEY);
    fileName.textContent = 'Belum ada file';
    uploadArea.classList.remove('has-file');
    processBtn.disabled = true;
    render();
    updateStorageStatus();
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
  clearBtn.addEventListener('click', clearStoredData);

  window.CompMachineList = {
    getRecords() {
      return state.records.map(record => ({ ...record }));
    },
    getStorageKey() {
      return STORAGE_KEY;
    },
    getMeta() {
      return {
        sourceFileName: state.sourceFileName,
        loadedAt: state.loadedAt,
        count: state.records.length,
        dataSource: state.dataSource
      };
    },
    refresh() {
      return loadRemoteMachineList();
    }
  };

  loadFromStorage();
  loadRemoteMachineList({ silent: false });
})();