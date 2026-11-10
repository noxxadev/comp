(() => {
  'use strict';

  const state = {
    rows: [],
    filteredRows: [],
    sortDesc: true,
    zoneFilter: 'all',
    topDcFilter: '',
    sourceFileName: '',
    loadedAt: '',
    dataSource: 'none',
    selectedIps: new Set(),
    engineerId: '',
    engineerCatalog: [],
    serialByIp: new Map(),
    cleaningCountByIp: new Map(),
    saveInProgress: false,
    selectionActionBusy: false
  };

  const $ = (id) => document.getElementById(id);

  const resultsSection = $('resultsSection');
  const resultsBody = $('resultsBody');
  const emptyResults = $('emptyResults');
  const searchInput = $('searchInput');
  const sortBtn = $('sortBtn');
  const copyResultsBtn = $('copyResultsBtn');
  const topDcCards = $('topDcCards');
  const zoneFilter = $('zoneFilter');
  const menuToggle = $('menuToggle');
  const sidebar = $('sidebar');
  const sidebarOverlay = $('sidebarOverlay');
  const selectedCount = $('selectedCount');
  const selectAllBtn = $('selectAllBtn');
  const clearSelectionBtn = $('clearSelectionBtn');
  const engineerSelect = $('engineerSelect');
  const workStatus = $('workStatus');
  const workNote = $('workNote');
  const saveWorkBtn = $('saveWorkBtn');
  const workMessage = $('workMessage');
  const cleaningWarningModal = $('cleaningWarningModal');
  const cleaningWarningList = $('cleaningWarningList');
  const cleaningWarningCancel = $('cleaningWarningCancel');
  const cleaningWarningContinue = $('cleaningWarningContinue');

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

  function extractDcName(location) {
    const parts = String(location ?? '').trim().split('.');
    if (parts.length >= 2 && parts[0].toUpperCase() === 'GBE' && parts[1].trim()) return parts[1].trim();
    return '';
  }

  function getSheetsConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  async function getSharedIpRepeat() {
    const config = getSheetsConfig();
    const baseUrl = String(config.webAppUrl || '').trim();
    if (!baseUrl) throw new Error('Google Sheets belum dikonfigurasi.');

    const params = new URLSearchParams({ action: 'getIpRepeat' });
    if (config.requestKey) params.set('requestKey', String(config.requestKey));

    const response = await fetch(
      `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`,
      { method: 'GET', cache: 'no-store' }
    );

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (_) {
      throw new Error(`Google Apps Script mengembalikan response tidak valid (HTTP ${response.status}).`);
    }

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `Gagal membaca IP Repeat bersama (HTTP ${response.status}).`);
    }

    return result;
  }

  function applySharedRows(result) {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    state.rows = rows
      .filter(row => isIpv4(String(row?.ip || '').trim()))
      .map(row => ({
        ip: String(row.ip).trim(),
        repeat: Number(row.repeat || 0),
        name: String(row.name || 'Bukan IP DC').trim() || 'Bukan IP DC',
        isMaster: String(row.name || '').trim() !== '' && String(row.name || '').trim() !== 'Bukan IP DC',
        zone: String(row.zone || '-').trim() || '-'
      }));

    state.sourceFileName = String(result?.sourceFileName || '').trim();
    state.loadedAt = result?.updatedAt || new Date().toISOString();
    state.dataSource = 'remote';
    state.selectedIps.clear();

    resultsSection.hidden = false;
    searchInput.value = '';
    if (zoneFilter) zoneFilter.value = 'all';
    state.zoneFilter = 'all';
    state.sortDesc = true;
    sortBtn.dataset.order = 'desc';
    sortBtn.innerHTML = '<i class="fas fa-arrow-down-wide-short"></i><span>Repeat Terbanyak</span>';
    render();

  }

  async function loadSharedIpRepeat() {
    try {
      const result = await getSharedIpRepeat();
      if (!Array.isArray(result?.rows) || !result.rows.length) {

        return;
      }
      applySharedRows(result);
    } catch (error) {
      console.warn('IP Repeat shared dataset tidak tersedia:', error);

    }
  }


  async function loadEngineerCatalog() {
    const fallbackCatalog = Array.isArray(window.engineerData) ? window.engineerData : [];
    let catalog = fallbackCatalog;

    try {
      const config = getSheetsConfig();
      const baseUrl = String(config.webAppUrl || '').trim();
      if (baseUrl) {
        const params = new URLSearchParams({ action: 'getEngineers' });
        if (config.requestKey) params.set('requestKey', String(config.requestKey));

        const response = await fetch(
          baseUrl + (baseUrl.includes('?') ? '&' : '?') + params.toString(),
          { method: 'GET', cache: 'no-store' }
        );
        const result = await response.json();
        if (response.ok && result?.ok && Array.isArray(result.rows) && result.rows.length) {
          catalog = result.rows;
        }
      }
    } catch (error) {
      console.warn('Engineer Master Google Sheets tidak tersedia, memakai catalog lokal:', error);
    }

    state.engineerCatalog = catalog.filter(engineer => engineer?.id && engineer?.displayName);

    engineerSelect.innerHTML = '<option value="">Pilih engineer</option>';

    state.engineerCatalog.forEach(engineer => {
      if (!engineer?.id || !engineer?.displayName) return;
      const option = document.createElement('option');
      option.value = engineer.id;
      option.textContent = engineer.displayName;
      engineerSelect.appendChild(option);
    });

    const storedId = window.localStorage?.getItem(ENGINEER_STORAGE_KEY) || '';
    if (state.engineerCatalog.some(engineer => engineer?.id === storedId)) {
      state.engineerId = storedId;
      engineerSelect.value = storedId;
    }

    updateWorkUi();
  }

  function updateWorkUi() {
    const targetCount = state.selectedIps.size;
    saveWorkBtn.disabled = state.saveInProgress || targetCount === 0 || !state.engineerId;
  }

  function setSaveInProgress(isSaving) {
    state.saveInProgress = Boolean(isSaving);

    if (!saveWorkBtn) return;

    saveWorkBtn.disabled = state.saveInProgress || state.selectedIps.size === 0 || !state.engineerId;
    saveWorkBtn.setAttribute('aria-busy', state.saveInProgress ? 'true' : 'false');
    saveWorkBtn.innerHTML = state.saveInProgress
      ? '<i class="fas fa-spinner fa-spin"></i><span>Menyimpan...</span>'
      : '<i class="fas fa-save"></i><span>Simpan Pekerjaan</span>';
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
    selectAllBtn.disabled = visibleIps.length === 0 || state.selectionActionBusy;
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

  function getCleaningWarnings(ips) {
    return [...new Set(ips)]
      .map(ip => {
        const serial = String(state.serialByIp.get(ip) || '').trim();
        const count = Number(state.cleaningCountByIp.get(ip) || 0);
        return { ip, serial, count };
      })
      .filter(item => item.serial && item.count > 2);
  }

  function showCleaningWarning(warnings) {
    if (!cleaningWarningModal || !cleaningWarningList || !warnings.length) {
      return Promise.resolve(true);
    }

    cleaningWarningList.innerHTML = '';
    warnings.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = '<strong></strong><span></span><small></small>';
      li.querySelector('strong').textContent = item.serial;
      li.querySelector('span').textContent = `IP ${item.ip}`;
      li.querySelector('small').textContent = `Cleaning Count: ${item.count}`;
      cleaningWarningList.appendChild(li);
    });

    cleaningWarningModal.hidden = false;
    document.body.classList.add('repeat-modal-open');

    return new Promise(resolve => {
      const close = result => {
        cleaningWarningModal.hidden = true;
        document.body.classList.remove('repeat-modal-open');
        cleaningWarningCancel.removeEventListener('click', onCancel);
        cleaningWarningContinue.removeEventListener('click', onContinue);
        resolve(result);
      };
      const onCancel = () => close(false);
      const onContinue = () => close(true);

      cleaningWarningCancel.addEventListener('click', onCancel);
      cleaningWarningContinue.addEventListener('click', onContinue);
    });
  }

  async function confirmCleaningSelection(ips) {
    const warnings = getCleaningWarnings(ips);
    if (!warnings.length) return true;
    return showCleaningWarning(warnings);
  }

  function parseSearchIps(value) {
    const raw = String(value || '').trim();
    if (!raw) return [];

    const tokens = raw.split(/[\s,]+/).map(token => token.trim()).filter(Boolean);
    if (!tokens.length || !tokens.every(isIpv4)) return [];

    return [...new Set(tokens)];
  }

  function renderTopDcCards() {
    if (!topDcCards) return;
    const ipsByDc = new Map();

    state.rows.forEach(row => {
      const name = extractDcName(row.name);
      if (!name || !row.isMaster || !row.ip) return;
      if (!ipsByDc.has(name)) ipsByDc.set(name, new Set());
      ipsByDc.get(name).add(normalizeIp(row.ip));
    });

    const topDcs = [...ipsByDc.entries()]
      .map(([name, ips]) => ({ name, total: ips.size }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, undefined, { numeric: true }))
      .slice(0, 5);

    topDcCards.innerHTML = '';
    if (!topDcs.length) {
      const empty = document.createElement('div');
      empty.className = 'repeat-top-dc-empty';
      empty.textContent = 'Belum ada data DC yang dapat dirangkum.';
      topDcCards.appendChild(empty);
      return;
    }

    topDcs.forEach((dc, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'repeat-top-dc-item';
      button.title = 'Klik untuk memfilter tabel ke ' + dc.name;
      button.setAttribute('aria-label', 'Filter ' + dc.name + ', total Repeat Zero ' + dc.total);
      const rank = document.createElement('span');
      rank.className = 'repeat-top-dc-rank';
      rank.textContent = '#' + (index + 1);
      const name = document.createElement('strong');
      name.className = 'repeat-top-dc-name';
      name.textContent = dc.name;
      const total = document.createElement('span');
      total.className = 'repeat-top-dc-total';
      total.textContent = dc.total.toLocaleString('id-ID');
      const caption = document.createElement('span');
      caption.className = 'repeat-top-dc-caption';
      caption.textContent = 'Repeat Zero';
      button.append(rank, name, total, caption);
      button.addEventListener('click', () => {
        state.topDcFilter = dc.name;
        searchInput.value = dc.name;
        if (zoneFilter) zoneFilter.value = 'all';
        state.zoneFilter = 'all';
        render();
        resultsBody.closest('.repeat-table-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      topDcCards.appendChild(button);
    });
  }

  function render() {
    renderTopDcCards();
    const rawQuery = searchInput.value.trim();
    const query = rawQuery.toLowerCase();
    const searchIps = parseSearchIps(rawQuery);
    const hasMultiIpQuery = searchIps.length > 0;

    state.filteredRows = state.rows.filter(row => {
      const matchesQuery = state.topDcFilter
        ? extractDcName(row.name) === state.topDcFilter
        : hasMultiIpQuery
          ? searchIps.includes(row.ip)
          : (
              row.ip.toLowerCase().includes(query) ||
              row.name.toLowerCase().includes(query) ||
              String(state.serialByIp.get(row.ip) || '').toLowerCase().includes(query)
            );
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
    if (copyResultsBtn) copyResultsBtn.disabled = state.filteredRows.length === 0;

    if (!state.filteredRows.length) {
      emptyResults.hidden = false;
      updateSelectionUi();
      return;
    }

    emptyResults.hidden = true;

    const fragment = document.createDocumentFragment();
    state.filteredRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.dataset.ipRepeatLocation = String(row.location || '').trim();
      if (state.selectedIps.has(row.ip)) tr.classList.add('is-selected');

      const selection = document.createElement('td');
      selection.className = 'selection-cell';

      const selectButton = document.createElement('button');
      const isSelected = state.selectedIps.has(row.ip);
      selectButton.type = 'button';
      selectButton.className = 'repeat-row-select-btn';
      selectButton.classList.toggle('selected', isSelected);
      selectButton.textContent = isSelected ? 'Dipilih' : 'Pilih';
      selectButton.setAttribute(
        'aria-label',
        isSelected ? `Batalkan pilihan IP ${row.ip}` : `Pilih IP ${row.ip}`
      );

      selectButton.addEventListener('click', async () => {
        if (state.selectionActionBusy) return;

        if (state.selectedIps.has(row.ip)) {
          state.selectedIps.delete(row.ip);
          render();
          return;
        }

        state.selectionActionBusy = true;
        selectButton.disabled = true;
        selectButton.classList.add('checking');
        selectButton.textContent = 'Memeriksa...';
        updateSelectionUi();

        try {
          const confirmed = await confirmCleaningSelection([row.ip]);
          if (confirmed) {
            state.selectedIps.add(row.ip);
          }
        } finally {
          state.selectionActionBusy = false;
          render();
        }
      });

      selection.appendChild(selectButton);

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

      tr.append(selection, ip, repeat, name, zone);
      fragment.appendChild(tr);
    });

    resultsBody.appendChild(fragment);
    updateSelectionUi();
  }

  async function saveWorkForSelected() {
    if (state.saveInProgress) return;

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

    const selectedIpSnapshot = new Set(state.selectedIps);
    const selectedRows = state.rows.filter(row => selectedIpSnapshot.has(row.ip));
    const items = {};
    const timestamp = new Date().toISOString();

    selectedRows.forEach(row => {
      items[row.ip] = {
        ip: row.ip,
        name: row.name,
        zone: row.zone,
        repeat: row.repeat,
        engineerId: state.engineerId,
        engineerName: String(state.engineerCatalog.find(engineer => engineer?.id === state.engineerId)?.displayName || '').trim(),
        status: workStatus.value,
        timestamp,
        note: workNote.value.trim()
      };
    });

    setSaveInProgress(true);
    showWorkMessage('Menyimpan data ke Google Sheets...');

    try {
      const result = await workApi.saveWorkItems(items);

      if (Number(result?.saved || 0) !== selectedRows.length) {
        throw new Error(`Google Sheets melaporkan ${result?.saved || 0} dari ${selectedRows.length} IP berhasil disimpan.`);
      }

      selectedIpSnapshot.forEach(ip => state.selectedIps.delete(ip));
      render();
      showWorkMessage(`${selectedRows.length.toLocaleString('id-ID')} IP berhasil disimpan ke Google Sheets. Memperbarui Cleaning Count...`);

      try {
        if (window.CompMachineResolver?.refreshCleaningData) {
          await window.CompMachineResolver.refreshCleaningData();
          render();
          showWorkMessage(`${selectedRows.length.toLocaleString('id-ID')} IP berhasil disimpan. Cleaning Count sudah diperbarui dari Work History.`);
        }
      } catch (refreshError) {
        console.error('Gagal memperbarui Cleaning Count setelah save:', refreshError);
        showWorkMessage(
          `${selectedRows.length.toLocaleString('id-ID')} IP berhasil disimpan, tetapi Cleaning Count belum dapat diperbarui otomatis. Silakan refresh data.`,
          true
        );
      }
    } catch (error) {
      console.error(error);
      showWorkMessage(error.message || 'Gagal menyimpan data pekerjaan ke Google Sheets. Pilihan IP tetap dipertahankan.', true);
    } finally {
      setSaveInProgress(false);
      updateWorkUi();
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
      .map(row => ({
        IP: row.ip,
        'Repeat Zero': row.repeat,
        'Nama DC': row.name,
        Zona: row.zone
      }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 12 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'IP Repeat');
    XLSX.writeFile(workbook, 'IP_Repeat_Analysis.xlsx');
  }

  window.addEventListener('comp:ip-repeat-serials-ready', (event) => {
    const serials = event.detail?.serialByIp;
    if (!(serials instanceof Map)) return;
    state.serialByIp = serials;

    const cleaningCounts = event.detail?.cleaningCountByIp;
    if (cleaningCounts instanceof Map) {
      state.cleaningCountByIp = cleaningCounts;
    }

    render();
  });

  copyResultsBtn?.addEventListener('click', async () => {
    if (!state.filteredRows.length) return;
    const lines = [
      ['IP', 'Nama DC', 'SN'],
      ...state.filteredRows.map(row => [
        row.ip,
        row.name,
        String(state.serialByIp.get(row.ip) || '').trim()
      ])
    ];
    const content = lines.map(columns => columns.map(value =>
      String(value).replace(/[\t\r\n]+/g, ' ')
    ).join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(content);
      const count = state.filteredRows.length;
      copyResultsBtn.innerHTML = '<i class="fas fa-check"></i><span>' + count.toLocaleString('id-ID') + ' IP Disalin</span>';
    } catch (error) {
      console.error('Gagal menyalin hasil IP Repeat:', error);
      copyResultsBtn.innerHTML = '<i class="fas fa-triangle-exclamation"></i><span>Copy Gagal</span>';
    }
  });

  searchInput.addEventListener('input', () => {
    state.topDcFilter = '';
    render();
  });

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

  selectAllBtn?.addEventListener('click', async () => {
    if (state.selectionActionBusy) return;

    const visibleIps = state.filteredRows.map(row => row.ip);
    const allVisibleSelected = visibleIps.length > 0 && visibleIps.every(ip => state.selectedIps.has(ip));

    if (allVisibleSelected) {
      visibleIps.forEach(ip => state.selectedIps.delete(ip));
      render();
      return;
    }

    const ipsToAdd = visibleIps.filter(ip => !state.selectedIps.has(ip));
    if (!ipsToAdd.length) return;

    state.selectionActionBusy = true;
    selectAllBtn.disabled = true;

    try {
      const confirmed = await confirmCleaningSelection(ipsToAdd);
      if (confirmed) {
        ipsToAdd.forEach(ip => state.selectedIps.add(ip));
      }
    } finally {
      state.selectionActionBusy = false;
      render();
    }
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

  loadEngineerCatalog();
  updateSelectionUi();

  loadSharedIpRepeat();
})();
